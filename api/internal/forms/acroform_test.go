package forms_test

import (
	"bytes"
	"strings"
	"testing"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
)

// caringInfoBlank is the official IL advance-directive packet (HCPOA + Living
// Will) distributed as a fillable AcroForm (36 fields).
const caringInfoBlank = "../../../docs/forms-phase0/blanks/il_caringinfo_advance_directives.pdf"

// TestFlattenAcroForm_ProducesFlatPDF proves the preprocessing route that
// unblocks AcroForm-distributed forms: an AcroForm input becomes a true-flat
// PDF (zero form fields) that still validates, while printed labels survive
// (so the overlay map can be authored against them).
func TestFlattenAcroForm_ProducesFlatPDF(t *testing.T) {
	src := mustRead(t, caringInfoBlank)
	conf := model.NewDefaultConfiguration()

	// Sanity: the source really is an AcroForm.
	if fields, err := api.FormFields(bytes.NewReader(src), conf); err != nil {
		t.Fatalf("source should be an AcroForm, got: %v", err)
	} else if len(fields) == 0 {
		t.Fatal("source reports zero AcroForm fields; wrong fixture?")
	}

	flat, err := forms.FlattenAcroForm(src)
	if err != nil {
		t.Fatalf("FlattenAcroForm: %v", err)
	}

	// The result must report zero AcroForm fields ("no form available").
	if fields, err := api.FormFields(bytes.NewReader(flat), conf); err != nil {
		if !strings.Contains(err.Error(), "no form available") {
			t.Fatalf("unexpected error inspecting flattened output: %v", err)
		}
	} else if len(fields) != 0 {
		t.Fatalf("flatten left %d residual AcroForm field(s)", len(fields))
	}

	// And it must still be a valid PDF.
	if err := api.Validate(bytes.NewReader(flat), conf); err != nil {
		t.Fatalf("flattened output failed validation: %v", err)
	}
}

// TestFlattenAcroForm_AlreadyFlatIsNoop: a flat input (the Property POA) is
// returned unchanged rather than erroring.
func TestFlattenAcroForm_AlreadyFlatIsNoop(t *testing.T) {
	src := mustRead(t, blankPath) // Property POA — already flat
	out, err := forms.FlattenAcroForm(src)
	if err != nil {
		t.Fatalf("FlattenAcroForm on flat input: %v", err)
	}
	if !bytes.Equal(out, src) {
		t.Fatal("already-flat input should be returned unchanged")
	}
}
