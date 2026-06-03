package forms_test

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// mdPOABlank is the official General Assembly of Maryland publication of the
// § 17-202 statutory form (flat, no AcroForm), SHA-pinned in the map.
const mdPOABlank = "../../../docs/forms-phase0/blanks/md_poa_17_202.pdf"

func mdPOAValues() map[string]string {
	return map[string]string{
		// Body (stamped) values.
		"principal_name":              "Cylton A. Collymore",
		"agent_name":                  "Jane Q. Agent",
		"agent_address":               "456 Proxy Avenue, Baltimore, MD 21201",
		"agent_phone":                 "(410) 555-0142",
		"coagent_name":                "Morgan P. Coagent",
		"successor_agent_name":        "Sam Backup",
		"successor_agent_address":     "789 Reserve Road, Annapolis, MD 21401",
		"successor_agent_phone":       "(410) 555-0199",
		"second_successor_agent_name": "Riley Second",
		"termination_date":            "December 31",

		// Execution sentinels — must NEVER render.
		"principal_signature":       "ZZ-MD-PRINCIPAL-SIG-ZZ",
		"principal_sign_date":       "ZZ-MD-PRINCIPAL-DATE-ZZ",
		"principal_name_printed":    "ZZ-MD-PRINCIPAL-PRINT-ZZ",
		"principal_address_exec":    "ZZ-MD-YOUR-ADDR-ZZ",
		"principal_telephone_exec":  "ZZ-MD-YOUR-TEL-ZZ",
		"notary_county":             "ZZ-MD-NOTARY-COUNTY-ZZ",
		"notary_date":               "ZZ-MD-NOTARY-DATE-ZZ",
		"notary_principal_name":     "ZZ-MD-NOTARY-PRIN-ZZ",
		"notary_signature":          "ZZ-MD-NOTARY-SIG-ZZ",
		"notary_commission_expires": "ZZ-MD-NOTARY-COMM-ZZ",
		"witness1_signature":        "ZZ-MD-W1-SIG-ZZ",
		"witness1_name_printed":     "ZZ-MD-W1-NAME-ZZ",
		"witness1_address":          "ZZ-MD-W1-ADDR-ZZ",
		"witness1_telephone":        "ZZ-MD-W1-TEL-ZZ",
		"witness2_signature":        "ZZ-MD-W2-SIG-ZZ",
		"witness2_name_printed":     "ZZ-MD-W2-NAME-ZZ",
		"witness2_address":          "ZZ-MD-W2-ADDR-ZZ",
		"witness2_telephone":        "ZZ-MD-W2-TEL-ZZ",
	}
}

// mdExecutionKeys is every Execution=true field on the MD POA form. The engine
// must skip all of them even when a value is supplied.
func mdExecutionKeys() map[string]bool {
	return map[string]bool{
		"principal_signature":       true,
		"principal_sign_date":       true,
		"principal_name_printed":    true,
		"principal_address_exec":    true,
		"principal_telephone_exec":  true,
		"notary_county":             true,
		"notary_date":               true,
		"notary_principal_name":     true,
		"notary_signature":          true,
		"notary_commission_expires": true,
		"witness1_signature":        true,
		"witness1_name_printed":     true,
		"witness1_address":          true,
		"witness1_telephone":        true,
		"witness2_signature":        true,
		"witness2_name_printed":     true,
		"witness2_address":          true,
		"witness2_telephone":        true,
	}
}

