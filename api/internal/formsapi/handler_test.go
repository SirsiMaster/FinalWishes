package formsapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/sirsi-technologies/finalwishes-api/internal/formsapi"
)

func router() *chi.Mux {
	h := formsapi.NewHandler()
	r := chi.NewRouter()
	r.Get("/api/v1/forms", h.HandleListForms)
	r.Get("/api/v1/forms/{formId}", h.HandleGetForm)
	r.Post("/api/v1/forms/{formId}/fill", h.HandleFillForm)
	return r
}

func TestListForms(t *testing.T) {
	rr := httptest.NewRecorder()
	router().ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/api/v1/forms", nil))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var body struct {
		Forms []struct {
			FormID string `json:"formId"`
			Fields []struct {
				Key       string `json:"key"`
				Execution bool   `json:"execution"`
			} `json:"fields"`
		} `json:"forms"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}

	// Assert the *contract* (required forms are wired and served with fields),
	// not a brittle total count. A bare `len == N` check breaks — and blocks the
	// deploy — every time a form is added, even though adding one is correct
	// (per Codex review of the C5 patch). Membership of the known IDs verifies
	// the real invariant and stays additive-friendly.
	got := make(map[string]int, len(body.Forms))
	for _, f := range body.Forms {
		got[f.FormID] = len(f.Fields)
	}
	required := []string{
		"il_poa_property_2011",
		"il_small_estate_3606",
		"il_hcpoa_caringinfo",
		"il_living_will_caringinfo",
		"il_mhtpd_2016",
		"mn_poa_523_23", // C5 multi-state POA
		"md_poa_17_202", // C5 multi-state POA
	}
	for _, id := range required {
		nFields, ok := got[id]
		if !ok {
			t.Errorf("forms list is missing required form %q (got %v)", id, keysOf(got))
			continue
		}
		if nFields == 0 {
			t.Errorf("form %q is served with zero field schemas", id)
		}
	}
	if len(body.Forms) < len(required) {
		t.Fatalf("expected at least %d forms, got %d", len(required), len(body.Forms))
	}
}

// keysOf returns the keys of a form-id→fieldcount map for diagnostic messages.
func keysOf(m map[string]int) []string {
	ks := make([]string, 0, len(m))
	for k := range m {
		ks = append(ks, k)
	}
	sort.Strings(ks)
	return ks
}

func TestFillForm_ReturnsPDF(t *testing.T) {
	payload := map[string]string{
		"principal_name":      "Cylton A. Collymore",
		"agent_name":          "Jane Q. Agent",
		"principal_signature": "SHOULD-NOT-APPEAR", // execution field
	}
	b, _ := json.Marshal(payload)

	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/forms/il_poa_property_2011/fill", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	router().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/pdf" {
		t.Fatalf("Content-Type = %q, want application/pdf", ct)
	}
	if !bytes.HasPrefix(rr.Body.Bytes(), []byte("%PDF")) {
		t.Fatalf("body is not a PDF (prefix %q)", rr.Body.Bytes()[:min(8, rr.Body.Len())])
	}
	// The execution field we supplied must be reported as skipped.
	if skipped := rr.Header().Get("X-Forms-Skipped-Execution"); !strings.Contains(skipped, "principal_signature") {
		t.Errorf("expected principal_signature in X-Forms-Skipped-Execution, got %q", skipped)
	}
}

func TestFillForm_UnknownReturns404(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/forms/nope/fill", strings.NewReader("{}"))
	req.Header.Set("Content-Type", "application/json")
	router().ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}
