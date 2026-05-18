package probate

import (
	"math"
	"time"
)

// IllinoisEngine implements StateEngine for the state of Illinois.
// Encodes rules from the Illinois Probate Act (755 ILCS 5/),
// Cook County Circuit Court procedures, and the Small Estate Affidavit
// threshold updated effective August 15, 2025 (SB83).
type IllinoisEngine struct{}

var _ StateEngine = (*IllinoisEngine)(nil)

func (e *IllinoisEngine) StateCode() string  { return "IL" }
func (e *IllinoisEngine) StateName() string  { return "Illinois" }
func (e *IllinoisEngine) CourtSystem() string { return "Circuit Court of Cook County, Probate Division" }
func (e *IllinoisEngine) EFilingAvailable() bool { return true }
func (e *IllinoisEngine) ProbableTimeline() string { return "12–24 months" }

// SmallEstateThreshold returns $150,000 (effective 2026; vehicles excluded).
func (e *IllinoisEngine) SmallEstateThreshold() float64 { return 150_000.00 }

// InventoryDeadline returns 60 days per Illinois probate rules.
func (e *IllinoisEngine) InventoryDeadline() int { return 60 }

// CreditorClaimsPeriod returns 6 months per Illinois probate rules.
func (e *IllinoisEngine) CreditorClaimsPeriod() time.Duration {
	return 6 * 30 * 24 * time.Hour // ~180 days
}

// EvaluateSmallEstate checks whether the estate qualifies for the Illinois
// small estate affidavit path. Per SB83 (2025), the threshold is $150K and
// vehicles are excluded from the count. Real estate disqualifies entirely.
func (e *IllinoisEngine) EvaluateSmallEstate(totalPersonalProperty float64, hasRealEstate bool) SmallEstateResult {
	threshold := e.SmallEstateThreshold()

	if hasRealEstate {
		return SmallEstateResult{
			Qualifies:        false,
			EstateValue:      totalPersonalProperty,
			Threshold:        threshold,
			VehiclesExcluded: true,
			Reason:           "Estates with real property cannot use the small estate affidavit. Consider a Transfer on Death Instrument (TODI) for real estate.",
		}
	}

	if totalPersonalProperty > threshold {
		return SmallEstateResult{
			Qualifies:        false,
			EstateValue:      totalPersonalProperty,
			Threshold:        threshold,
			VehiclesExcluded: true,
			Reason:           "Personal property exceeds the $150,000 threshold. Full probate is required.",
		}
	}

	return SmallEstateResult{
		Qualifies:        true,
		EstateValue:      totalPersonalProperty,
		Threshold:        threshold,
		VehiclesExcluded: true,
		Reason:           "Estate qualifies for small estate affidavit. Wait at least 30 days after date of death before presenting.",
	}
}

// ComputeDeadlines calculates all key Illinois probate deadlines from the date
// letters of office were issued.
func (e *IllinoisEngine) ComputeDeadlines(lettersIssuedAt time.Time) []Deadline {
	now := time.Now()
	deadlines := []Deadline{
		{
			ID:          "inventory",
			Name:        "File Inventory",
			Description: "File a complete inventory of all estate assets with the court within 60 days of appointment.",
			DueDate:     lettersIssuedAt.AddDate(0, 0, 60),
			Category:    "filing",
		},
		{
			ID:          "creditor_notice",
			Name:        "Publish Creditor Notice",
			Description: "Publish notice to creditors in a newspaper of general circulation in the county. This starts the 6-month claims period.",
			DueDate:     lettersIssuedAt.AddDate(0, 0, 30), // should be done within first month
			Category:    "notice",
		},
		{
			ID:          "creditor_claims_close",
			Name:        "Creditor Claims Period Closes",
			Description: "All creditor claims must be filed within 6 months of publication. After this date, unpresented claims are barred.",
			DueDate:     lettersIssuedAt.AddDate(0, 6, 0),
			Category:    "notice",
		},
		{
			ID:          "final_accounting",
			Name:        "File Final Accounting",
			Description: "Prepare and file a detailed accounting of all estate transactions, distributions, and expenses.",
			DueDate:     lettersIssuedAt.AddDate(0, 9, 0), // typically after creditor period
			Category:    "accounting",
		},
		{
			ID:          "estate_tax_return",
			Name:        "File Estate Tax Return (if required)",
			Description: "Illinois estates exceeding $4 million must file an estate tax return within 9 months of death.",
			DueDate:     lettersIssuedAt.AddDate(0, 9, 0),
			Category:    "filing",
		},
	}

	for i := range deadlines {
		daysFromNow := int(math.Ceil(time.Until(deadlines[i].DueDate).Hours() / 24))
		deadlines[i].DaysFromNow = daysFromNow
		deadlines[i].Overdue = now.After(deadlines[i].DueDate)
	}

	return deadlines
}

