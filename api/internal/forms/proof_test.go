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

	if _, err := exec.LookPath("pdftoppm"); err != nil {
		t.Logf("pdftoppm absent; wrote PDF only")
		return
	}
	// Render the body page (3) and the execution page (7) at 150 DPI.
	for _, page := range []string{"3", "7"} {
		prefix := filepath.Join(proofDir, "il_poa_property_2011_p"+page)
		cmd := exec.Command("pdftoppm", "-png", "-r", "150", "-f", page, "-l", page, pdfPath, prefix)
		if b, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("pdftoppm page %s: %v\n%s", page, err, b)
		}
		t.Logf("rendered page %s -> %s-*.png", page, prefix)
	}
}
