package lockbox

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// TestHandleStoreCredentials_Unauthorized verifies 401 without auth context.
func TestHandleStoreCredentials_Unauthorized(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"est-123","itemId":"item-456","password":"secret"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/store-credentials", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.HandleStoreCredentials(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Authentication required") {
		t.Errorf("expected 'Authentication required', got %q", rr.Body.String())
	}
}

// TestHandleStoreCredentials_MissingFields verifies 400 when estateId or itemId is missing.
func TestHandleStoreCredentials_MissingFields(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"","itemId":"","password":"secret"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/store-credentials", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := auth.InjectUserIDForTest(req.Context(), "user-abc")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.HandleStoreCredentials(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "estateId and itemId are required") {
		t.Errorf("expected 'estateId and itemId are required', got %q", rr.Body.String())
	}
}

// TestHandleStoreCredentials_NoSensitiveFields verifies 400 when no sensitive fields are provided.
func TestHandleStoreCredentials_NoSensitiveFields(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"est-123","itemId":"item-456","username":"admin"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/store-credentials", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := auth.InjectUserIDForTest(req.Context(), "user-abc")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.HandleStoreCredentials(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "At least one sensitive field") {
		t.Errorf("expected sensitive field error, got %q", rr.Body.String())
	}
}

// TestHandleStoreCredentials_InvalidJSON verifies 400 for malformed JSON.
func TestHandleStoreCredentials_InvalidJSON(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/store-credentials", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	ctx := auth.InjectUserIDForTest(req.Context(), "user-abc")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.HandleStoreCredentials(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Invalid request body") {
		t.Errorf("expected 'Invalid request body', got %q", rr.Body.String())
	}
}

// TestHandleRetrieveCredentials_Unauthorized verifies 401 without auth context.
func TestHandleRetrieveCredentials_Unauthorized(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"est-123","itemId":"item-456"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/retrieve-credentials", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.HandleRetrieveCredentials(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

// TestHandleRetrieveCredentials_MissingFields verifies 400 when estateId or itemId is missing.
func TestHandleRetrieveCredentials_MissingFields(t *testing.T) {
	h := &Handler{}

	body := `{"estateId":"","itemId":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/retrieve-credentials", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := auth.InjectUserIDForTest(req.Context(), "user-abc")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.HandleRetrieveCredentials(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "estateId and itemId are required") {
		t.Errorf("expected 'estateId and itemId are required', got %q", rr.Body.String())
	}
}

// TestHandleRetrieveCredentials_InvalidJSON verifies 400 for malformed JSON.
func TestHandleRetrieveCredentials_InvalidJSON(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/lockbox/retrieve-credentials", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	ctx := auth.InjectUserIDForTest(req.Context(), "user-abc")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.HandleRetrieveCredentials(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}
