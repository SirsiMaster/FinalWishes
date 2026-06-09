package vault

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// --- Test Infrastructure ---

// setupRouter creates a chi router with vault routes and a mock auth middleware.
// When X-Test-UID header is present, the request is authenticated as that user.
// When absent, the request is unauthenticated (handlers return 401).
func setupRouter(h *Handler) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/v1/vault", func(r chi.Router) {
		r.Use(testAuthMiddleware)
		r.Post("/user-pii", h.HandleStoreUserPII)
		r.Get("/user-pii", h.HandleRetrieveUserPII)
		r.Post("/asset-pii", h.HandleStoreAssetPII)
		r.Get("/asset-pii", h.HandleRetrieveAssetPII)
		r.Post("/heir-pii", h.HandleStoreHeirPII)
		r.Get("/heir-pii", h.HandleRetrieveHeirPII)
	})
	return r
}

// testAuthMiddleware reads X-Test-UID and injects it as the authenticated user.
func testAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := r.Header.Get("X-Test-UID")
		if uid != "" {
			ctx := auth.InjectUserIDForTest(r.Context(), uid)
			r = r.WithContext(ctx)
		}
		next.ServeHTTP(w, r)
	})
}

// authReq creates a request with the X-Test-UID header set.
func authReq(method, url string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req, _ = http.NewRequest(method, url, bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, url, nil)
	}
	req.Header.Set("X-Test-UID", "test-user-1")
	return req
}

// noAuthReq creates a request without authentication.
func noAuthReq(method, url string, body string) *http.Request {
	var req *http.Request
	if body != "" {
		req, _ = http.NewRequest(method, url, bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, url, nil)
	}
	return req
}

// assertStatus checks the HTTP status code.
func assertStatus(t *testing.T, resp *http.Response, expected int) {
	t.Helper()
	if resp.StatusCode != expected {
		t.Errorf("expected status %d, got %d", expected, resp.StatusCode)
	}
}

// assertBodyContains checks that the response body contains the given string.
func assertBodyContains(t *testing.T, resp *http.Response, substr string) {
	t.Helper()
	buf := new(bytes.Buffer)
	buf.ReadFrom(resp.Body)
	if !strings.Contains(buf.String(), substr) {
		t.Errorf("expected body to contain %q, got %s", substr, buf.String())
	}
}

// =========================================================
// User PII Endpoint Tests
// =========================================================

