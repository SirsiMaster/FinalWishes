package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// SmallEstateAffidavit3606 returns the coordinate map for the Illinois Small
// Estate Affidavit (SOS/Probate Form 3606, rev. 1/26), 755 ILCS 5/25-1.
//
// The blank is flat (no AcroForm), 4 pages, US Letter. This first-pass map
// covers the core single-value affidavit fields (affiant + decedent identity,
// dates, addresses, relationship) and flags the execution block on page 4
// (signature, date, notary) as Execution=true — never stamped, wet-sign +
// notarization required.
//
// NOT YET MAPPED (documented limitation — needs a repeating-row renderer, a
// future engine extension): the variable-length schedules — creditor Classes
// 1–7 (paras 6–7), heirs/legatees tables (paras 9–10), and the spousal/child
// award computations. Those rows vary per estate and cannot be expressed as
// fixed coordinates. Single-claimant common cases can be added as discrete
// fields later; multi-row support is tracked separately.
//
// Coordinates are derived from positioned-text extraction (pdftotext -bbox) and
// marked ConfidenceLow: the affidavit uses dotted/underscore leaders, so the
// exact blank-start on each line is an estimate to be tuned against the proof
// raster before this form is treated as production-ready.
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