// Checklist returns the ordered probate steps for Illinois, including
// Cook County form references and direct URLs where available.
func (e *IllinoisEngine) Checklist() []ChecklistItem {
	return []ChecklistItem{
		{
			ID: "death_certificate", Order: 1,
			Title:       "Obtain Certified Death Certificate",
			Description: "Request certified copies from the county clerk or funeral director. You will need multiple copies for court filings, financial institutions, and government agencies.",
			Phase:       string(PhaseDeathReported),
			Category:    "document",
			Required:    true,
		},
		{
			ID: "locate_will", Order: 2,
			Title:       "Locate the Will",
			Description: "Search for the original will in the decedent's records, safe deposit box, or with their attorney. Illinois requires the original document for probate.",
			Phase:       string(PhaseDeathReported),
			Category:    "document",
			Required:    true,
		},
		{
			ID: "evaluate_small_estate", Order: 3,
			Title:       "Evaluate Small Estate Eligibility",
			Description: "If the estate has no real property and personal property is under $150,000 (vehicles excluded), a small estate affidavit may avoid formal probate. Must wait 30 days after death.",
			Phase:       string(PhaseDeathReported),
			Category:    "document",
			Required:    false,
			FormURL:     "https://www.illinoislegalaid.org/legal-information/using-small-estate-affidavit",
		},
		{
			ID: "petition_probate", Order: 4,
			Title:       "File Petition for Probate",
			Description: "File the petition to admit the will to probate and request Letters Testamentary (or Letters of Administration if no will). Include the Probate Division Cover Sheet.",
			Phase:       string(PhaseExecutorConfirmed),
			Category:    "court_filing",
			Required:    true,
			FormRef:     "CCP0315",
			FormURL:     "https://www.cookcountycourtil.gov/division/probate-division/court-forms-probate-division",
		},
		{
			ID: "oath_bond", Order: 5,
			Title:       "File Oath and Bond of Representative",
			Description: "The appointed representative must take an oath and may need to post a bond (unless the will waives it or the court orders independent administration).",
			Phase:       string(PhaseExecutorConfirmed),
			Category:    "court_filing",
			Required:    true,
			FormRef:     "CCP0312/CCP0313",
			FormURL:     "https://www.cookcountycourtil.gov/division/probate-division/court-forms-probate-division",
		},
		{
			ID: "letters_office", Order: 6,
			Title:       "Receive Letters of Office",
			Description: "Once the court approves the petition, you receive Letters of Office (Letters Testamentary or Letters of Administration). This is your legal authority to act for the estate.",
			Phase:       string(PhaseInProbate),
			Category:    "court_filing",
			Required:    true,
		},
		{
			ID: "notify_creditors", Order: 7,
			Title:       "Publish Notice to Creditors",
			Description: "Publish a notice in a newspaper of general circulation in the county where the estate is being probated. This starts the 6-month claims period.",
			Phase:       string(PhaseInProbate),
			Category:    "notice",
			Required:    true,
		},
		{
			ID: "notify_heirs", Order: 8,
			Title:       "Send Notice to Known Heirs and Beneficiaries",
			Description: "Mail formal notice to all known heirs, beneficiaries, and creditors. Include information about their rights and the claims process.",
			Phase:       string(PhaseInProbate),
			Category:    "notice",
			Required:    true,
		},
		{
			ID: "file_inventory", Order: 9,
			Title:       "File Inventory (Due in 60 Days)",
			Description: "File a complete inventory of all estate assets with their fair market values within 60 days of receiving Letters of Office.",
			Phase:       string(PhaseInProbate),
			Category:    "court_filing",
			Required:    true,
		},
		{
			ID: "manage_assets", Order: 10,
			Title:       "Manage Estate Assets",
			Description: "Secure and manage estate property. This includes closing accounts, transferring titles, paying ongoing bills, and maintaining insurance.",
			Phase:       string(PhaseInProbate),
			Category:    "financial",
			Required:    true,
		},
		{
			ID: "pay_debts", Order: 11,
			Title:       "Pay Valid Debts and Claims",
			Description: "Review and pay valid creditor claims from estate funds. Reject invalid claims in writing. Wait for the 6-month claims period to close before making final distributions.",
			Phase:       string(PhaseInProbate),
			Category:    "financial",
			Required:    true,
		},
		{
			ID: "tax_returns", Order: 12,
			Title:       "File Tax Returns",
			Description: "File the decedent's final income tax return and, if required, an Illinois estate tax return (estates over $4 million). Federal estate tax applies over ~$13.6 million.",
			Phase:       string(PhaseInProbate),
			Category:    "filing",
			Required:    true,
		},
		{
			ID: "vehicle_transfer", Order: 13,
			Title:       "Transfer Vehicles",
			Description: "If the decedent designated a beneficiary on the title (VSD 773), the beneficiary can claim the vehicle with VSD 774 and a death certificate. Otherwise, transfer through probate.",
			Phase:       string(PhaseInProbate),
			Category:    "document",
			Required:    false,
			FormRef:     "VSD 774",
			FormURL:     "https://www.ilsos.gov/content/dam/publications/pdf_publications/vsd774.pdf",
		},
		{
			ID: "real_estate_transfer", Order: 14,
			Title:       "Transfer Real Estate",
			Description: "If a Transfer on Death Instrument (TODI) was recorded, the beneficiary files a Notice of Death Affidavit. Otherwise, real estate transfers through the probate estate.",
			Phase:       string(PhaseInProbate),
			Category:    "document",
			Required:    false,
			FormURL:     "https://www.illinoislegalaid.org/legal-information/creating-transfer-death-instrument-todi",
		},
		{
			ID: "final_accounting", Order: 15,
			Title:       "Prepare Final Accounting",
			Description: "Prepare a detailed accounting of all estate income, expenses, distributions, and remaining assets. This must be approved by the court or by all beneficiaries.",
			Phase:       string(PhaseProbateComplete),
			Category:    "accounting",
			Required:    true,
		},
		{
			ID: "receipt_release", Order: 16,
			Title:       "Obtain Receipt and Release from Beneficiaries",
			Description: "Each beneficiary signs a Receipt and Release acknowledging their distribution. Under independent administration, this may replace a formal court accounting.",
			Phase:       string(PhaseProbateComplete),
			Category:    "document",
			Required:    true,
		},
		{
			ID: "close_estate", Order: 17,
			Title:       "File to Close the Estate",
			Description: "File the final accounting and receipts with the court. Request discharge of the representative and closing of the estate.",
			Phase:       string(PhaseClosed),
			Category:    "court_filing",
			Required:    true,
		},
	}
}
