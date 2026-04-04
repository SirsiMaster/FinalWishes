package estate

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/storage"
)

// HandleDownloadURL returns an HTTP handler that generates signed download URLs.
// Query params: ?storageKey=estates/xxx/vault/123-file.pdf
func HandleDownloadURL(sc *storage.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		storageKey := r.URL.Query().Get("storageKey")
		if storageKey == "" {
			http.Error(w, `{"error":"storageKey query parameter required"}`, http.StatusBadRequest)
			return
		}

		bucketName := os.Getenv("VAULT_STORAGE_BUCKET")
		if bucketName == "" {
			bucketName = "finalwishes-vault"
		}

		downloadURL, err := sc.Bucket(bucketName).SignedURL(storageKey, &storage.SignedURLOptions{
			Scheme:  storage.SigningSchemeV4,
			Method:  "GET",
			Expires: time.Now().Add(1 * time.Hour),
		})
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"failed to generate download URL: %s"}`, err.Error()), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"downloadUrl": downloadURL,
		})
	}
}
