// Package lockbox provides HTTP handlers for the Digital Lockbox credential encryption API.
//
// Lockbox items live in Firestore at estates/{estateId}/lockbox/{itemId}.
// Sensitive credential fields (password, pin, notes) are encrypted using
// Cloud KMS envelope encryption via the shared VaultCrypto module.
//
// Each encryption operation is bound to both the estate and the specific lockbox
// item via AAD (Additional Authenticated Data), preventing cross-estate and
// cross-item decryption attacks.
//
// Field index assignments (must be stable — changing these breaks decryption):
//
//	0 = password
//	1 = pin
//	2 = notes
//
// Endpoints:
//
//	POST /api/v1/lockbox/store-credentials      — Encrypt and store credentials
//	POST /api/v1/lockbox/retrieve-credentials    — Decrypt and return credentials
package lockbox

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	"github.com/sirsi-technologies/finalwishes-api/internal/crypto"
)

// Field index constants — these MUST remain stable across versions.
// Changing an index breaks decryption of all previously encrypted data for that field.
const (
	fieldIndexPassword = 0
	fieldIndexPin      = 1
	fieldIndexNotes    = 2
)

// Handler wraps Firestore and VaultCrypto for lockbox credential operations.
type Handler struct {
	fs     *firestore.Client
	crypto *crypto.VaultCrypto
}

// NewHandler creates a new lockbox handler.
func NewHandler(fs *firestore.Client, vc *crypto.VaultCrypto) *Handler {
	return &Handler{
		fs:     fs,
		crypto: vc,
	}
}

// --- Request/Response Types ---

