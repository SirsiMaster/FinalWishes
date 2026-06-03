// Package guidance implements the Shepherd — FinalWishes' estate planning
// guidance engine. v4 adds conversational chat, situational checklists
// driven by intake metadata, and multi-model AI routing.
package guidance

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// Handler serves guidance/scoring endpoints.
type Handler struct {
	fs      *firestore.Client
	advisor Advisor
	rag     RAGRetriever
}

// NewHandler creates a guidance handler with an AI advisor.
// If advisor is nil, the handler falls back to deterministic insights.
// Accepts either *ShepherdAdvisor (Claude Opus) or *GenkitAdvisor (legacy Gemini).
func NewHandler(fs *firestore.Client, advisor Advisor) *Handler {
	return &Handler{fs: fs, advisor: advisor}
}

// WithRAG enables corpus-grounded legal guidance for chat requests.
func (h *Handler) WithRAG(retriever RAGRetriever) *Handler {
	h.rag = retriever
	return h
}

// Score represents the estate completion assessment.
type Score struct {
	EstateID          string    `json:"estateId"`
	CompletionPercent int       `json:"completionPercent"`
	CompletedSteps    int       `json:"completedSteps"`
	TotalSteps        int       `json:"totalSteps"`
	Steps             []Step    `json:"steps"`
	NextAction        *Step     `json:"nextAction"`
	Insight           string    `json:"insight"`
	LastCalculated    time.Time `json:"lastCalculated"`
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
	// Optional marks situational/informational steps that have no auto-complete
	// signal (e.g. "Designate Guardian", state threshold reviews). They are shown
	// in the journey but EXCLUDED from completion% and never chosen as nextAction,
	// so the Shepherd cannot get stuck pointing at a step that can never complete.
	Optional bool `json:"optional"`
}

// intakeData holds the onboarding wizard answers from estates/{id}/metadata/intake.
type intakeData struct {
	HasMinors    bool   `firestore:"hasMinors"`
	OwnsProperty bool   `firestore:"ownsProperty"`
	HasBusiness  bool   `firestore:"hasBusiness"`
	IsMarried    bool   `firestore:"isMarried"`
	State        string `firestore:"state"`
	PlanningMode string `firestore:"planningMode"` // "ahead" or "after_loss"
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

	// Enhance insight with AI if available
	if h.advisor != nil {
		// Fetch estate name for personalized insight
		estateName := estateID
		estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
		if err == nil {
			if name, ok := estateSnap.Data()["name"].(string); ok && name != "" {
				estateName = name
			}
		}

		if aiInsight := h.advisor.GenerateInsight(ctx, score, estateName); aiInsight != "" {
			score.Insight = aiInsight
		}
	}

	writeJSON(w, http.StatusOK, score)
}

