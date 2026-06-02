package forms_test

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"strings"
	"testing"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// blankPath is the official IL Property POA blank, relative to this package.
const blankPath = "../../../docs/forms-phase0/blanks/il_poa_property_2011.pdf"

// realisticValues fills the non-execution fields AND supplies execution-field
// values, so tests can prove the execution values are ignored.
func realisticValues() map[string]string {
	return map[string]string{
		"principal_name":          "Cylton A. Collymore",
		"principal_address_line1": "123 Estate Lane",
		"principal_address_line2": "Chicago, IL 60601",
		"agent_name":              "Jane Q. Agent",
		"agent_address_line1":     "456 Proxy Avenue",
		"agent_address_line2":     "Evanston, IL 60201",

		// Execution data deliberately supplied — the engine MUST ignore it.
		"principal_signature": "Cylton A. Collymore",
		"principal_date":      "2026-06-02",
		"witness_signature":   "Walter Witness",
		"witness_date":        "2026-06-02",
	}
}

// TestFailsClosedOnSourceMismatch: a blank whose bytes do not match the pinned
// digest is refused before any stamping (guardrail: SHA256 source manifest).
func TestFailsClosedOnSourceMismatch(t *testing.T) {
	m := maps.PropertyPOA2011()
	m.BlankSHA256 = strings.Repeat("0", 64) // wrong digest

	_, _, err := forms.Fill(blankPath, m, realisticValues())
	if err == nil {
		t.Fatal("expected ErrSourceMismatch, got nil")
	}
	if !errors.Is(err, forms.ErrSourceMismatch) {
		t.Fatalf("expected ErrSourceMismatch, got: %v", err)
	}
}

// TestExecutionFieldsNeverStamped is the central guarantee. pdfcpu output is
// not byte-deterministic (it embeds a fresh document ID per write), so the
// guarantee is proven two ways, neither relying on byte equality:
//
//  1. Decision layer (always): no execution key is ever routed to Report.Stamped,
//     and every supplied execution key lands in Report.SkippedExecution.
//  2. Render layer (when pdftotext is present): unique execution-only sentinels
//     appear NOWHERE in the rasterized text of the output.
func TestExecutionFieldsNeverStamped(t *testing.T) {
	m := maps.PropertyPOA2011()

	// Distinctive sentinels for every execution field, chosen so they cannot
	// collide with any non-execution value rendered on the form.
	sentinels := map[string]string{
		"principal_signature": "ZZ-EXEC-PRINCIPAL-SIG-ZZ",
		"principal_date":      "ZZ-EXEC-PRINCIPAL-DATE-ZZ",
		"witness_signature":   "ZZ-EXEC-WITNESS-SIG-ZZ",
		"witness_date":        "ZZ-EXEC-WITNESS-DATE-ZZ",
	}
	vals := realisticValues()
	for k, v := range sentinels {
		vals[k] = v
	}

	out, rep, err := forms.Fill(blankPath, m, vals)
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	// (1) Decision layer — fully deterministic.
	for _, k := range rep.Stamped {
		if _, isExec := sentinels[k]; isExec {
			t.Fatalf("execution field %q was routed to Stamped — guarantee violated", k)
		}
	}
	if len(rep.SkippedExecution) != len(sentinels) {
		t.Fatalf("expected %d skipped execution fields, got %v", len(sentinels), rep.SkippedExecution)
	}
	for _, k := range rep.SkippedExecution {
		if _, ok := sentinels[k]; !ok {
			t.Errorf("unexpected skipped-execution key: %s", k)
		}
	}

	// (2) Render layer — proves the sentinels are physically absent from the page.
	if _, err := exec.LookPath("pdftotext"); err != nil {
		t.Skip("decision-layer guarantee verified; pdftotext absent, skipping render-layer check")
	}
	text := pdfToText(t, out)
	for k, s := range sentinels {
		if strings.Contains(text, s) {
			t.Errorf("execution value for %q rendered onto the form (sentinel %q found)", k, s)
		}
	}
}

