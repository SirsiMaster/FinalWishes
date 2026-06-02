package forms

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// ErrSourceMismatch is returned when the blank's bytes do not hash to the
// digest pinned in the CoordinateMap. The engine fails closed: a tampered,
// re-revised, or wrong-version blank is never stamped.
var ErrSourceMismatch = errors.New("forms: blank SHA256 does not match pinned digest in coordinate map")

// ErrFieldsIntroduced is returned when the stamped output unexpectedly reports
// AcroForm fields. The overlay engine stamps static page content only; a
// non-zero field count means the output is not truly flat and is refused.
var ErrFieldsIntroduced = errors.New("forms: output reports AcroForm fields; overlay output must be flat")

// Report describes what the engine did, so callers (and tests) can assert the
// execution-field guarantee and surface missing required data to the user.
type Report struct {
	FormID string `json:"formId"`

	// Stamped lists the field keys that received a value on the page.
	Stamped []string `json:"stamped"`

	// SkippedExecution lists execution field keys (signature/witness/notary)
	// for which a value WAS supplied but was deliberately ignored. The engine
	// never stamps execution fields; this records attempts so the guarantee is
	// observable. An empty list with execution data supplied is a bug.
	SkippedExecution []string `json:"skippedExecution"`

	// MissingRequired lists required, non-execution fields that had no value.
	// The engine still returns a PDF (partial fills are valid for review); the
	// caller decides whether to block.
	MissingRequired []string `json:"missingRequired"`
}

// Fill overlays values onto the flat blank described by m and returns the
// stamped PDF bytes plus a Report.
//
// Guarantees enforced here (each backed by a unit test):
//   - Source integrity: the blank at blankPath must hash to m.BlankSHA256, else
//     ErrSourceMismatch (fail closed).
//   - Execution safety: fields with Execution=true are NEVER stamped, even when
//     a value is supplied; the attempt is recorded in Report.SkippedExecution.
//   - True flatness: the output must report zero AcroForm fields, else
//     ErrFieldsIntroduced.
//
// values maps Field.Key -> string. Checkbox fields treat the value as truthy.
func Fill(blankPath string, m *CoordinateMap, values map[string]string) ([]byte, *Report, error) {
	if m == nil {
		return nil, nil, errors.New("forms: nil coordinate map")
	}

	blank, err := os.ReadFile(blankPath)
	if err != nil {
		return nil, nil, fmt.Errorf("forms: read blank %q: %w", blankPath, err)
	}

	// Fail closed on source-integrity mismatch BEFORE any stamping.
	sum := sha256.Sum256(blank)
	if got := hex.EncodeToString(sum[:]); !strings.EqualFold(got, m.BlankSHA256) {
		return nil, nil, fmt.Errorf("%w: got %s, want %s", ErrSourceMismatch, got, m.BlankSHA256)
	}

	conf := model.NewDefaultConfiguration()

	report := &Report{
		FormID:           m.FormID,
		Stamped:          []string{},
		SkippedExecution: []string{},
		MissingRequired:  []string{},
	}

	// Build page -> []watermark. Each stamp is one field's value.
	stamps := map[int][]*model.Watermark{}
	for _, f := range m.Fields {
		val, supplied := values[f.Key]
		val = strings.TrimSpace(val)

		// Execution fields are sacrosanct: never stamped, even if supplied.
		if f.Execution {
			if supplied && val != "" {
				report.SkippedExecution = append(report.SkippedExecution, f.Key)
			}
			continue
		}

		if val == "" {
			if f.Required {
				report.MissingRequired = append(report.MissingRequired, f.Key)
			}
			continue
		}

		text := val
		if f.Kind == FieldCheckbox {
			if !isTruthy(val) {
				continue // unchecked box: stamp nothing
			}
			text = glyphOf(f)
		}

		wm, werr := api.TextWatermark(text, m.describe(f), true /*onTop*/, false /*update*/, types.POINTS)
		if werr != nil {
			return nil, nil, fmt.Errorf("forms: build stamp for %q: %w", f.Key, werr)
		}
		stamps[f.Page] = append(stamps[f.Page], wm)
		report.Stamped = append(report.Stamped, f.Key)
	}

	out := blank
	if len(stamps) > 0 {
		var buf bytes.Buffer
		if err := api.AddWatermarksSliceMap(bytes.NewReader(blank), &buf, stamps, conf); err != nil {
			return nil, nil, fmt.Errorf("forms: apply overlay: %w", err)
		}
		out = buf.Bytes()
	}

	// Assert true flatness: the overlay must not have introduced form fields.
	// pdfcpu returns a "no form available" error when a PDF has no AcroForm at
	// all — for an overlay engine that is the success case (the output is flat,
	// values are baked into page content). Any other error is a real failure;
	// a non-empty field set means the output is NOT flat and is refused.
	fields, err := api.FormFields(bytes.NewReader(out), conf)
	if err != nil {
		if strings.Contains(err.Error(), "no form available") {
			return out, report, nil
		}
		return nil, nil, fmt.Errorf("forms: inspect output form fields: %w", err)
	}
	if len(fields) > 0 {
		return nil, nil, fmt.Errorf("%w: %d field(s)", ErrFieldsIntroduced, len(fields))
	}

	return out, report, nil
}

// describe builds the pdfcpu watermark description for a field: a left-aligned
// text stamp anchored at the page's bottom-left corner, offset to (X, Y) in
// points, rendered as near-black fill with no scaling or rotation.
func (m *CoordinateMap) describe(f Field) string {
	return fmt.Sprintf(
		"fontname:%s, points:%g, scalefactor:1 abs, position:bl, offset:%g %g, aligntext:l, fillcolor:0.10 0.10 0.10, rotation:0, opacity:1, rendermode:0",
		m.fontOf(f), m.sizeOf(f), f.X, f.Y,
	)
}

// glyphOf returns a checkbox field's mark, defaulting to "X".
func glyphOf(f Field) string {
	if f.Glyph != "" {
		return f.Glyph
	}
	return "X"
}

// isTruthy reports whether a checkbox value should render its glyph.
func isTruthy(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "true", "yes", "x", "1", "on", "checked":
		return true
	}
	return false
}
