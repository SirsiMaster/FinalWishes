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

// QuorumConfig defines the quorum rules for an estate with multiple executors.
// Stored at estates/{estateID}/probate/quorum_config.
type QuorumConfig struct {
	Enabled        bool     `json:"enabled" firestore:"enabled"`
	RequiredVotes  int      `json:"requiredVotes" firestore:"requiredVotes"` // e.g., 2 of 3
	TotalExecutors int      `json:"totalExecutors" firestore:"totalExecutors"`
	ExecutorUIDs   []string `json:"executorUids" firestore:"executorUids"`
}

// QuorumAction represents a proposed action requiring multi-executor approval.
// Stored at estates/{estateID}/quorum_actions/{actionID}.
type QuorumAction struct {
	ID             string          `json:"id" firestore:"-"`
	EstateID       string          `json:"estateId" firestore:"estateId"`
	ActionType     string          `json:"actionType" firestore:"actionType"` // "phase_transition", "asset_distribution", "document_sign"
	Description    string          `json:"description" firestore:"description"`
	ProposedBy     string          `json:"proposedBy" firestore:"proposedBy"`
	ProposedByName string          `json:"proposedByName" firestore:"proposedByName"`
	ProposedAt     time.Time       `json:"proposedAt" firestore:"proposedAt"`
	Status         string          `json:"status" firestore:"status"` // "pending", "approved", "rejected"
	Votes          []QuorumVote    `json:"votes" firestore:"votes"`
	RequiredVotes  int             `json:"requiredVotes" firestore:"requiredVotes"`
	Payload        json.RawMessage `json:"payload,omitempty" firestore:"payload,omitempty"`
	ResolvedAt     *time.Time      `json:"resolvedAt,omitempty" firestore:"resolvedAt,omitempty"`
}

// QuorumVote is a single executor's vote on a quorum action.
type QuorumVote struct {
	ExecutorUID  string    `json:"executorUid" firestore:"executorUid"`
	ExecutorName string    `json:"executorName" firestore:"executorName"`
	Decision     string    `json:"decision" firestore:"decision"` // "approve", "reject"
	Reason       string    `json:"reason,omitempty" firestore:"reason,omitempty"`
	VotedAt      time.Time `json:"votedAt" firestore:"votedAt"`
}

// HandleGetQuorumConfig returns the quorum configuration for an estate.
// GET /api/v1/probate/quorum/config?estate_id=xxx
func (h *Handler) HandleGetQuorumConfig(w http.ResponseWriter, r *http.Request) {
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

	config, err := h.getQuorumConfig(ctx, estateID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"config": nil})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"config": config})
}

