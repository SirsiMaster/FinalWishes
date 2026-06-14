package opensign

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	firebaseAuth "firebase.google.com/go/v4/auth"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// withAuth injects an authenticated CALLER context (as the middleware would) so these
// tests exercise HandleCreateEnvelope past its auth gate. NOTE: as of the
// signer=principal change (claude-home 2026-06-14) the caller's token email is NO
// LONGER the signer — the signer is resolved from the estate principal via the injected
// signerResolver. The caller is recorded only as initiatedBy. A nil-fs WebhookHandler
// skips the estate_users check + the binding write, leaving the OpenSign proxy behavior
// + principal-resolution under test. Bodies include estateId/directiveId (required).
func withAuth(req *http.Request) *http.Request {
	ctx := auth.ContextWithUserID(req.Context(), "u1")
	ctx = auth.ContextWithToken(ctx, &firebaseAuth.Token{Claims: map[string]interface{}{
		"email": "u1@example.com",
		"name":  "U One",
	}})
	return req.WithContext(ctx)
}

// fakeSignerResolver is the test double for the principal-resolution seam, standing in
// for the Firestore+Firebase-Auth-backed firebaseSignerResolver (neither can be built
// offline). It returns canned signer identity / rejection.
type fakeSignerResolver struct {
	email     string
	name      string
	status    int
	clientMsg string
}

func (f *fakeSignerResolver) resolveSigner(_ context.Context, _, fallbackName string) (string, string, int, string) {
	if f.status != 0 {
		return "", "", f.status, f.clientMsg
	}
	name := f.name
	if name == "" {
		name = fallbackName
	}
	return f.email, name, 0, ""
}

// openSignTestHandler returns a handler whose principal resolves to a VERIFIED estate
// principal (principal@example.com) — the common case for the provider-proxy tests,
// which assert behavior AFTER signer resolution succeeds.
func openSignTestHandler() *WebhookHandler {
	return &WebhookHandler{
		signerResolver: &fakeSignerResolver{email: "principal@example.com", name: "Estate Principal"},
	}
}

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

	// With no Sirsi credential and no dissociated fallback configured, the resilient
	// provider reports the signing service unavailable (ADR-047).
	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "temporarily unavailable") {
		t.Errorf("expected 'temporarily unavailable', got %q", rr.Body.String())
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
	// A 4xx from the provider is a business rejection — surfaced as 502, never re-routed.
	if !strings.Contains(rr.Body.String(), "could not accept this request") {
		t.Errorf("expected business-rejection message, got %q", rr.Body.String())
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
		// Signer is the estate PRINCIPAL resolved server-side — NOT the caller token
		// (u1@example.com) and NOT the body's signerEmail (cylton@sirsi.ai). The
		// dissociated provider nests the signer under signers[0].
		gotSigner := ""
		if signers, ok := payload["signers"].([]interface{}); ok && len(signers) > 0 {
			if s0, ok := signers[0].(map[string]interface{}); ok {
				gotSigner, _ = s0["email"].(string)
			}
		}
		if gotSigner != "principal@example.com" {
			t.Errorf("expected signer to be the estate principal, got %q", gotSigner)
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

	// A 200 with an unparseable body yields no envelope id — the provider didn't
	// fulfil the request, so the resilient wrapper reports it unavailable (ADR-047).
	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "temporarily unavailable") {
		t.Errorf("expected unavailable message, got %q", rr.Body.String())
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

// TestCreateEnvelope_SignerIsVerifiedPrincipal verifies the resolved signer is the
// estate principal (verified), not the caller and not the body's signerEmail.
func TestCreateEnvelope_SignerIsVerifiedPrincipal(t *testing.T) {
	var gotSignerEmail string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		if signers, ok := payload["signers"].([]interface{}); ok && len(signers) > 0 {
			if s0, ok := signers[0].(map[string]interface{}); ok {
				gotSignerEmail, _ = s0["email"].(string)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"id":"env-1","url":"https://sign.example.com/env-1"}`)
	}))
	defer upstream.Close()

	t.Setenv("OPENSIGN_CREATE_ENVELOPE_URL", upstream.URL)
	t.Setenv("OPENSIGN_API_KEY", "k")
	t.Setenv("OPENSIGN_API_URL", "")

	h := &WebhookHandler{
		signerResolver: &fakeSignerResolver{email: "principal@example.com", name: "Estate Principal"},
	}

	// Caller token says u1@example.com; body says imposter@evil.com — both must be ignored.
	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","signerName":"Imposter","signerEmail":"imposter@evil.com","redirectUrl":"https://x.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/envelopes", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rr.Code, rr.Body.String())
	}
	if gotSignerEmail != "principal@example.com" {
		t.Errorf("signer must be the verified estate principal, got %q", gotSignerEmail)
	}
}

// TestCreateEnvelope_PrincipalEmailUnverified verifies the required gate: signing is
// rejected with 403 when the estate principal's email is not verified.
func TestCreateEnvelope_PrincipalEmailUnverified(t *testing.T) {
	h := &WebhookHandler{
		signerResolver: &fakeSignerResolver{
			status:    http.StatusForbidden,
			clientMsg: "The estate principal's email is not verified; signing cannot proceed",
		},
	}

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","redirectUrl":"https://x.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/envelopes", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for unverified principal, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "not verified") {
		t.Errorf("expected unverified-principal message, got %q", rr.Body.String())
	}
}

// TestCreateEnvelope_MissingPrincipal verifies a 400 when the estate has no principal
// on record (e.g. estates/{id}.principalId is empty/missing).
func TestCreateEnvelope_MissingPrincipal(t *testing.T) {
	h := &WebhookHandler{
		signerResolver: &fakeSignerResolver{
			status:    http.StatusBadRequest,
			clientMsg: "Estate has no principal on record",
		},
	}

	body := `{"estateId":"e1","directiveId":"d1","templateId":"t1","redirectUrl":"https://x.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/envelopes", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.HandleCreateEnvelope(rr, withAuth(req))

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing principal, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "no principal on record") {
		t.Errorf("expected missing-principal message, got %q", rr.Body.String())
	}
}

// TestFirebaseSignerResolver_UnverifiedAndMissing covers the production resolver's
// pure-logic branches that don't need a live Firestore client: nil fs / nil auth.
func TestFirebaseSignerResolver_DefensiveNils(t *testing.T) {
	r := &firebaseSignerResolver{} // nil fs, nil authClient
	_, _, status, msg := r.resolveSigner(context.Background(), "e1", "")
	if status != http.StatusServiceUnavailable {
		t.Errorf("nil fs should yield 503, got %d (%s)", status, msg)
	}
}
