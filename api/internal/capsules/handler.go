// Package capsules implements deferred delivery of time capsule messages.
// Capsules are scheduled via Cloud Tasks (one-time) or Cloud Scheduler (anniversary).
// Delivery writes to the Firestore `mail` collection, which triggers the
// Firebase SendGrid extension to send the actual email.
package capsules

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	cloudtaskspb "cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

var (
	queueLocation = "us-central1"
	queueName     = "capsule-delivery"
	deliverURL    string
)

func init() {
	deliverURL = os.Getenv("CAPSULE_DELIVERY_URL")
	if deliverURL == "" {
		deliverURL = "https://finalwishes-api-860699311615.us-central1.run.app/api/v1/capsules/deliver"
	}
}

// Handler manages time capsule scheduling and delivery.
type Handler struct {
	fs    *firestore.Client
	tasks *cloudtasks.Client
	// projectID is the GCP project (extracted from Firestore client path).
	projectID string
}

// NewHandler creates a capsules handler.
func NewHandler(fs *firestore.Client, tasks *cloudtasks.Client, projectID string) *Handler {
	return &Handler{
		fs:        fs,
		tasks:     tasks,
		projectID: projectID,
	}
}

// --- Request / Response types ---

// ScheduleRequest is the payload for POST /api/v1/capsules/schedule.
type ScheduleRequest struct {
	EstateID  string `json:"estateId"`
	CapsuleID string `json:"capsuleId"`
}

// TaskPayload is what Cloud Tasks sends to the deliver endpoint.
type TaskPayload struct {
	EstateID  string `json:"estateId"`
	CapsuleID string `json:"capsuleId"`
	Action    string `json:"action"`
}

// CancelRequest is the payload for POST /api/v1/capsules/cancel.
type CancelRequest struct {
	EstateID  string `json:"estateId"`
	CapsuleID string `json:"capsuleId"`
}

// --- Handlers ---

