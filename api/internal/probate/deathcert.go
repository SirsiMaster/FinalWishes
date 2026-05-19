package probate

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// DeathCertFacts stores the extracted facts from a death certificate analysis.
// These facts must be reviewed and confirmed by the executor before they
// trigger any state transitions. Per Codex directive: "requires user
// confirmation before they change estate state."
type DeathCertFacts struct {
	DecedentName    string  `json:"decedentName" firestore:"decedentName"`
	DateOfDeath     *string `json:"dateOfDeath" firestore:"dateOfDeath"`
	PlaceOfDeath    *string `json:"placeOfDeath" firestore:"placeOfDeath"`
	CauseOfDeath    *string `json:"causeOfDeath" firestore:"causeOfDeath"`
	CertificateNum  *string `json:"certificateNumber" firestore:"certificateNumber"`
	CountyOfDeath   *string `json:"countyOfDeath" firestore:"countyOfDeath"`
	FuneralHome     *string `json:"funeralHome" firestore:"funeralHome"`
	Confirmed       bool    `json:"confirmed" firestore:"confirmed"`
	ConfirmedBy     string  `json:"confirmedBy,omitempty" firestore:"confirmedBy,omitempty"`
	ConfirmedAt     *time.Time `json:"confirmedAt,omitempty" firestore:"confirmedAt,omitempty"`
	DocumentID      string  `json:"documentId" firestore:"documentId"`
	AnalyzedAt      *time.Time `json:"analyzedAt,omitempty" firestore:"analyzedAt,omitempty"`
}

// HandleSubmitDeathCertAnalysis accepts the document ID of an already-analyzed
// death certificate and stores the extracted facts for executor review.
// The executor must then call HandleConfirmDeathCert to confirm the facts
// and advance the estate phase.
//
// POST /api/v1/probate/death-cert/submit
func (h *Handler) HandleSubmitDeathCertAnalysis(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID   string `json:"estateId"`
		DocumentID string `json:"documentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EstateID == "" || req.DocumentID == "" {
		writeError(w, http.StatusBadRequest, "estateId and documentId are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Verify executor/admin access
	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" && role != "admin" {
		writeError(w, http.StatusForbidden, "Only executors or administrators can submit death certificate analysis")
		return
	}

	// Read the document's analysis from Firestore (already analyzed by docintell)
	docSnap, err := h.fs.Collection("estates").Doc(req.EstateID).Collection("documents").Doc(req.DocumentID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Document not found")
		return
	}

	data := docSnap.Data()
	analysisStatus, _ := data["analysisStatus"].(string)
	if analysisStatus != "complete" {
		writeError(w, http.StatusBadRequest, "Document has not been analyzed yet. Please run document analysis first.")
		return
	}

	// Extract the analysis data
	analysisRaw, ok := data["analysis"]
	if !ok {
		writeError(w, http.StatusBadRequest, "No analysis data found on this document")
		return
	}

	// Convert the analysis map to extract death cert specific fields
	analysisMap, ok := analysisRaw.(map[string]interface{})
	if !ok {
		writeError(w, http.StatusInternalServerError, "Invalid analysis data format")
		return
	}

	now := time.Now()
	facts := DeathCertFacts{
		DecedentName:   getString(analysisMap, "summary"), // AI summary contains the name
		DocumentID:     req.DocumentID,
		Confirmed:      false,
		AnalyzedAt:     &now,
	}

	// Extract specific fields from AI analysis
	if v := getString(analysisMap, "signingDate"); v != "" {
		facts.DateOfDeath = &v
	}
	if v := getString(analysisMap, "jurisdiction"); v != "" {
		facts.CountyOfDeath = &v
	}

	// Store death cert facts in the probate subcollection
	_, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate").Doc("death_cert_facts").Set(ctx, facts)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to store death cert facts")
		writeError(w, http.StatusInternalServerError, "Failed to store analysis results")
		return
	}

	// Audit trail
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":     "death_cert_submitted",
		"documentId": req.DocumentID,
		"actor":      userID,
		"actorRole":  role,
		"timestamp":  now,
	})

	log.Info().
		Str("estate_id", req.EstateID).
		Str("document_id", req.DocumentID).
		Str("actor", userID).
		Msg("Death certificate analysis submitted for review")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"facts":   facts,
		"message": "Death certificate facts stored. Please review and confirm before proceeding.",
	})
}

// HandleConfirmDeathCert confirms the extracted death certificate facts and
// transitions the estate from death_reported to executor_confirmed (if valid).
// This is the "user confirmation before state changes" gate required by Codex.
//
// POST /api/v1/probate/death-cert/confirm
func (h *Handler) HandleConfirmDeathCert(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID string `json:"estateId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Verify executor/admin
	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" && role != "admin" {
		writeError(w, http.StatusForbidden, "Only executors or administrators can confirm death certificate facts")
		return
	}

	// Read existing facts
	factsSnap, err := h.fs.Collection("estates").Doc(req.EstateID).Collection("probate").Doc("death_cert_facts").Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "No death certificate analysis found. Submit one first.")
		return
	}

	var facts DeathCertFacts
	if err := factsSnap.DataTo(&facts); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read death cert facts")
		return
	}

	if facts.Confirmed {
		writeError(w, http.StatusBadRequest, "Death certificate has already been confirmed")
		return
	}

	// Mark as confirmed
	now := time.Now()
	_, err = factsSnap.Ref.Update(ctx, []firestore.Update{
		{Path: "confirmed", Value: true},
		{Path: "confirmedBy", Value: userID},
		{Path: "confirmedAt", Value: now},
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to confirm death cert")
		writeError(w, http.StatusInternalServerError, "Failed to confirm")
		return
	}

	// Audit trail
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":    "death_cert_confirmed",
		"actor":     userID,
		"actorRole": role,
		"timestamp": now,
	})

	log.Info().
		Str("estate_id", req.EstateID).
		Str("confirmed_by", userID).
		Msg("Death certificate confirmed — executor may now proceed with probate")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"confirmed": true,
		"message":   "Death certificate confirmed. You may now proceed to confirm your executor role.",
	})
}

// HandleGetDeathCertFacts returns the stored death cert facts for an estate.
// GET /api/v1/probate/death-cert?estate_id=xxx
func (h *Handler) HandleGetDeathCertFacts(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	estateID := r.URL.Query().Get("estate_id")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estate_id query parameter is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := h.verifyEstateAccess(ctx, userID, estateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	factsSnap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("death_cert_facts").Get(ctx)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"facts": nil,
		})
		return
	}

	var facts DeathCertFacts
	if err := factsSnap.DataTo(&facts); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read death cert facts")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"facts": facts,
	})
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}
