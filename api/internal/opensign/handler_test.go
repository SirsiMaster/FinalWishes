package opensign

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// withAuth injects an authenticated user context (as the middleware would) so these
// tests exercise HandleCreateEnvelope past its auth gate. A nil-fs WebhookHandler skips
// the estate_users check + the binding write, leaving the OpenSign proxy behavior under
// test. Bodies include estateId/directiveId (now required).
func withAuth(req *http.Request) *http.Request {
	return req.WithContext(auth.ContextWithUserID(req.Context(), "u1"))
}

func openSignTestHandler() *WebhookHandler { return &WebhookHandler{} }

// TestCreateEnvelope_InvalidJSON verifies that malformed request bodies are rejected.
func TestCreateEnvelope_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader("{bad json"))
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Invalid request body") {
		t.Errorf("expected 'Invalid request body', got %q", rr.Body.String())
	}
}

// TestCreateEnvelope_MissingConfig verifies that missing API configuration returns 500.
func TestCreateEnvelope_MissingConfig(t *testing.T) {
	// Clear any env vars that might be set
	t.Setenv("OPENSIGN_API_URL", "")
	t.Setenv("OPENSIGN_API_KEY", "")
	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", "")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Test User","signerEmail":"test@example.com","redirectUrl":"https://example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Server configuration error") {
		t.Errorf("expected 'Server configuration error', got %q", rr.Body.String())
	}
}

// TestCreateEnvelope_UpstreamError verifies that upstream 4xx/5xx errors are forwarded as 502.
func TestCreateEnvelope_UpstreamError(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error":"invalid_api_key"}`))
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "test-key")
	t.Setenv("OPENSIGN_API_URL", "")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Test User","signerEmail":"test@example.com","redirectUrl":"https://example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Signing provider error") {
		t.Errorf("expected 'Signing provider error', got %q", rr.Body.String())
	}
}

// TestCreateEnvelope_HappyPath verifies successful envelope creation proxies correctly.
func TestCreateEnvelope_HappyPath(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the upstream request is well-formed
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json content-type, got %q", r.Header.Get("Content-Type"))
		}
		if r.Header.Get("Authorization") != "Bearer test-key-123" {
			t.Errorf("expected Bearer test-key-123, got %q", r.Header.Get("Authorization"))
		}

		// Verify payload structure
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("failed to decode upstream request: %v", err)
		}
		if payload["template_id"] != "t1" {
			t.Errorf("expected template_id t1, got %v", payload["template_id"])
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"env-abc-123","url":"https://sign.example.com/env-abc-123"}`))
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "test-key-123")
	t.Setenv("OPENSIGN_API_URL", "")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Cylton Collymore","signerEmail":"cylton@sirsi.ai","redirectUrl":"https://finalwishes.app/done"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp CreateEnvelopeResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.EnvelopeID != "env-abc-123" {
		t.Errorf("expected envelope ID env-abc-123, got %q", resp.EnvelopeID)
	}
	if resp.SigningURL != "https://sign.example.com/env-abc-123" {
		t.Errorf("expected signing URL, got %q", resp.SigningURL)
	}
}

// TestCreateEnvelope_NestedURLFallback verifies the fallback for APIs that return URL in a nested object.
func TestCreateEnvelope_NestedURLFallback(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"env-xyz","data":{"url":"https://sign.example.com/nested"}}`))
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "key")
	t.Setenv("OPENSIGN_API_URL", "")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Test","signerEmail":"test@test.com","redirectUrl":"https://example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp CreateEnvelopeResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.SigningURL != "https://sign.example.com/nested" {
		t.Errorf("expected nested URL fallback, got %q", resp.SigningURL)
	}
}

// TestCreateEnvelope_APIURLFallback verifies that OPENSIGN_API_URL is used when CREATE_ENVELOPE_URL is not set.
func TestCreateEnvelope_APIURLFallback(t *testing.T) {
	var receivedPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"env-fallback","url":"https://sign.example.com/fallback"}`))
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", "")
	t.Setenv("OPENSIGN_API_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "key")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Test","signerEmail":"test@test.com","redirectUrl":"https://example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if receivedPath != "/v1/envelopes" {
		t.Errorf("expected /v1/envelopes path, got %q", receivedPath)
	}
}

// TestCreateEnvelope_UpstreamBadJSON verifies handling when upstream returns non-JSON.
func TestCreateEnvelope_UpstreamBadJSON(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`not json at all`))
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "key")
	t.Setenv("OPENSIGN_API_URL", "")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Test","signerEmail":"test@test.com","redirectUrl":"https://example.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusBadGateway {
		t.Errorf("expected 502, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Failed to parse upstream response") {
		t.Errorf("expected parse error message, got %q", rr.Body.String())
	}
}

// TestCreateEnvelope_EmptyBody verifies that an empty body is rejected.
func TestCreateEnvelope_EmptyBody(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", nil)
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

// TestCreateEnvelope_NoAPIKeyStillSends verifies the handler sends the request even without API key.
func TestCreateEnvelope_NoAPIKeyStillSends(t *testing.T) {
	var receivedAuthHeader string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"id":"e1","url":"https://sign.example.com/e1"}`)
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "")
	t.Setenv("OPENSIGN_API_URL", "")

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Test","signerEmail":"t@t.com","redirectUrl":"https://x.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/opensign/create-envelope", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	openSignTestHandler().HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if receivedAuthHeader != "" {
		t.Errorf("expected no auth header when API key is empty, got %q", receivedAuthHeader)
	}
}