// HandleChat handles a conversational estate planning question.
// POST /api/v1/guidance/chat
func (h *Handler) HandleChat(w http.ResponseWriter, r *http.Request) {
	if h.advisor == nil {
		writeError(w, http.StatusServiceUnavailable, "AI guidance is not available")
		return
	}

	var req struct {
		EstateID            string        `json:"estateId"`
		Message             string        `json:"message"`
		ConversationHistory []ChatMessage `json:"conversationHistory"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Message == "" {
		writeError(w, http.StatusBadRequest, "message is required")
		return
	}
	if req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	// Verify access
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	euDocID := userID + "_" + req.EstateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", req.EstateID).Msg("Chat denied — no access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Enrich the prompt with estate context
	estateCtx := h.buildEstateContext(ctx, req.EstateID)
	var citations []CorpusCitation
	if h.rag != nil && IsLegalGuidanceTopic(req.Message) {
		chunks, err := h.rag.Retrieve(ctx, req.Message, 5)
		if err != nil {
			log.Warn().Err(err).Str("estate_id", req.EstateID).Msg("Legal corpus retrieval failed")
			writeError(w, http.StatusServiceUnavailable, "Legal guidance corpus is temporarily unavailable")
			return
		}
		if len(chunks) == 0 {
			writeJSON(w, http.StatusOK, &ChatResponse{
				Reply: "I cannot answer that legal question from the approved FinalWishes legal corpus yet. This is informational guidance, not legal advice; please consult a licensed attorney in the relevant jurisdiction for a legal decision.",
			})
			return
		}
		estateCtx += formatCorpusContext(chunks)
		citations = citationList(chunks)
	}

	resp, err := h.advisor.Chat(ctx, estateCtx, req.Message, req.ConversationHistory)
	if err != nil {
		// Fail LOUD in telemetry (ops must see a misconfigured/unavailable AI
		// provider — e.g. no SIRSI_AI/GEMINI key on the service), but fail SOFT
		// in UX: a 500 makes the Shepherd feel broken and blocks the user. The
		// deterministic /guidance/score endpoint drives the checklist + next
		// action independently of this conversational path, so degrade to a warm,
		// honest fallback instead of erroring out.
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Chat generation failed — serving graceful fallback")
		writeJSON(w, http.StatusOK, &ChatResponse{
			Reply: "I'm having trouble reaching my guidance engine right now, so I can't give a full conversational answer this moment — but nothing is lost and everything in your estate is safe. Your dashboard checklist still shows the next best step, and you can keep adding to any section at your own pace. Please try me again in a little while.",
			SuggestedActions: []string{
				"View my estate checklist",
				"Add a beneficiary",
				"Record a Soul Log entry",
			},
		})
		return
	}
	if len(citations) > 0 {
		resp.Citations = citations
	}

	writeJSON(w, http.StatusOK, resp)
}

// buildEstateContext fetches estate metadata and formats it for the AI prompt.
func (h *Handler) buildEstateContext(ctx context.Context, estateID string) string {
	estateRef := h.fs.Collection("estates").Doc(estateID)

	// Fetch estate doc
	var estateName, estateState string
	estateSnap, err := estateRef.Get(ctx)
	if err == nil {
		if name, ok := estateSnap.Data()["name"].(string); ok {
			estateName = name
		}
		if state, ok := estateSnap.Data()["state"].(string); ok {
			estateState = state
		}
	}

	// Fetch subcollection counts
	assetCount, _ := countCollection(ctx, estateRef.Collection("assets"))
	heirCount, _ := countCollection(ctx, estateRef.Collection("heirs"))
	executorCount, _ := countCollection(ctx, estateRef.Collection("executors"))
	documentCount, _ := countCollection(ctx, estateRef.Collection("documents"))

	// Fetch intake metadata
	intake := h.fetchIntake(ctx, estateID)

	// Compute completion score
	score, _ := h.computeScore(ctx, estateID)
	completionPercent := 0
	if score != nil {
		completionPercent = score.CompletionPercent
	}

	var parts []string
	parts = append(parts, fmt.Sprintf("Estate: %s", estateName))
	if estateState != "" {
		parts = append(parts, fmt.Sprintf("State: %s", estateState))
	} else if intake.State != "" {
		parts = append(parts, fmt.Sprintf("State: %s", intake.State))
	}
	parts = append(parts, fmt.Sprintf("Completion: %d%%", completionPercent))
	parts = append(parts, fmt.Sprintf("Assets: %d, Beneficiaries: %d, Executors: %d, Documents: %d", assetCount, heirCount, executorCount, documentCount))

	if intake.HasMinors {
		parts = append(parts, "Has minor children")
	}
	if intake.OwnsProperty {
		parts = append(parts, "Owns real property")
	}
	if intake.HasBusiness {
		parts = append(parts, "Has business interests")
	}
	if intake.IsMarried {
		parts = append(parts, "Married")
	}
	if intake.PlanningMode == "after_loss" {
		parts = append(parts, "Mode: settling an estate after a loss")
	} else {
		parts = append(parts, "Mode: planning ahead")
	}

	return strings.Join(parts, "\n")
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

	// Fetch intake metadata for situational steps
	intake := h.fetchIntake(ctx, estateID)

	// Build base steps (always present)
	steps := []Step{
		{
			ID: "assets", Label: "Add Assets", Category: "Foundation",
			Description: "Inventory your financial accounts, property, and valuables",
			Complete:    counts["assets"] >= 1, Route: "assets", Priority: 1,
		},
		{
			ID: "beneficiaries", Label: "Add Beneficiaries", Category: "Foundation",
			Description: "Designate heirs and their inheritance allocations",
			Complete:    counts["heirs"] >= 1, Route: "beneficiaries", Priority: 2,
		},
		{
			ID: "executors", Label: "Designate Executor", Category: "Foundation",
			Description: "Appoint someone to manage your estate",
			Complete:    counts["executors"] >= 1, Route: "beneficiaries", Priority: 3,
		},
		{
			ID: "documents", Label: "Upload Documents", Category: "Vault",
			Description: "Upload your will, trust, insurance policies, and legal documents",
			Complete:    counts["documents"] >= 1, Route: "vault", Priority: 4,
		},
		{
			ID: "documents_3", Label: "Upload 3+ Documents", Category: "Vault",
			Description: "A complete vault should have at least 3 key documents",
			Complete:    counts["documents"] >= 3, Route: "vault", Priority: 5,
		},
		{
			ID: "lockbox", Label: "Set Up Digital Lockbox", Category: "Security",
			Description: "Store account credentials and access instructions for your heirs",
			Complete:    counts["lockbox"] >= 1, Route: "lockbox", Priority: 6,
		},
		{
			ID: "memoirs", Label: "Create a Memory", Category: "Legacy",
			Description: "Record a video message or upload photos for your family",
			Complete:    counts["memoirs"] >= 1, Route: "memoirs", Priority: 7,
		},
		{
			ID: "directives", Label: "Write a Directive", Category: "Legacy",
			Description: "Create an ethical will, funeral preferences, or final message",
			Complete:    counts["directives"] >= 1, Route: "directives", Priority: 8,
		},
		{
			ID: "timecapsule", Label: "Create Time Capsule", Category: "Legacy",
			Description: "Schedule a message for future delivery to someone you love",
			Complete:    counts["capsules"] >= 1, Route: "timecapsule", Priority: 9,
		},
		{
			ID: "obituary", Label: "Draft Final Record", Category: "Legacy",
			Description: "Write your life story and obituary in your own words",
			Complete:    obituaryExists, Route: "obituary", Priority: 10,
		},
		{
			ID: "settings", Label: "Configure Governance", Category: "Security",
			Description: "Set up MFA, alerts, and estate governance preferences",
			Complete:    settingsExists, Route: "settings", Priority: 11,
		},
	}

	// Add situational steps based on intake metadata
	priority := 12
	if intake.HasMinors {
		steps = append(steps, Step{
			ID: "guardian", Label: "Designate Guardian", Category: "Foundation",
			Description: "Designate a guardian for your minor children",
			Complete:    false, Route: "beneficiaries", Priority: priority,
		})
		priority++
	}
	if intake.OwnsProperty {
		steps = append(steps, Step{
			ID: "property_deeds", Label: "Upload Property Deeds", Category: "Vault",
			Description: "Upload property deeds to the vault",
			Complete:    false, Route: "vault", Priority: priority,
		})
		priority++
	}
	if intake.HasBusiness {
		steps = append(steps, Step{
			ID: "business_succession", Label: "Business Succession Plan", Category: "Foundation",
			Description: "Create a business succession plan",
			Complete:    false, Route: "vault", Priority: priority,
		})
		priority++
	}
	if intake.IsMarried {
		steps = append(steps, Step{
			ID: "beneficiary_review", Label: "Review Beneficiary Designations", Category: "Foundation",
			Description: "Review and update beneficiary designations",
			Complete:    false, Route: "beneficiaries", Priority: priority,
		})
		priority++
	}

	// State-specific steps
	switch strings.ToUpper(intake.State) {
	case "MD", "MARYLAND":
		steps = append(steps, Step{
			ID: "state_md", Label: "Review Maryland Thresholds", Category: "Legal",
			Description: "Review Maryland's small estate threshold ($50K personal / $100K real)",
			Complete:    false, Route: "vault", Priority: priority,
		})
		priority++
	case "IL", "ILLINOIS":
		steps = append(steps, Step{
			ID: "state_il", Label: "Review Illinois Thresholds", Category: "Legal",
			Description: "Review Illinois' small estate threshold ($150K, vehicles excluded)",
			Complete:    false, Route: "vault", Priority: priority,
		})
		priority++
	case "MN", "MINNESOTA":
		steps = append(steps, Step{
			ID: "state_mn", Label: "Review Minnesota Thresholds", Category: "Legal",
			Description: "Review Minnesota's small estate threshold ($75K)",
			Complete:    false, Route: "vault", Priority: priority,
		})
		priority++
	}

	// Situational + state-specific steps (priority >= 12) have no auto-complete
	// signal, so mark them Optional: they stay visible in the journey but must
	// not trap nextAction or block 100% completion.
	for i := range steps {
		if steps[i].Priority >= 12 {
			steps[i].Optional = true
		}
	}

	// Adjust language for after-loss mode
	if intake.PlanningMode == "after_loss" {
		for i := range steps {
			switch steps[i].ID {
			case "assets":
				steps[i].Label = "Inventory Estate Assets"
				steps[i].Description = "Identify and catalog all financial accounts, property, and valuables in the estate"
			case "beneficiaries":
				steps[i].Label = "Identify Heirs"
				steps[i].Description = "Document all beneficiaries and their designations"
			case "executors":
				steps[i].Label = "Confirm Executor"
				steps[i].Description = "Verify the named executor or petition the court to appoint one"
			case "obituary":
				steps[i].Label = "Prepare Obituary"
				steps[i].Description = "Draft the obituary and final record for your loved one"
			}
		}
	}

	// Deterministic ordering: sort by Priority so nextAction never depends on
	// append order. nextAction = lowest-priority INCOMPLETE, non-optional step.
	// Completion% is computed over completable (non-optional) steps only, so a
	// finished plan can actually reach 100%.
	sort.SliceStable(steps, func(i, j int) bool { return steps[i].Priority < steps[j].Priority })

	completed, coreTotal := 0, 0
	var nextAction *Step
	for i := range steps {
		if steps[i].Optional {
			continue
		}
		coreTotal++
		if steps[i].Complete {
			completed++
		} else if nextAction == nil {
			nextAction = &steps[i]
		}
	}

	percent := 0
	if coreTotal > 0 {
		percent = (completed * 100) / coreTotal
	}

	insight := generateInsight(percent, completed, coreTotal, counts, nextAction)

	return &Score{
		EstateID:          estateID,
		CompletionPercent: percent,
		CompletedSteps:    completed,
		TotalSteps:        coreTotal,
		Steps:             steps,
		NextAction:        nextAction,
		Insight:           insight,
		LastCalculated:    time.Now(),
	}, nil
}

// fetchIntake reads the onboarding wizard data from estates/{id}/metadata/intake.
func (h *Handler) fetchIntake(ctx context.Context, estateID string) intakeData {
	var intake intakeData
	snap, err := h.fs.Collection("estates").Doc(estateID).Collection("metadata").Doc("intake").Get(ctx)
	if err != nil {
		// Intake not filled out yet — return zero values
		return intake
	}
	if err := snap.DataTo(&intake); err != nil {
		log.Warn().Err(err).Str("estate_id", estateID).Msg("Failed to parse intake metadata")
	}
	return intake
}

// HandleAssistObituary accepts a prompt and returns an AI-drafted obituary.
// POST /api/v1/guidance/assist-obituary
func (h *Handler) HandleAssistObituary(w http.ResponseWriter, r *http.Request) {
	if h.advisor == nil {
		writeError(w, http.StatusServiceUnavailable, "AI guidance is not available")
		return
	}

	var req struct {
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Prompt == "" {
		writeError(w, http.StatusBadRequest, "prompt is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	text := h.advisor.GenerateObituary(ctx, req.Prompt)
	if text == "" {
		writeError(w, http.StatusInternalServerError, "Failed to generate obituary draft")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"text": text})
}

// HandleSuggestions returns AI-generated action suggestions for an estate.
// GET /api/v1/guidance/suggestions?estate_id=xxx
func (h *Handler) HandleSuggestions(w http.ResponseWriter, r *http.Request) {
	estateID := r.URL.Query().Get("estate_id")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estate_id is required")
		return
	}

	// Verify access
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	euDocID := userID + "_" + estateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", estateID).Msg("Suggestions denied — no access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	score, err := h.computeScore(ctx, estateID)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to compute score for suggestions")
		writeError(w, http.StatusInternalServerError, "Failed to compute suggestions")
		return
	}

	var suggestions []string
	if h.advisor != nil {
		suggestions = h.advisor.SuggestNextActions(ctx, score)
	} else {
		suggestions = fallbackSuggestions(score)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"suggestions": suggestions})
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
