package forms_test

import (
	"os/exec"
	"strings"
	"testing"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// TestMentalHealth_ExecutionNeverStamped proves the execution guarantee on the
// Mental Health Treatment Preference Declaration: identity + attorney-in-fact
// fields fill, but signature/witness sentinels render nowhere.
func TestMentalHealth_ExecutionNeverStamped(t *testing.T) {
	vals := map[string]string{
		"declarant_name": "Cylton A. Collymore",
		"aif_name":       "Jane Q. Agent",

		"principal_signature": "ZZ-MH-SIG-ZZ",
		"witness1_signature":  "ZZ-MH-W1-ZZ",
		"witness2_signature":  "ZZ-MH-W2-ZZ",
	}

	out, rep, err := maps.FillByID("il_mhtpd_2016", vals)
	if err != nil {
		t.Fatalf("FillByID: %v", err)
	}

	execKeys := map[string]bool{"principal_signature": true, "witness1_signature": true, "witness2_signature": true}
	for _, k := range rep.Stamped {
		if execKeys[k] {
			t.Fatalf("execution field %q stamped — guarantee violated", k)
		}
	}
	if len(rep.SkippedExecution) != len(execKeys) {
		t.Fatalf("expected %d skipped execution fields, got %v", len(execKeys), rep.SkippedExecution)
	}

	if _, err := exec.LookPath("pdftotext"); err != nil {
		t.Skip("decision-layer verified; pdftotext absent")
	}
	text := pdfToText(t, out)
	if !strings.Contains(text, "Cylton A. Collymore") {
		t.Error("expected declarant name in rendered text")
	}
	for _, s := range []string{"ZZ-MH-SIG-ZZ", "ZZ-MH-W1-ZZ", "ZZ-MH-W2-ZZ"} {
		if strings.Contains(text, s) {
			t.Errorf("execution sentinel %q rendered — guarantee violated", s)
		}
	}
}
