// Package guidance implements the Shepherd — FinalWishes' estate completion
// scoring engine. v1 is deterministic (counts subcollections). v2 will add
// Gemini/Genkit for natural language suggestions.
package guidance

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// Handler serves guidance/scoring endpoints.
type Handler struct {
	fs *firestore.Client
}

// NewHandler creates a guidance handler.
func NewHandler(fs *firestore.Client) *Handler {
	return &Handler{fs: fs}
}

// Score represents the estate completion assessment.
type Score struct {
	EstateID           string       `json:"estateId"`
	CompletionPercent  int          `json:"completionPercent"`
	CompletedSteps     int          `json:"completedSteps"`
	TotalSteps         int          `json:"totalSteps"`
	Steps              []Step       `json:"steps"`
	NextAction         *Step        `json:"nextAction"`
	Insight            string       `json:"insight"`
	LastCalculated     time.Time    `json:"lastCalculated"`
}

// Step is a single checklist item in the estate completion assessment.
type Step struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Complete    bool   `json:"complete"`
	Route       string `json:"route"` // Frontend route to complete this step
	Priority    int    `json:"priority"`
}

// HandleGetScore computes and returns the estate completion score.
// Requires authenticated user with access to the estate (via estate_users junction).
func (h *Handler) HandleGetScore(w http.ResponseWriter, r *http.Request) {
	estateID := r.URL.Query().Get("estate_id")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estate_id is required")
		return
	}

	// Verify the authenticated user has access to this estate
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Check estate_users junction for access
	euDocID := userID + "_" + estateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", estateID).Msg("Guidance score denied — no access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	score, err := h.computeScore(ctx, estateID)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to compute guidance score")
		writeError(w, http.StatusInternalServerError, "Failed to compute score")
		return
	}

	writeJSON(w, http.StatusOK, score)
}

func (h *Handler) computeScore(ctx context.Context, estateID string) (*Score, error) {
	estateRef := h.fs.Collection("estates").Doc(estateID)

	// Count documents in each subcollection concurrently
	type countResult struct {
		name  string
		count int
		err   error
	}
	ch := make(chan countResult, 8)

	subcollections := []string{"assets", "heirs", "executors", "documents", "memoirs", "lockbox", "directives", "capsules"}
	for _, name := range subcollections {
		go func(n string) {
			count, err := countCollection(ctx, estateRef.Collection(n))
			ch <- countResult{name: n, count: count, err: err}
		}(name)
	}

	counts := make(map[string]int)
	for range subcollections {
		r := <-ch
		if r.err != nil {
			log.Warn().Err(r.err).Str("collection", r.name).Msg("Failed to count subcollection")
		}
		counts[r.name] = r.count
	}

	// Check governance docs
	obituaryExists := docExists(ctx, estateRef.Collection("governance").Doc("obituary"))
	settingsExists := docExists(ctx, estateRef.Collection("governance").Doc("settings"))

	// Build steps
	steps := []Step{
		{
			ID: "assets", Label: "Add Assets", Category: "Foundation",
			Description: "Inventory your financial accounts, property, and valuables",
			Complete: counts["assets"] >= 1, Route: "assets", Priority: 1,
		},
		{
			ID: "beneficiaries", Label: "Add Beneficiaries", Category: "Foundation",
			Description: "Designate heirs and their inheritance allocations",
			Complete: counts["heirs"] >= 1, Route: "beneficiaries", Priority: 2,
		},
		{
			ID: "executors", Label: "Designate Executor", Category: "Foundation",
			Description: "Appoint someone to manage your estate",
			Complete: counts["executors"] >= 1, Route: "beneficiaries", Priority: 3,
		},
		{
			ID: "documents", Label: "Upload Documents", Category: "Vault",
			Description: "Upload your will, trust, insurance policies, and legal documents",
			Complete: counts["documents"] >= 1, Route: "vault", Priority: 4,
		},
		{
			ID: "documents_3", Label: "Upload 3+ Documents", Category: "Vault",
			Description: "A complete vault should have at least 3 key documents",
			Complete: counts["documents"] >= 3, Route: "vault", Priority: 5,
		},
		{
			ID: "lockbox", Label: "Set Up Digital Lockbox", Category: "Security",
			Description: "Store account credentials and access instructions for your heirs",
			Complete: counts["lockbox"] >= 1, Route: "lockbox", Priority: 6,
		},
		{
			ID: "memoirs", Label: "Create a Memory", Category: "Legacy",
			Description: "Record a video message or upload photos for your family",
			Complete: counts["memoirs"] >= 1, Route: "memoirs", Priority: 7,
		},
		{
			ID: "directives", Label: "Write a Directive", Category: "Legacy",
			Description: "Create an ethical will, funeral preferences, or final message",
			Complete: counts["directives"] >= 1, Route: "directives", Priority: 8,
		},
		{
			ID: "timecapsule", Label: "Create Time Capsule", Category: "Legacy",
			Description: "Schedule a message for future delivery to someone you love",
			Complete: counts["capsules"] >= 1, Route: "timecapsule", Priority: 9,
		},
		{
			ID: "obituary", Label: "Draft Final Record", Category: "Legacy",
			Description: "Write your life story and obituary in your own words",
			Complete: obituaryExists, Route: "obituary", Priority: 10,
		},
		{
			ID: "settings", Label: "Configure Governance", Category: "Security",
			Description: "Set up MFA, alerts, and estate governance preferences",
			Complete: settingsExists, Route: "settings", Priority: 11,
		},
	}

	completed := 0
	var nextAction *Step
	for i := range steps {
		if steps[i].Complete {
			completed++
		} else if nextAction == nil {
			nextAction = &steps[i]
		}
	}

	percent := 0
	if len(steps) > 0 {
		percent = (completed * 100) / len(steps)
	}

	insight := generateInsight(percent, completed, len(steps), counts, nextAction)

	return &Score{
		EstateID:          estateID,
		CompletionPercent: percent,
		CompletedSteps:    completed,
		TotalSteps:        len(steps),
		Steps:             steps,
		NextAction:        nextAction,
		Insight:           insight,
		LastCalculated:    time.Now(),
	}, nil
}

func generateInsight(percent, completed, total int, counts map[string]int, next *Step) string {
	switch {
	case percent == 100:
		return "Your estate plan is complete. Your family is protected."
	case percent >= 80:
		return "You're almost there. Just a few more steps to full coverage."
	case percent >= 50:
		if next != nil {
			return "Good progress. Next recommended: " + next.Label + " — " + next.Description
		}
		return "Good progress. Keep building your estate plan."
	case percent >= 25:
		return "Your estate plan is taking shape. Focus on the foundation: assets, beneficiaries, and key documents."
	default:
		return "Let's get started. Begin by adding your assets and designating your beneficiaries."
	}
}

func countCollection(ctx context.Context, col *firestore.CollectionRef) (int, error) {
	// Firestore count aggregation — single operation, no document reads
	results, err := col.NewAggregationQuery().WithCount("n").Get(ctx)
	if err != nil {
		return 0, err
	}
	v, ok := results["n"]
	if !ok {
		return 0, nil
	}
	if n, ok := v.(*firestore.AggregationResult); ok && n != nil {
		_ = n // shouldn't happen at this level
	}
	// The Go Firestore SDK returns count as int64
	if n, ok := v.(int64); ok {
		return int(n), nil
	}
	return 0, nil
}

func docExists(ctx context.Context, ref *firestore.DocumentRef) bool {
	snap, err := ref.Get(ctx)
	if err != nil {
		return false
	}
	return snap.Exists()
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
