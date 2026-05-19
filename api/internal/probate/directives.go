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

// AdvanceDirectiveType represents an Illinois legal advance directive.
type AdvanceDirectiveType struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Statute         string   `json:"statute"`
	Description     string   `json:"description"`
	FormURL         string   `json:"formUrl"`
	WitnessRequired int      `json:"witnessRequired"` // number of witnesses needed
	NotaryRequired  bool     `json:"notaryRequired"`
	LawyerRequired  bool     `json:"lawyerRequired"`
	ValidityYears   int      `json:"validityYears,omitempty"` // 0 = permanent until revoked
	OverriddenBy    string   `json:"overriddenBy,omitempty"`  // e.g., "hcpoa" overrides "living_will"
	RevocationRules string   `json:"revocationRules"`
	KeyPoints       []string `json:"keyPoints"`
}

// AdvanceDirectiveStatus tracks completion of an advance directive for an estate.
type AdvanceDirectiveStatus struct {
	DirectiveID string     `json:"directiveId" firestore:"directiveId"`
	Status      string     `json:"status" firestore:"status"` // "not_started", "in_progress", "completed", "expired"
	CompletedAt *time.Time `json:"completedAt,omitempty" firestore:"completedAt,omitempty"`
	ExpiresAt   *time.Time `json:"expiresAt,omitempty" firestore:"expiresAt,omitempty"`
	DocumentID  string     `json:"documentId,omitempty" firestore:"documentId,omitempty"` // vault doc reference
	Notes       string     `json:"notes,omitempty" firestore:"notes,omitempty"`
}

// IllinoisAdvanceDirectives returns the 4 Illinois advance directive types.
func IllinoisAdvanceDirectives() []AdvanceDirectiveType {
	return []AdvanceDirectiveType{
		{
			ID:              "hcpoa",
			Name:            "Health Care Power of Attorney",
			Statute:         "Illinois Power of Attorney Act (755 ILCS 45/)",
			Description:     "Appoint a trusted person to make medical decisions on your behalf if you become incapacitated. This is the most flexible advance directive because your agent can react to unexpected medical scenarios in real time.",
			FormURL:         "https://www.isms.org/resources/patients/personal-decision",
			WitnessRequired: 1,
			NotaryRequired:  false,
			LawyerRequired:  false,
			ValidityYears:   0,
			RevocationRules: "Can be revoked at any time by destroying the form, writing a cancellation, or verbally stating your intent.",
			KeyPoints: []string{
				"Appoints an agent for all medical decisions including end-of-life",
				"Your primary doctor or health care provider cannot serve as your agent",
				"Overrides a Living Will when your agent is available to make decisions",
				"Can specify medical treatment preferences and successor agents",
				"Requires 1 witness (18+ years old)",
			},
		},
		{
			ID:              "living_will",
			Name:            "Living Will Declaration",
			Statute:         "Illinois Living Will Act (755 ILCS 35/)",
			Description:     "Explicitly declares your desire to withhold or withdraw death-delaying procedures if you are diagnosed with a terminal condition and can no longer speak for yourself.",
			FormURL:         "https://www.caringinfo.org/wp-content/uploads/Illinois.pdf",
			WitnessRequired: 1,
			NotaryRequired:  false,
			LawyerRequired:  false,
			ValidityYears:   0,
			OverriddenBy:    "hcpoa",
			RevocationRules: "Can be revoked at any time by destroying the form, writing a cancellation, or verbally stating your intent.",
			KeyPoints: []string{
				"Applies ONLY to terminal illness — narrowly tailored in Illinois",
				"Covers ventilators, CPR, feeding tubes, and other death-delaying procedures",
				"Overridden if you have an active Health Care Power of Attorney agent available",
				"Does NOT cover non-terminal conditions or general medical decisions",
				"Requires 1 witness (18+ years old)",
			},
		},
		{
			ID:              "mental_health",
			Name:            "Declaration for Mental Health Treatment Preference",
			Statute:         "Mental Health Treatment Preference Declaration Act (755 ILCS 43/)",
			Description:     "Dictate choices for future mental health care while you are of sound mind. Covers psychotropic medications, electroconvulsive therapy (ECT), and short-term facility admission.",
			FormURL:         "https://ilaging.illinois.gov/aboutus/legal-adv-directives.html",
			WitnessRequired: 1,
			NotaryRequired:  false,
			LawyerRequired:  false,
			ValidityYears:   3,
			RevocationRules: "Can be revoked while you are of sound mind. Automatically expires after 3 years — must be re-executed to remain active.",
			KeyPoints: []string{
				"Covers 3 specific areas: psychotropic medications, ECT, and facility admission",
				"Valid for 3 years from execution — must be renewed",
				"Can only be revoked while you are of sound mind",
				"Separate from Health Care Power of Attorney",
				"Requires 1 witness (18+ years old)",
			},
		},
		{
			ID:              "polst",
			Name:            "Practitioner Orders for Life-Sustaining Treatment (POLST)",
			Statute:         "IDPH Uniform POLST",
			Description:     "Actionable medical orders signed by both you (or your legal proxy) and your attending physician. Creates immediate orders that emergency responders and hospital staff must follow.",
			FormURL:         "https://www.sralab.org/lifecenter/resources/listing-advance-directives-forms-health-choices-idhp-and-polst",
			WitnessRequired: 0,
			NotaryRequired:  false,
			LawyerRequired:  false,
			ValidityYears:   0,
			RevocationRules: "Can be revoked by the patient at any time. A new POLST form replaces the previous one.",
			KeyPoints: []string{
				"Requires BOTH patient/proxy AND practitioner signatures",
				"Creates actionable medical orders (not just preferences)",
				"Covers DNR, intubation, feeding tubes, and selective treatment limits",
				"Typically for individuals who are seriously ill or near end of life",
				"Emergency responders and hospital staff must follow POLST orders",
				"Different from advance directives — these are medical orders, not directives",
			},
		},
	}
}

