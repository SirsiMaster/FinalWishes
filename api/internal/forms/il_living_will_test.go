package forms_test

import (
	"bytes"
	"strings"
	"testing"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// livingWillBlank is the same flattened CaringInfo packet as the HCPOA; the
// Living Will declaration is page 17.
const livingWillBlank = hcpoaBlank

func livingWillValues() map[string]string {
	return map[string]string{
		"declarant_name":      "Cylton A. Collymore",
		"declarant_residence": "Chicago, Cook County, Illinois",

		// Execution sentinels — must never render.
		"declaration_day":        "ZZ-LW-DAY-ZZ",
		"declaration_month_year": "ZZ-LW-MONTHYEAR-ZZ",
		"declarant_signature":    "ZZ-LW-SIG-ZZ",
		"witness1_signature":     "ZZ-LW-WIT1-ZZ",
		"witness2_signature":     "ZZ-LW-WIT2-ZZ",
	}
}

// TestLivingWill_SameBlankNewMap proves a second form (Living Will) on the SAME
// pinned flat blank as the HCPOA — only the CoordinateMap differs.
func TestLivingWill_SameBlankNewMap(t *testing.T) {
	m := maps.LivingWillCaringInfo()

	out, rep, err := forms.Fill(livingWillBlank, m, livingWillValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	execKeys := map[string]bool{
		"declaration_day": true, "declaration_month_year": true,
		"declarant_signature": true, "witness1_signature": true, "witness2_signature": true,
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
}
