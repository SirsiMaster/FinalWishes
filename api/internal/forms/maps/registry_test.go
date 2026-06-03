package maps_test

import (
	"errors"
	"testing"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// TestFillByID_AllFormsFromEmbeddedBlanks fills every registered form from the
// embedded blank set, proving the SHA pins match the embedded bytes and the
// engine reaches each form by ID with no disk access.
func TestFillByID_AllFormsFromEmbeddedBlanks(t *testing.T) {
	for _, id := range maps.SupportedFormIDs() {
		id := id
		t.Run(id, func(t *testing.T) {
			out, rep, err := maps.FillByID(id, map[string]string{
				// A harmless value for whichever identity field exists; unknown
				// keys are ignored, so one map covers all forms.
				"principal_name": "Test Principal",
				"affiant_name":   "Test Affiant",
				"declarant_name": "Test Declarant",
			})
			if err != nil {
				t.Fatalf("FillByID(%q): %v", id, err)
			}
			if len(out) == 0 {
				t.Fatalf("FillByID(%q): empty output", id)
			}
			if rep.FormID != id {
				t.Errorf("report FormID = %q, want %q", rep.FormID, id)
			}
		})
	}
}

func TestFillByID_UnknownForm(t *testing.T) {
	_, _, err := maps.FillByID("not_a_form", nil)
	var unknown maps.ErrUnknownForm
	if !errors.As(err, &unknown) {
		t.Fatalf("expected ErrUnknownForm, got %v", err)
	}
}

func TestSupportedFormIDs_Stable(t *testing.T) {
	want := []string{
		"il_hcpoa_caringinfo",
		"il_living_will_caringinfo",
		"il_mhtpd_2016",
		"il_poa_property_2011",
		"il_small_estate_3606",
		"md_poa_17_202",
		"mn_poa_523_23",
	}
	ids := maps.SupportedFormIDs() // returns sorted
	if len(ids) != len(want) {
		t.Fatalf("expected %d supported forms, got %d: %v", len(want), len(ids), ids)
	}
	for i, id := range want {
		if ids[i] != id {
			t.Fatalf("supported form IDs drifted: got %v, want %v", ids, want)
		}
	}
}
