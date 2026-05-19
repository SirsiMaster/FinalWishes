package guardian

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/iterator"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// Default escalation thresholds (days since last activity).
// Estates can override the base threshold via guardianThreshold field.
const (
	defaultThresholdDays     = 90
	reminderOffsetDays       = 0 // reminder at threshold
	executorNotifyOffsetDays = 7 // executor notified at threshold + 7
	// Day threshold+14: manual only — executor must report via report-status
)

// HandleRunInactivityCheck is an admin-only endpoint (or Cloud Scheduler target)
// that scans all estates for inactivity and escalates as needed.
//
// Escalation levels:
//   - Day threshold:   Send reminder email to owner.       → escalationLevel = "reminder_sent"
//   - Day threshold+7: Send notification to executor.      → escalationLevel = "executor_notified"
//   - Beyond:          Manual only — executor must report via report-status.
func (h *Handler) HandleRunInactivityCheck(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		// Also allow Cloud Scheduler OIDC-authenticated requests (no Firebase user)
		// In production, this would be secured by IAM. For now, require admin.
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// For now, any authenticated user can trigger this (admin-only enforcement
	// is at the route registration level or via Cloud Scheduler IAM).
	_ = userID

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()

	results, err := h.runInactivityCheck(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Inactivity check failed")
		writeError(w, http.StatusInternalServerError, "Inactivity check failed")
		return
	}

	log.Info().
		Int("estates_checked", results.EstatesChecked).
		Int("reminders_sent", results.RemindersSent).
		Int("executors_notified", results.ExecutorsNotified).
		Msg("Inactivity check completed")

	writeJSON(w, http.StatusOK, results)
}

// InactivityResults summarizes the outcome of an inactivity check run.
type InactivityResults struct {
	EstatesChecked    int `json:"estatesChecked"`
	RemindersSent     int `json:"remindersSent"`
	ExecutorsNotified int `json:"executorsNotified"`
}

// runInactivityCheck scans all active estates and escalates based on inactivity.
func (h *Handler) runInactivityCheck(ctx context.Context) (*InactivityResults, error) {
	results := &InactivityResults{}

	// Query all estates that are not already in settlement
	iter := h.fs.Collection("estates").
		Where("status", "!=", "in_settlement").
		Documents(ctx)

	for {
		snap, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return results, fmt.Errorf("iterate estates: %w", err)
		}

		results.EstatesChecked++
		data := snap.Data()
		estateID := snap.Ref.ID

		// Get the estate's inactivity threshold (default 90)
		threshold := defaultThresholdDays
		if t, ok := data["guardianThreshold"].(int64); ok && t > 0 {
			threshold = int(t)
		}

		// Get last activity
		lastActivity, ok := data["lastActivityAt"].(time.Time)
		if !ok {
			// No activity recorded yet — skip (estate might be brand new)
			continue
		}

		daysSince := int(math.Floor(time.Since(lastActivity).Hours() / 24))
		currentLevel, _ := data["escalationLevel"].(string)

		// Determine what escalation is needed
		if daysSince >= threshold+executorNotifyOffsetDays && currentLevel != "executor_notified" {
			// Escalate to executor notification
			if err := h.escalateToExecutorNotified(ctx, estateID, data, daysSince); err != nil {
				log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to notify executor")
			} else {
				results.ExecutorsNotified++
			}
		} else if daysSince >= threshold+reminderOffsetDays && (currentLevel == "" || currentLevel == "none") {
			// Send owner reminder
			if err := h.escalateToReminderSent(ctx, estateID, data, daysSince); err != nil {
				log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to send owner reminder")
			} else {
				results.RemindersSent++
			}
		}
	}

	return results, nil
}

