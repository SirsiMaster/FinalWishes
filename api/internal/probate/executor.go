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

// ExecutorActivation represents the state of executor confirmation for an estate.
type ExecutorActivation struct {
	EstateID        string     `json:"estateId" firestore:"estateId"`
	ExecutorUID     string     `json:"executorUid" firestore:"executorUid"`
	ExecutorName    string     `json:"executorName" firestore:"executorName"`
	ExecutorEmail   string     `json:"executorEmail" firestore:"executorEmail"`
	Status          string     `json:"status" firestore:"status"` // "pending", "confirmed", "declined"
	ConfirmedAt     *time.Time `json:"confirmedAt,omitempty" firestore:"confirmedAt,omitempty"`
	DeathReportedAt *time.Time `json:"deathReportedAt,omitempty" firestore:"deathReportedAt,omitempty"`
}

// HandleGetExecutorStatus returns the executor activation status for an estate.
// GET /api/v1/probate/executor/status?estate_id=xxx
func (h *Handler) HandleGetExecutorStatus(w http.ResponseWriter, r *http.Request) {
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

	// Read activation status from probate subcollection
	activationSnap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("executor_activation").Get(ctx)
	if err != nil {
		// No activation record — estate hasn't entered death_reported yet
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"activation": nil,
		})
		return
	}

	var activation ExecutorActivation
	if err := activationSnap.DataTo(&activation); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read executor status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"activation": activation,
	})
}

// HandleConfirmExecutorRole allows the designated executor to confirm their role
// after a death has been reported. This transitions the estate from death_reported
// to executor_confirmed. The executor must have already been designated on the estate.
//
// POST /api/v1/probate/executor/confirm
func (h *Handler) HandleConfirmExecutorRole(w http.ResponseWriter, r *http.Request) {
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

	// Must be executor role
	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" {
		writeError(w, http.StatusForbidden, "Only a designated executor can confirm this role")
		return
	}

	// Verify estate is in death_reported phase
	estateSnap, err := h.fs.Collection("estates").Doc(req.EstateID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Estate not found")
		return
	}
	currentPhase, _ := estateSnap.DataAt("probatePhase")
	if currentPhase != string(PhaseDeathReported) {
		writeError(w, http.StatusBadRequest, fmt.Sprintf(
			"Estate must be in '%s' phase to confirm executor role. Current phase: %v",
			PhaseDeathReported, currentPhase,
		))
		return
	}

	now := time.Now()

	// Get executor details
	euDocID := userID + "_" + req.EstateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read executor details")
		return
	}
	executorName, _ := euSnap.Data()["fullName"].(string)
	executorEmail, _ := euSnap.Data()["email"].(string)

	// Write activation record
	activation := ExecutorActivation{
		EstateID:      req.EstateID,
		ExecutorUID:   userID,
		ExecutorName:  executorName,
		ExecutorEmail: executorEmail,
		Status:        "confirmed",
		ConfirmedAt:   &now,
	}

	_, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate").Doc("executor_activation").Set(ctx, activation)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to write executor activation")
		writeError(w, http.StatusInternalServerError, "Failed to record confirmation")
		return
	}

	// Transition estate to executor_confirmed
	_, err = h.fs.Collection("estates").Doc(req.EstateID).Update(ctx, []firestore.Update{
		{Path: "probatePhase", Value: string(PhaseExecutorConfirmed)},
		{Path: "probatePhaseUpdatedAt", Value: now},
		{Path: "probatePhaseUpdatedBy", Value: userID},
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to transition to executor_confirmed")
		writeError(w, http.StatusInternalServerError, "Failed to update estate phase")
		return
	}

	// Audit trail
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":       "executor_confirmed",
		"fromPhase":    string(PhaseDeathReported),
		"toPhase":      string(PhaseExecutorConfirmed),
		"actor":        userID,
		"actorRole":    "executor",
		"executorName": executorName,
		"timestamp":    now,
	})

	// Send notification to estate members
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("notifications").Add(ctx, map[string]interface{}{
		"type":      "probate",
		"title":     "Executor confirmed",
		"message":   fmt.Sprintf("%s has confirmed their role as executor. Probate proceedings may now begin.", executorName),
		"createdAt": now,
		"createdBy": userID,
	})

	// Queue email notification to all estate members
	h.notifyEstateMembers(ctx, req.EstateID, executorName)

	log.Info().
		Str("estate_id", req.EstateID).
		Str("executor", userID).
		Str("executor_name", executorName).
		Msg("Executor confirmed — estate ready for probate")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":       "confirmed",
		"currentPhase": string(PhaseExecutorConfirmed),
		"message":      "Your executor role has been confirmed. You may now proceed with probate filings.",
		"nextSteps": []string{
			"Review the probate checklist for required filings",
			"Upload and confirm the death certificate if not already done",
			"File the Petition for Probate with the court",
			"Transition the estate to 'In Probate' when Letters of Office are received",
		},
	})
}

// notifyEstateMembers sends email notifications to all heirs and other estate members
// about the executor confirmation.
func (h *Handler) notifyEstateMembers(ctx context.Context, estateID, executorName string) {
	estateName := "the estate"
	estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err == nil {
		if name, _ := estateSnap.DataAt("name"); name != nil {
			if s, ok := name.(string); ok && s != "" {
				estateName = s
			}
		}
	}

	// Collect heir emails
	heirSnaps, err := h.fs.Collection("estates").Doc(estateID).Collection("heirs").Documents(ctx).GetAll()
	if err != nil {
		return
	}

	for _, snap := range heirSnaps {
		email, _ := snap.Data()["email"].(string)
		name, _ := snap.Data()["fullName"].(string)
		if email == "" {
			continue
		}

		greeting := "Dear family member"
		if name != "" {
			greeting = fmt.Sprintf("Dear %s", name)
		}

		_, _, _ = h.fs.Collection("mail").Add(ctx, map[string]interface{}{
			"to":        email,
			"createdAt": time.Now(),
			"source":    "probate-executor-confirmation",
			"estateId":  estateID,
			"message": map[string]interface{}{
				"subject": fmt.Sprintf("FinalWishes — Executor confirmed for %s", estateName),
				"text": fmt.Sprintf(
					"%s,\n\n%s has confirmed their role as executor for %s. "+
						"Probate proceedings will now begin. You will be notified of any important "+
						"updates throughout the process.\n\n"+
						"If you have questions, please log in to FinalWishes or contact the executor directly.\n\n"+
						"— FinalWishes",
					greeting, executorName, estateName,
				),
			},
		})
	}
}
