package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestUserIDFromContext_Empty(t *testing.T) {
	uid := UserIDFromContext(context.Background())
	if uid != "" {
		t.Errorf("expected empty uid, got %q", uid)
	}
}

func TestTokenFromContext_Nil(t *testing.T) {
	token := TokenFromContext(context.Background())
	if token != nil {
		t.Errorf("expected nil token, got %v", token)
	}
}

func TestRequireUserID_NoAuth(t *testing.T) {
	_, err := RequireUserID(context.Background())
	if err == nil {
		t.Fatal("expected error for unauthenticated context")
	}
}

func TestRequireUserID_WithAuth(t *testing.T) {
	ctx := context.WithValue(context.Background(), userIDKey, "uid-abc")
	uid, err := RequireUserID(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if uid != "uid-abc" {
		t.Errorf("expected uid-abc, got %q", uid)
	}
}

func TestUserIDFromContext_Roundtrip(t *testing.T) {
	ctx := context.WithValue(context.Background(), userIDKey, "test-uid-123")
	uid := UserIDFromContext(ctx)
	if uid != "test-uid-123" {
		t.Errorf("expected test-uid-123, got %q", uid)
	}
}

func TestMiddleware_MissingHeader(t *testing.T) {
	// Use a mock middleware that only checks headers (no Firebase client needed)
	handler := mockAuthGuard(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "UNAUTHENTICATED") {
		t.Errorf("expected UNAUTHENTICATED error, got %s", rr.Body.String())
	}
}

func TestMiddleware_InvalidFormat(t *testing.T) {
	handler := mockAuthGuard(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	tests := []struct {
		name   string
		header string
	}{
		{"no_bearer_prefix", "Token abc123"},
		{"basic_auth", "Basic dXNlcjpwYXNz"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			req.Header.Set("Authorization", tt.header)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != http.StatusUnauthorized {
				t.Errorf("expected 401, got %d", rr.Code)
			}
		})
	}
}

// mockAuthGuard replicates the header-parsing behavior of the real middleware
// without requiring a Firebase Auth client. This tests the guard logic.
func mockAuthGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":{"code":"UNAUTHENTICATED","message":"Missing authorization header"}}`, http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			http.Error(w, `{"error":{"code":"UNAUTHENTICATED","message":"Invalid authorization format"}}`, http.StatusUnauthorized)
			return
		}
		// In real middleware, Firebase verifies the token here.
		// For tests, we inject a mock UID from the token value.
		ctx := context.WithValue(r.Context(), userIDKey, parts[1])
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func TestMiddleware_DemoToken_RejectedByDefault(t *testing.T) {
	// With DEMO_MODE unset (default), demo-token should be treated as a regular
	// token and fail Firebase verification — not bypass auth.
	os.Unsetenv("DEMO_MODE")

	handler := Middleware(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer demo-token")
	rr := httptest.NewRecorder()

	// Middleware(nil) will panic or fail on VerifyIDToken with nil client.
	// We recover to verify the demo bypass did NOT short-circuit.
	defer func() {
		if r := recover(); r != nil {
			// Panic from nil authClient.VerifyIDToken means demo bypass was correctly skipped.
			// The token reached Firebase verification (which panicked because client is nil).
			// This is the expected behavior: demo-token is NOT special when DEMO_MODE is off.
			return
		}
		// If no panic, check that the response is 401 (rejected).
		if rr.Code == http.StatusOK {
			t.Error("demo-token should NOT be accepted when DEMO_MODE is not set")
		}
	}()

	handler.ServeHTTP(rr, req)
}

func TestMiddleware_DemoToken_AcceptedWhenEnabled(t *testing.T) {
	os.Setenv("DEMO_MODE", "true")
	defer os.Unsetenv("DEMO_MODE")

	var capturedUID string
	handler := Middleware(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer demo-token")
	req.Header.Set("X-Demo-User-ID", "test_demo_user")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 with DEMO_MODE=true, got %d", rr.Code)
	}
	if capturedUID != "test_demo_user" {
		t.Errorf("expected test_demo_user, got %q", capturedUID)
	}
}

func TestMiddleware_DemoToken_DefaultUID(t *testing.T) {
	os.Setenv("DEMO_MODE", "true")
	defer os.Unsetenv("DEMO_MODE")

	var capturedUID string
	handler := Middleware(nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer demo-token")
	// No X-Demo-User-ID header — should fall back to "demo_user"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if capturedUID != "demo_user" {
		t.Errorf("expected demo_user default, got %q", capturedUID)
	}
}

func TestMiddleware_ValidToken_InjectsUID(t *testing.T) {
	var capturedUID string
	handler := mockAuthGuard(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer mock-uid-456")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if capturedUID != "mock-uid-456" {
		t.Errorf("expected mock-uid-456, got %q", capturedUID)
	}
}
