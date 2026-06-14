package probate

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"cloud.google.com/go/firestore"

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

	// Compute total asset values for the inventory and small-estate templates.
	//
	// Rule 9: these strings are stamped into legal-form prefill fields, and the
	// personal-property total gates small-estate qualification. We therefore
	// derive a REAL dollar figure from the recorded asset values — never a proxy
	// like a count. If any recorded value cannot be parsed into a number, the
	// derived total would be misleading, so we leave the field BLANK for the
	// affiant to complete by hand rather than assert an unverifiable amount.
	var totalAssetValue, personalPropertyValue string
	assetSnaps, err := h.fs.Collection("estates").Doc(estateID).Collection("assets").Documents(ctx).GetAll()
	if err == nil {
		totalAssetValue = computeTotalAssets(assetSnaps, false)
		personalPropertyValue = computeTotalAssets(assetSnaps, true)
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
				"estateName":        estateName,
				"decedentName":      decedentName,
				"dateOfDeath":       dateOfDeath,
				"countyOfDeath":     county,
				"state":             "Illinois",
				"petitionerName":    executorName,
				"petitionerAddress": executorAddress,
				"courtName":         "Circuit Court of " + county + " County, Probate Division",
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
				"decedentName":          decedentName,
				"dateOfDeath":           dateOfDeath,
				"affiantName":           executorName,
				"affiantAddress":        executorAddress,
				"totalPersonalProperty": personalPropertyValue,
				"threshold":             "$150,000",
				"waitingPeriod":         "30 days after date of death",
				"vehiclesExcluded":      "Yes — vehicles do not count toward the $150,000 limit",
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
				"estateName":         estateName,
				"decedentName":       decedentName,
				"courtName":          "Circuit Court of " + county + " County, Probate Division",
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

// realEstateTypes are asset `type` values that represent real property, which
// is excluded from the Illinois small-estate personal-property threshold
// (755 ILCS 5/25-1). Matching is case-insensitive and substring-based so that
// "Real Estate", "real property", and "Residential Real Estate" all qualify.
var realEstateTypes = []string{"real estate", "real property", "realty", "land"}

func isRealProperty(assetType string) bool {
	t := strings.ToLower(strings.TrimSpace(assetType))
	for _, re := range realEstateTypes {
		if strings.Contains(t, re) {
			return true
		}
	}
	return false
}

// parseCurrency converts a recorded asset value string (e.g. "$485,000",
// "124500.50", "1,200") into a numeric dollar amount. It returns ok=false when
// the string contains no parseable amount, so callers can fail closed (leave a
// legal-form field blank) rather than assert a fabricated figure (Rule 9).
func parseCurrency(s string) (float64, bool) {
	// Strip currency symbols, thousands separators, and any whitespace
	// (including non-breaking/thin spaces some locales use as group separators).
	cleaned := strings.Map(func(r rune) rune {
		if r == '$' || r == ',' || unicode.IsSpace(r) {
			return -1
		}
		return r
	}, s)
	if cleaned == "" {
		return 0, false
	}
	v, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

// formatCurrency renders a dollar amount with thousands separators, e.g.
// 609500 -> "$609,500". Whole amounts drop the cents; fractional amounts keep
// two decimals.
func formatCurrency(v float64) string {
	negative := v < 0
	if negative {
		v = -v
	}
	whole := int64(v)
	frac := v - float64(whole)

	digits := strconv.FormatInt(whole, 10)
	var grouped strings.Builder
	for i, d := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			grouped.WriteByte(',')
		}
		grouped.WriteRune(d)
	}

	out := "$" + grouped.String()
	if frac > 0.0049 {
		out += strings.TrimPrefix(strconv.FormatFloat(frac, 'f', 2, 64), "0")
	}
	if negative {
		out = "-" + out
	}
	return out
}

// computeTotalAssets derives a real dollar valuation from recorded asset values.
//
// When personalPropertyOnly is true, real-property assets are excluded so the
// result matches the Illinois small-estate personal-property threshold
// (755 ILCS 5/25-1). When false, every asset is summed for the general estate
// inventory.
//
// Rule 9: if ANY contributing asset has a value that cannot be parsed into a
// number, the sum would be unverifiable, so we return "" — the form field is
// left blank for the affiant to complete rather than stamped with a guess. An
// estate with zero contributing assets returns "$0" (a fact, not a guess).
func computeTotalAssets(snaps []*firestore.DocumentSnapshot, personalPropertyOnly bool) string {
	var total float64
	var contributing int
	for _, snap := range snaps {
		data := snap.Data()
		assetType, _ := data["type"].(string)
		if personalPropertyOnly && isRealProperty(assetType) {
			continue
		}
		raw, _ := data["value"].(string)
		amount, ok := parseCurrency(raw)
		if !ok {
			// Unverifiable total — refuse to fabricate a legal figure (Rule 9).
			return ""
		}
		total += amount
		contributing++
	}
	if contributing == 0 {
		return "$0"
	}
	return formatCurrency(total)
}
