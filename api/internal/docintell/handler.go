// Package docintell provides Document Intelligence — AI-powered analysis of
// uploaded vault documents. Extracts document type, beneficiaries, executors,
// signing dates, and cross-references against estate heirs for discrepancies.
package docintell

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"

	sai "github.com/SirsiMaster/sirsi-ai"
)

// Handler serves document analysis endpoints.
type Handler struct {
	fs     *firestore.Client
	sc     *storage.Client
	ai     sai.AIService
	bucket string
}

// NewHandler creates a document intelligence handler.
func NewHandler(fs *firestore.Client, sc *storage.Client, ai sai.AIService, bucket string) *Handler {
	return &Handler{fs: fs, sc: sc, ai: ai, bucket: bucket}
}

// AnalyzeRequest is the POST body for /api/v1/documents/analyze.
type AnalyzeRequest struct {
	EstateID   string `json:"estateId"`
	DocumentID string `json:"documentId"`
	StorageKey string `json:"storageKey"`
	MimeType   string `json:"mimeType"`
	FileName   string `json:"fileName"`
}

// DocumentAnalysis is the structured analysis result written to Firestore.
type DocumentAnalysis struct {
	DocumentType       string   `json:"documentType" firestore:"documentType"`
	SigningDate        *string  `json:"signingDate" firestore:"signingDate"`
	Notarized          *bool    `json:"notarized" firestore:"notarized"`
	NamedBeneficiaries []string `json:"namedBeneficiaries" firestore:"namedBeneficiaries"`
	NamedExecutor      *string  `json:"namedExecutor" firestore:"namedExecutor"`
	NamedTrustee       *string  `json:"namedTrustee" firestore:"namedTrustee"`
	AssetsMentioned    []string `json:"assetsMentioned" firestore:"assetsMentioned"`
	Jurisdiction       *string  `json:"jurisdiction" firestore:"jurisdiction"`
	Summary            string   `json:"summary" firestore:"summary"`
	Flags              []string `json:"flags" firestore:"flags"`
}

// Discrepancy represents a mismatch between document names and estate heirs.
type Discrepancy struct {
	Type    string `json:"type" firestore:"type"`
	Name    string `json:"name" firestore:"name"`
	Message string `json:"message" firestore:"message"`
}

// AnalyzeResponse is returned to the client.
type AnalyzeResponse struct {
	Analysis      DocumentAnalysis `json:"analysis"`
	Discrepancies []Discrepancy    `json:"discrepancies"`
}

const analysisPrompt = `Analyze this estate planning document and extract the following in JSON format:
{
  "documentType": "will|trust|insurance|deed|financial|medical|other",
  "signingDate": "YYYY-MM-DD or null",
  "notarized": true/false/null,
  "namedBeneficiaries": ["Full Name", ...],
  "namedExecutor": "Full Name or null",
  "namedTrustee": "Full Name or null",
  "assetsMentioned": ["description", ...],
  "jurisdiction": "State or null",
  "summary": "2-3 sentence plain English summary",
  "flags": ["any concerns or items that need attention"]
}

Return ONLY the JSON object, no markdown fences or explanation.`

const analysisSystemPrompt = `You are a legal document analysis assistant for FinalWishes, an estate planning platform.
You analyze estate planning documents (wills, trusts, insurance policies, deeds, financial statements, medical directives) and extract structured metadata.
Be precise with names — use exact spelling as written in the document.
For the summary, use plain English that a non-lawyer can understand.
For flags, note things like: unsigned documents, missing witnesses, outdated dates (>5 years old), conflicting beneficiary designations, or missing notarization where typically required.
Always return valid JSON. If a field cannot be determined, use null for scalar fields or empty arrays for list fields.`

