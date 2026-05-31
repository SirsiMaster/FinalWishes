package mail

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

type Handler struct {
	fs     *firestore.Client
	sc     *storage.Client
	lob    *LobClient
	bucket string
	from   Address
}

type CertifiedMailRequest struct {
	Recipient   Address `json:"recipient"`
	DocumentRef string  `json:"documentRef"`
	Purpose     string  `json:"purpose"`
}

func NewHandler(fs *firestore.Client, sc *storage.Client, lob *LobClient, bucket string, from Address) *Handler {
	if bucket == "" {
		bucket = "finalwishes-vault"
	}
	return &Handler{fs: fs, sc: sc, lob: lob, bucket: bucket, from: from}
}

func NewAddressFromEnv(prefix string) Address {
	return Address{
		Name:         os.Getenv(prefix + "_NAME"),
		AddressLine1: os.Getenv(prefix + "_ADDRESS_LINE1"),
		AddressLine2: os.Getenv(prefix + "_ADDRESS_LINE2"),
		City:         os.Getenv(prefix + "_CITY"),
		State:        os.Getenv(prefix + "_STATE"),
		Zip:          os.Getenv(prefix + "_ZIP"),
		Country:      firstNonEmpty(os.Getenv(prefix+"_COUNTRY"), "US"),
	}
}

func (h *Handler) HandleCreateCertifiedMail(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	estateID := chi.URLParam(r, "estateId")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	var req CertifiedMailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Purpose == "" || req.DocumentRef == "" || req.Recipient.AddressLine1 == "" || req.Recipient.City == "" || req.Recipient.State == "" || req.Recipient.Zip == "" {
		writeError(w, http.StatusBadRequest, "recipient, documentRef, and purpose are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	role, err := h.getEstateRole(ctx, userID, estateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" && role != "admin" && role != "principal" {
		writeError(w, http.StatusForbidden, "Only estate owners, executors, or administrators can send certified mail")
		return
	}

	fileURL, storageKey, err := h.signedDocumentURL(estateID, req.DocumentRef)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	letter, err := h.lob.CreateCertifiedLetter(ctx, CreateCertifiedLetterRequest{
		To:          normalizeAddress(req.Recipient),
		From:        normalizeAddress(h.from),
		FileURL:     fileURL,
		Description: "FinalWishes " + req.Purpose,
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Lob certified mail failed")
		writeError(w, http.StatusBadGateway, "Certified mail provider failed")
		return
	}

	now := time.Now()
	trackingID := firstNonEmpty(letter.TrackingID, letter.ID)
	record := map[string]interface{}{
		"lobLetterId":    letter.ID,
		"trackingId":     trackingID,
		"recipientHash":  hashRecipient(req.Recipient),
		"documentRef":    storageKey,
		"purpose":        req.Purpose,
		"status":         letter.Status,
		"lobTrackingURL": letter.TrackingURL,
		"lobURL":         letter.URL,
		"sentAt":         now,
		"createdBy":      userID,
	}
	_, err = h.fs.Collection("estates").Doc(estateID).Collection("certifiedMail").Doc(trackingID).Set(ctx, record)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to persist certified mail audit record")
		writeError(w, http.StatusInternalServerError, "Certified mail queued but audit persistence failed")
		return
	}
	_, _, _ = h.fs.Collection("estates").Doc(estateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":        "certified_mail_sent",
		"trackingId":    trackingID,
		"documentRef":   storageKey,
		"purpose":       req.Purpose,
		"actor":         userID,
		"actorRole":     role,
		"recipientHash": hashRecipient(req.Recipient),
		"timestamp":     now,
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"trackingId":     trackingID,
		"lobTrackingURL": letter.TrackingURL,
		"status":         letter.Status,
	})
}

func (h *Handler) signedDocumentURL(estateID, documentRef string) (string, string, error) {
	storageKey := strings.TrimPrefix(documentRef, "gs://"+h.bucket+"/")
	storageKey = strings.TrimPrefix(storageKey, "/")
	if !strings.HasPrefix(storageKey, "estates/"+estateID+"/") {
		return "", "", errBadDocumentRef
	}
	url, err := h.sc.Bucket(h.bucket).SignedURL(storageKey, &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  http.MethodGet,
		Expires: time.Now().Add(2 * time.Hour),
	})
	if err != nil {
		return "", "", errSignedURL
	}
	return url, storageKey, nil
}

var (
	errBadDocumentRef = apiError("documentRef must point to this estate's vault storage path")
	errSignedURL      = apiError("failed to prepare vault document for mailing")
)

type apiError string

func (e apiError) Error() string { return string(e) }

func (h *Handler) getEstateRole(ctx context.Context, userID, estateID string) (string, error) {
	snap, err := h.fs.Collection("estate_users").Doc(userID + "_" + estateID).Get(ctx)
	if err != nil || !snap.Exists() {
		return "", errBadDocumentRef
	}
	role, _ := snap.Data()["role"].(string)
	return role, nil
}

func normalizeAddress(a Address) Address {
	if a.Country == "" {
		a.Country = "US"
	}
	return a
}

func hashRecipient(a Address) string {
	normalized := strings.ToLower(strings.Join([]string{a.Name, a.AddressLine1, a.AddressLine2, a.City, a.State, a.Zip}, "|"))
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:])
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{"error": map[string]interface{}{"code": http.StatusText(status), "message": message}})
}
