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

// mnPOABlank is the official Minnesota Attorney General Statutory Short Form
// Power of Attorney (Minn. Stat. § 523.23), flat (no AcroForm), SHA-pinned.
const mnPOABlank = "../../../docs/forms-phase0/blanks/mn_poa_523_23.pdf"

// mnPOAExecKeys are the execution-block field keys: the principal's
// signing-date and signature, the notary acknowledgment, and the
// attorney(s)-in-fact specimen/acknowledgment signatures. None of these may
// ever be stamped — the form is wet-signed and notarized.
var mnPOAExecKeys = map[string]bool{
	"execution_day": true, "execution_month": true, "execution_year": true,
	"principal_signature": true,
	"notary_day":          true, "notary_month": true, "notary_year": true,
	"notary_principal_name": true, "notary_signature": true,
	"aif_acknowledgment_signature": true, "aif_specimen_signature": true,
}

func mnPOAValues() map[string]string {
	return map[string]string{
		// Principal (page 1).
		"principal_name":          "Cylton A. Collymore",
		"principal_address_line1": "123 Estate Lane",
		"principal_address_line2": "Minneapolis, MN 55401",

		// Attorney-in-fact (page 1).
		"aif_name":          "Jane Q. Agent",
		"aif_address_line1": "456 Proxy Avenue",
		"aif_address_line2": "Saint Paul, MN 55101",

		// First successor attorney-in-fact (page 1).
		"successor_name":          "Sam Backup",
		"successor_address_line1": "789 Reserve Road",
		"successor_address_line2": "Duluth, MN 55802",

		// Joint/several + expiration (page 1).
		"agents_several":  "x",
		"expiration_date": "December 31, 2030",

		// Powers (page 2): grant (N) — all powers.
		"power_n": "x",

		// Execution sentinels — must never render.
		"execution_day":                "ZZ-MN-EXEC-DAY-ZZ",
		"execution_month":              "ZZ-MN-EXEC-MONTH-ZZ",
		"execution_year":               "ZZ-MN-EXEC-YEAR-ZZ",
		"principal_signature":          "ZZ-MN-PRINCIPAL-SIG-ZZ",
		"notary_day":                   "ZZ-MN-NOTARY-DAY-ZZ",
		"notary_month":                 "ZZ-MN-NOTARY-MONTH-ZZ",
		"notary_year":                  "ZZ-MN-NOTARY-YEAR-ZZ",
		"notary_principal_name":        "ZZ-MN-NOTARY-NAME-ZZ",
		"notary_signature":             "ZZ-MN-NOTARY-SIG-ZZ",
		"aif_acknowledgment_signature": "ZZ-MN-AIF-ACK-ZZ",
		"aif_specimen_signature":       "ZZ-MN-AIF-SPECIMEN-ZZ",
	}
}

// TestMNStatutoryPOA_Fills proves the overlay route end to end on the Minnesota
// Statutory Short Form POA: SHA fails closed, the blank fills, execution fields
// never stamp, output stays flat and valid, and core values render while
// execution sentinels do not.
func TestMNStatutoryPOA_Fills(t *testing.T) {
	m := maps.MNStatutoryPOA()

	// SHA fail-closed.
	bad := maps.MNStatutoryPOA()
	bad.BlankSHA256 = strings.Repeat("0", 64)
	if _, _, err := forms.Fill(mnPOABlank, bad, mnPOAValues()); !errors.Is(err, forms.ErrSourceMismatch) {
		t.Fatalf("expected ErrSourceMismatch, got %v", err)
	}

	out, rep, err := forms.Fill(mnPOABlank, m, mnPOAValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}

	// No execution field may appear in Stamped.
	for _, k := range rep.Stamped {
		if mnPOAExecKeys[k] {
			t.Fatalf("execution field %q stamped — guarantee violated", k)
		}
	}
	// Every execution key had a value supplied, so all must be skipped.
	if len(rep.SkippedExecution) != len(mnPOAExecKeys) {
		t.Fatalf("expected %d skipped execution fields, got %d: %v", len(mnPOAExecKeys), len(rep.SkippedExecution), rep.SkippedExecution)
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
	for _, s := range []string{"Cylton A. Collymore", "Minneapolis, MN 55401", "Jane Q. Agent", "Sam Backup"} {
		if !strings.Contains(text, s) {
			t.Errorf("expected core value %q in rendered text", s)
		}
	}
	for _, s := range []string{
		"ZZ-MN-EXEC-DAY-ZZ", "ZZ-MN-EXEC-MONTH-ZZ", "ZZ-MN-EXEC-YEAR-ZZ",
		"ZZ-MN-PRINCIPAL-SIG-ZZ", "ZZ-MN-NOTARY-DAY-ZZ", "ZZ-MN-NOTARY-MONTH-ZZ",
		"ZZ-MN-NOTARY-YEAR-ZZ", "ZZ-MN-NOTARY-NAME-ZZ", "ZZ-MN-NOTARY-SIG-ZZ",
		"ZZ-MN-AIF-ACK-ZZ", "ZZ-MN-AIF-SPECIMEN-ZZ",
	} {
		if strings.Contains(text, s) {
			t.Errorf("execution sentinel %q rendered — guarantee violated", s)
		}
	}
}

// TestGenerateMNProof writes the filled MN POA and rasterizes the body pages
// (1 principal/agent, 2 powers) and the execution page (3) to PNG for human
// visual review. Gated behind GEN_PROOF=1 so it never runs in normal CI.
//
//	GEN_PROOF=1 go test ./internal/forms/ -run TestGenerateMNProof -v
func TestGenerateMNProof(t *testing.T) {
	if os.Getenv("GEN_PROOF") != "1" {
		t.Skip("set GEN_PROOF=1 to regenerate human-review proof artifacts")
	}

	out, rep, err := forms.Fill(mnPOABlank, maps.MNStatutoryPOA(), mnPOAValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}
	t.Logf("stamped=%v skippedExecution=%v missingRequired=%v", rep.Stamped, rep.SkippedExecution, rep.MissingRequired)

	proofDir := "../../../docs/forms-phase0/proof"
	if err := os.MkdirAll(proofDir, 0o755); err != nil {
		t.Fatal(err)
	}
	pdfPath := filepath.Join(proofDir, "mn_poa_523_23_filled.pdf")
	if err := os.WriteFile(pdfPath, out, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", pdfPath, len(out))
	mnRenderProofPages(t, proofDir, pdfPath, "mn_poa_523_23", []string{"1", "2", "3"})
}

// mnRenderProofPages rasterizes the given pages of pdfPath to 150-DPI PNGs.
// Defined locally so this test does not depend on proof_test.go's helper.
func mnRenderProofPages(t *testing.T, proofDir, pdfPath, stem string, pages []string) {
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
