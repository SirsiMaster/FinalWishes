package youtube

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// injectTestUserID wraps auth.InjectUserIDForTest for convenience.
func injectTestUserID(ctx context.Context, uid string) context.Context {
	return auth.InjectUserIDForTest(ctx, uid)
}

// TestHandleUploadVideo_Unauthorized verifies 401 without auth context.
func TestHandleUploadVideo_Unauthorized(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/youtube/upload", nil)
	rr := httptest.NewRecorder()
	h.HandleUploadVideo(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Authentication required") {
		t.Errorf("expected 'Authentication required', got %q", rr.Body.String())
	}
}

// TestHandleUploadVideo_MissingFile verifies 400 when no multipart form is sent.
func TestHandleUploadVideo_MissingFile(t *testing.T) {
	h := &Handler{}

	// Send a request with auth context but no multipart form body
	req := httptest.NewRequest(http.MethodPost, "/api/v1/youtube/upload", strings.NewReader("not multipart"))

	// We need to inject auth context to get past the auth check
	// Use the auth testing helper
	ctx := injectTestUserID(req.Context(), "user-123")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.HandleUploadVideo(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
}

// TestHandleUploadVideo_MissingEstateID verifies 400 when estateId is not in multipart form.
func TestHandleUploadVideo_MissingEstateID(t *testing.T) {
	h := &Handler{}

	// Create a multipart form with title but no estateId
	body := &strings.Builder{}
	boundary := "testboundary"
	body.WriteString("--" + boundary + "\r\n")
	body.WriteString("Content-Disposition: form-data; name=\"title\"\r\n\r\n")
	body.WriteString("My Video\r\n")
	body.WriteString("--" + boundary + "--\r\n")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/youtube/upload", strings.NewReader(body.String()))
	req.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)

	ctx := injectTestUserID(req.Context(), "user-123")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.HandleUploadVideo(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "estateId is required") {
		t.Errorf("expected 'estateId is required', got %q", rr.Body.String())
	}
}

// TestHandleUploadVideo_MissingTitle verifies 400 when title is not in multipart form.
func TestHandleUploadVideo_MissingTitle(t *testing.T) {
	h := &Handler{}

	body := &strings.Builder{}
	boundary := "testboundary"
	body.WriteString("--" + boundary + "\r\n")
	body.WriteString("Content-Disposition: form-data; name=\"estateId\"\r\n\r\n")
	body.WriteString("est-123\r\n")
	body.WriteString("--" + boundary + "--\r\n")

	req := httptest.NewRequest(http.MethodPost, "/api/v1/youtube/upload", strings.NewReader(body.String()))
	req.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)

	ctx := injectTestUserID(req.Context(), "user-123")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h.HandleUploadVideo(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "title is required") {
		t.Errorf("expected 'title is required', got %q", rr.Body.String())
	}
}

// TestHandleGetVideoStatus_Unauthorized verifies 401 without auth context.
func TestHandleGetVideoStatus_Unauthorized(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/youtube/status?video_id=abc", nil)
	rr := httptest.NewRecorder()
	h.HandleGetVideoStatus(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

// TestHandleGetVideoStatus_MissingVideoID verifies 400 when video_id is missing.
func TestHandleGetVideoStatus_MissingVideoID(t *testing.T) {
	h := &Handler{}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/youtube/status", nil)
	ctx := injectTestUserID(req.Context(), "user-123")
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.HandleGetVideoStatus(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "video_id is required") {
		t.Errorf("expected 'video_id is required', got %q", rr.Body.String())
	}
}
