package probate

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// PhaseTransitionHook is called after a successful phase transition.
// Used to trigger side effects like applying vault document holds.
type PhaseTransitionHook func(ctx context.Context, estateID string, from, to EstatePhase) error

// Handler manages probate API endpoints.
type Handler struct {
	fs                *firestore.Client
	engine            StateEngine
	onPhaseTransition PhaseTransitionHook
}

// NewHandler creates a probate handler with the specified state engine.
func NewHandler(fs *firestore.Client, engine StateEngine) *Handler {
	return &Handler{fs: fs, engine: engine}
}

// SetPhaseTransitionHook registers a callback invoked after phase transitions.
func (h *Handler) SetPhaseTransitionHook(hook PhaseTransitionHook) {
	h.onPhaseTransition = hook
}

// --- Request / Response types ---

// TransitionRequest is the payload for POST /api/v1/probate/transition.
type TransitionRequest struct {
	EstateID    string `json:"estateId"`
	TargetPhase string `json:"targetPhase"`
	Notes       string `json:"notes,omitempty"`
}

// StatusResponse is the response for GET /api/v1/probate/status.
type StatusResponse struct {
	EstateID         string             `json:"estateId"`
	CurrentPhase     string             `json:"currentPhase"`
	StateCode        string             `json:"stateCode"`
	StateName        string             `json:"stateName"`
	ProbableTimeline string             `json:"probableTimeline"`
	EFilingAvailable bool               `json:"eFilingAvailable"`
	CourtSystem      string             `json:"courtSystem"`
	Deadlines        []Deadline         `json:"deadlines,omitempty"`
	SmallEstate      *SmallEstateResult `json:"smallEstate,omitempty"`
	ValidTransitions []string           `json:"validTransitions"`
}

// ChecklistResponse is the response for GET /api/v1/probate/checklist.
type ChecklistResponse struct {
	EstateID  string          `json:"estateId"`
	StateCode string          `json:"stateCode"`
	Items     []ChecklistItem `json:"items"`
	Completed map[string]bool `json:"completed"`
}

// --- Handlers ---

// HandleTransition processes estate phase transitions with executor authority checks.
func (h *Handler) HandleTransition(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req TransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EstateID == "" || req.TargetPhase == "" {
		writeError(w, http.StatusBadRequest, "estateId and targetPhase are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Verify caller has executor or admin role
	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" && role != "admin" && role != "principal" {
		writeError(w, http.StatusForbidden, "Only estate owners, executors, or administrators can change probate status")
		return
	}

	// Death reports can only be made by executors/admins (not the owner themselves)
	targetPhase := EstatePhase(req.TargetPhase)
	if targetPhase == PhaseDeathReported && role == "principal" {
		writeError(w, http.StatusForbidden, "Estate owners cannot report their own death. An executor or administrator must do this.")
		return
	}

	// Read current estate phase
	estateSnap, err := h.fs.Collection("estates").Doc(req.EstateID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Estate not found")
		return
	}

	currentPhaseStr, _ := estateSnap.DataAt("probatePhase")
	currentPhase := EstatePhase("active")
	if s, ok := currentPhaseStr.(string); ok && s != "" {
		currentPhase = EstatePhase(s)
	}

	// Validate transition
	if !CanTransition(currentPhase, targetPhase) {
		writeError(w, http.StatusBadRequest, fmt.Sprintf(
			"Invalid transition: %s → %s. Valid transitions from %s: %v",
			currentPhase, targetPhase, currentPhase, ValidTransitions[currentPhase],
		))
		return
	}

	now := time.Now()

	// Update estate document
	updates := []firestore.Update{
		{Path: "probatePhase", Value: string(targetPhase)},
		{Path: "probatePhaseUpdatedAt", Value: now},
		{Path: "probatePhaseUpdatedBy", Value: userID},
		{Path: "probateStateCode", Value: h.engine.StateCode()},
	}

	// Set letters issued date when entering in_probate (triggers deadline calculations)
	if targetPhase == PhaseInProbate {
		updates = append(updates, firestore.Update{Path: "lettersIssuedAt", Value: now})
	}

	_, err = h.fs.Collection("estates").Doc(req.EstateID).Update(ctx, updates)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to update probate phase")
		writeError(w, http.StatusInternalServerError, "Failed to update estate phase")
		return
	}

	// Write audit trail entry
	_, _, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"fromPhase": string(currentPhase),
		"toPhase":   string(targetPhase),
		"actor":     userID,
		"actorRole": role,
		"notes":     req.Notes,
		"timestamp": now,
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to write probate audit trail")
		// Non-fatal — transition already applied
	}

	// Write notification
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("notifications").Add(ctx, map[string]interface{}{
		"type":      "probate",
		"title":     fmt.Sprintf("Estate phase changed to %s", targetPhase),
		"message":   phaseMessage(targetPhase),
		"createdAt": now,
		"createdBy": userID,
	})

	log.Info().
		Str("estate_id", req.EstateID).
		Str("from", string(currentPhase)).
		Str("to", string(targetPhase)).
		Str("actor", userID).
		Str("role", role).
		Msg("Probate phase transition")

	// Fire phase transition hook (e.g., apply vault document holds on death_reported)
	if h.onPhaseTransition != nil {
		if err := h.onPhaseTransition(ctx, req.EstateID, currentPhase, targetPhase); err != nil {
			log.Warn().Err(err).Str("estate_id", req.EstateID).Msg("Phase transition hook failed (non-fatal)")
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"previousPhase":  string(currentPhase),
		"currentPhase":   string(targetPhase),
		"transitionedAt": now,
	})
}

