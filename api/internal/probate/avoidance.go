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

// ProbateAvoidanceTool represents a method of transferring assets without probate.
type ProbateAvoidanceTool struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	AssetType    string   `json:"assetType"` // "real_estate", "vehicle", "bank_account", "securities", "insurance", "retirement"
	Description  string   `json:"description"`
	FormURL      string   `json:"formUrl,omitempty"`
	FormNumber   string   `json:"formNumber,omitempty"`
	Requirements []string `json:"requirements"`
	Limitations  []string `json:"limitations"`
	LegalBasis   string   `json:"legalBasis"`
}

// AssetAvoidanceStatus tracks whether an asset has a probate avoidance designation.
type AssetAvoidanceStatus struct {
	AssetID    string `json:"assetId" firestore:"assetId"`
	ToolID     string `json:"toolId" firestore:"toolId"`
	Status     string `json:"status" firestore:"status"` // "not_started", "in_progress", "completed"
	Notes      string `json:"notes,omitempty" firestore:"notes,omitempty"`
	DocumentID string `json:"documentId,omitempty" firestore:"documentId,omitempty"` // vault reference
}

// IllinoisAvoidanceTools returns all probate avoidance methods available in Illinois.
func IllinoisAvoidanceTools() []ProbateAvoidanceTool {
	return []ProbateAvoidanceTool{
		{
			ID:          "todi",
			Name:        "Transfer on Death Instrument (TODI)",
			AssetType:   "real_estate",
			Description: "Name a beneficiary who will receive your Illinois real property when you die, without probate. The beneficiary has no claim until your death — you retain full control.",
			FormURL:     "https://www.illinoislegalaid.org/legal-information/transfer-death-instrument-or-todi",
			LegalBasis:  "755 ILCS 27 (Real Property Transfer on Death Instrument Act)",
			Requirements: []string{
				"Signed by the property owner",
				"Witnessed by 2 credible witnesses (neither can be the beneficiary or their spouse)",
				"Notarized",
				"Recorded with the Recorder of Deeds in the county where the property is located",
				"Must be recorded BEFORE the owner's death",
				"Filing fee: $45-$100 depending on county",
			},
			Limitations: []string{
				"Only applies to Illinois real estate",
				"Beneficiary should file Notice of Death Affidavit within 2 years after death",
				"Can be revoked by the owner at any time while alive",
				"Multiple beneficiaries allowed",
			},
		},
		{
			ID:          "vsd773",
			Name:        "Secretary of State Beneficiary Affidavit (VSD 773)",
			AssetType:   "vehicle",
			Description: "Designate a beneficiary on your vehicle title so it transfers on death without probate. Once the owner dies, the designation cannot be changed by a will — only by court order.",
			FormURL:     "https://www.ilsos.gov/content/dam/publications/pdf_publications/vsd773.pdf",
			FormNumber:  "VSD 773",
			LegalBasis:  "625 ILCS 5/3-112.1",
			Requirements: []string{
				"Vehicle must be solely owned",
				"No joint tenancy, lien, or lease on the title",
				"Not a business vehicle",
				"Only one beneficiary may be listed on the title",
			},
			Limitations: []string{
				"Cannot be changed by a will after owner's death",
				"Only one beneficiary per title",
				"Owner can change/revoke while alive",
				"Beneficiary claims with VSD 774 + death certificate + title fee",
			},
		},
		{
			ID:          "pod",
			Name:        "Payable on Death (POD) Designation",
			AssetType:   "bank_account",
			Description: "Add a payable-on-death designation to bank accounts. You retain full control during your lifetime — the beneficiary claims funds directly from the bank with a death certificate.",
			LegalBasis:  "205 ILCS 625 (Illinois Trust and Payable on Death Accounts Act)",
			Requirements: []string{
				"Complete POD form at your bank or credit union",
				"Name one or more beneficiaries",
				"You retain full control of the account during your lifetime",
			},
			Limitations: []string{
				"Only applies to bank accounts (savings, checking, CDs)",
				"Beneficiary has no rights until your death",
				"Review designations after major life events (marriage, divorce, birth)",
			},
		},
		{
			ID:          "tod",
			Name:        "Transfer on Death (TOD) Registration",
			AssetType:   "securities",
			Description: "Register stocks, bonds, and brokerage accounts in transfer-on-death form. The beneficiary inherits the account directly from the brokerage — no probate needed.",
			LegalBasis:  "815 ILCS 10/ (Uniform TOD Security Registration Act)",
			Requirements: []string{
				"Complete TOD forms with your brokerage",
				"Name one or more beneficiaries",
				"Works for individual and joint brokerage accounts",
			},
			Limitations: []string{
				"Only applies to securities and brokerage accounts",
				"Beneficiary works with brokerage directly to transfer",
				"Review designations after major life events",
			},
		},
		{
			ID:          "beneficiary_insurance",
			Name:        "Life Insurance Beneficiary Designation",
			AssetType:   "insurance",
			Description: "Life insurance proceeds transfer directly to named beneficiaries, bypassing probate entirely. The insurance company pays within weeks of receiving documentation.",
			Requirements: []string{
				"Name primary and contingent beneficiaries with your insurance provider",
				"Keep designations current (marriage, divorce, birth of children)",
				"Provide beneficiary contact information to your provider",
			},
			Limitations: []string{
				"Designations override your will — the named beneficiary receives proceeds regardless of will provisions",
				"Proceeds may have tax implications depending on beneficiary relationship",
				"Minor beneficiaries may need a guardian or trust to receive proceeds",
			},
		},
		{
			ID:          "beneficiary_retirement",
			Name:        "Retirement Account Beneficiary Designation",
			AssetType:   "retirement",
			Description: "401(k)s, IRAs, pensions, and other retirement accounts transfer directly to designated beneficiaries. These carry significant tax implications.",
			Requirements: []string{
				"Name beneficiaries through your plan administrator or IRA custodian",
				"Spouse is often the default beneficiary by law (spousal consent may be required to name others)",
				"Keep designations current after life changes",
			},
			Limitations: []string{
				"Significant tax implications — beneficiaries may owe income tax on distributions",
				"Spousal consent rules vary by account type",
				"Designations override your will",
				"Consider a trust for minor beneficiaries",
			},
		},
	}
}

