package opensign

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// WebhookHandler handles OpenSign webhook callbacks and signing status checks.
type WebhookHandler struct {
	fs            *firestore.Client
	webhookSecret string
}

// NewWebhookHandler creates a webhook handler for OpenSign signing events.
func NewWebhookHandler(fs *firestore.Client) *WebhookHandler {
	return &WebhookHandler{
		fs:            fs,
		webhookSecret: os.Getenv("OPENSIGN_WEBHOOK_SECRET"),
	}
}

// HandleWebhook processes OpenSign signing completion webhooks.
// OpenSign calls this endpoint when a signer completes or declines signing.
//
// POST /api/v1/opensign/webhook
func (h *WebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Verify webhook signature. FAIL CLOSED in production — this endpoint writes
	// signingVerified:true + signerIP + certificateId onto a legal directive straight
	// from the body, so skipping HMAC verification lets an UNAUTHENTICATED caller forge
	// a "server-verified" signed advance-directive/POA. Was: verify only if the secret
	// happened to be set (fail-open). Now an unset secret in prod is rejected (mirrors
	// payments.HandleWebhook).
	if h.webhookSecret == "" {
		if os.Getenv("GOOGLE_CLOUD_PROJECT") != "" {
			log.Error().Msg("OPENSIGN_WEBHOOK_SECRET not configured in production — rejecting webhook")
			http.Error(w, "Webhook not configured", http.StatusServiceUnavailable)
			return
		}
		log.Warn().Msg("OpenSign webhook signature verification DISABLED (local dev only)")
	} else {
		sig := r.Header.Get("X-OpenSign-Signature")
		if sig == "" {
			log.Warn().Msg("OpenSign webhook missing signature header")
			http.Error(w, "Missing signature", http.StatusUnauthorized)
			return
		}
		// OpenSign uses HMAC-SHA256 for webhook signatures
		if !verifyWebhookSignature(body, sig, h.webhookSecret) {
			log.Warn().Msg("OpenSign webhook signature verification failed")
			http.Error(w, "Invalid signature", http.StatusUnauthorized)
			return
		}
	}

	var event WebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Error().Err(err).Msg("Failed to parse OpenSign webhook payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("event_type", event.EventType).
		Str("envelope_id", event.EnvelopeID).
		Str("status", event.Status).
		Msg("OpenSign webhook received")

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	switch event.EventType {
	case "envelope.completed", "signing.completed":
		if err := h.handleSigningCompleted(ctx, event); err != nil {
			log.Error().Err(err).Str("envelope_id", event.EnvelopeID).Msg("Failed to process signing completion")
			http.Error(w, "Processing failed", http.StatusInternalServerError)
			return
		}
	case "envelope.declined", "signing.declined":
		if err := h.handleSigningDeclined(ctx, event); err != nil {
			log.Error().Err(err).Str("envelope_id", event.EnvelopeID).Msg("Failed to process signing decline")
			http.Error(w, "Processing failed", http.StatusInternalServerError)
			return
		}
	default:
		log.Debug().Str("event_type", event.EventType).Msg("Unhandled OpenSign webhook event type")
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// handleSigningCompleted marks the matching directive as signed with server-verified proof.
func (h *WebhookHandler) handleSigningCompleted(ctx context.Context, event WebhookEvent) error {
	// Find the directive with this envelope ID across all estates
	iter := h.fs.CollectionGroup("directives").Where("signingEnvelopeId", "==", event.EnvelopeID).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		return err
	}

	// Update with server-verified signing proof
	_, err = doc.Ref.Update(ctx, []firestore.Update{
		{Path: "signedAt", Value: time.Now().UTC().Format(time.RFC3339)},
		{Path: "signingStatus", Value: "completed"},
		{Path: "signingVerified", Value: true},
		{Path: "signingCompletedAt", Value: firestore.ServerTimestamp},
		{Path: "signedDocumentUrl", Value: event.DocumentURL},
		{Path: "signerIP", Value: event.SignerIP},
		{Path: "signatureCertificateId", Value: event.CertificateID},
	})
	if err != nil {
		return err
	}

	log.Info().
		Str("envelope_id", event.EnvelopeID).
		Str("directive_path", doc.Ref.Path).
		Msg("Directive marked as signed (server-verified)")
	return nil
}

// handleSigningDeclined marks the directive signing as declined.
func (h *WebhookHandler) handleSigningDeclined(ctx context.Context, event WebhookEvent) error {
	iter := h.fs.CollectionGroup("directives").Where("signingEnvelopeId", "==", event.EnvelopeID).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		return err
	}

	_, err = doc.Ref.Update(ctx, []firestore.Update{
		{Path: "signingStatus", Value: "declined"},
		{Path: "signingDeclinedAt", Value: firestore.ServerTimestamp},
		{Path: "signingDeclineReason", Value: event.DeclineReason},
	})
	if err != nil {
		return err
	}

	log.Info().
		Str("envelope_id", event.EnvelopeID).
		Msg("Directive signing declined")
	return nil
}

// HandleCheckSigningStatus allows the frontend to poll for signing completion
// instead of relying on client-side URL parameters.
//
// GET /api/v1/opensign/status?envelopeId=xxx
func (h *WebhookHandler) HandleCheckSigningStatus(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
		return
	}

	envelopeID := r.URL.Query().Get("envelopeId")
	if envelopeID == "" {
		http.Error(w, `{"error":"envelopeId is required"}`, http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Find the directive by envelope ID
	iter := h.fs.CollectionGroup("directives").Where("signingEnvelopeId", "==", envelopeID).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "pending",
			"verified": false,
		})
		return
	}

	// Cross-estate IDOR guard: the directive was matched only by the caller-supplied
	// envelopeId across ALL estates. Confirm the caller is a member of the estate that
	// owns this directive (estates/{estateId}/directives/{id} → walk to the estate doc)
	// before disclosing its signing state.
	estateRef := doc.Ref.Parent.Parent
	if estateRef == nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	euSnap, euErr := h.fs.Collection("estate_users").Doc(userID + "_" + estateRef.ID).Get(ctx)
	if euErr != nil || !euSnap.Exists() {
		http.Error(w, `{"error":"You do not have access to this estate"}`, http.StatusForbidden)
		return
	}

	data := doc.Data()
	status := "pending"
	if s, ok := data["signingStatus"].(string); ok {
		status = s
	}
	verified := false
	if v, ok := data["signingVerified"].(bool); ok {
		verified = v
	}
	signedAt := ""
	if s, ok := data["signedAt"].(string); ok {
		signedAt = s
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   status,
		"verified": verified,
		"signedAt": signedAt,
	})
}

// WebhookEvent represents the payload from an OpenSign webhook callback.
type WebhookEvent struct {
	EventType     string `json:"event_type"`
	EnvelopeID    string `json:"envelope_id"`
	Status        string `json:"status"`
	DocumentURL   string `json:"document_url"`
	SignerIP      string `json:"signer_ip"`
	CertificateID string `json:"certificate_id"`
	DeclineReason string `json:"decline_reason"`
}

// verifyWebhookSignature verifies the HMAC-SHA256 signature of the webhook payload.
func verifyWebhookSignature(payload []byte, signature, secret string) bool {
	if secret == "" {
		return true
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
