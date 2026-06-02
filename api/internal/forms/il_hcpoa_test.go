package forms_test

import (
	"bytes"
	"errors"
	"os/exec"
	"strings"
	"testing"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// hcpoaBlank is the flattened CaringInfo IL advance-directive packet (the HCPOA
// form, derived from the AcroForm source via FlattenAcroForm and SHA-pinned).
const hcpoaBlank = "../../../docs/forms-phase0/blanks/il_hcpoa_caringinfo_flat.pdf"

func hcpoaValues() map[string]string {
	return map[string]string{
		"principal_name":    "Cylton A. Collymore",
		"principal_address": "123 Estate Lane, Chicago, IL 60601",
		"agent_name":        "Jane Q. Agent",
		"agent_address":     "456 Proxy Avenue, Evanston, IL 60201",
		"agent_phone":       "(312) 555-0142",

		// Execution sentinels — must never render.
		"principal_signature":  "ZZ-HC-PRINCIPAL-SIG-ZZ",
		"principal_date":       "ZZ-HC-PRINCIPAL-DATE-ZZ",
		"witness_signature":    "ZZ-HC-WITNESS-SIG-ZZ",
		"witness_printed_name": "ZZ-HC-WITNESS-NAME-ZZ",
	}
}

// TestHCPOA_FlattenedSourceFills proves the AcroForm→flat→overlay route end to
// end on the priority-1 Health Care POA: the flattened blank fills, execution
// fields never stamp, output stays flat and valid.
func TestHCPOA_FlattenedSourceFills(t *testing.T) {
	m := maps.HCPOACaringInfo()

	bad := maps.HCPOACaringInfo()
	bad.BlankSHA256 = strings.Repeat("0", 64)
	if _, _, err := forms.Fill(hcpoaBlank, bad, hcpoaValues()); !errors.Is(err, forms.ErrSourceMismatch) {
		t.Fatalf("expected ErrSourceMismatch, got %v", err)
	}

	out, rep, err := forms.Fill(hcpoaBlank, m, hcpoaValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	execKeys := map[string]bool{
		"principal_signature": true, "principal_date": true,
		"witness_signature": true, "witness_printed_name": true,
	}
	for _, k := range rep.Stamped {
		if execKeys[k] {
			t.Fatalf("execution field %q stamped — guarantee violated", k)
		}
	}
	if len(rep.SkippedExecution) != len(execKeys) {
		t.Fatalf("expected %d skipped execution fields, got %v", len(execKeys), rep.SkippedExecution)
	}

	conf := model.NewDefaultConfiguration()
	if fields, ferr := api.FormFields(bytes.NewReader(out), conf); ferr != nil {
		if !strings.Contains(ferr.Error(), "no form available") {
			t.Fatalf("inspect form fields: %v", ferr)
		}
	} else if len(fields) != 0 {
		t.Fatalf("output not flat: %d field(s)", len(fields))
	}
	if err := api.Validate(bytes.NewReader(out), conf); err != nil {
		t.Fatalf("output failed validation: %v", err)
	}

	if _, err := exec.LookPath("pdftotext"); err != nil {
		t.Skip("decision-layer verified; pdftotext absent, skipping render check")
	}
	text := pdfToText(t, out)
	for _, s := range []string{"Cylton A. Collymore", "Jane Q. Agent", "(312) 555-0142"} {
		if !strings.Contains(text, s) {
			t.Errorf("expected core value %q in rendered text", s)
		}
	}
	for _, s := range []string{"ZZ-HC-PRINCIPAL-SIG-ZZ", "ZZ-HC-PRINCIPAL-DATE-ZZ", "ZZ-HC-WITNESS-SIG-ZZ", "ZZ-HC-WITNESS-NAME-ZZ"} {
		if strings.Contains(text, s) {
			t.Errorf("execution sentinel %q rendered — guarantee violated", s)
		}
	}
}
