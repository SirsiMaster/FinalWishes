package forms_test

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
)

// TestGenerateProof writes the filled Property POA and rasterizes the body
// page (3) and execution page (7) to PNG for human visual review. It is gated
// behind GEN_PROOF=1 so it never runs in normal CI; it exists to (re)generate
// the artifacts under docs/forms-phase0/proof/ when coordinates change.
//
//	GEN_PROOF=1 go test ./internal/forms/ -run TestGenerateProof -v
func TestGenerateProof(t *testing.T) {
	if os.Getenv("GEN_PROOF") != "1" {
		t.Skip("set GEN_PROOF=1 to regenerate human-review proof artifacts")
	}

	m := maps.PropertyPOA2011()
	out, rep, err := forms.Fill(blankPath, m, realisticValues())
	if err != nil {
		t.Fatalf("fill: %v", err)
	}
	t.Logf("stamped=%v skippedExecution=%v missingRequired=%v", rep.Stamped, rep.SkippedExecution, rep.MissingRequired)

	proofDir := "../../../docs/forms-phase0/proof"
	if err := os.MkdirAll(proofDir, 0o755); err != nil {
		t.Fatal(err)
	}

	pdfPath := filepath.Join(proofDir, "il_poa_property_2011_filled.pdf")
	if err := os.WriteFile(pdfPath, out, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", pdfPath, len(out))
	renderProofPages(t, proofDir, pdfPath, "il_poa_property_2011", []string{"3", "7"})

	// Small Estate Affidavit (Form 3606): body page 1 + execution page 4.
	seOut, seRep, err := forms.Fill(smallEstateBlank, maps.SmallEstateAffidavit3606(), seValues())
	if err != nil {
		t.Fatalf("fill small estate: %v", err)
	}
	t.Logf("small-estate stamped=%v skippedExecution=%v missingRequired=%v", seRep.Stamped, seRep.SkippedExecution, seRep.MissingRequired)
	sePath := filepath.Join(proofDir, "il_small_estate_3606_filled.pdf")
	if err := os.WriteFile(sePath, seOut, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", sePath, len(seOut))
	renderProofPages(t, proofDir, sePath, "il_small_estate_3606", []string{"1", "4"})

	// Health Care POA (flattened CaringInfo): principal/agent page 11 + execution pages 15, 16.
	hcOut, hcRep, err := forms.Fill(hcpoaBlank, maps.HCPOACaringInfo(), hcpoaValues())
	if err != nil {
		t.Fatalf("fill hcpoa: %v", err)
	}
	t.Logf("hcpoa stamped=%v skippedExecution=%v missingRequired=%v", hcRep.Stamped, hcRep.SkippedExecution, hcRep.MissingRequired)
	hcPath := filepath.Join(proofDir, "il_hcpoa_caringinfo_filled.pdf")
	if err := os.WriteFile(hcPath, hcOut, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", hcPath, len(hcOut))
	renderProofPages(t, proofDir, hcPath, "il_hcpoa_caringinfo", []string{"11", "15", "16"})

	// Living Will (same flattened packet, page 17).
	lwOut, lwRep, err := forms.Fill(livingWillBlank, maps.LivingWillCaringInfo(), livingWillValues())
	if err != nil {
		t.Fatalf("fill living will: %v", err)
	}
	t.Logf("living-will stamped=%v skippedExecution=%v missingRequired=%v", lwRep.Stamped, lwRep.SkippedExecution, lwRep.MissingRequired)
	lwPath := filepath.Join(proofDir, "il_living_will_caringinfo_filled.pdf")
	if err := os.WriteFile(lwPath, lwOut, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", lwPath, len(lwOut))
	renderProofPages(t, proofDir, lwPath, "il_living_will_caringinfo", []string{"17"})

	// Mental Health Treatment Preference Declaration (pages 1-3).
	mhOut, mhRep, err := maps.FillByID("il_mhtpd_2016", map[string]string{
		"declarant_name": "Cylton A. Collymore", "declarant_dob": "1973-04-12",
		"aif_name": "Jane Q. Agent", "aif_address": "456 Proxy Ave, Evanston, IL 60201", "aif_phone": "(312) 555-0142",
		"successor_aif_name": "Sam Backup", "successor_aif_address": "789 Reserve Rd, Oak Park, IL 60302", "successor_aif_phone": "(312) 555-0199",
		"principal_signature": "ZZ-MH-SIG-ZZ", "witness1_signature": "ZZ-MH-W1-ZZ", "witness2_signature": "ZZ-MH-W2-ZZ",
	})
	if err != nil {
		t.Fatalf("fill mhtpd: %v", err)
	}
	t.Logf("mhtpd stamped=%v skippedExecution=%v", mhRep.Stamped, mhRep.SkippedExecution)
	mhPath := filepath.Join(proofDir, "il_mhtpd_2016_filled.pdf")
	if err := os.WriteFile(mhPath, mhOut, 0o644); err != nil {
		t.Fatal(err)
	}
	renderProofPages(t, proofDir, mhPath, "il_mhtpd_2016", []string{"1", "2", "3"})
}

// renderProofPages rasterizes the given pages of pdfPath to 150-DPI PNGs.
func renderProofPages(t *testing.T, proofDir, pdfPath, stem string, pages []string) {
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