// HandleGetAvoidanceTools returns available probate avoidance tools and
// per-asset completion status for an estate.
// GET /api/v1/probate/avoidance-tools?estate_id=xxx
func (h *Handler) HandleGetAvoidanceTools(w http.ResponseWriter, r *http.Request) {
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

	// Read per-asset avoidance statuses
	statuses := map[string]AssetAvoidanceStatus{}
	statusSnap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("avoidance_status").Get(ctx)
	if err == nil && statusSnap.Exists() {
		for k, v := range statusSnap.Data() {
			if m, ok := v.(map[string]interface{}); ok {
				s := AssetAvoidanceStatus{}
				if v, ok := m["toolId"].(string); ok {
					s.ToolID = v
				}
				if v, ok := m["status"].(string); ok {
					s.Status = v
				}
				if v, ok := m["notes"].(string); ok {
					s.Notes = v
				}
				s.AssetID = k
				statuses[k] = s
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"tools":     IllinoisAvoidanceTools(),
		"statuses":  statuses,
		"stateCode": h.engine.StateCode(),
	})
}

// HandleUpdateAvoidanceStatus updates the probate avoidance status for a specific asset.
// POST /api/v1/probate/avoidance-tools/update
func (h *Handler) HandleUpdateAvoidanceStatus(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req struct {
		EstateID string `json:"estateId"`
		AssetID  string `json:"assetId"`
		ToolID   string `json:"toolId"`
		Status   string `json:"status"`
		Notes    string `json:"notes,omitempty"`
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
		writeError(w, http.StatusForbidden, "Only estate owners or administrators can update avoidance status")
		return
	}

	update := map[string]interface{}{
		"toolId": req.ToolID,
		"status": req.Status,
	}
	if req.Notes != "" {
		update["notes"] = req.Notes
	}

	_, err = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate").Doc("avoidance_status").Set(ctx, map[string]interface{}{
		req.AssetID: update,
	}, firestore.MergeAll)
	if err != nil {
		log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to update avoidance status")
		writeError(w, http.StatusInternalServerError, "Failed to update status")
		return
	}

	// Audit trail
	_, _, _ = h.fs.Collection("estates").Doc(req.EstateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":    "avoidance_tool_update",
		"assetId":   req.AssetID,
		"toolId":    req.ToolID,
		"status":    req.Status,
		"actor":     userID,
		"actorRole": role,
		"timestamp": time.Now(),
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"assetId": req.AssetID,
		"toolId":  req.ToolID,
		"status":  req.Status,
	})
}