// HandleProposeQuorumAction creates a new action that requires quorum approval.
// POST /api/v1/probate/quorum/propose
func (h *Handler) HandleProposeQuorumAction(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID    string          `json:"estateId"`
		ActionType  string          `json:"actionType"`
		Description string          `json:"description"`
		Payload     json.RawMessage `json:"payload,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil || role != "executor" {
		writeError(w, http.StatusForbidden, "Only executors can propose quorum actions")
		return
	}

	config, err := h.getQuorumConfig(ctx, req.EstateID)
	if err != nil || !config.Enabled {
		writeError(w, http.StatusBadRequest, "Quorum is not enabled for this estate")
		return
	}

	// Get proposer name
	euDocID := userID + "_" + req.EstateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	proposerName := "Executor"
	if err == nil {
		if name, _ := euSnap.Data()["fullName"].(string); name != "" {
			proposerName = name
		}
	}

	now := time.Now()
	action := QuorumAction{
		EstateID:       req.EstateID,
		ActionType:     req.ActionType,
		Description:    req.Description,
		ProposedBy:     userID,
		ProposedByName: proposerName,
		ProposedAt:     now,
		Status:         "pending",
		Votes:          []QuorumVote{},
		RequiredVotes:  config.RequiredVotes,
		Payload:        req.Payload,
	}

	docRef, _, err := h.fs.Collection("estates").Doc(req.EstateID).Collection("quorum_actions").Add(ctx, action)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to create quorum action")
		writeError(w, http.StatusInternalServerError, "Failed to create quorum action")
		return
	}

	// Notify other executors
	h.notifyExecutorsOfQuorum(ctx, req.EstateID, proposerName, req.Description, docRef.ID)

	log.Info().
		Str("estate_id", req.EstateID).
		Str("action_id", docRef.ID).
		Str("action_type", req.ActionType).
		Str("proposed_by", userID).
		Msg("Quorum action proposed")

	action.ID = docRef.ID
	writeJSON(w, http.StatusCreated, map[string]interface{}{"action": action})
}

// HandleVoteQuorumAction casts a vote on a pending quorum action.
// POST /api/v1/probate/quorum/vote
func (h *Handler) HandleVoteQuorumAction(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID string `json:"estateId"`
		ActionID string `json:"actionId"`
		Decision string `json:"decision"` // "approve" or "reject"
		Reason   string `json:"reason,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Decision != "approve" && req.Decision != "reject" {
		writeError(w, http.StatusBadRequest, "Decision must be 'approve' or 'reject'")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	role, err := h.getEstateRole(ctx, userID, req.EstateID)
	if err != nil || role != "executor" {
		writeError(w, http.StatusForbidden, "Only executors can vote on quorum actions")
		return
	}

	// Read the action
	actionRef := h.fs.Collection("estates").Doc(req.EstateID).Collection("quorum_actions").Doc(req.ActionID)
	actionSnap, err := actionRef.Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Quorum action not found")
		return
	}

	var action QuorumAction
	if err := actionSnap.DataTo(&action); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read quorum action")
		return
	}

	if action.Status != "pending" {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("This action has already been %s", action.Status))
		return
	}

	// Check if already voted
	for _, v := range action.Votes {
		if v.ExecutorUID == userID {
			writeError(w, http.StatusConflict, "You have already voted on this action")
			return
		}
	}

	// Get voter name
	euDocID := userID + "_" + req.EstateID
	euSnap, _ := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	voterName := "Executor"
	if euSnap != nil {
		if name, _ := euSnap.Data()["fullName"].(string); name != "" {
			voterName = name
		}
	}

	now := time.Now()
	vote := QuorumVote{
		ExecutorUID:  userID,
		ExecutorName: voterName,
		Decision:     req.Decision,
		Reason:       req.Reason,
		VotedAt:      now,
	}

	action.Votes = append(action.Votes, vote)

	// Tally votes
	approveCount := 0
	rejectCount := 0
	for _, v := range action.Votes {
		if v.Decision == "approve" {
			approveCount++
		} else {
			rejectCount++
		}
	}

	// Check if quorum is reached
	config, _ := h.getQuorumConfig(ctx, req.EstateID)
	totalExecutors := 3
	if config != nil {
		totalExecutors = config.TotalExecutors
	}
	requiredVotes := action.RequiredVotes

	if approveCount >= requiredVotes {
		action.Status = "approved"
		action.ResolvedAt = &now
	} else if rejectCount > (totalExecutors - requiredVotes) {
		// Enough rejections that approval is impossible
		action.Status = "rejected"
		action.ResolvedAt = &now
	}

	// Write back
	_, err = actionRef.Set(ctx, action)
	if err != nil {
		log.Error().Err(err).Str("action_id", req.ActionID).Msg("Failed to update quorum action")
		writeError(w, http.StatusInternalServerError, "Failed to record vote")
		return
	}

	// Audit
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":    "quorum_vote",
		"actionId":  req.ActionID,
		"voter":     userID,
		"voterName": voterName,
		"decision":  req.Decision,
		"newStatus": action.Status,
		"timestamp": now,
	})

	// Notify if resolved
	if action.Status == "approved" || action.Status == "rejected" {
		_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("notifications").Add(ctx, map[string]interface{}{
			"type":      "probate",
			"title":     fmt.Sprintf("Quorum action %s", action.Status),
			"message":   fmt.Sprintf("The action \"%s\" has been %s by executor quorum (%d/%d votes).", action.Description, action.Status, approveCount, requiredVotes),
			"createdAt": now,
			"createdBy": "system",
		})
	}

	log.Info().
		Str("estate_id", req.EstateID).
		Str("action_id", req.ActionID).
		Str("voter", userID).
		Str("decision", req.Decision).
		Str("status", action.Status).
		Int("approve_count", approveCount).
		Int("reject_count", rejectCount).
		Msg("Quorum vote recorded")

	action.ID = req.ActionID
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"action":       action,
		"voteRecorded": true,
	})
}

// HandleListQuorumActions returns all quorum actions for an estate.
// GET /api/v1/probate/quorum/actions?estate_id=xxx
func (h *Handler) HandleListQuorumActions(w http.ResponseWriter, r *http.Request) {
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

	snaps, err := h.fs.Collection("estates").Doc(estateID).Collection("quorum_actions").
		OrderBy("proposedAt", firestore.Desc).
		Limit(50).
		Documents(ctx).
		GetAll()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list quorum actions")
		return
	}

	actions := make([]QuorumAction, 0, len(snaps))
	for _, snap := range snaps {
		var a QuorumAction
		if err := snap.DataTo(&a); err != nil {
			continue
		}
		a.ID = snap.Ref.ID
		actions = append(actions, a)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"actions": actions})
}

// --- Internal helpers ---

func (h *Handler) getQuorumConfig(ctx context.Context, estateID string) (*QuorumConfig, error) {
	snap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("quorum_config").Get(ctx)
	if err != nil {
		return nil, err
	}
	var config QuorumConfig
	if err := snap.DataTo(&config); err != nil {
		return nil, err
	}
	return &config, nil
}

func (h *Handler) notifyExecutorsOfQuorum(ctx context.Context, estateID, proposerName, description, actionID string) {
	config, err := h.getQuorumConfig(ctx, estateID)
	if err != nil || config == nil {
		return
	}

	for _, uid := range config.ExecutorUIDs {
		euDocID := uid + "_" + estateID
		euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
		if err != nil {
			continue
		}
		email, _ := euSnap.Data()["email"].(string)
		name, _ := euSnap.Data()["fullName"].(string)
		if email == "" {
			continue
		}

		greeting := "Dear Executor"
		if name != "" {
			greeting = fmt.Sprintf("Dear %s", name)
		}

		_, _, _ = h.fs.Collection("mail").Add(ctx, map[string]interface{}{
			"to":        email,
			"createdAt": time.Now(),
			"source":    "quorum-action-proposed",
			"estateId":  estateID,
			"message": map[string]interface{}{
				"subject": "FinalWishes — Executor vote required",
				"text": fmt.Sprintf(
					"%s,\n\n%s has proposed an action that requires executor approval:\n\n\"%s\"\n\n"+
						"Please log in to FinalWishes to review and cast your vote.\n\n— FinalWishes",
					greeting, proposerName, description,
				),
			},
		})
	}
}