// escalateToReminderSent sends a reminder email to the estate owner and updates escalation level.
func (h *Handler) escalateToReminderSent(ctx context.Context, estateID string, data map[string]interface{}, daysSince int) error {
	ownerEmail, _ := data["ownerEmail"].(string)
	ownerName, _ := data["ownerName"].(string)
	estateName, _ := data["name"].(string)

	if ownerEmail == "" {
		log.Warn().Str("estate_id", estateID).Msg("No owner email — cannot send reminder")
		return nil
	}

	if ownerName == "" {
		ownerName = "there"
	}
	if estateName == "" {
		estateName = "your estate"
	}

	subject := "FinalWishes — We haven't heard from you"
	htmlBody := composeReminderEmail(ownerName, estateName, daysSince)

	// Write to Firestore mail collection (triggers SendGrid)
	_, _, err := h.fs.Collection("mail").Add(ctx, map[string]interface{}{
		"to": ownerEmail,
		"message": map[string]interface{}{
			"subject": subject,
			"html":    htmlBody,
		},
		"createdAt": firestore.ServerTimestamp,
		"source":    "guardian-inactivity-reminder",
		"estateId":  estateID,
	})
	if err != nil {
		return fmt.Errorf("write reminder mail: %w", err)
	}

	// Update escalation level
	_, err = h.fs.Collection("estates").Doc(estateID).Update(ctx, []firestore.Update{
		{Path: "escalationLevel", Value: "reminder_sent"},
	})
	if err != nil {
		return fmt.Errorf("update escalation level: %w", err)
	}

	// Write notification
	_, _, err = h.fs.Collection("estates").Doc(estateID).Collection("notifications").Add(ctx, map[string]interface{}{
		"type":      "guardian_reminder",
		"title":     "Inactivity reminder sent",
		"message":   fmt.Sprintf("A reminder was sent to the estate owner after %d days of inactivity.", daysSince),
		"createdAt": firestore.ServerTimestamp,
	})
	if err != nil {
		log.Warn().Err(err).Str("estate_id", estateID).Msg("Failed to write reminder notification")
	}

	log.Info().Str("estate_id", estateID).Int("days_since", daysSince).Msg("Owner inactivity reminder sent")
	return nil
}

// escalateToExecutorNotified sends a notification to the executor and updates escalation level.
func (h *Handler) escalateToExecutorNotified(ctx context.Context, estateID string, data map[string]interface{}, daysSince int) error {
	estateName, _ := data["name"].(string)
	ownerName, _ := data["ownerName"].(string)

	if estateName == "" {
		estateName = "An estate"
	}
	if ownerName == "" {
		ownerName = "the estate owner"
	}

	// Find executor(s) for this estate via estate_users
	executorEmails, err := h.findExecutorEmails(ctx, estateID)
	if err != nil {
		return fmt.Errorf("find executor emails: %w", err)
	}
	if len(executorEmails) == 0 {
		log.Warn().Str("estate_id", estateID).Msg("No executor found for estate — cannot escalate")
		return nil
	}

	subject := fmt.Sprintf("FinalWishes — %s requires your attention", estateName)
	htmlBody := composeExecutorNotificationEmail(ownerName, estateName, daysSince)

	for _, email := range executorEmails {
		_, _, err := h.fs.Collection("mail").Add(ctx, map[string]interface{}{
			"to": email,
			"message": map[string]interface{}{
				"subject": subject,
				"html":    htmlBody,
			},
			"createdAt": firestore.ServerTimestamp,
			"source":    "guardian-executor-notification",
			"estateId":  estateID,
		})
		if err != nil {
			log.Error().Err(err).Str("email", email).Msg("Failed to send executor notification email")
		}
	}

	// Update escalation level
	_, err = h.fs.Collection("estates").Doc(estateID).Update(ctx, []firestore.Update{
		{Path: "escalationLevel", Value: "executor_notified"},
	})
	if err != nil {
		return fmt.Errorf("update escalation level: %w", err)
	}

	// Write notification
	_, _, err = h.fs.Collection("estates").Doc(estateID).Collection("notifications").Add(ctx, map[string]interface{}{
		"type":      "guardian_executor_notified",
		"title":     "Executor notified of inactivity",
		"message":   fmt.Sprintf("The designated executor has been notified after %d days of owner inactivity.", daysSince),
		"createdAt": firestore.ServerTimestamp,
	})
	if err != nil {
		log.Warn().Err(err).Str("estate_id", estateID).Msg("Failed to write executor notification")
	}

	log.Info().Str("estate_id", estateID).Int("days_since", daysSince).Msg("Executor notified of inactivity")
	return nil
}

