package docuseal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/rs/zerolog/log"
)

// DocuSeal API structures
type Submitter struct {
	Email string `json:"email"`
	Role  string `json:"role,omitempty"`
}

type CreateSubmissionRequest struct {
	TemplateID int         `json:"template_id"`
	Submitters []Submitter `json:"submitters"`
}

type CreateSubmissionResponse struct {
	ID    int    `json:"id"`
	Slug  string `json:"slug"`
	Token string `json:"token,omitempty"`
}

func CreateSubmissionHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Parse Request
	var req CreateSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 2. Config
	docusealURL := os.Getenv("DOCUSEAL_URL")
	if docusealURL == "" {
		docusealURL = "https://sign.sirsi.ai"
	}
	// Auth via X-Auth-Token if configured, but for local dev with no auth set up yet, might be open or using a generated token.
	// For now, we'll assume we might need a token if the user set one up, otherwise we try without or use a placeholder.
	// NOTE: DocuSeal usually requires an API key (X-Auth-Token) even self-hosted if users are created.
	// We will ask the user to provide the API key they generate in the dashboard as 'DOCUSEAL_API_KEY'.
	apiToken := os.Getenv("DOCUSEAL_API_KEY")

	// 3. Construct Upstream Payload
	payloadBytes, err := json.Marshal(req)
	if err != nil {
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
		return
	}

	// 4. Call DocuSeal API
	client := &http.Client{}
	upstreamReq, err := http.NewRequest("POST", docusealURL+"/api/submissions", bytes.NewBuffer(payloadBytes))
	if err != nil {
		http.Error(w, "Failed to create upstream request", http.StatusInternalServerError)
		return
	}

	upstreamReq.Header.Set("Content-Type", "application/json")
	if apiToken != "" {
		upstreamReq.Header.Set("X-Auth-Token", apiToken)
	}

	resp, err := client.Do(upstreamReq)
	if err != nil {
		log.Error().Err(err).Msg("Failed to call DocuSeal API")
		http.Error(w, "Failed to communicate with signing provider", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// 5. Handle Response
	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		log.Error().Int("status", resp.StatusCode).Str("body", string(body)).Msg("DocuSeal API error")
		http.Error(w, fmt.Sprintf("Signing provider error: %s", string(body)), http.StatusBadGateway)
		return
	}

	// 6. Return Result
	// We just proxy the response body directly for now, or decode/encode to be safe
	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}
