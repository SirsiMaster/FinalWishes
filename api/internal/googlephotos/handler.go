package googlephotos

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"path"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/iterator"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

const maxImportBytes = 50 << 20

type Handler struct {
	fs     *firestore.Client
	sc     *storage.Client
	picker *PickerClient
	bucket string
}

func NewHandler(fs *firestore.Client, sc *storage.Client, picker *PickerClient, bucket string) *Handler {
	if bucket == "" {
		bucket = "finalwishes-vault"
	}
	return &Handler{fs: fs, sc: sc, picker: picker, bucket: bucket}
}

func (h *Handler) HandleCreateSession(w http.ResponseWriter, r *http.Request) {
	userID, estateID, ok := h.authorize(w, r)
	if !ok {
		return
	}
	token := readAccessToken(r)
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	session, err := h.picker.CreateSession(ctx, token)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Str("user_id", userID).Msg("Google Photos Picker session failed")
		writeError(w, http.StatusBadGateway, "Failed to start Google Photos picker")
		return
	}
	writeJSON(w, http.StatusOK, session)
}

func (h *Handler) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	_, _, ok := h.authorize(w, r)
	if !ok {
		return
	}
	token := r.Header.Get("X-Google-Photos-Token")
	sessionID := chi.URLParam(r, "sessionId")
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	session, err := h.picker.GetSession(ctx, token, sessionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Failed to read Google Photos picker session")
		return
	}
	writeJSON(w, http.StatusOK, session)
}

func (h *Handler) HandleImport(w http.ResponseWriter, r *http.Request) {
	userID, estateID, ok := h.authorize(w, r)
	if !ok {
		return
	}
	var req struct {
		AccessToken string `json:"accessToken"`
		SessionID   string `json:"sessionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.AccessToken == "" || req.SessionID == "" {
		writeError(w, http.StatusBadRequest, "accessToken and sessionId are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()
	items, err := h.picker.ListMediaItems(ctx, req.AccessToken, req.SessionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "Failed to list selected Google Photos items")
		return
	}

	imported := 0
	skipped := 0
	var importedIDs []string
	for _, item := range items {
		if !strings.HasPrefix(item.MediaFile.MimeType, "image/") {
			skipped++
			continue
		}
		data, err := h.picker.DownloadMedia(ctx, req.AccessToken, item)
		if err != nil || len(data) > maxImportBytes {
			skipped++
			continue
		}
		sha := sha256Hex(data)
		duplicate, err := h.hasHash(ctx, estateID, sha)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to check duplicate photos")
			return
		}
		if duplicate {
			skipped++
			continue
		}
		filename := cleanFilename(item.MediaFile.Filename, item.ID)
		objectPath := fmt.Sprintf("estates/%s/heirlooms/imported/%s-%s", estateID, sha[:12], filename)
		writer := h.sc.Bucket(h.bucket).Object(objectPath).NewWriter(ctx)
		writer.ContentType = firstNonEmpty(item.MediaFile.MimeType, "image/jpeg")
		if _, err := writer.Write(data); err != nil {
			_ = writer.Close()
			writeError(w, http.StatusInternalServerError, "Failed to store imported photo")
			return
		}
		if err := writer.Close(); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to store imported photo")
			return
		}

		doc, _, err := h.fs.Collection("estates").Doc(estateID).Collection("heirlooms").Add(ctx, map[string]interface{}{
			"estateId":               estateID,
			"name":                   strings.TrimSuffix(filename, path.Ext(filename)),
			"category":               "family_artifact",
			"description":            "Imported from Google Photos",
			"photoUrls":              []string{"gs://" + h.bucket + "/" + objectPath},
			"status":                 "active",
			"importSource":           "google_photos_picker",
			"originalGooglePhotosId": item.ID,
			"sha256":                 sha,
			"dHash":                  averageDHash(data),
			"googlePhotosMetadata":   item.MediaFile.MediaMetadata,
			"storageBucket":          h.bucket,
			"storageKey":             objectPath,
			"importedBy":             userID,
			"importedAt":             firestore.ServerTimestamp,
			"createdAt":              firestore.ServerTimestamp,
			"updatedAt":              firestore.ServerTimestamp,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to record imported photo")
			return
		}
		_, err = h.fs.Collection("estates").Doc(estateID).Collection("heirloomHashes").Doc(sha).Set(ctx, map[string]interface{}{
			"heirloomId": doc.ID,
			"sha256":     sha,
			"dHash":      averageDHash(data),
			"createdAt":  firestore.ServerTimestamp,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to record photo hash")
			return
		}
		imported++
		importedIDs = append(importedIDs, doc.ID)
	}

	_, _, _ = h.fs.Collection("estates").Doc(estateID).Collection("audit").Add(ctx, map[string]interface{}{
		"action":    "google_photos_import",
		"imported":  imported,
		"skipped":   skipped,
		"actor":     userID,
		"timestamp": firestore.ServerTimestamp,
	})
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"imported":    imported,
		"skipped":     skipped,
		"heirloomIds": importedIDs,
	})
}

func (h *Handler) authorize(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return "", "", false
	}
	estateID := chi.URLParam(r, "estateId")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return "", "", false
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	snap, err := h.fs.Collection("estate_users").Doc(userID + "_" + estateID).Get(ctx)
	if err != nil || !snap.Exists() {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return "", "", false
	}
	// Importing photos WRITES heirlooms — gate on a writer role (principal/executor/
	// admin, mirroring canWriteEstate). A read-only heir is a member but must not
	// write to the estate.
	if role, _ := snap.Data()["role"].(string); role != "principal" && role != "executor" && role != "admin" {
		writeError(w, http.StatusForbidden, "You do not have permission to import to this estate")
		return "", "", false
	}
	return userID, estateID, true
}

func (h *Handler) hasHash(ctx context.Context, estateID, sha string) (bool, error) {
	_, err := h.fs.Collection("estates").Doc(estateID).Collection("heirloomHashes").Doc(sha).Get(ctx)
	if err == nil {
		return true, nil
	}
	if iterator.Done == err {
		return false, nil
	}
	if strings.Contains(err.Error(), "NotFound") || strings.Contains(err.Error(), "not found") {
		return false, nil
	}
	// Any other error (transient, permission, config) is NOT "no duplicate" —
	// propagate it so the caller aborts the import instead of silently
	// importing a possible duplicate.
	return false, err
}

func readAccessToken(r *http.Request) string {
	if token := r.Header.Get("X-Google-Photos-Token"); token != "" {
		return token
	}
	var req struct {
		AccessToken string `json:"accessToken"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	return req.AccessToken
}

func cleanFilename(name, fallback string) string {
	name = path.Base(strings.TrimSpace(name))
	if name == "." || name == "/" || name == "" {
		name = fallback + ".jpg"
	}
	return strings.ReplaceAll(name, " ", "_")
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{"error": map[string]interface{}{"code": http.StatusText(status), "message": message}})
}

func limitReader(b []byte) *bytes.Reader { return bytes.NewReader(b) }