// TestNonExecutionStampingChangesOutput: real principal/agent values must
// actually land (output differs from the untouched blank) and be reported.
func TestNonExecutionStampingChangesOutput(t *testing.T) {
	m := maps.PropertyPOA2011()

	out, rep, err := forms.Fill(blankPath, m, realisticValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	blank := mustRead(t, blankPath)
	if bytes.Equal(out, blank) {
		t.Fatal("output identical to blank — no values were stamped")
	}

	wantStamped := []string{
		"principal_name", "principal_address_line1", "principal_address_line2",
		"agent_name", "agent_address_line1", "agent_address_line2",
	}
	if len(rep.Stamped) != len(wantStamped) {
		t.Fatalf("expected %d stamped fields, got %v", len(wantStamped), rep.Stamped)
	}
}

// TestOutputIsFlat: the overlay must never introduce AcroForm fields, and the
// result must validate as a well-formed PDF (TRUE FLATTEN requirement).
func TestOutputIsFlat(t *testing.T) {
	m := maps.PropertyPOA2011()

	out, _, err := forms.Fill(blankPath, m, realisticValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	conf := model.NewDefaultConfiguration()

	// A flat PDF has no AcroForm, so FormFields reports "no form available" —
	// that is the pass condition. A nil error with a non-empty field set means
	// the overlay introduced form fields and is a failure.
	fields, err := api.FormFields(bytes.NewReader(out), conf)
	switch {
	case err != nil && strings.Contains(err.Error(), "no form available"):
		// flat — good
	case err != nil:
		t.Fatalf("inspect form fields: %v", err)
	case len(fields) != 0:
		t.Fatalf("output is not flat: %d AcroForm field(s) present", len(fields))
	}

	if err := api.Validate(bytes.NewReader(out), conf); err != nil {
		t.Fatalf("output failed PDF validation: %v", err)
	}
}

// TestMissingRequiredReported: omitting a required, non-execution field is
// reported (engine still returns a partial PDF for review).
func TestMissingRequiredReported(t *testing.T) {
	m := maps.PropertyPOA2011()

	vals := realisticValues()
	delete(vals, "agent_name")

	_, rep, err := forms.Fill(blankPath, m, vals)
	if err != nil {
		t.Fatalf("fill: %v", err)
	}
	if !contains(rep.MissingRequired, "agent_name") {
		t.Fatalf("expected agent_name in MissingRequired, got %v", rep.MissingRequired)
	}
}

// TestRenderedTextGolden is a stronger, render-level check: it rasterizes the
// output to text (poppler) and asserts the principal/agent values are present
// while NO execution value (signature/date) appears anywhere. Skipped when
// pdftotext is unavailable so core guarantees stay dependency-free.
func TestRenderedTextGolden(t *testing.T) {
	if _, err := exec.LookPath("pdftotext"); err != nil {
		t.Skip("pdftotext not installed; skipping render-level golden")
	}

	m := maps.PropertyPOA2011()
	out, _, err := forms.Fill(blankPath, m, realisticValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	text := pdfToText(t, out)

	mustContain := []string{"Cylton A. Collymore", "Jane Q. Agent", "123 Estate Lane", "456 Proxy Avenue"}
	for _, s := range mustContain {
		if !strings.Contains(text, s) {
			t.Errorf("expected stamped value %q in rendered text, not found", s)
		}
	}

	// Witness name is execution-only and must never render. (Principal name and
	// date strings overlap non-execution data, so we assert on the witness.)
	if strings.Contains(text, "Walter Witness") {
		t.Error("execution value \"Walter Witness\" rendered onto the form — execution guarantee violated")
	}
}

// --- helpers ---

func pdfToText(t *testing.T, pdf []byte) string {
	t.Helper()
	cmd := exec.Command("pdftotext", "-layout", "-", "-")
	cmd.Stdin = bytes.NewReader(pdf)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	if err := cmd.Run(); err != nil {
		t.Fatalf("pdftotext: %v", err)
	}
	return stdout.String()
}

func mustRead(t *testing.T, path string) []byte {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return b
}

func contains(ss []string, want string) bool {
	for _, s := range ss {
		if s == want {
			return true
		}
	}
	return false
}
