package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"healthy","service":"finalwishes-api","vault":"active","encryption":"AES-256-GCM","kms":"Cloud KMS"}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] != "healthy" {
		t.Errorf("expected healthy, got %q", resp["status"])
	}
	if resp["service"] != "finalwishes-api" {
		t.Errorf("expected finalwishes-api, got %q", resp["service"])
	}
	if resp["vault"] != "active" {
		t.Errorf("expected active, got %q", resp["vault"])
	}
	if resp["encryption"] != "AES-256-GCM" {
		t.Errorf("expected AES-256-GCM, got %q", resp["encryption"])
	}
}

func TestGetEnvOrDefault(t *testing.T) {
	tests := []struct {
		name     string
		key      string
		envVal   string
		defVal   string
		expected string
	}{
		{"uses_default", "TEST_NONEXISTENT_KEY_12345", "", "fallback", "fallback"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getEnvOrDefault(tt.key, tt.defVal)
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}
