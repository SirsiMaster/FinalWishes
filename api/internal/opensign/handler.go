package opensign

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/rs/zerolog/log"
)

type CreateEnvelopeRequest struct {
	TemplateID  string `json:"templateId"`
	SignerName  string `json:"signerName"`
	SignerEmail string `json:"signerEmail"`
	RedirectURL string `json:"redirectUrl"`
}

type CreateEnvelopeResponse struct {
	EnvelopeID string `json:"envelopeId"`
	SigningURL string `json:"signingUrl"`
}

func CreateEnvelopeHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Parse Request
	var req CreateEnvelopeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 2. Get Config
	apiKey := os.Getenv("OPENSIGN_API_KEY")
	apiURL := os.Getenv("OPENSIGN_API_URL")
	createEnvelopeURL := os.Getenv("OPENSIGN_CREATE_ENVELOPE_URL")

	if apiKey == "" {
		log.Warn().Msg("OpenSign API key missing (OPENSIGN_API_KEY)")
		// Proceeding might allow unauthenticated calls if the upstream doesn't require it?
		// Unlikely, but let's not hard fail here if we want to debug 401s.
		// Actually, standard practice is to fail early or let upstream fail.
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

	// 3. Construct Upstream Payload
	// ... (unchanged)
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

	// 4. Call OpenSign API
	client := &http.Client{}
	upstreamReq, err := http.NewRequest("POST", targetURL, bytes.NewBuffer(payloadBytes))
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

	// 5. Handle Response
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

	// 6. Return Result
	// Extract fields safely
	envelopeID, _ := upstreamResp["id"].(string)
	signingURL, _ := upstreamResp["url"].(string) // Assuming 'url' is the signing link field

	if signingURL == "" {
		// Fallback for some APIs that return it in a nested object
		// This is defensive coding since we don't have the exact spec
		if data, ok := upstreamResp["data"].(map[string]interface{}); ok {
			signingURL, _ = data["url"].(string)
		}
	}

	json.NewEncoder(w).Encode(CreateEnvelopeResponse{
		EnvelopeID: envelopeID,
		SigningURL: signingURL,
	})
}