func TestStoreUserPII_AuthFailure(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(noAuthReq(http.MethodPost, ts.URL+"/api/v1/vault/user-pii", `{"estate_id":"e1","ssn":"123"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestStoreUserPII_MissingEstateID(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/user-pii", `{"ssn":"123-45-6789"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusBadRequest)
	assertBodyContains(t, resp, "estate_id is required")
}

func TestStoreUserPII_NoPIIFields(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/user-pii", `{"estate_id":"e1"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusBadRequest)
	assertBodyContains(t, resp, "At least one PII field")
}

func TestStoreUserPII_InvalidJSON(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/user-pii", `{bad json`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusBadRequest)
	assertBodyContains(t, resp, "Invalid request body")
}

func TestRetrieveUserPII_AuthFailure(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(noAuthReq(http.MethodGet, ts.URL+"/api/v1/vault/user-pii?estate_id=e1", ""))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestRetrieveUserPII_MissingEstateID(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(authReq(http.MethodGet, ts.URL+"/api/v1/vault/user-pii", ""))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusBadRequest)
	assertBodyContains(t, resp, "estate_id query parameter")
}

// =========================================================
// Asset PII Endpoint Tests
// =========================================================

func TestStoreAssetPII_AuthFailure(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(noAuthReq(http.MethodPost, ts.URL+"/api/v1/vault/asset-pii", `{"asset_id":"a1","estate_id":"e1","account_number":"1234"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestStoreAssetPII_MissingIDs(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	tests := []struct {
		name string
		body string
	}{
		{"missing_both", `{"account_number":"1234"}`},
		{"missing_asset_id", `{"estate_id":"e1","account_number":"1234"}`},
		{"missing_estate_id", `{"asset_id":"a1","account_number":"1234"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/asset-pii", tt.body))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			assertStatus(t, resp, http.StatusBadRequest)
		})
	}
}

// C1 regression: the asset-PII store MUST deny a caller whose estate membership
// cannot be verified (here, a nil Firestore client = fail-closed). This authz gate
// runs BEFORE body-completeness validation, so a well-formed request with valid
// ids but no proven estate access is rejected 403 — never processed. Without the
// gate this returned 400 (PII required), meaning the handler was evaluating
// unauthorized callers' payloads against arbitrary estate_ids.
func TestStoreAssetPII_DeniesWithoutEstateAccess(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/asset-pii", `{"asset_id":"a1","estate_id":"e1"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusForbidden)
	assertBodyContains(t, resp, "do not have access")
}

func TestRetrieveAssetPII_AuthFailure(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(noAuthReq(http.MethodGet, ts.URL+"/api/v1/vault/asset-pii?estate_id=e1&asset_id=a1", ""))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestRetrieveAssetPII_MissingParams(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	tests := []struct {
		name  string
		query string
	}{
		{"missing_both", ""},
		{"missing_asset_id", "?estate_id=e1"},
		{"missing_estate_id", "?asset_id=a1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.DefaultClient.Do(authReq(http.MethodGet, ts.URL+"/api/v1/vault/asset-pii"+tt.query, ""))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			assertStatus(t, resp, http.StatusBadRequest)
		})
	}
}

// =========================================================
// Heir PII Endpoint Tests
// =========================================================

func TestStoreHeirPII_AuthFailure(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(noAuthReq(http.MethodPost, ts.URL+"/api/v1/vault/heir-pii", `{"heir_id":"h1","estate_id":"e1","ssn":"111"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestStoreHeirPII_MissingIDs(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	tests := []struct {
		name string
		body string
	}{
		{"missing_both", `{"ssn":"111-22-3333"}`},
		{"missing_heir_id", `{"estate_id":"e1","ssn":"111-22-3333"}`},
		{"missing_estate_id", `{"heir_id":"h1","ssn":"111-22-3333"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/heir-pii", tt.body))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			assertStatus(t, resp, http.StatusBadRequest)
		})
	}
}

// C1 regression (heir PII / SSN+DOB): same fail-closed authz gate as the asset path.
func TestStoreHeirPII_DeniesWithoutEstateAccess(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(authReq(http.MethodPost, ts.URL+"/api/v1/vault/heir-pii", `{"heir_id":"h1","estate_id":"e1"}`))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusForbidden)
	assertBodyContains(t, resp, "do not have access")
}

func TestRetrieveHeirPII_AuthFailure(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	resp, err := http.DefaultClient.Do(noAuthReq(http.MethodGet, ts.URL+"/api/v1/vault/heir-pii?estate_id=e1&heir_id=h1", ""))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestRetrieveHeirPII_MissingParams(t *testing.T) {
	ts := httptest.NewServer(setupRouter(&Handler{repo: nil}))
	defer ts.Close()

	tests := []struct {
		name  string
		query string
	}{
		{"missing_both", ""},
		{"missing_heir_id", "?estate_id=e1"},
		{"missing_estate_id", "?heir_id=h1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := http.DefaultClient.Do(authReq(http.MethodGet, ts.URL+"/api/v1/vault/heir-pii"+tt.query, ""))
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()
			assertStatus(t, resp, http.StatusBadRequest)
		})
	}
}

// =========================================================
// HTTP Helper Tests
// =========================================================

func TestWriteJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	writeJSON(rr, http.StatusOK, map[string]string{"status": "ok"})

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected application/json, got %q", ct)
	}

	var body map[string]string
	json.NewDecoder(rr.Body).Decode(&body)
	if body["status"] != "ok" {
		t.Errorf("expected ok, got %q", body["status"])
	}
}

func TestWriteError(t *testing.T) {
	rr := httptest.NewRecorder()
	writeError(rr, http.StatusForbidden, "forbidden")

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(rr.Body).Decode(&resp)
	errObj, ok := resp["error"].(map[string]interface{})
	if !ok {
		t.Fatal("expected error object in response")
	}
	if errObj["message"] != "forbidden" {
		t.Errorf("expected 'forbidden', got %v", errObj["message"])
	}
	if errObj["code"] != float64(403) {
		t.Errorf("expected code 403, got %v", errObj["code"])
	}
}