// TestMDStatutoryPOA_Fills proves the Maryland § 17-202 statutory form fills
// end to end: source fail-closed on SHA mismatch, body values stamp, the entire
// execution block is skipped (never stamped), output stays flat and valid, and
// the rendered text carries the body values while no execution sentinel leaks.
func TestMDStatutoryPOA_Fills(t *testing.T) {
	m := maps.MDStatutoryPOA()

	// Fail closed on source-integrity mismatch.
	bad := maps.MDStatutoryPOA()
	bad.BlankSHA256 = strings.Repeat("0", 64)
	if _, _, err := forms.Fill(mdPOABlank, bad, mdPOAValues()); !errors.Is(err, forms.ErrSourceMismatch) {
		t.Fatalf("expected ErrSourceMismatch, got %v", err)
	}

	out, rep, err := forms.Fill(mdPOABlank, m, mdPOAValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	// No execution field may ever appear in the stamped set.
	execKeys := mdExecutionKeys()
	for _, k := range rep.Stamped {
		if execKeys[k] {
			t.Fatalf("execution field %q stamped — guarantee violated", k)
		}
	}

	// Every execution key was supplied a value, so SkippedExecution must list
	// exactly that many keys.
	if len(rep.SkippedExecution) != len(execKeys) {
		t.Fatalf("expected %d skipped execution fields, got %d: %v", len(execKeys), len(rep.SkippedExecution), rep.SkippedExecution)
	}

	// True-flatten assertion: the overlay must not introduce AcroForm fields.
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
	for _, s := range []string{
		"Cylton A. Collymore", "Jane Q. Agent", "(410) 555-0142",
		"Sam Backup", "(410) 555-0199", "Riley Second",
	} {
		if !strings.Contains(text, s) {
			t.Errorf("expected core value %q in rendered text", s)
		}
	}
	for _, s := range []string{
		"ZZ-MD-PRINCIPAL-SIG-ZZ", "ZZ-MD-PRINCIPAL-DATE-ZZ", "ZZ-MD-PRINCIPAL-PRINT-ZZ",
		"ZZ-MD-YOUR-ADDR-ZZ", "ZZ-MD-YOUR-TEL-ZZ",
		"ZZ-MD-NOTARY-COUNTY-ZZ", "ZZ-MD-NOTARY-DATE-ZZ", "ZZ-MD-NOTARY-PRIN-ZZ",
		"ZZ-MD-NOTARY-SIG-ZZ", "ZZ-MD-NOTARY-COMM-ZZ",
		"ZZ-MD-W1-SIG-ZZ", "ZZ-MD-W1-NAME-ZZ", "ZZ-MD-W1-ADDR-ZZ", "ZZ-MD-W1-TEL-ZZ",
		"ZZ-MD-W2-SIG-ZZ", "ZZ-MD-W2-NAME-ZZ", "ZZ-MD-W2-ADDR-ZZ", "ZZ-MD-W2-TEL-ZZ",
	} {
		if strings.Contains(text, s) {
			t.Errorf("execution sentinel %q rendered — guarantee violated", s)
		}
	}
}

// TestGenerateMDProof writes the filled Maryland POA and rasterizes the agent
// page (2), successor page (3), and an execution page (9) to PNG for human
// visual review. Gated behind GEN_PROOF=1 so it never runs in normal CI.
//
//	GEN_PROOF=1 go test ./internal/forms/ -run TestGenerateMDProof -v
func TestGenerateMDProof(t *testing.T) {
	if os.Getenv("GEN_PROOF") != "1" {
		t.Skip("set GEN_PROOF=1 to regenerate human-review proof artifacts")
	}

	m := maps.MDStatutoryPOA()
	out, rep, err := forms.Fill(mdPOABlank, m, mdPOAValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}
	t.Logf("stamped=%v skippedExecution=%v missingRequired=%v", rep.Stamped, rep.SkippedExecution, rep.MissingRequired)

	proofDir := "../../../docs/forms-phase0/proof"
	if err := os.MkdirAll(proofDir, 0o755); err != nil {
		t.Fatal(err)
	}

	pdfPath := filepath.Join(proofDir, "md_poa_17_202_filled.pdf")
	if err := os.WriteFile(pdfPath, out, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", pdfPath, len(out))
	renderMDProofPages(t, proofDir, pdfPath, "md_poa_17_202", []string{"2", "3", "9"})
}

// renderMDProofPages rasterizes the given pages of pdfPath to 150-DPI PNGs.
func renderMDProofPages(t *testing.T, proofDir, pdfPath, stem string, pages []string) {
	t.Helper()
	if _, err := exec.LookPath("pdftoppm"); err != nil {
		t.Logf("pdftoppm absent; wrote PDF only for %s", stem)
		return
	}
	for _, page := range pages {
		prefix := filepath.Join(proofDir, stem+"_p"+page)
		cmd := exec.Command("pdftoppm", "-png", "-r", "150", "-f", page, "-l", page, pdfPath, prefix)
		if b, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("pdftoppm %s page %s: %v\n%s", stem, page, err, b)
		}
		t.Logf("rendered %s page %s -> %s-*.png", stem, page, prefix)
	}
}