// HandleGetStatus returns the probate status for an estate including deadlines and small estate evaluation.
func (h *Handler) HandleGetStatus(w http.ResponseWriter, r *http.Request) {
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

	// Verify estate access
	if err := h.verifyEstateAccess(ctx, userID, estateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Estate not found")
		return
	}

	data := estateSnap.Data()
	currentPhase := EstatePhase("active")
	if s, ok := data["probatePhase"].(string); ok && s != "" {
		currentPhase = EstatePhase(s)
	}

	resp := StatusResponse{
		EstateID:         estateID,
		CurrentPhase:     string(currentPhase),
		StateCode:        h.engine.StateCode(),
		StateName:        h.engine.StateName(),
		ProbableTimeline: h.engine.ProbableTimeline(),
		EFilingAvailable: h.engine.EFilingAvailable(),
		CourtSystem:      h.engine.CourtSystem(),
	}

	// Compute deadlines if letters have been issued
	if lettersAt, ok := data["lettersIssuedAt"].(time.Time); ok {
		resp.Deadlines = h.engine.ComputeDeadlines(lettersAt)
	}

	// Compute valid transitions from current phase
	if targets, ok := ValidTransitions[currentPhase]; ok {
		for _, t := range targets {
			resp.ValidTransitions = append(resp.ValidTransitions, string(t))
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// HandleGetChecklist returns the probate checklist for an estate with completion status.
func (h *Handler) HandleGetChecklist(w http.ResponseWriter, r *http.Request) {
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

	// Read completion status from Firestore
	completed := map[string]bool{}
	completionSnap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("checklist_status").Get(ctx)
	if err == nil && completionSnap.Exists() {
		for k, v := range completionSnap.Data() {
			if b, ok := v.(bool); ok {
				completed[k] = b
			}
		}
	}

	resp := ChecklistResponse{
		EstateID:  estateID,
		StateCode: h.engine.StateCode(),
		Items:     h.engine.Checklist(),
		Completed: completed,
	}

	writeJSON(w, http.StatusOK, resp)
}

// HandleUpdateChecklistItem marks a checklist item as complete or incomplete.
func (h *Handler) HandleUpdateChecklistItem(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID string `json:"estateId"`
		ItemID   string `json:"itemId"`
		Complete bool   `json:"complete"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" && role != "admin" && role != "principal" {
		writeError(w, http.StatusForbidden, "Only estate owners, executors, or administrators can update the checklist")
		return
	}

	_, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate").Doc("checklist_status").Set(ctx, map[string]interface{}{
		req.ItemID: req.Complete,
	}, firestore.MergeAll)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Str("item_id", req.ItemID).Msg("Failed to update checklist item")
		writeError(w, http.StatusInternalServerError, "Failed to update checklist item")
		return
	}

	// Audit trail for checklist changes
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":    "checklist_update",
		"itemId":    req.ItemID,
		"complete":  req.Complete,
		"actor":     userID,
		"actorRole": role,
		"timestamp": time.Now(),
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"itemId":   req.ItemID,
		"complete": req.Complete,
	})
}

// HandleEvaluateSmallEstate evaluates whether an estate qualifies for the small estate path.
func (h *Handler) HandleEvaluateSmallEstate(w http.ResponseWriter, r *http.Request) {
	_, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		TotalPersonalProperty float64 `json:"totalPersonalProperty"`
		HasRealEstate         bool    `json:"hasRealEstate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	result := h.engine.EvaluateSmallEstate(req.TotalPersonalProperty, req.HasRealEstate)
	writeJSON(w, http.StatusOK, result)
}

// --- Internal helpers ---

func (h *Handler) verifyEstateAccess(ctx context.Context, userID, estateID string) error {
	docID := userID + "_" + estateID
	snap, err := h.fs.Collection("estate_users").Doc(docID).Get(ctx)
	if err != nil || !snap.Exists() {
		return fmt.Errorf("no access to estate %s", estateID)
	}
	return nil
}

func (h *Handler) getEstateRole(ctx context.Context, userID, estateID string) (string, error) {
	docID := userID + "_" + estateID
	snap, err := h.fs.Collection("estate_users").Doc(docID).Get(ctx)
	if err != nil || !snap.Exists() {
		return "", fmt.Errorf("no access to estate %s", estateID)
	}
	role, _ := snap.Data()["role"].(string)
	if role == "" {
		return "", fmt.Errorf("no role found")
	}
	return role, nil
}

func phaseMessage(phase EstatePhase) string {
	switch phase {
	case PhaseDeathReported:
		return "A death has been reported for this estate. The executor must confirm to proceed."
	case PhaseExecutorConfirmed:
		return "The executor has confirmed their role. Probate proceedings can now begin."
	case PhaseInProbate:
		return "The estate has entered probate. Letters of Office have been issued. Deadlines are now active."
	case PhaseProbateComplete:
		return "Probate proceedings are complete. Final accounting and distributions are in progress."
	case PhaseClosed:
		return "The estate has been closed. All distributions are complete."
	case PhaseSmallEstate:
		return "This estate qualifies for the small estate affidavit process, bypassing formal probate."
	default:
		return "Estate phase has been updated."
	}
}

// --- JSON helpers ---

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
