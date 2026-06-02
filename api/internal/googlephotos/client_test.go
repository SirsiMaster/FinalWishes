package googlephotos

import (
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPickerClientCreateSessionUsesBearerToken(t *testing.T) {
	var authHeader string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		_ = json.NewEncoder(w).Encode(PickerSession{ID: "session-1", PickerURI: "https://photos.google.com/picker"})
	}))
	defer srv.Close()

	client := NewPickerClient(srv.URL, srv.Client())
	session, err := client.CreateSession(t.Context(), "token-1")
	if err != nil {
		t.Fatal(err)
	}
	if authHeader != "Bearer token-1" {
		t.Fatalf("auth header = %q", authHeader)
	}
	if session.ID != "session-1" {
		t.Fatalf("session = %+v", session)
	}
}

func TestHashHelpers(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x * 30), G: uint8(y * 30), B: 120, A: 255})
		}
	}
	var b strings.Builder
	if err := png.Encode(&stringWriter{&b}, img); err != nil {
		t.Fatal(err)
	}
	data := []byte(b.String())
	if sha256Hex(data) == "" {
		t.Fatal("expected sha")
	}
	if averageDHash(data) == "" {
		t.Fatal("expected image hash")
	}
}

type stringWriter struct{ b *strings.Builder }

func (w *stringWriter) Write(p []byte) (int, error) {
	return w.b.WriteString(string(p))
}
