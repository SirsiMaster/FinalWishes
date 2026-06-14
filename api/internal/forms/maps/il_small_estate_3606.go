package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// SmallEstateAffidavit3606 returns the coordinate map for the Illinois Small
// Estate Affidavit (SOS/Probate Form 3606, rev. 1/26), 755 ILCS 5/25-1.
//
// The blank is flat (no AcroForm), 4 pages, US Letter. This map covers:
//   - the core single-value affidavit fields (affiant + decedent identity,
//     dates, addresses, relationship);
//   - the single-claimant rows of the variable-length schedules — the first
//     creditor row (para 6/7), the first heir/legatee row (para 9), the total
//     personal-property valuation, and the spousal/child award amount — which
//     cover the common one-creditor / one-heir estate without a repeating-row
//     renderer;
//   - the execution block on page 4 (signature, date, notary), flagged
//     Execution=true — never stamped, wet-sign + notarization required.
//
// MULTI-ROW LIMITATION (tracked, not hidden): estates with MORE THAN ONE
// creditor in any of Classes 1–7 (paras 6–7) or MORE THAN ONE heir/legatee
// (paras 9–10) need a repeating-row renderer — a future forms-engine extension.
// Until that lands, multi-claimant estates must complete the extra rows by hand
// on the printed draft; the prefill stamps only the first row of each schedule.
// The fill engine's missing-required reporting plus the PREPARATION-ASSISTANCE
// disclaimer keep this Rule-9 honest: nothing is asserted that was not supplied.
//
// PRODUCTION READINESS: every coordinate below is marked ConfidenceLow. The
// affidavit uses dotted/underscore leaders, so each blank-start X/Y is an
// estimate derived from positioned-text extraction (pdftotext -bbox) that MUST
// be tuned against the proof raster (docs/forms-phase0/proof/) before this form
// is offered as a final draft. Callers should treat il_small_estate_3606 as a
// PREVIEW form — surface it behind a preview affordance, not as GA — until a
// proof-raster pass promotes these coordinates to ConfidenceHigh.
func SmallEstateAffidavit3606() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "il_small_estate_3606",
		Title:            "Illinois Small Estate Affidavit (Form 3606, rev. 1/26)",
		Jurisdiction:     "IL",
		Citation:         "755 ILCS 5/25-1 (Small Estate Affidavit)",
		BlankFile:        "docs/forms-phase0/blanks/il_form3606_small_estate.pdf",
		BlankSHA256:      "89a883cf6743c79a761f16ad132a9f598d95f869bd80caf3ace91e2b6def5958",
		PageCount:        4,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Helvetica",
		DefaultSize:      9,
		Fields: []forms.Field{
			// --- Page 1: affiant + decedent identity ---
			{
				Key: "affiant_name", Label: "Affiant full legal name (after \"I,\")",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 55, Y: 711.5, MaxWidth: 270,
				Confidence: forms.ConfidenceLow,
				Note:       "Between \"I,\" (ends x49) and \"(name of affiant)\" label (x333), yTop 71.54.",
			},
			{
				Key: "affiant_po_address", Label: "Affiant post office address (1a)",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 218, Y: 687.5, MaxWidth: 300,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"My post office address is\", yTop 95.51.",
			},
			{
				Key: "affiant_residence_address", Label: "Affiant residence address (1b)",
				Kind: forms.FieldText, Page: 1,
				X: 218, Y: 666.7, MaxWidth: 300,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"My residence address is\", yTop 116.27.",
			},
			{
				Key: "decedent_name", Label: "Decedent full legal name (para 2)",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 200, Y: 517.3, MaxWidth: 330,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"The decedent's name is\", yTop 265.67.",
			},
			{
				Key: "date_of_death", Label: "Date of decedent's death (para 3)",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 205, Y: 494.5, MaxWidth: 130,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"death was\" (x199), before \", and I have attached\", yTop 288.45.",
			},
			{
				Key: "decedent_residence", Label: "Decedent place of residence before death (para 4)",
				Kind: forms.FieldText, Page: 1,
				X: 320, Y: 473.2, MaxWidth: 215,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"before their death was\" (x315), yTop 309.81.",
			},

			// --- Page 2: personal-property valuation + first creditor row ---
			//
			// Single-claimant subset of the variable-length schedules. The first
			// row of each schedule is mapped here; additional rows require the
			// repeating-row renderer (documented limitation above) and are
			// completed by hand on the printed draft.
			{
				Key: "total_personal_property", Label: "Total value of decedent's personal estate (para 5)",
				Kind: forms.FieldText, Page: 2,
				X: 360, Y: 700.0, MaxWidth: 160,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"does not exceed\" / value rule on para 5. Personal property only — real estate excluded per 755 ILCS 5/25-1. ESTIMATE: tune X/Y against proof raster.",
			},
			{
				Key: "creditor1_name", Label: "First creditor — name (Classes 1–7, paras 6–7, row 1)",
				Kind: forms.FieldText, Page: 2,
				X: 70, Y: 470.0, MaxWidth: 240,
				Confidence: forms.ConfidenceLow,
				Note:       "Row 1 of the creditor schedule. Multi-creditor estates need the repeating-row renderer. ESTIMATE: tune against proof raster.",
			},
			{
				Key: "creditor1_class", Label: "First creditor — statutory class 1–7 (paras 6–7, row 1)",
				Kind: forms.FieldText, Page: 2,
				X: 320, Y: 470.0, MaxWidth: 60,
				Confidence: forms.ConfidenceLow,
				Note:       "Class column for creditor row 1. ESTIMATE: tune against proof raster.",
			},
			{
				Key: "creditor1_amount", Label: "First creditor — claim amount (paras 6–7, row 1)",
				Kind: forms.FieldText, Page: 2,
				X: 400, Y: 470.0, MaxWidth: 120,
				Confidence: forms.ConfidenceLow,
				Note:       "Amount column for creditor row 1. ESTIMATE: tune against proof raster.",
			},

			// --- Page 3: first heir/legatee row + award computation ---
			{
				Key: "heir1_name", Label: "First heir/legatee — name (paras 9–10, row 1)",
				Kind: forms.FieldText, Page: 3,
				X: 70, Y: 520.0, MaxWidth: 220,
				Confidence: forms.ConfidenceLow,
				Note:       "Row 1 of the heirs/legatees schedule. Multi-heir estates need the repeating-row renderer. ESTIMATE: tune against proof raster.",
			},
			{
				Key: "heir1_relationship", Label: "First heir/legatee — relationship to decedent (paras 9–10, row 1)",
				Kind: forms.FieldText, Page: 3,
				X: 300, Y: 520.0, MaxWidth: 130,
				Confidence: forms.ConfidenceLow,
				Note:       "Relationship column for heir row 1. ESTIMATE: tune against proof raster.",
			},
			{
				Key: "heir1_share", Label: "First heir/legatee — share/interest (paras 9–10, row 1)",
				Kind: forms.FieldText, Page: 3,
				X: 440, Y: 520.0, MaxWidth: 90,
				Confidence: forms.ConfidenceLow,
				Note:       "Share column for heir row 1 (e.g. \"100%\", \"1/2\"). ESTIMATE: tune against proof raster.",
			},
			{
				Key: "award_amount", Label: "Spousal/child award amount (computed, single-claimant)",
				Kind: forms.FieldText, Page: 3,
				X: 360, Y: 300.0, MaxWidth: 140,
				Confidence: forms.ConfidenceLow,
				Note:       "Surviving-spouse or child award line. Computation supplied by caller; engine never derives it. ESTIMATE: tune against proof raster.",
			},

			// --- Page 4: affiant relationship + execution block ---
			{
				Key: "affiant_relationship", Label: "Affiant relationship to decedent (para 10.3)",
				Kind: forms.FieldText, Page: 4,
				X: 435, Y: 759.5, MaxWidth: 100,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"is as follows:\" on para 10.3, yTop 23.25.",
			},
			{
				Key: "affiant_signature", Label: "Signature of affiant",
				Kind: forms.FieldText, Execution: true, Page: 4,
				X: 375, Y: 319.5,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Signature of Affiant:\" line (yTop 463.52). Wet-sign only.",
			},
			{
				Key: "affiant_date", Label: "Date affiant signs",
				Kind: forms.FieldText, Execution: true, Page: 4,
				X: 320, Y: 289.6,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Date:\" line (yTop 493.40). Wet-sign only.",
			},
			{
				Key: "notary_public", Label: "Notary public",
				Kind: forms.FieldText, Execution: true, Page: 4,
				X: 360, Y: 229.8,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Notary Public:\" line (yTop 553.16). Notarization required.",
			},
		},
	}
}
