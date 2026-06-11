package opensign

import (
	"encoding/json"
	"errors"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

type CreateEnvelopeRequest struct {
	EstateID    string `json:"estateId"`
	DirectiveID string `json:"directiveId"`
	TemplateID  string `json:"templateId"`
	SignerName  string `json:"signerName"`
	SignerEmail string `json:"signerEmail"`
	RedirectURL string `json:"redirectUrl"`
}

type CreateEnvelopeResponse struct {
	EnvelopeID string `json:"envelopeId"`
	SigningURL string `json:"signingUrl"`
}

// HandleCreateEnvelope initiates an OpenSign signing ceremony BOUND to a specific
// estate directive. The caller must be an estate writer (principal/executor/admin);
// the envelope→(estate,directive) mapping is recorded SERVER-SIDE so the webhook can
// stamp the verified result onto exactly that directive — not a blind cross-estate
// match keyed on a client-written field. Mirrors the proven Assiduous opensign
// pattern (record the envelope at creation, update the recorded resource by id).
func (h *WebhookHandler) HandleCreateEnvelope(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if h.provider == nil {
		h.provider = NewSigningProvider()
	}

	userID, err := auth.RequireUserID(ctx)
	if err != nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req CreateEnvelopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.EstateID == "" || req.DirectiveID == "" {
		http.Error(w, "estateId and directiveId are required", http.StatusBadRequest)
		return
	}

	// Writer-role gate — a signing ceremony writes to the estate's legal record, so
	// only principal/executor/admin may initiate it (not any authenticated user).
	if h.fs != nil {
		eu, euErr := h.fs.Collection("estate_users").Doc(userID + "_" + req.EstateID).Get(ctx)
		if euErr != nil || !eu.Exists() {
			http.Error(w, "You do not have access to this estate", http.StatusForbidden)
			return
		}
		role, _ := eu.Data()["role"].(string)
		if role != "principal" && role != "executor" && role != "admin" {
			http.Error(w, "You do not have permission to initiate signing for this estate", http.StatusForbidden)
			return
		}
	}

	// Force the signer identity to the AUTHENTICATED caller — never the body's
	// signerEmail. Otherwise an estate writer could name an ARBITRARY signer (send the
	// signing link to anyone / forge "X signed this directive"). The verified email
	// claim is the only trustworthy signer identity. (claude-home PR #4 review.)
	signerEmail := ""
	signerName := req.SignerName
	if tok := auth.TokenFromContext(ctx); tok != nil {
		if e, _ := tok.Claims["email"].(string); e != "" {
			signerEmail = e
		}
		if n, _ := tok.Claims["name"].(string); n != "" {
			signerName = n
		}
	}
	if signerEmail == "" {
		http.Error(w, "Signer email could not be determined from your account", http.StatusBadRequest)
		return
	}

	// Create the envelope via the shared-services provider: CONSUME THE SIRSI SIGN
	// SERVICE FIRST, fall back to dissociated infra only on a Sirsi-org availability
	// failure (ADR-047). A clean business rejection is surfaced, never re-routed.
	result, err := h.provider.CreateEnvelope(ctx, EnvelopeRequest{
		TemplateID:  req.TemplateID,
		SignerName:  signerName,
		SignerEmail: signerEmail,
		RedirectURL: req.RedirectURL,
	})
	if err != nil {
		var br *errBusinessRejection
		if errors.As(err, &br) {
			log.Warn().Err(err).Msg("Signing provider rejected the request")
			http.Error(w, "The signing provider could not accept this request", http.StatusBadGateway)
		} else {
			log.Error().Err(err).Msg("All signing providers unavailable")
			http.Error(w, "Signing service is temporarily unavailable", http.StatusServiceUnavailable)
		}
		return
	}
	envelopeID := result.EnvelopeID
	signingURL := result.SigningURL
	log.Info().Str("served_by", result.ServedBy).Str("envelope_id", envelopeID).
		Str("estate_id", req.EstateID).Msg("Signing envelope created")

	// Record the envelope→(estate,directive) binding SERVER-SIDE and stamp the
	// directive. The webhook resolves the verified result against THIS record, so the
	// signing evidence chain can never be redirected to another estate's directive by
	// a client-written signingEnvelopeId. signing_envelopes is server-only (rules).
	if h.fs != nil && envelopeID != "" {
		// Top-level signing_envelopes/{envelopeId} (envelope IDs are globally unique),
		// so the webhook resolves the binding with a direct GET — no collection-group
		// index needed. Server-only (firestore.rules).
		if _, e := h.fs.Collection("signing_envelopes").Doc(envelopeID).Set(ctx, map[string]interface{}{
			"envelopeId":  envelopeID,
			"estateId":    req.EstateID,
			"directiveId": req.DirectiveID,
			"createdBy":   userID,
			"status":      "sent",
			"createdAt":   firestore.ServerTimestamp,
		}); e != nil {
			log.Error().Err(e).Str("envelope_id", envelopeID).Msg("Failed to record signing_envelopes mapping")
		}
		if _, e := h.fs.Collection("estates").Doc(req.EstateID).
			Collection("directives").Doc(req.DirectiveID).Update(ctx, []firestore.Update{
			{Path: "signingEnvelopeId", Value: envelopeID},
			{Path: "signingStatus", Value: "sent"},
		}); e != nil {
			log.Warn().Err(e).Str("directive_id", req.DirectiveID).Msg("Failed to stamp directive signingEnvelopeId")
		}
	}

	if err := json.NewEncoder(w).Encode(CreateEnvelopeResponse{
		EnvelopeID: envelopeID,
		SigningURL: signingURL,
	}); err != nil {
		log.Error().Err(err).Msg("Failed to encode response")
	}
}
