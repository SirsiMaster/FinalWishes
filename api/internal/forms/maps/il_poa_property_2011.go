// Package maps holds per-form CoordinateMaps for the overlay engine. Each map
// is the ONLY form-specific artifact; the engine in package forms is generic.
//
// Coordinates were derived from positioned-text extraction of the official
// blank (poppler `pdftotext -bbox`), not estimated by eye. The blank uses a
// top-left origin; pdfcpu stamps from the bottom-left, so every Y below is
//
//	Y_pdfcpu = pageHeight(792) - (yTop + baselineOffset≈10.5)
//
// placing the value's baseline on the form's underscore rule. A single human
// visual pass (the proof raster in docs/forms-phase0/proof/) confirms the
// vertical baseline before the form is treated as production-ready.
package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// PropertyPOA2011 returns the coordinate map for the Illinois Statutory Short
// Form Power of Attorney for Property (July 1, 2011 revision), 755 ILCS 45.
//
// The blank is flat (no AcroForm); the fillable body is on page 3 (principal
// and agent name/address). All execution fields (principal/witness signature
// and date, page 7) are marked Execution=true and are NEVER stamped — the form
// is wet-signed by default.
func PropertyPOA2011() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "il_poa_property_2011",
		Title:            "Illinois Statutory Short Form Power of Attorney for Property",
		Jurisdiction:     "IL",
		Citation:         "755 ILCS 45/3-3 (Statutory Short Form, eff. July 1, 2011)",
		BlankFile:        "docs/forms-phase0/blanks/il_poa_property_2011.pdf",
		BlankSHA256:      "6fae0d5687253bc0e1f0ee03c446fa53e275f46c209cbb230c45eca02d56bfbc",
		PageCount:        11,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Times-Roman",
		DefaultSize:      11,
		Fields: []forms.Field{
			// --- Principal: "1. I, ____ (name and address of principal)" (page 3) ---
			{
				Key: "principal_name", Label: "Principal full legal name (after \"I,\")",
				Kind: forms.FieldText, Required: true, Page: 3,
				X: 104, Y: 646.7, MaxWidth: 405,
				Confidence: forms.ConfidenceHigh,
				Note:       "Anchored to the \"I,___\" rule at yTop 134.82; baseline = 792-(134.82+10.5).",
			},
			{
				Key: "principal_address_line1", Label: "Principal street address",
				Kind: forms.FieldText, Required: true, Page: 3,
				X: 74, Y: 630.6, MaxWidth: 460,
				Confidence: forms.ConfidenceHigh,
				Note:       "Blank rule 2 at yTop 150.90.",
			},
			{
				Key: "principal_address_line2", Label: "Principal city, state, ZIP",
				Kind: forms.FieldText, Required: true, Page: 3,
				X: 74, Y: 614.4, MaxWidth: 460,
				Confidence: forms.ConfidenceHigh,
				Note:       "Blank rule 3 at yTop 167.10.",
			},

			// --- Agent: "appoint: ____ (name and address of agent)" (page 3) ---
			{
				Key: "agent_name", Label: "Agent full legal name",
				Kind: forms.FieldText, Required: true, Page: 3,
				X: 74, Y: 517.8, MaxWidth: 460,
				Confidence: forms.ConfidenceHigh,
				Note:       "Agent blank rule 1 at yTop 263.70.",
			},
			{
				Key: "agent_address_line1", Label: "Agent street address",
				Kind: forms.FieldText, Required: true, Page: 3,
				X: 74, Y: 501.7, MaxWidth: 460,
				Confidence: forms.ConfidenceHigh,
				Note:       "Agent blank rule 2 at yTop 279.78.",
			},
			{
				Key: "agent_address_line2", Label: "Agent city, state, ZIP",
				Kind: forms.FieldText, Required: true, Page: 3,
				X: 74, Y: 485.6, MaxWidth: 460,
				Confidence: forms.ConfidenceHigh,
				Note:       "Agent blank rule 3 at yTop 295.86.",
			},

			// --- Execution block (page 7): NEVER stamped. Wet-sign + notarize. ---
			{
				Key: "principal_date", Label: "Date principal signs",
				Kind: forms.FieldText, Execution: true, Page: 7,
				X: 115, Y: 432.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"Dated:\" on the principal signature line (yTop 348.78). Wet-sign only.",
			},
			{
				Key: "principal_signature", Label: "Principal signature",
				Kind: forms.FieldText, Execution: true, Page: 7,
				X: 337, Y: 432.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"Signed:\" / (Principal) line. Wet-sign only.",
			},
			{
				Key: "witness_date", Label: "Date witness signs",
				Kind: forms.FieldText, Execution: true, Page: 7,
				X: 115, Y: 94.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "Witness \"Dated:\" line (yTop 686.82). Wet-sign only.",
			},
			{
				Key: "witness_signature", Label: "Witness signature",
				Kind: forms.FieldText, Execution: true, Page: 7,
				X: 300, Y: 94.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "Witness \"Signed:\" / (Witness) line. Wet-sign + notarization required.",
			},
		},
	}
}
