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

// smallEstateBlank is the official IL Small Estate Affidavit (Form 3606).
const smallEstateBlank = "../../../docs/forms-phase0/blanks/il_form3606_small_estate.pdf"

// seValues fills the core single-value fields and supplies execution-only
// sentinels so the execution guarantee can be proven on this form too.
func seValues() map[string]string {
	return map[string]string{
		"affiant_name":              "Cylton A. Collymore",
		"affiant_po_address":        "PO Box 100, Chicago, IL 60601",
		"affiant_residence_address": "123 Estate Lane, Chicago, IL 60601",
		"decedent_name":             "Margaret R. Collymore",
		"date_of_death":             "2026-01-15",
		"decedent_residence":        "456 Legacy Road, Evanston, IL 60201",
		"affiant_relationship":      "Son",

		// Execution sentinels — must never render.
		"affiant_signature": "ZZ-SE-AFFIANT-SIG-ZZ",
		"affiant_date":      "ZZ-SE-AFFIANT-DATE-ZZ",
		"notary_public":     "ZZ-SE-NOTARY-ZZ",
	}
}

// TestSmallEstate_SpineGeneralizes proves the same engine fills a second,
// structurally different official IL form with no engine changes: source-hash
// fail-closed, execution fields never stamped, true-flat output.
func TestSmallEstate_SpineGeneralizes(t *testing.T) {
	m := maps.SmallEstateAffidavit3606()

	// Fail-closed on source mismatch.
	bad := maps.SmallEstateAffidavit3606()
	bad.BlankSHA256 = strings.Repeat("0", 64)
	if _, _, err := forms.Fill(smallEstateBlank, bad, seValues()); !errors.Is(err, forms.ErrSourceMismatch) {
		t.Fatalf("expected ErrSourceMismatch, got %v", err)
	}

	out, rep, err := forms.Fill(smallEstateBlank, m, seValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	// Execution fields never routed to Stamped.
	execKeys := map[string]bool{"affiant_signature": true, "affiant_date": true, "notary_public": true}
	for _, k := range rep.Stamped {
		if execKeys[k] {
			t.Fatalf("execution field %q stamped — guarantee violated", k)
		}
	}
	if len(rep.SkippedExecution) != len(execKeys) {
		t.Fatalf("expected %d skipped execution fields, got %v", len(execKeys), rep.SkippedExecution)
	}

	// Output is flat (no AcroForm introduced) and valid.
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

	// Render-layer: core values present, execution sentinels absent.
	if _, err := exec.LookPath("pdftotext"); err != nil {
		t.Skip("decision-layer verified; pdftotext absent, skipping render check")
	}
	text := pdfToText(t, out)
	for _, s := range []string{"Cylton A. Collymore", "Margaret R. Collymore", "Son"} {
		if !strings.Contains(text, s) {
			t.Errorf("expected core value %q in rendered text", s)
		}
	}
	for _, s := range []string{"ZZ-SE-AFFIANT-SIG-ZZ", "ZZ-SE-AFFIANT-DATE-ZZ", "ZZ-SE-NOTARY-ZZ"} {
		if strings.Contains(text, s) {
			t.Errorf("execution sentinel %q rendered — guarantee violated", s)
		}
	}
}