// StoreCredentialsRequest is the request body for encrypting and storing lockbox credentials.
type StoreCredentialsRequest struct {
	EstateID string `json:"estateId"`
	ItemID   string `json:"itemId"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Pin      string `json:"pin,omitempty"`
	Notes    string `json:"notes,omitempty"`
}

// RetrieveCredentialsRequest is the request body for decrypting lockbox credentials.
type RetrieveCredentialsRequest struct {
	EstateID string `json:"estateId"`
	ItemID   string `json:"itemId"`
}

// CredentialsResponse is the decrypted credential response.
type CredentialsResponse struct {
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Pin      string `json:"pin,omitempty"`
	Notes    string `json:"notes,omitempty"`
}

// firestoreCredentials is the shape stored in the Firestore "credentials" map field.
type firestoreCredentials struct {
	EncryptedDEK      string `firestore:"encryptedDEK"      json:"encryptedDEK"`
	IV                string `firestore:"iv"                 json:"iv"`
	EncryptedPassword string `firestore:"encryptedPassword,omitempty" json:"encryptedPassword,omitempty"`
	EncryptedPin      string `firestore:"encryptedPin,omitempty"      json:"encryptedPin,omitempty"`
	EncryptedNotes    string `firestore:"encryptedNotes,omitempty"    json:"encryptedNotes,omitempty"`
	// Username is stored in plaintext (not sensitive — it's an identifier, not a secret)
	Username string `firestore:"username,omitempty" json:"username,omitempty"`
}

// --- Handlers ---

// HandleStoreCredentials encrypts sensitive credential fields and stores them in Firestore.
//
// A single DEK is generated per store operation. All sensitive fields share the DEK,
// with per-field nonce derivation (XOR field index) to ensure each AES-GCM encryption
// uses a unique nonce. The DEK is encrypted via Cloud KMS with estate+item-scoped AAD.
//
// POST /api/v1/lockbox/store-credentials
func (h *Handler) HandleStoreCredentials(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req StoreCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.EstateID == "" || req.ItemID == "" {
		writeError(w, http.StatusBadRequest, "estateId and itemId are required")
		return
	}

	if req.Password == "" && req.Pin == "" && req.Notes == "" {
		writeError(w, http.StatusBadRequest, "At least one sensitive field (password, pin, or notes) is required")
		return
	}

	// Verify caller has principal or admin access to this estate
	hasAccess, err := h.verifyEstateAccess(ctx, userID, req.EstateID)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Str("estate_id", req.EstateID).Msg("Estate access verification failed")
		writeError(w, http.StatusInternalServerError, "Failed to verify estate access")
		return
	}
	if !hasAccess {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Msg("Unauthorized lockbox credential store attempt")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Build AAD strings for this estate+item combination
	gcmAAD := fmt.Sprintf("estate:%s:lockbox:%s", req.EstateID, req.ItemID)
	kmsAAD := fmt.Sprintf("finalwishes:estate:%s:lockbox:%s", req.EstateID, req.ItemID)

	// Create a single envelope (one DEK, one base nonce) for all fields
	envelope, err := h.crypto.NewMultiFieldEnvelope(ctx, gcmAAD, kmsAAD)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to create encryption envelope")
		writeError(w, http.StatusInternalServerError, "Encryption failed")
		return
	}
	defer envelope.Zero()

	creds := firestoreCredentials{
		EncryptedDEK: envelope.EncryptedDEKBase64,
		IV:           envelope.NonceBase64,
		Username:     req.Username, // Stored in plaintext
	}

	// Encrypt each sensitive field with a unique per-field nonce derivation
	if req.Password != "" {
		ct, err := envelope.EncryptField([]byte(req.Password), fieldIndexPassword)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to encrypt password")
			writeError(w, http.StatusInternalServerError, "Encryption failed")
			return
		}
		creds.EncryptedPassword = ct
	}

	if req.Pin != "" {
		ct, err := envelope.EncryptField([]byte(req.Pin), fieldIndexPin)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to encrypt pin")
			writeError(w, http.StatusInternalServerError, "Encryption failed")
			return
		}
		creds.EncryptedPin = ct
	}

	if req.Notes != "" {
		ct, err := envelope.EncryptField([]byte(req.Notes), fieldIndexNotes)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to encrypt notes")
			writeError(w, http.StatusInternalServerError, "Encryption failed")
			return
		}
		creds.EncryptedNotes = ct
	}

	// Write to Firestore: merge encrypted credentials into the lockbox item
	docRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("lockbox").Doc(req.ItemID)
	_, err = docRef.Set(ctx, map[string]interface{}{
		"credentials":          creds,
		"hasSecureCredentials": true,
		"credentialsUpdatedAt": time.Now().UTC(),
	}, firestore.MergeAll)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to store encrypted credentials in Firestore")
		writeError(w, http.StatusInternalServerError, "Failed to store credentials")
		return
	}

	// Audit log — blocking: credential operations must always be audited (SOC 2)
	if err := h.logAudit(ctx, userID, req.EstateID, req.ItemID, "store_credentials", r.RemoteAddr, r.UserAgent()); err != nil {
		writeError(w, http.StatusInternalServerError, "Credential operation aborted: audit logging failed")
		return
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("item_id", req.ItemID).
		Str("user_id", userID).
		Msg("Lockbox credentials stored (encrypted)")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Credentials encrypted and stored securely",
	})
}

// HandleRetrieveCredentials decrypts and returns lockbox credentials.
//
// POST /api/v1/lockbox/retrieve-credentials
func (h *Handler) HandleRetrieveCredentials(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req RetrieveCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.EstateID == "" || req.ItemID == "" {
		writeError(w, http.StatusBadRequest, "estateId and itemId are required")
		return
	}

	// Verify caller has principal or admin access to this estate
	hasAccess, err := h.verifyEstateAccess(ctx, userID, req.EstateID)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Str("estate_id", req.EstateID).Msg("Estate access verification failed")
		writeError(w, http.StatusInternalServerError, "Failed to verify estate access")
		return
	}
	if !hasAccess {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Msg("Unauthorized lockbox credential retrieval attempt")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Fetch the lockbox item from Firestore
	docRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("lockbox").Doc(req.ItemID)
	doc, err := docRef.Get(ctx)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to fetch lockbox item")
		writeError(w, http.StatusNotFound, "Lockbox item not found")
		return
	}

	// Extract the credentials map
	credsData, err := doc.DataAt("credentials")
	if err != nil {
		writeError(w, http.StatusNotFound, "No credentials stored for this lockbox item")
		return
	}

	// Convert to struct via JSON round-trip (Firestore returns map[string]interface{})
	credsMap, ok := credsData.(map[string]interface{})
	if !ok {
		writeError(w, http.StatusInternalServerError, "Invalid credentials data format")
		return
	}

	credsJSON, err := json.Marshal(credsMap)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to parse credentials data")
		return
	}

	var creds firestoreCredentials
	if err := json.Unmarshal(credsJSON, &creds); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to parse credentials data")
		return
	}

	if creds.EncryptedDEK == "" || creds.IV == "" {
		writeError(w, http.StatusInternalServerError, "Credential envelope is missing or corrupt")
		return
	}

	// Build AAD strings (must match encryption)
	gcmAAD := fmt.Sprintf("estate:%s:lockbox:%s", req.EstateID, req.ItemID)
	kmsAAD := fmt.Sprintf("finalwishes:estate:%s:lockbox:%s", req.EstateID, req.ItemID)

	// Open the envelope — one KMS call to decrypt the DEK, then decrypt all fields locally
	envelope, err := h.crypto.OpenMultiFieldEnvelope(ctx, creds.EncryptedDEK, creds.IV, gcmAAD, kmsAAD)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to open encryption envelope")
		writeError(w, http.StatusInternalServerError, "Decryption failed")
		return
	}
	defer envelope.Zero()

	resp := CredentialsResponse{
		Username: creds.Username,
	}

	if creds.EncryptedPassword != "" {
		plaintext, err := envelope.DecryptField(creds.EncryptedPassword, fieldIndexPassword)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to decrypt password")
			writeError(w, http.StatusInternalServerError, "Decryption failed")
			return
		}
		resp.Password = string(plaintext)
	}

	if creds.EncryptedPin != "" {
		plaintext, err := envelope.DecryptField(creds.EncryptedPin, fieldIndexPin)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to decrypt pin")
			writeError(w, http.StatusInternalServerError, "Decryption failed")
			return
		}
		resp.Pin = string(plaintext)
	}

	if creds.EncryptedNotes != "" {
		plaintext, err := envelope.DecryptField(creds.EncryptedNotes, fieldIndexNotes)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to decrypt notes")
			writeError(w, http.StatusInternalServerError, "Decryption failed")
			return
		}
		resp.Notes = string(plaintext)
	}

	// Audit log the retrieval — blocking: credential access must always be audited (SOC 2)
	if err := h.logAudit(ctx, userID, req.EstateID, req.ItemID, "retrieve_credentials", r.RemoteAddr, r.UserAgent()); err != nil {
		writeError(w, http.StatusInternalServerError, "Credential retrieval aborted: audit logging failed")
		return
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("item_id", req.ItemID).
		Str("user_id", userID).
		Msg("Lockbox credentials retrieved (decrypted)")

	writeJSON(w, http.StatusOK, resp)
}

// --- Access Control ---

// verifyEstateAccess confirms the caller may access the estate's Digital Lockbox —
// the most-sensitive surface, restricted to principal+admin only (matches the
// persona matrix + the frontend RoleGuard). It uses the REAL data model: the estate
// owner is estates/<id>.principalId; any other authorized party carries an
// estate_users/<uid>_<estateID> junction whose role is principal/admin. (The prior
// implementation read an "ownerId" field + "members" map that this app never
// writes — estates use principalId + the estate_users junction — so every real
// principal was denied and the feature was 100% broken.)
func (h *Handler) verifyEstateAccess(ctx context.Context, userID, estateID string) (bool, error) {
	doc, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to fetch estate: %w", err)
	}

	// The estate owner (principal) always has access.
	if pid, derr := doc.DataAt("principalId"); derr == nil {
		if pidStr, ok := pid.(string); ok && pidStr == userID {
			return true, nil
		}
	}

	// Otherwise require an estate_users junction with a principal/admin role.
	eu, err := h.fs.Collection("estate_users").Doc(userID + "_" + estateID).Get(ctx)
	if err != nil || eu == nil || !eu.Exists() {
		return false, nil
	}
	roleVal, _ := eu.DataAt("role")
	role, _ := roleVal.(string)
	return role == "principal" || role == "admin", nil
}

// --- Audit Logging ---

// logAudit writes a credential access event to the estate's audit_log subcollection.
// This is a blocking operation — if the audit write fails, the caller MUST treat it
// as an error and abort the credential operation. SOC 2 requires that every credential
// access is audited; unaudited access is not permitted.
func (h *Handler) logAudit(ctx context.Context, userID, estateID, itemID, action, ipAddress, userAgent string) error {
	auditRef := h.fs.Collection("estates").Doc(estateID).Collection("audit_log").NewDoc()
	_, err := auditRef.Set(ctx, map[string]interface{}{
		"userId":       userID,
		"estateId":     estateID,
		"itemId":       itemID,
		"action":       action,
		"resourceType": "lockbox_credentials",
		"ipAddress":    ipAddress,
		"userAgent":    userAgent,
		"timestamp":    time.Now().UTC(),
	})
	if err != nil {
		log.Error().Err(err).
			Str("user_id", userID).
			Str("estate_id", estateID).
			Str("item_id", itemID).
			Str("action", action).
			Msg("Failed to write lockbox audit log — blocking credential operation")
		return fmt.Errorf("audit log write failed: %w", err)
	}
	return nil
}

// --- HTTP Helpers ---

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]interface{}{
			"code":    status,
			"message": message,
		},
	})
}