// HandleAnalyze processes a document analysis request.
// POST /api/v1/documents/analyze
func (h *Handler) HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.EstateID == "" || req.DocumentID == "" || req.StorageKey == "" {
		writeError(w, http.StatusBadRequest, "estateId, documentId, and storageKey are required")
		return
	}

	// Verify Firebase auth and estate access
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	// Check estate_users junction for access
	euDocID := userID + "_" + req.EstateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Msg("DocIntell denied — no access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// The estate_users check authorizes EstateID, but StorageKey is a SEPARATE
	// client-supplied value — without binding it to EstateID, a member of estate A
	// could pass storageKey=estates/B/vault/<file> and exfiltrate estate B's vault
	// document into their own estate's analysis (cross-tenant IDOR). Require the key
	// to live under this estate's prefix (same guard as estate/download.go + mail).
	if !strings.HasPrefix(req.StorageKey, "estates/"+req.EstateID+"/") {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Str("storage_key", req.StorageKey).Msg("DocIntell denied — storageKey outside estate")
		writeError(w, http.StatusForbidden, "storageKey does not belong to this estate")
		return
	}

	// Mark document as processing
	docRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("documents").Doc(req.DocumentID)
	if _, err := docRef.Update(ctx, []firestore.Update{
		{Path: "analysisStatus", Value: "processing"},
		{Path: "updatedAt", Value: firestore.ServerTimestamp},
	}); err != nil {
		log.Error().Err(err).Str("doc_id", req.DocumentID).Msg("Failed to set analysisStatus=processing")
		// Non-fatal — continue with analysis
	}

	// Read document from Cloud Storage
	docContent, err := h.readDocument(ctx, req.StorageKey)
	if err != nil {
		log.Error().Err(err).Str("storage_key", req.StorageKey).Msg("Failed to read document from storage")
		h.markAnalysisFailed(ctx, docRef)
		writeError(w, http.StatusInternalServerError, "Failed to read document")
		return
	}

	// Send to AI for analysis
	analysis, err := h.analyzeWithAI(ctx, docContent, req.FileName, req.MimeType)
	if err != nil {
		log.Error().Err(err).Str("doc_id", req.DocumentID).Msg("AI analysis failed")
		h.markAnalysisFailed(ctx, docRef)
		writeError(w, http.StatusInternalServerError, "Document analysis failed")
		return
	}

	// Cross-reference against estate heirs
	discrepancies := h.crossReferenceHeirs(ctx, req.EstateID, analysis)

	// Write analysis to Firestore
	if _, err := docRef.Update(ctx, []firestore.Update{
		{Path: "analysis", Value: analysis},
		{Path: "analysisStatus", Value: "complete"},
		{Path: "discrepancies", Value: discrepancies},
		{Path: "analyzedAt", Value: firestore.ServerTimestamp},
		{Path: "updatedAt", Value: firestore.ServerTimestamp},
	}); err != nil {
		log.Error().Err(err).Str("doc_id", req.DocumentID).Msg("Failed to write analysis to Firestore")
		writeError(w, http.StatusInternalServerError, "Failed to save analysis")
		return
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("doc_id", req.DocumentID).
		Str("doc_type", analysis.DocumentType).
		Int("discrepancies", len(discrepancies)).
		Msg("Document analysis complete")

	writeJSON(w, http.StatusOK, AnalyzeResponse{
		Analysis:      *analysis,
		Discrepancies: discrepancies,
	})
}

// readDocument fetches the document bytes from Cloud Storage.
func (h *Handler) readDocument(ctx context.Context, storageKey string) ([]byte, error) {
	reader, err := h.sc.Bucket(h.bucket).Object(storageKey).NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("open storage object: %w", err)
	}
	defer reader.Close()

	// Limit to 20 MB to prevent memory issues
	const maxSize = 20 * 1024 * 1024
	data, err := io.ReadAll(io.LimitReader(reader, maxSize))
	if err != nil {
		return nil, fmt.Errorf("read storage object: %w", err)
	}

	return data, nil
}

