// Package guardian implements the Guardian Protocol — the system that ensures
// FinalWishes actually acts when the moment arrives. Without this, the app is
// just storage. With it, it's an active guardian of a person's legacy.
//
// Endpoints:
//   - POST /api/v1/guardian/check-in         — Owner activity heartbeat
//   - POST /api/v1/guardian/report-status     — Executor reports incapacity/death
//   - GET  /api/v1/guardian/status            — Guardian status for an estate
//   - POST /api/v1/guardian/run-inactivity-check — Admin-only inactivity cron
package guardian

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/iterator"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// Handler manages Guardian Protocol endpoints.
type Handler struct {
	fs *firestore.Client
}

// NewHandler creates a guardian handler.
func NewHandler(fs *firestore.Client) *Handler {
	return &Handler{fs: fs}
}

// --- Request / Response types ---

// ReportStatusRequest is the payload for POST /api/v1/guardian/report-status.
type ReportStatusRequest struct {
	EstateID   string `json:"estateId"`
	Status     string `json:"status"` // "incapacity" or "death"
	ReportedBy string `json:"reportedBy"`
	Notes      string `json:"notes,omitempty"`
}

// GuardianStatusResponse is the response for GET /api/v1/guardian/status.
type GuardianStatusResponse struct {
	LastActivityAt      *time.Time `json:"lastActivityAt"`
	DaysSinceActivity   int        `json:"daysSinceActivity"`
	InactivityThreshold int        `json:"inactivityThreshold"`
	EscalationLevel     string     `json:"escalationLevel"`
	SettlementType      *string    `json:"settlementType"`
}

// --- Handlers ---

// HandleCheckIn records owner activity on the estate. Called by the frontend
// on each owner login. Simple timestamp write — the heartbeat of the Guardian Protocol.
func (h *Handler) HandleCheckIn(w http.ResponseWriter, r *http.Request) {
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
	if req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Verify estate access
	if err := h.verifyEstateAccess(ctx, userID, req.EstateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Update lastActivityAt on the estate document
	_, err = h.fs.Collection("estates").Doc(req.EstateID).Update(ctx, []firestore.Update{
		{Path: "lastActivityAt", Value: time.Now()},
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to update lastActivityAt")
		writeError(w, http.StatusInternalServerError, "Failed to record activity")
		return
	}

	log.Debug().Str("estate_id", req.EstateID).Str("uid", userID).Msg("Guardian check-in recorded")
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleReportStatus allows an executor to report owner incapacity or death,
// triggering the settlement process and capsule delivery.
func (h *Handler) HandleReportStatus(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req ReportStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}
	if req.Status != "incapacity" && req.Status != "death" {
		writeError(w, http.StatusBadRequest, "status must be 'incapacity' or 'death'")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Verify executor or admin role
	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}
	if role != "executor" && role != "admin" {
		writeError(w, http.StatusForbidden, "Only executors or administrators can report status changes")
		return
	}

	now := time.Now()

	// Step 1: Update estate document to enter settlement
	_, err = h.fs.Collection("estates").Doc(req.EstateID).Update(ctx, []firestore.Update{
		{Path: "status", Value: "in_settlement"},
		{Path: "settlementReportedAt", Value: now},
		{Path: "settlementReportedBy", Value: userID},
		{Path: "settlementType", Value: req.Status},
		{Path: "escalationLevel", Value: "in_settlement"},
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to update estate for settlement")
		writeError(w, http.StatusInternalServerError, "Failed to update estate status")
		return
	}

	// Step 2: Trigger capsule delivery for on_passing / on_settlement capsules
	delivered, err := h.triggerSettlementCapsules(ctx, req.EstateID)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Error delivering settlement capsules")
		// Continue — estate status is already updated, capsule delivery is best-effort
	}

	// Step 3: Write notification
	_, _, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("notifications").Add(ctx, map[string]interface{}{
		"type":      "settlement",
		"title":     "Estate entered settlement",
		"message":   fmt.Sprintf("The estate has entered settlement due to reported %s. Time capsules with settlement triggers are being delivered.", req.Status),
		"createdAt": now,
		"createdBy": userID,
	})
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to write settlement notification")
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("status", req.Status).
		Str("reported_by", userID).
		Int("capsules_triggered", delivered).
		Msg("Estate entered settlement — Guardian Protocol activated")

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":            "settlement_initiated",
		"settlementType":    req.Status,
		"capsulesTriggered": delivered,
	})
}

// HandleGetStatus returns the guardian status for an estate.
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

	// Verify estate access (any role)
	if err := h.verifyEstateAccess(ctx, userID, estateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Read estate document
	snap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Estate not found")
		return
	}

	data := snap.Data()
	resp := GuardianStatusResponse{
		InactivityThreshold: 90, // default
		EscalationLevel:     "none",
	}

	// Parse inactivity threshold if set
	if threshold, ok := data["guardianThreshold"].(int64); ok && threshold > 0 {
		resp.InactivityThreshold = int(threshold)
	}

	// Parse lastActivityAt
	if lastActivity, ok := data["lastActivityAt"].(time.Time); ok {
		resp.LastActivityAt = &lastActivity
		resp.DaysSinceActivity = int(math.Floor(time.Since(lastActivity).Hours() / 24))
	}

	// Parse escalation level
	if level, ok := data["escalationLevel"].(string); ok {
		resp.EscalationLevel = level
	}

	// Parse settlement type
	if st, ok := data["settlementType"].(string); ok {
		resp.SettlementType = &st
	}

	writeJSON(w, http.StatusOK, resp)
}

// --- Capsule trigger helpers ---

