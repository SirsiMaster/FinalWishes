// Package transcription provides audio/video transcription via Google Cloud
// Speech-to-Text v2. Called after Soul Log media uploads; writes transcripts
// back to the Firestore soul-log document.
package transcription

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/option"
	"google.golang.org/api/transport"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// Handler manages transcription requests.
type Handler struct {
	fs        *firestore.Client
	projectID string
}

// NewHandler creates a transcription handler.
func NewHandler(fs *firestore.Client, projectID string) *Handler {
	return &Handler{fs: fs, projectID: projectID}
}

// TranscribeRequest is the JSON body for POST /api/v1/transcription/transcribe.
type TranscribeRequest struct {
	EstateID   string `json:"estateId"`
	EntryID    string `json:"entryId"`
	StorageURI string `json:"storageUri"` // gs:// URI or HTTPS Cloud Storage URL
	MimeType   string `json:"mimeType"`
}

// TranscribeResponse is returned on success.
type TranscribeResponse struct {
	Transcript string `json:"transcript"`
	EntryID    string `json:"entryId"`
}

// HandleTranscribe processes an audio/video file through Google Cloud Speech-to-Text
// and writes the transcript back to the Firestore soul-log document.
//
// POST /api/v1/transcription/transcribe
func (h *Handler) HandleTranscribe(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req TranscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EstateID == "" || req.EntryID == "" || req.StorageURI == "" {
		writeError(w, http.StatusBadRequest, "estateId, entryId, and storageUri are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	// Verify estate access
	euDocID := userID + "_" + req.EstateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Msg("Transcription denied — no access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Mark entry as transcribing
	entryRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("soul-log").Doc(req.EntryID)
	if _, err := entryRef.Update(ctx, []firestore.Update{
		{Path: "transcriptStatus", Value: "processing"},
	}); err != nil {
		log.Warn().Err(err).Str("entry_id", req.EntryID).Msg("Failed to mark entry as transcribing")
	}

	// Convert HTTPS URL to gs:// URI if needed
	gsURI := req.StorageURI
	if strings.HasPrefix(gsURI, "https://storage.googleapis.com/") {
		// https://storage.googleapis.com/BUCKET/OBJECT -> gs://BUCKET/OBJECT
		path := strings.TrimPrefix(gsURI, "https://storage.googleapis.com/")
		gsURI = "gs://" + path
	}

	// Bind the storage object to EstateID. The estate_users check above authorizes
	// EstateID, but StorageURI is a SEPARATE client value — without this, a member of
	// estate A could pass another estate's Soul Log audio URI and steal its transcript
	// (cross-tenant IDOR). The object key (after gs://BUCKET/) must live under this
	// estate's prefix.
	objectKey := ""
	if rest := strings.TrimPrefix(gsURI, "gs://"); rest != gsURI {
		if s := strings.IndexByte(rest, '/'); s >= 0 {
			objectKey = rest[s+1:]
		}
	}
	if !strings.HasPrefix(objectKey, "estates/"+req.EstateID+"/") {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Str("storage_uri", req.StorageURI).Msg("Transcription denied — storageUri outside estate")
		writeError(w, http.StatusForbidden, "storageUri does not belong to this estate")
		return
	}

	// Call Google Cloud Speech-to-Text v2 REST API
	transcript, err := h.callSpeechToText(ctx, gsURI, req.MimeType)
	if err != nil {
		log.Error().Err(err).Str("entry_id", req.EntryID).Msg("Speech-to-Text transcription failed")
		// Mark as failed in Firestore
		if _, updateErr := entryRef.Update(ctx, []firestore.Update{
			{Path: "transcriptStatus", Value: "failed"},
		}); updateErr != nil {
			log.Warn().Err(updateErr).Msg("Failed to mark transcription as failed")
		}
		writeError(w, http.StatusInternalServerError, "Transcription failed")
		return
	}

	// Write transcript to Firestore
	if _, err := entryRef.Update(ctx, []firestore.Update{
		{Path: "transcript", Value: transcript},
		{Path: "transcriptStatus", Value: "complete"},
	}); err != nil {
		log.Error().Err(err).Str("entry_id", req.EntryID).Msg("Failed to write transcript to Firestore")
		writeError(w, http.StatusInternalServerError, "Failed to save transcript")
		return
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("entry_id", req.EntryID).
		Int("transcript_length", len(transcript)).
		Msg("Transcription complete")

	writeJSON(w, http.StatusOK, TranscribeResponse{
		Transcript: transcript,
		EntryID:    req.EntryID,
	})
}

// callSpeechToText invokes the Google Cloud Speech-to-Text v2 REST API.
// Uses Application Default Credentials (ADC) — works on Cloud Run automatically.
func (h *Handler) callSpeechToText(ctx context.Context, gsURI string, mimeType string) (string, error) {
	// Determine encoding from MIME type
	// Speech-to-Text v2 auto-detects encoding for most formats when using ENCODING_UNSPECIFIED.
	encoding := "ENCODING_UNSPECIFIED"
	if strings.Contains(mimeType, "webm") {
		encoding = "WEBM_OPUS"
	}

	// Use default credentials for the API call
	location := os.Getenv("SPEECH_LOCATION")
	if location == "" {
		location = "us-central1"
	}

	endpoint := fmt.Sprintf(
		"https://%s-speech.googleapis.com/v2/projects/%s/locations/%s/recognizers/_:recognize",
		location, h.projectID, location,
	)

	// Build request body
	body := map[string]interface{}{
		"config": map[string]interface{}{
			"auto_decoding_config": map[string]interface{}{},
			"language_codes":       []string{"en-US"},
			"model":                "long",
			"features": map[string]interface{}{
				"enable_automatic_punctuation": true,
			},
		},
		"uri": gsURI,
	}

	// If we have a specific encoding, use explicit decoding config instead
	if encoding != "ENCODING_UNSPECIFIED" {
		body["config"] = map[string]interface{}{
			"explicit_decoding_config": map[string]interface{}{
				"encoding":            encoding,
				"sample_rate_hertz":   48000,
				"audio_channel_count": 1,
			},
			"language_codes": []string{"en-US"},
			"model":          "long",
			"features": map[string]interface{}{
				"enable_automatic_punctuation": true,
			},
		}
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	// Create authenticated HTTP client using ADC
	httpClient, _, err := transport.NewHTTPClient(ctx,
		option.WithScopes("https://www.googleapis.com/auth/cloud-platform"),
	)
	if err != nil {
		return "", fmt.Errorf("create HTTP client: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(bodyBytes)))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("speech API call: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("speech API returned %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse the Speech-to-Text v2 response
	var result struct {
		Results []struct {
			Alternatives []struct {
				Transcript string  `json:"transcript"`
				Confidence float64 `json:"confidence"`
			} `json:"alternatives"`
		} `json:"results"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	// Concatenate all result segments
	var parts []string
	for _, r := range result.Results {
		if len(r.Alternatives) > 0 {
			parts = append(parts, r.Alternatives[0].Transcript)
		}
	}

	transcript := strings.TrimSpace(strings.Join(parts, " "))
	if transcript == "" {
		return "(No speech detected)", nil
	}

	return transcript, nil
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]interface{}{
			"code":    http.StatusText(status),
			"message": message,
		},
	})
}
