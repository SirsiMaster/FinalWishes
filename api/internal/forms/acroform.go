package forms

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// FlattenAcroForm removes every AcroForm field from an AcroForm PDF, leaving the
// printed page content (labels, rules, captions) intact and producing a PDF that
// reports zero form fields. It is the preprocessing step that lets the
// coordinate-overlay engine target official statutory forms that are distributed
// as fillable AcroForms (e.g. the CaringInfo Illinois advance-directive packet
// carrying the Health Care POA + Living Will).
//
// Workflow: flatten ONCE offline → write the result as a new blank → pin its
// SHA256 in a CoordinateMap → commit the flat blank → overlay-stamp with Fill.
//
// This is deliberately NOT part of Fill. Fill must stay a pure, deterministic
// overlay over an already-flat, SHA-pinned blank; pdfcpu's writer is not
// byte-deterministic, so flattening at fill time would break source pinning.
//
// If src has no AcroForm it is returned unchanged (already flat).
func FlattenAcroForm(src []byte) ([]byte, error) {
	conf := model.NewDefaultConfiguration()

	fields, err := api.FormFields(bytes.NewReader(src), conf)
	if err != nil {
		if strings.Contains(err.Error(), "no form available") {
			return src, nil // already flat
		}
		return nil, fmt.Errorf("forms: inspect source form: %w", err)
	}

	ids := make([]string, 0, len(fields))
	for _, f := range fields {
		if f.ID != "" {
			ids = append(ids, f.ID)
		}
	}
	if len(ids) == 0 {
		return src, nil
	}

	var buf bytes.Buffer
	if err := api.RemoveFormFields(bytes.NewReader(src), &buf, ids, conf); err != nil {
		return nil, fmt.Errorf("forms: remove form fields: %w", err)
	}
	out := buf.Bytes()

	// Verify the result is truly flat — zero AcroForm fields.
	if f2, err := api.FormFields(bytes.NewReader(out), conf); err != nil {
		if strings.Contains(err.Error(), "no form available") {
			return out, nil
		}
		return nil, fmt.Errorf("forms: verify flattened output: %w", err)
	} else if len(f2) > 0 {
		return nil, fmt.Errorf("forms: flatten left %d residual field(s)", len(f2))
	}

	return out, nil
}
