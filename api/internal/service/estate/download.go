package estate

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// HandleDownloadURL returns an HTTP handler that generates signed download URLs.
// Query params: ?storageKey=estates/xxx/vault/123-file.pdf
func HandleDownloadURL(sc *storage.Client, fs ...*firestore.Client) http.HandlerFunc {
	var fsClient *firestore.Client
	if len(fs) > 0 {
		fsClient = fs[0]
	}

	return func(w http.ResponseWriter, r *http.Request) {
		storageKey := r.URL.Query().Get("storageKey")
		if storageKey == "" {
			http.Error(w, `{"error":"storageKey query parameter required"}`, http.StatusBadRequest)
			return
		}

		parts := strings.SplitN(storageKey, "/", 4)
		if len(parts) < 3 || parts[0] != "estates" {
			http.Error(w, `{"error":"invalid storage key format"}`, http.StatusBadRequest)
			return
		}
		estateID := parts[1]

		if fsClient != nil {
			userID := auth.UserIDFromContext(r.Context())
			if userID == "" {
				http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
				return
			}
			docRef := fsClient.Collection("estate_users").Doc(userID + "_" + estateID)
			doc, err := docRef.Get(r.Context())
			if err != nil || !doc.Exists() {
				http.Error(w, `{"error":"access denied"}`, http.StatusForbidden)
				return
			}
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
			http.Error(w, `{"error":"failed to generate download URL"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"downloadUrl": downloadURL,
		})
	}
}