// HandleGetAdvanceDirectives returns the Illinois advance directive types
// and their completion status for an estate.
// GET /api/v1/probate/advance-directives?estate_id=xxx
func (h *Handler) HandleGetAdvanceDirectives(w http.ResponseWriter, r *http.Request) {
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

	// Read completion statuses from Firestore
	statuses := map[string]AdvanceDirectiveStatus{}
	statusSnap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("advance_directive_status").Get(ctx)
	if err == nil && statusSnap.Exists() {
		data := statusSnap.Data()
		for _, d := range IllinoisAdvanceDirectives() {
			if raw, ok := data[d.ID]; ok {
				if m, ok := raw.(map[string]interface{}); ok {
					s := AdvanceDirectiveStatus{DirectiveID: d.ID}
					if v, ok := m["status"].(string); ok {
						s.Status = v
					}
					if v, ok := m["documentId"].(string); ok {
						s.DocumentID = v
					}
					if v, ok := m["notes"].(string); ok {
						s.Notes = v
					}
					statuses[d.ID] = s
				}
			}
		}
	}

	// Fill defaults for missing statuses
	for _, d := range IllinoisAdvanceDirectives() {
		if _, ok := statuses[d.ID]; !ok {
			statuses[d.ID] = AdvanceDirectiveStatus{
				DirectiveID: d.ID,
				Status:      "not_started",
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"directives": IllinoisAdvanceDirectives(),
		"statuses":   statuses,
		"stateCode":  h.engine.StateCode(),
	})
}

// HandleUpdateAdvanceDirectiveStatus updates the completion status of an advance directive.
// POST /api/v1/probate/advance-directives/update
func (h *Handler) HandleUpdateAdvanceDirectiveStatus(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID    string `json:"estateId"`
		DirectiveID string `json:"directiveId"`
		Status      string `json:"status"`
		DocumentID  string `json:"documentId,omitempty"`
		Notes       string `json:"notes,omitempty"`
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
	if role != "principal" && role != "admin" {
		writeError(w, http.StatusForbidden, "Only estate owners or administrators can update advance directive status")
		return
	}

	now := time.Now()
	update := map[string]interface{}{
		"status": req.Status,
	}
	if req.DocumentID != "" {
		update["documentId"] = req.DocumentID
	}
	if req.Notes != "" {
		update["notes"] = req.Notes
	}
	if req.Status == "completed" {
		update["completedAt"] = now

		// Check if this directive type has an expiry
		for _, d := range IllinoisAdvanceDirectives() {
			if d.ID == req.DirectiveID && d.ValidityYears > 0 {
				expiresAt := now.AddDate(d.ValidityYears, 0, 0)
				update["expiresAt"] = expiresAt
			}
		}
	}

	_, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate").Doc("advance_directive_status").Set(ctx, map[string]interface{}{
		req.DirectiveID: update,
	}, firestore.MergeAll)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Str("directive", req.DirectiveID).Msg("Failed to update directive status")
		writeError(w, http.StatusInternalServerError, "Failed to update status")
		return
	}

	// Audit trail
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":      "advance_directive_update",
		"directiveId": req.DirectiveID,
		"status":      req.Status,
		"actor":       userID,
		"actorRole":   role,
		"timestamp":   now,
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"directiveId": req.DirectiveID,
		"status":      req.Status,
	})
}