// findExecutorEmails looks up executor email addresses for an estate from estate_users.
func (h *Handler) findExecutorEmails(ctx context.Context, estateID string) ([]string, error) {
	iter := h.fs.Collection("estate_users").
		Where("estateId", "==", estateID).
		Where("role", "==", "executor").
		Documents(ctx)

	var emails []string
	for {
		snap, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		if email, ok := snap.Data()["email"].(string); ok && email != "" {
			emails = append(emails, email)
		}
	}
	return emails, nil
}

// --- Email templates ---

func composeReminderEmail(ownerName, estateName string, daysSince int) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0B1D3A;font-family:'Inter',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0B1D3A;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#133378;border-radius:16px;overflow:hidden;">
  <tr>
    <td style="padding:32px 40px 16px;text-align:center;">
      <h1 style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:22px;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
        We Miss You
      </h1>
    </td>
  </tr>
  <tr><td style="padding:0 40px;"><div style="height:2px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div></td></tr>
  <tr>
    <td style="padding:32px 40px;">
      <p style="margin:0 0 16px;font-size:16px;color:#B8C7E0;line-height:1.6;">Hi %s,</p>
      <p style="margin:0 0 16px;font-size:15px;color:#8A9BBD;line-height:1.7;">
        It has been <strong style="color:#C8A951;">%d days</strong> since your last visit to <strong style="color:#FFFFFF;">%s</strong> on FinalWishes.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#8A9BBD;line-height:1.7;">
        Your estate and the people you care about are counting on this being up to date. Take a moment to check in — review your assets, add a Soul Log entry, or simply log in to let us know you are well.
      </p>
      <p style="margin:0;font-size:13px;color:#5A6F94;line-height:1.6;">
        If we do not hear from you, your designated executor will be notified as part of the Guardian Protocol you set up to protect your family.
      </p>
    </td>
  </tr>
  <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div></td></tr>
  <tr>
    <td style="padding:24px 40px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:#5A6F94;">Your guardian,</p>
      <p style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:14px;color:#C8A951;letter-spacing:1px;">FinalWishes</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`, ownerName, daysSince, estateName)
}

func composeExecutorNotificationEmail(ownerName, estateName string, daysSince int) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0B1D3A;font-family:'Inter',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0B1D3A;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#133378;border-radius:16px;overflow:hidden;">
  <tr>
    <td style="padding:32px 40px 16px;text-align:center;">
      <h1 style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:22px;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">
        Executor Notice
      </h1>
    </td>
  </tr>
  <tr><td style="padding:0 40px;"><div style="height:2px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div></td></tr>
  <tr>
    <td style="padding:32px 40px;">
      <p style="margin:0 0 16px;font-size:16px;color:#B8C7E0;line-height:1.6;">Important Notice,</p>
      <p style="margin:0 0 16px;font-size:15px;color:#8A9BBD;line-height:1.7;">
        <strong style="color:#FFFFFF;">%s</strong> has not checked in to <strong style="color:#C8A951;">%s</strong> for <strong style="color:#C8A951;">%d days</strong>.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#8A9BBD;line-height:1.7;">
        As the designated executor, you are being notified as part of the Guardian Protocol. Please reach out to confirm their wellbeing.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#8A9BBD;line-height:1.7;">
        If you need to report a status change, you can do so by logging in to FinalWishes and navigating to the estate settlement panel.
      </p>
      <p style="margin:0;font-size:13px;color:#5A6F94;line-height:1.6;">
        No automatic action will be taken. Settlement can only be initiated by you.
      </p>
    </td>
  </tr>
  <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#C8A951,transparent);"></div></td></tr>
  <tr>
    <td style="padding:24px 40px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:#5A6F94;">The Guardian Protocol</p>
      <p style="margin:0;font-family:'Cinzel',Georgia,serif;font-size:14px;color:#C8A951;letter-spacing:1px;">FinalWishes</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`, ownerName, estateName, daysSince)
}
