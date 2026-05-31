package mail

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreateCertifiedLetterUsesCertifiedExtraService(t *testing.T) {
	var got map[string]interface{}
	var authHeader string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Fatal(err)
		}
		_ = json.NewEncoder(w).Encode(map[string]string{
			"id":           "ltr_test",
			"tracking_id":  "9400",
			"tracking_url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400",
			"status":       "queued",
		})
	}))
	defer srv.Close()

	client := NewLobClient("test-key", srv.URL, srv.Client())
	resp, err := client.CreateCertifiedLetter(t.Context(), CreateCertifiedLetterRequest{
		To:      Address{Name: "Jane Doe", AddressLine1: "1 Main St", City: "Chicago", State: "IL", Zip: "60601"},
		From:    Address{Name: "FinalWishes", AddressLine1: "2 Main St", City: "Chicago", State: "IL", Zip: "60602"},
		FileURL: "https://signed.example/document.pdf",
	})
	if err != nil {
		t.Fatal(err)
	}

	wantAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte("test-key:"))
	if authHeader != wantAuth {
		t.Fatalf("auth header = %q, want %q", authHeader, wantAuth)
	}
	if got["extra_service"] != "certified" {
		t.Fatalf("extra_service = %v, want certified", got["extra_service"])
	}
	if got["mail_type"] != "usps_first_class" {
		t.Fatalf("mail_type = %v, want usps_first_class", got["mail_type"])
	}
	if resp.TrackingID != "9400" || resp.Status != "queued" {
		t.Fatalf("unexpected response: %+v", resp)
	}
}
