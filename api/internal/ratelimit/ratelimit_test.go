package ratelimit

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// newTestLimiter creates a limiter without the background cleanup goroutine leaking into tests.
// We use a high limit window and ban duration to control timing precisely.
func newTestLimiter(limit int, window, ban time.Duration) *Limiter {
	return &Limiter{
		visitors: make(map[string]*visitor),
		banned:   make(map[string]time.Time),
		limit:    limit,
		window:   window,
		ban:      ban,
	}
}

// TestRateLimiter_AllowsUnderLimit verifies that requests under the limit pass through.
func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
	limiter := newTestLimiter(100, time.Minute, 10*time.Minute)

	for i := 0; i < 100; i++ {
		if !limiter.allow("192.168.1.1") {
			t.Fatalf("request %d should have been allowed", i+1)
		}
	}
}

// TestRateLimiter_BlocksOverLimit verifies that the 101st request is blocked.
func TestRateLimiter_BlocksOverLimit(t *testing.T) {
	limiter := newTestLimiter(100, time.Minute, 10*time.Minute)

	// Send 100 requests (all should pass)
	for i := 0; i < 100; i++ {
		limiter.allow("192.168.1.1")
	}

	// 101st request should be blocked
	if limiter.allow("192.168.1.1") {
		t.Error("101st request should have been blocked")
	}
}

// TestRateLimiter_DifferentIPs verifies that each IP has its own limit.
func TestRateLimiter_DifferentIPs(t *testing.T) {
	limiter := newTestLimiter(5, time.Minute, 10*time.Minute)

	// Exhaust IP1's limit
	for i := 0; i < 5; i++ {
		limiter.allow("10.0.0.1")
	}
	// IP1 should be blocked on the 6th request
	if limiter.allow("10.0.0.1") {
		t.Error("IP1 should be blocked after exceeding limit")
	}

	// IP2 should still be allowed
	if !limiter.allow("10.0.0.2") {
		t.Error("IP2 should not be affected by IP1's limit")
	}
}

// TestRateLimiter_BanExpires verifies that banned IPs are allowed after the ban duration
// once the window also resets. The ban removes the ban entry, and if the window has
// also elapsed the visitor counter resets.
func TestRateLimiter_BanExpires(t *testing.T) {
	// Use a very short ban and window duration so both expire together
	limiter := newTestLimiter(2, 50*time.Millisecond, 50*time.Millisecond)

	// Exceed the limit to trigger a ban
	limiter.allow("10.0.0.1")
	limiter.allow("10.0.0.1")
	if limiter.allow("10.0.0.1") {
		t.Error("should be blocked after exceeding limit")
	}

	// Verify still banned
	if limiter.allow("10.0.0.1") {
		t.Error("should still be banned immediately after")
	}

	// Wait for both ban and window to expire
	time.Sleep(80 * time.Millisecond)

	// Should be allowed again — ban expired and window elapsed so counter resets
	if !limiter.allow("10.0.0.1") {
		t.Error("should be allowed after ban and window expire")
	}
}

// TestRateLimiter_WindowReset verifies that the counter resets after the window elapses.
func TestRateLimiter_WindowReset(t *testing.T) {
	limiter := newTestLimiter(3, 50*time.Millisecond, 10*time.Minute)

	// Use all 3 requests
	for i := 0; i < 3; i++ {
		limiter.allow("10.0.0.1")
	}

	// Wait for window to elapse
	time.Sleep(60 * time.Millisecond)

	// Should be allowed again (window reset)
	if !limiter.allow("10.0.0.1") {
		t.Error("should be allowed after window resets")
	}
}

// TestMiddleware_Returns429 verifies the HTTP middleware returns 429 with proper headers.
func TestMiddleware_Returns429(t *testing.T) {
	limiter := newTestLimiter(1, time.Minute, 10*time.Minute)

	handler := Middleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// First request passes
	req1 := httptest.NewRequest(http.MethodGet, "/", nil)
	req1.RemoteAddr = "10.0.0.1:12345"
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)

	if rr1.Code != http.StatusOK {
		t.Errorf("first request: expected 200, got %d", rr1.Code)
	}

	// Second request should be rate limited
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	req2.RemoteAddr = "10.0.0.1:12345"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusTooManyRequests {
		t.Errorf("second request: expected 429, got %d", rr2.Code)
	}
	if rr2.Header().Get("Retry-After") != "600" {
		t.Errorf("expected Retry-After: 600, got %q", rr2.Header().Get("Retry-After"))
	}
	if !strings.Contains(rr2.Body.String(), "RATE_LIMITED") {
		t.Errorf("expected RATE_LIMITED in body, got %q", rr2.Body.String())
	}
}

// TestMiddleware_UsesXForwardedFor verifies that X-Forwarded-For header is used for IP identification.
func TestMiddleware_UsesXForwardedFor(t *testing.T) {
	limiter := newTestLimiter(1, time.Minute, 10*time.Minute)

	handler := Middleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Two requests from different RemoteAddr but same X-Forwarded-For
	req1 := httptest.NewRequest(http.MethodGet, "/", nil)
	req1.RemoteAddr = "10.0.0.1:12345"
	req1.Header.Set("X-Forwarded-For", "203.0.113.1")
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)

	if rr1.Code != http.StatusOK {
		t.Errorf("first request: expected 200, got %d", rr1.Code)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	req2.RemoteAddr = "10.0.0.2:54321"
	req2.Header.Set("X-Forwarded-For", "203.0.113.1")
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)

	if rr2.Code != http.StatusTooManyRequests {
		t.Errorf("second request with same XFF: expected 429, got %d", rr2.Code)
	}
}