// analyzeWithAI sends document content to the AI model for structured analysis.
// For PDFs and images, it sends the raw bytes as inline data so the model can
// read the document natively. For text files, it sends the content as text.
func (h *Handler) analyzeWithAI(ctx context.Context, content []byte, fileName, mimeType string) (*DocumentAnalysis, error) {
	var userPrompt string

	if mimeType == "text/plain" {
		// For plain text, include content directly in the prompt
		userPrompt = fmt.Sprintf("Document: %s\n\nContent:\n%s\n\n%s", fileName, string(content), analysisPrompt)
	} else {
		// For PDFs and binary formats, encode as base64 so the AI model can read the content
		encoded := base64.StdEncoding.EncodeToString(content)
		userPrompt = fmt.Sprintf(
			"Document: %s (type: %s)\n\nThe document is provided as base64-encoded data below. Decode and analyze it.\n\n<document_base64>\n%s\n</document_base64>\n\n%s",
			fileName, mimeType, encoded, analysisPrompt,
		)
	}

	resp, err := h.ai.Explain(ctx, userPrompt,
		sai.WithSystem(analysisSystemPrompt),
		sai.WithTemperature(0.3), // Low temperature for precise extraction
		sai.WithMaxTokens(1000),
		sai.WithTask(sai.TaskAnalyzeComplex), // Routes to Claude Opus (strongest reasoning)
	)
	if err != nil {
		return nil, fmt.Errorf("AI explain failed: %w", err)
	}

	// Parse the JSON response
	text := strings.TrimSpace(resp)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var analysis DocumentAnalysis
	if err := json.Unmarshal([]byte(text), &analysis); err != nil {
		return nil, fmt.Errorf("parse analysis JSON: %w (raw: %s)", err, truncate(text, 200))
	}

	// Ensure non-nil slices for Firestore
	if analysis.NamedBeneficiaries == nil {
		analysis.NamedBeneficiaries = []string{}
	}
	if analysis.AssetsMentioned == nil {
		analysis.AssetsMentioned = []string{}
	}
	if analysis.Flags == nil {
		analysis.Flags = []string{}
	}

	return &analysis, nil
}

// crossReferenceHeirs checks named beneficiaries and executor against estate heirs.
func (h *Handler) crossReferenceHeirs(ctx context.Context, estateID string, analysis *DocumentAnalysis) []Discrepancy {
	// Fetch all heirs for this estate
	heirSnaps, err := h.fs.Collection("estates").Doc(estateID).Collection("heirs").
		Where("status", "==", "active").
		Documents(ctx).GetAll()
	if err != nil {
		log.Warn().Err(err).Str("estate_id", estateID).Msg("Failed to fetch heirs for cross-reference")
		return nil
	}

	// Build a set of known heir names (lowercased for fuzzy matching)
	knownNames := make(map[string]bool)
	for _, snap := range heirSnaps {
		if name, ok := snap.Data()["fullName"].(string); ok && name != "" {
			knownNames[strings.ToLower(strings.TrimSpace(name))] = true
		}
	}

	var discrepancies []Discrepancy

	// Check beneficiaries
	for _, name := range analysis.NamedBeneficiaries {
		if !knownNames[strings.ToLower(strings.TrimSpace(name))] {
			discrepancies = append(discrepancies, Discrepancy{
				Type:    "unknown_beneficiary",
				Name:    name,
				Message: fmt.Sprintf("Named in document but not in your estate beneficiaries"),
			})
		}
	}

	// Check executor
	if analysis.NamedExecutor != nil && *analysis.NamedExecutor != "" {
		if !knownNames[strings.ToLower(strings.TrimSpace(*analysis.NamedExecutor))] {
			discrepancies = append(discrepancies, Discrepancy{
				Type:    "unknown_executor",
				Name:    *analysis.NamedExecutor,
				Message: fmt.Sprintf("Named as executor in document but not in your estate"),
			})
		}
	}

	// Check trustee
	if analysis.NamedTrustee != nil && *analysis.NamedTrustee != "" {
		if !knownNames[strings.ToLower(strings.TrimSpace(*analysis.NamedTrustee))] {
			discrepancies = append(discrepancies, Discrepancy{
				Type:    "unknown_trustee",
				Name:    *analysis.NamedTrustee,
				Message: fmt.Sprintf("Named as trustee in document but not in your estate"),
			})
		}
	}

	return discrepancies
}

// markAnalysisFailed sets the analysis status to failed on the Firestore document.
func (h *Handler) markAnalysisFailed(ctx context.Context, docRef *firestore.DocumentRef) {
	if _, err := docRef.Update(ctx, []firestore.Update{
		{Path: "analysisStatus", Value: "failed"},
		{Path: "updatedAt", Value: firestore.ServerTimestamp},
	}); err != nil {
		log.Error().Err(err).Msg("Failed to mark analysis as failed")
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
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
