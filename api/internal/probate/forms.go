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

// FormTemplate represents a court form template that can be pre-filled
// with estate data. These are preparation drafts only — not legal filings.
type FormTemplate struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	FormNumber  string            `json:"formNumber"`
	Description string            `json:"description"`
	CourtURL    string            `json:"courtUrl"`
	Category    string            `json:"category"` // "petition", "inventory", "small_estate", "oath"
	Fields      map[string]string `json:"fields"`   // pre-filled field values from estate data
	Disclaimer  string            `json:"disclaimer"`
}

const formDisclaimer = "PREPARATION ASSISTANCE ONLY — This document is a draft prepared by FinalWishes to help you organize information for court filing. It does NOT constitute a legal filing, legal advice, or attorney representation. You must review all information for accuracy and file the original with the appropriate court. Consult a licensed Illinois attorney for legal advice."

// HandleGetFormTemplates returns available form templates for the estate's jurisdiction.
// GET /api/v1/probate/forms?estate_id=xxx
func (h *Handler) HandleGetFormTemplates(w http.ResponseWriter, r *http.Request) {
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

	// Read estate data to pre-fill forms
	estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil {
		writeError(w, http.StatusNotFound, "Estate not found")
		return
	}

	data := estateSnap.Data()
	estateName, _ := data["name"].(string)

	// Read death cert facts if available
	var decedentName, dateOfDeath, countyOfDeath string
	factsSnap, err := h.fs.Collection("estates").Doc(estateID).Collection("probate").Doc("death_cert_facts").Get(ctx)
	if err == nil && factsSnap.Exists() {
		factsData := factsSnap.Data()
		decedentName, _ = factsData["decedentName"].(string)
		if v, ok := factsData["dateOfDeath"].(*string); ok && v != nil {
			dateOfDeath = *v
		} else if v, ok := factsData["dateOfDeath"].(string); ok {
			dateOfDeath = v
		}
		if v, ok := factsData["countyOfDeath"].(*string); ok && v != nil {
			countyOfDeath = *v
		} else if v, ok := factsData["countyOfDeath"].(string); ok {
			countyOfDeath = v
		}
	}

	// Read executor info
	var executorName, executorAddress string
	executorSnaps, err := h.fs.Collection("estates").Doc(estateID).Collection("executors").Documents(ctx).GetAll()
	if err == nil && len(executorSnaps) > 0 {
		exData := executorSnaps[0].Data()
		executorName, _ = exData["fullName"].(string)
		executorAddress, _ = exData["address"].(string)
	}

	// Compute total asset value for small estate evaluation
	var totalAssetValue string
	assetSnaps, err := h.fs.Collection("estates").Doc(estateID).Collection("assets").Documents(ctx).GetAll()
	if err == nil {
		totalAssetValue = computeTotalAssets(assetSnaps)
	}

	county := countyOfDeath
	if county == "" {
		county = "Cook"
	}

	templates := []FormTemplate{
		{
			ID:          "petition_probate",
			Name:        "Petition for Probate of Will and Letters Testamentary",
			FormNumber:  "CCP0315",
			Description: "Opens probate when a will exists. Names the executor and requests Letters of Office.",
			CourtURL:    "https://www.cookcountycourtil.gov/division/probate-division/court-forms-probate-division",
			Category:    "petition",
			Disclaimer:  formDisclaimer,
			Fields: map[string]string{
				"estateName":      estateName,
				"decedentName":    decedentName,
				"dateOfDeath":     dateOfDeath,
				"countyOfDeath":   county,
				"state":           "Illinois",
				"petitionerName":  executorName,
				"petitionerAddress": executorAddress,
				"courtName":       "Circuit Court of " + county + " County, Probate Division",
			},
		},
		{
			ID:          "inventory",
			Name:        "Estate Inventory",
			FormNumber:  "IL Probate Act §14-1",
			Description: "Complete inventory of all estate assets with fair market values. Due within 60 days of appointment.",
			CourtURL:    "https://www.cookcountycourtil.gov/division/probate-division/court-forms-probate-division",
			Category:    "inventory",
			Disclaimer:  formDisclaimer,
			Fields: map[string]string{
				"estateName":      estateName,
				"decedentName":    decedentName,
				"executorName":    executorName,
				"totalAssetValue": totalAssetValue,
				"courtName":       "Circuit Court of " + county + " County, Probate Division",
				"filingDeadline":  "60 days from Letters of Office",
			},
		},
		{
			ID:          "small_estate_affidavit",
			Name:        "Small Estate Affidavit",
			FormNumber:  "755 ILCS 5/ Art. XXV",
			Description: "For estates under $150,000 (vehicles excluded). Avoids formal probate. Must wait 30 days after death.",
			CourtURL:    "https://www.illinoislegalaid.org/legal-information/using-small-estate-affidavit",
			Category:    "small_estate",
			Disclaimer:  formDisclaimer,
			Fields: map[string]string{
				"decedentName":         decedentName,
				"dateOfDeath":          dateOfDeath,
				"affiantName":          executorName,
				"affiantAddress":       executorAddress,
				"totalPersonalProperty": totalAssetValue,
				"threshold":            "$150,000",
				"waitingPeriod":        "30 days after date of death",
				"vehiclesExcluded":     "Yes — vehicles do not count toward the $150,000 limit",
			},
		},
		{
			ID:          "oath_bond",
			Name:        "Oath and Bond of Representative",
			FormNumber:  "CCP0312/CCP0313",
			Description: "The appointed representative takes an oath to faithfully administer the estate. Bond may be required unless waived by the will.",
			CourtURL:    "https://www.cookcountycourtil.gov/division/probate-division/court-forms-probate-division",
			Category:    "oath",
			Disclaimer:  formDisclaimer,
			Fields: map[string]string{
				"representativeName": executorName,
				"estateName":        estateName,
				"decedentName":      decedentName,
				"courtName":         "Circuit Court of " + county + " County, Probate Division",
			},
		},
	}

	// Audit: log form access
	_, _, _ = h.fs.Collection("estates").Doc(estateID).Collection("probate_audit").Add(ctx, map[string]interface{}{
		"action":    "forms_accessed",
		"actor":     userID,
		"timestamp": time.Now(),
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"templates":  templates,
		"stateCode":  h.engine.StateCode(),
		"disclaimer": formDisclaimer,
	})
}

// computeTotalAssets sums all asset values from Firestore snapshots.
func computeTotalAssets(snaps []*firestore.DocumentSnapshot) string {
	// For now, return the count — proper valuation requires parsing value strings
	if len(snaps) == 0 {
		return "$0"
	}
	return jsonString(len(snaps)) + " assets recorded"
}

func jsonString(v int) string {
	b, _ := json.Marshal(v)
	return string(b)
}

// HandleGetFormData returns pre-filled data for a specific form.
// GET /api/v1/probate/forms/:formId?estate_id=xxx
func (h *Handler) HandleGetFormData(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	estateID := r.URL.Query().Get("estate_id")
	formID := r.URL.Query().Get("form_id")
	if estateID == "" || formID == "" {
		writeError(w, http.StatusBadRequest, "estate_id and form_id query parameters are required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := h.verifyEstateAccess(ctx, userID, estateID); err != nil {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// For now, reuse HandleGetFormTemplates logic and filter by ID
	// In a full implementation, this would return richer per-form data
	log.Debug().Str("estate_id", estateID).Str("form_id", formID).Msg("Form data requested")
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"formId":     formID,
		"disclaimer": formDisclaimer,
		"message":    "Use the /forms endpoint for pre-filled templates",
	})
}