// HandleScheduleCapsule creates a Cloud Task to deliver a capsule at its scheduled time.
// Called after a time capsule is written to Firestore.
//
// Delivery types:
//   - scheduled_date → Cloud Task with ScheduleTime
//   - anniversary    → Cloud Task for next occurrence (re-enqueues after each delivery)
//   - on_death / on_settlement → no task; triggered by estate status listener
func (h *Handler) HandleScheduleCapsule(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req ScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EstateID == "" || req.CapsuleID == "" {
		writeError(w, http.StatusBadRequest, "estateId and capsuleId are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Verify estate access
	if err := h.verifyEstateAccess(ctx, userID, req.EstateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Read capsule from Firestore
	capsuleRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("capsules").Doc(req.CapsuleID)
	snap, err := capsuleRef.Get(ctx)
	if err != nil {
		log.Error().Err(err).Str("capsule_id", req.CapsuleID).Msg("Capsule not found")
		writeError(w, http.StatusNotFound, "Capsule not found")
		return
	}

	data := snap.Data()
	deliveryType, _ := data["deliveryType"].(string)

	switch deliveryType {
	case "scheduled_date":
		scheduledDate, ok := data["scheduledDate"].(time.Time)
		if !ok {
			writeError(w, http.StatusBadRequest, "Capsule missing scheduledDate")
			return
		}
		taskName, err := h.createDeliveryTask(ctx, req.EstateID, req.CapsuleID, scheduledDate)
		if err != nil {
			log.Error().Err(err).Msg("Failed to create Cloud Task for capsule delivery")
			writeError(w, http.StatusInternalServerError, "Failed to schedule delivery")
			return
		}

		// Store task name on capsule for cancellation
		_, err = capsuleRef.Update(ctx, []firestore.Update{
			{Path: "taskName", Value: taskName},
			{Path: "status", Value: "scheduled"},
		})
		if err != nil {
			log.Error().Err(err).Msg("Failed to update capsule with task name")
		}

		log.Info().
			Str("estate_id", req.EstateID).
			Str("capsule_id", req.CapsuleID).
			Time("scheduled_for", scheduledDate).
			Str("task", taskName).
			Msg("Capsule delivery scheduled")

		writeJSON(w, http.StatusOK, map[string]string{
			"status":   "scheduled",
			"taskName": taskName,
		})

	case "anniversary":
		// For anniversary capsules, schedule for the next occurrence of the date.
		anniversaryDate, ok := data["anniversaryDate"].(time.Time)
		if !ok {
			writeError(w, http.StatusBadRequest, "Capsule missing anniversaryDate")
			return
		}

		nextDelivery := nextAnniversary(anniversaryDate)
		taskName, err := h.createDeliveryTask(ctx, req.EstateID, req.CapsuleID, nextDelivery)
		if err != nil {
			log.Error().Err(err).Msg("Failed to create Cloud Task for anniversary capsule")
			writeError(w, http.StatusInternalServerError, "Failed to schedule anniversary delivery")
			return
		}

		_, err = capsuleRef.Update(ctx, []firestore.Update{
			{Path: "taskName", Value: taskName},
			{Path: "status", Value: "scheduled"},
			{Path: "nextDelivery", Value: nextDelivery},
		})
		if err != nil {
			log.Error().Err(err).Msg("Failed to update capsule with task name")
		}

		log.Info().
			Str("estate_id", req.EstateID).
			Str("capsule_id", req.CapsuleID).
			Time("next_delivery", nextDelivery).
			Msg("Anniversary capsule scheduled")

		writeJSON(w, http.StatusOK, map[string]string{
			"status":       "scheduled",
			"taskName":     taskName,
			"nextDelivery": nextDelivery.Format(time.RFC3339),
		})

	case "on_death", "on_settlement":
		// These are event-driven, not time-driven. Mark as awaiting trigger.
		_, err = capsuleRef.Update(ctx, []firestore.Update{
			{Path: "status", Value: "awaiting_trigger"},
		})
		if err != nil {
			log.Error().Err(err).Msg("Failed to update capsule status")
		}

		log.Info().
			Str("estate_id", req.EstateID).
			Str("capsule_id", req.CapsuleID).
			Str("delivery_type", deliveryType).
			Msg("Capsule set to await estate event trigger")

		writeJSON(w, http.StatusOK, map[string]string{
			"status": "awaiting_trigger",
		})

	default:
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Unknown delivery type: %s", deliveryType))
	}
}

// HandleDeliverCapsule is the Cloud Tasks callback. It reads the capsule,
// composes the email, and writes to the Firestore `mail` collection.
func (h *Handler) HandleDeliverCapsule(w http.ResponseWriter, r *http.Request) {
	// Verify request originates from Cloud Tasks
	taskName := r.Header.Get("X-CloudTasks-TaskName")
	queueHeader := r.Header.Get("X-CloudTasks-QueueName")
	if taskName == "" || queueHeader == "" {
		log.Warn().Msg("Deliver endpoint called without Cloud Tasks headers")
		writeError(w, http.StatusForbidden, "This endpoint accepts only Cloud Tasks requests")
		return
	}

	var payload TaskPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid task payload")
		return
	}
	if payload.EstateID == "" || payload.CapsuleID == "" {
		writeError(w, http.StatusBadRequest, "Missing estateId or capsuleId in payload")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	logger := log.With().
		Str("estate_id", payload.EstateID).
		Str("capsule_id", payload.CapsuleID).
		Str("task", taskName).
		Logger()

	// Read capsule
	capsuleRef := h.fs.Collection("estates").Doc(payload.EstateID).Collection("capsules").Doc(payload.CapsuleID)
	snap, err := capsuleRef.Get(ctx)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to read capsule for delivery")
		writeError(w, http.StatusInternalServerError, "Capsule read failed")
		return
	}

	data := snap.Data()

	// Idempotency: skip if already delivered
	status, _ := data["status"].(string)
	if status == "delivered" {
		logger.Info().Msg("Capsule already delivered — skipping (idempotent)")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract fields
	recipientEmail, _ := data["recipientEmail"].(string)
	recipientName, _ := data["recipientName"].(string)
	senderName, _ := data["senderName"].(string)
	message, _ := data["message"].(string)
	subject, _ := data["subject"].(string)
	deliveryType, _ := data["deliveryType"].(string)

	if recipientEmail == "" {
		logger.Error().Msg("Capsule has no recipient email — cannot deliver")
		writeError(w, http.StatusBadRequest, "No recipient email")
		return
	}
	if subject == "" {
		subject = fmt.Sprintf("A Time Capsule from %s", senderName)
	}

	// Compose styled HTML email
	htmlBody := composeEmail(senderName, recipientName, message)

	// Write to Firestore `mail` collection — triggers Firebase SendGrid extension
	_, _, err = h.fs.Collection("mail").Add(ctx, map[string]interface{}{
		"to": recipientEmail,
		"message": map[string]interface{}{
			"subject": subject,
			"html":    htmlBody,
		},
		"createdAt": firestore.ServerTimestamp,
		"source":    "time-capsule",
		"estateId":  payload.EstateID,
		"capsuleId": payload.CapsuleID,
	})
	if err != nil {
		logger.Error().Err(err).Msg("Failed to write mail document")
		writeError(w, http.StatusInternalServerError, "Email dispatch failed")
		return
	}

	// Mark capsule as delivered
	now := time.Now()
	updates := []firestore.Update{
		{Path: "status", Value: "delivered"},
		{Path: "deliveredAt", Value: now},
	}

	// For anniversary capsules, re-enqueue for next year
	if deliveryType == "anniversary" {
		anniversaryDate, ok := data["anniversaryDate"].(time.Time)
		if ok {
			nextDelivery := nextAnniversary(anniversaryDate)
			newTaskName, err := h.createDeliveryTask(ctx, payload.EstateID, payload.CapsuleID, nextDelivery)
			if err != nil {
				logger.Error().Err(err).Msg("Failed to re-enqueue anniversary capsule")
			} else {
				updates = append(updates,
					firestore.Update{Path: "taskName", Value: newTaskName},
					firestore.Update{Path: "nextDelivery", Value: nextDelivery},
					firestore.Update{Path: "status", Value: "scheduled"}, // Override delivered — it's recurring
				)
				logger.Info().Time("next_delivery", nextDelivery).Msg("Anniversary capsule re-enqueued")
			}
		}
	}

	_, err = capsuleRef.Update(ctx, updates)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to update capsule status after delivery")
	}

	logger.Info().Str("recipient", recipientEmail).Msg("Capsule delivered successfully")
	w.WriteHeader(http.StatusOK)
}

// HandleCancelScheduled cancels a pending Cloud Task for a capsule.
func (h *Handler) HandleCancelScheduled(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req CancelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EstateID == "" || req.CapsuleID == "" {
		writeError(w, http.StatusBadRequest, "estateId and capsuleId are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Verify estate access
	if err := h.verifyEstateAccess(ctx, userID, req.EstateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Read capsule to get task name
	capsuleRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("capsules").Doc(req.CapsuleID)
	snap, err := capsuleRef.Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Capsule not found")
		return
	}

	data := snap.Data()
	taskName, _ := data["taskName"].(string)
	if taskName == "" {
		// No task to cancel — might be on_death/on_settlement or already delivered
		_, _ = capsuleRef.Update(ctx, []firestore.Update{
			{Path: "status", Value: "cancelled"},
		})
		writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
		return
	}

	// Delete the Cloud Task
	err = h.tasks.DeleteTask(ctx, &cloudtaskspb.DeleteTaskRequest{
		Name: taskName,
	})
	if err != nil {
		log.Warn().Err(err).Str("task", taskName).Msg("Failed to delete Cloud Task (may have already executed)")
		// Continue — we still want to mark it cancelled
	}

	// Update capsule status
	_, err = capsuleRef.Update(ctx, []firestore.Update{
		{Path: "status", Value: "cancelled"},
		{Path: "taskName", Value: firestore.Delete},
	})
	if err != nil {
		log.Error().Err(err).Msg("Failed to update capsule status to cancelled")
		writeError(w, http.StatusInternalServerError, "Failed to update capsule")
		return
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("capsule_id", req.CapsuleID).
		Msg("Capsule delivery cancelled")

	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// --- Internal helpers ---

// createDeliveryTask enqueues a Cloud Task to deliver a capsule at the given time.
func (h *Handler) createDeliveryTask(ctx context.Context, estateID, capsuleID string, scheduleTime time.Time) (string, error) {
	queuePath := fmt.Sprintf("projects/%s/locations/%s/queues/%s", h.projectID, queueLocation, queueName)

	payload, err := json.Marshal(TaskPayload{
		EstateID:  estateID,
		CapsuleID: capsuleID,
		Action:    "deliver",
	})
	if err != nil {
		return "", fmt.Errorf("marshal task payload: %w", err)
	}

	task := &cloudtaskspb.Task{
		ScheduleTime: timestamppb.New(scheduleTime),
		MessageType: &cloudtaskspb.Task_HttpRequest{
			HttpRequest: &cloudtaskspb.HttpRequest{
				HttpMethod: cloudtaskspb.HttpMethod_POST,
				Url:        deliverURL,
				Headers: map[string]string{
					"Content-Type": "application/json",
				},
				Body: payload,
				AuthorizationHeader: &cloudtaskspb.HttpRequest_OidcToken{
					OidcToken: &cloudtaskspb.OidcToken{
						ServiceAccountEmail: fmt.Sprintf("finalwishes-api@%s.iam.gserviceaccount.com", h.projectID),
						Audience:            deliverURL,
					},
				},
			},
		},
	}

	resp, err := h.tasks.CreateTask(ctx, &cloudtaskspb.CreateTaskRequest{
		Parent: queuePath,
		Task:   task,
	})
	if err != nil {
		return "", fmt.Errorf("create cloud task: %w", err)
	}

	return resp.Name, nil
}

// verifyEstateAccess checks the estate_users junction collection.
func (h *Handler) verifyEstateAccess(ctx context.Context, userID, estateID string) error {
	docID := userID + "_" + estateID
	snap, err := h.fs.Collection("estate_users").Doc(docID).Get(ctx)
	if err != nil || !snap.Exists() {
		return fmt.Errorf("no access to estate %s", estateID)
	}
	return nil
}

// nextAnniversary returns the next occurrence of a date (same month/day, future year).
func nextAnniversary(date time.Time) time.Time {
	now := time.Now()
	thisYear := time.Date(now.Year(), date.Month(), date.Day(), 9, 0, 0, 0, time.UTC)
	if thisYear.After(now) {
		return thisYear
	}
	return time.Date(now.Year()+1, date.Month(), date.Day(), 9, 0, 0, 0, time.UTC)
}

// composeEmail builds a Royal Neo-Deco styled HTML email for capsule delivery.
func composeEmail(senderName, recipientName, message string) string {
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
  <!-- Header -->
  <tr>
    <td style="padding:32px 40px 16px;text-align:center;">
      <h1 style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:24px;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
        Time Capsule
      </h1>
    </td>
  </tr>

  <!-- Gold accent line -->
  <tr>
    <td style="padding:0 40px;">
      <div style="height:2px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px 40px;">
      <p style="margin:0 0 24px;font-size:16px;color:#B8C7E0;line-height:1.6;">
        %s,
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#8A9BBD;">
        A message was left for you by <strong style="color:#C8A951;">%s</strong>:
      </p>
      <div style="margin:24px 0;padding:24px;background-color:rgba(255,255,255,0.06);border-left:3px solid #C8A951;border-radius:8px;">
        <p style="margin:0;font-size:16px;color:#FFFFFF;line-height:1.8;white-space:pre-wrap;">%s</p>
      </div>
    </td>
  </tr>

  <!-- Gold accent line -->
  <tr>
    <td style="padding:0 40px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div>
    </td>
  </tr>

  <!-- Footer -->
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
