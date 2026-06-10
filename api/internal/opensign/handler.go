package opensign

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

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

	// --- OpenSign config + proxy (unchanged behavior) ---
	apiKey := os.Getenv("OPENSIGN_API_KEY")
	apiURL := os.Getenv("OPENSIGN_API_URL")
	createEnvelopeURL := os.Getenv("OPENSIGN_CREATE_ENVELOPE_URL")

	if apiKey == "" {
		log.Warn().Msg("OpenSign API key missing (OPENSIGN_API_KEY)")
		if os.Getenv("GOOGLE_CLOUD_PROJECT") != "" {
			http.Error(w, "Signing service unavailable", http.StatusInternalServerError)
			return
		}
	}

	targetURL := ""
	if createEnvelopeURL != "" {
		targetURL = createEnvelopeURL
	} else if apiURL != "" {
		targetURL = apiURL + "/v1/envelopes"
	} else {
		log.Error().Msg("OpenSign configuration missing (OPENSIGN_API_URL or OPENSIGN_CREATE_ENVELOPE_URL)")
		http.Error(w, "Server configuration error", http.StatusInternalServerError)
		return
	}

	upstreamPayload := map[string]interface{}{
		"template_id": req.TemplateID,
		"signers": []map[string]string{
			{
				"name":  req.SignerName,
				"email": req.SignerEmail,
				"role":  "Signer",
			},
		},
		"redirect_url": req.RedirectURL,
	}

	payloadBytes, err := json.Marshal(upstreamPayload)
	if err != nil {
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
		return
	}

	client := &http.Client{}
	upstreamReq, err := http.NewRequestWithContext(ctx, "POST", targetURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		http.Error(w, "Failed to create upstream request", http.StatusInternalServerError)
		return
	}
	upstreamReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		upstreamReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := client.Do(upstreamReq)
	if err != nil {
		log.Error().Err(err).Msg("Failed to call OpenSign API")
		http.Error(w, "Failed to communicate with signing provider", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		log.Error().Int("status", resp.StatusCode).Str("body", string(body)).Msg("OpenSign API error")
		http.Error(w, fmt.Sprintf("Signing provider error: %s", string(body)), http.StatusBadGateway)
		return
	}

	var upstreamResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&upstreamResp); err != nil {
		http.Error(w, "Failed to parse upstream response", http.StatusBadGateway)
		return
	}

	envelopeID, _ := upstreamResp["id"].(string)
	signingURL, _ := upstreamResp["url"].(string)
	if signingURL == "" {
		if data, ok := upstreamResp["data"].(map[string]interface{}); ok {
			signingURL, _ = data["url"].(string)
		}
	}

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