// triggerSettlementCapsules finds all pending capsules with on_passing or on_settlement
// triggers and enqueues them for delivery via the Firestore mail collection.
func (h *Handler) triggerSettlementCapsules(ctx context.Context, estateID string) (int, error) {
	capsulesRef := h.fs.Collection("estates").Doc(estateID).Collection("capsules")

	// Query pending capsules with settlement-related triggers
	delivered := 0
	triggerTypes := []string{"on_death", "on_settlement", "on_passing"}

	for _, trigger := range triggerTypes {
		iter := capsulesRef.
			Where("status", "==", "awaiting_trigger").
			Where("deliveryType", "==", trigger).
			Documents(ctx)

		for {
			snap, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				log.Error().Err(err).Str("trigger", trigger).Msg("Error iterating capsules")
				break
			}

			data := snap.Data()
			capsuleID := snap.Ref.ID

			// Update capsule status to delivering
			_, err = snap.Ref.Update(ctx, []firestore.Update{
				{Path: "status", Value: "delivering"},
			})
			if err != nil {
				log.Error().Err(err).Str("capsule_id", capsuleID).Msg("Failed to update capsule status")
				continue
			}

			// Extract delivery fields
			recipientEmail, _ := data["recipientEmail"].(string)
			recipientName, _ := data["recipientName"].(string)
			senderName, _ := data["senderName"].(string)
			message, _ := data["message"].(string)
			subject, _ := data["subject"].(string)

			if recipientEmail == "" {
				log.Warn().Str("capsule_id", capsuleID).Msg("Capsule has no recipient email — skipping")
				continue
			}
			if subject == "" {
				subject = fmt.Sprintf("A Message from %s", senderName)
			}

			htmlBody := composeSettlementEmail(senderName, recipientName, message)

			// Write to Firestore `mail` collection — triggers Firebase SendGrid extension
			_, _, err = h.fs.Collection("mail").Add(ctx, map[string]interface{}{
				"to": recipientEmail,
				"message": map[string]interface{}{
					"subject": subject,
					"html":    htmlBody,
				},
				"createdAt": firestore.ServerTimestamp,
				"source":    "guardian-settlement",
				"estateId":  estateID,
				"capsuleId": capsuleID,
			})
			if err != nil {
				log.Error().Err(err).Str("capsule_id", capsuleID).Msg("Failed to write mail document for capsule")
				continue
			}

			// Mark as delivered
			_, err = snap.Ref.Update(ctx, []firestore.Update{
				{Path: "status", Value: "delivered"},
				{Path: "deliveredAt", Value: time.Now()},
			})
			if err != nil {
				log.Error().Err(err).Str("capsule_id", capsuleID).Msg("Failed to mark capsule as delivered")
			}

			delivered++
			log.Info().
				Str("capsule_id", capsuleID).
				Str("recipient", recipientEmail).
				Str("trigger", trigger).
				Msg("Settlement capsule delivered")
		}
	}

	return delivered, nil
}

// --- Internal helpers ---

// verifyEstateAccess checks the estate_users junction collection.
func (h *Handler) verifyEstateAccess(ctx context.Context, userID, estateID string) error {
	docID := userID + "_" + estateID
	snap, err := h.fs.Collection("estate_users").Doc(docID).Get(ctx)
	if err != nil || !snap.Exists() {
		return fmt.Errorf("no access to estate %s", estateID)
	}
	return nil
}

// getEstateRole returns the user's role for the given estate.
func (h *Handler) getEstateRole(ctx context.Context, userID, estateID string) (string, error) {
	docID := userID + "_" + estateID
	snap, err := h.fs.Collection("estate_users").Doc(docID).Get(ctx)
	if err != nil || !snap.Exists() {
		return "", fmt.Errorf("no access to estate %s", estateID)
	}
	role, _ := snap.Data()["role"].(string)
	if role == "" {
		return "", fmt.Errorf("no role found for user %s on estate %s", userID, estateID)
	}
	return role, nil
}

// composeSettlementEmail builds a Royal Neo-Deco styled HTML email for settlement delivery.
func composeSettlementEmail(senderName, recipientName, message string) string {
	greeting := "Dear Friend"
	if recipientName != "" {
		greeting = fmt.Sprintf("Dear %s", recipientName)
	}
	if senderName == "" {
		senderName = "Someone who cares about you"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0B1D3A;font-family:'Inter',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0B1D3A;">
<tr><td align="center" style="padding:40px 20px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#133378;border-radius:16px;overflow:hidden;">
  <tr>
    <td style="padding:32px 40px 16px;text-align:center;">
      <h1 style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:24px;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
        A Message For You
      </h1>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px;">
      <div style="height:2px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;">
      <p style="margin:0 0 24px;font-size:16px;color:#B8C7E0;line-height:1.6;">
        %s,
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#8A9BBD;">
        <strong style="color:#C8A951;">%s</strong> prepared this message for you:
      </p>
      <div style="margin:24px 0;padding:24px;background-color:rgba(255,255,255,0.06);border-left:3px solid #C8A951;border-radius:8px;">
        <p style="margin:0;font-size:16px;color:#FFFFFF;line-height:1.8;white-space:pre-wrap;">%s</p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:#5A6F94;">
        Delivered with care by
      </p>
      <p style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:14px;color:#C8A951;letter-spacing:1px;">
        FinalWishes
      </p>
      <p style="margin:8px 0 0;font-size:11px;color:#3D5280;">
        The Estate Operating System &mdash; finalwishes.app
      </p>
    </td>
  </tr>
</table>

</td></tr>
</table>
</body>
</html>`, greeting, senderName, message)
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
