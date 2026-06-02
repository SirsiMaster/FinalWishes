package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// LivingWillCaringInfo returns the coordinate map for the Illinois Living Will
// Declaration (755 ILCS 35, Illinois Living Will Act), page 17 of the same
// flattened CaringInfo advance-directive packet used for the Health Care POA.
//
// The blank is the SHA-pinned flat packet (il_hcpoa_caringinfo_flat.pdf); only
// the form ID, citation, and field set differ from the HCPOA map — the engine
// is unchanged. Identity fields (declarant name, residence) are filled; the
// declaration date, declarant signature, and both witness signatures are
// Execution=true and never stamped (wet-sign + two witnesses required by the
// Act).
//
// Coordinates from pdftotext -bbox, ConfidenceLow pending the proof-tuning pass.
func LivingWillCaringInfo() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "il_living_will_caringinfo",
		Title:            "Illinois Living Will Declaration",
		Jurisdiction:     "IL",
		Citation:         "755 ILCS 35 (Illinois Living Will Act)",
		BlankFile:        "docs/forms-phase0/blanks/il_hcpoa_caringinfo_flat.pdf",
		BlankSHA256:      "de7ae3d6c0bac40efa61b2bcb1677a2a677adbd33550021c7bcda5013ec7315d",
		PageCount:        17,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Helvetica",
		DefaultSize:      10,
		Fields: []forms.Field{
			// --- Page 17: declarant identity (filled) ---
			{
				Key: "declarant_name", Label: "Declarant full legal name (after \"I,\")",
				Kind: forms.FieldText, Required: true, Page: 17,
				X: 240, Y: 641, MaxWidth: 290,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"I,\" (x233, yTop 141.25), before \"being of sound mind\".",
			},
			{
				Key: "declarant_residence", Label: "Declarant city, county and state of residence",
				Kind: forms.FieldText, Page: 17,
				X: 340, Y: 356, MaxWidth: 190,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"City, County and State of Residence\" (ends x334, yTop 426.25).",
			},

			// --- Page 17: execution. NEVER stamped (wet-sign + two witnesses). ---
			{
				Key: "declaration_day", Label: "Day of month the declaration is made",
				Kind: forms.FieldText, Execution: true, Page: 17,
				X: 305, Y: 670,
				Confidence: forms.ConfidenceLow,
				Note:       "\"made this ___ day\" (yTop 112.33). Dated at signing — wet-sign only.",
			},
			{
				Key: "declaration_month_year", Label: "Month and year the declaration is made",
				Kind: forms.FieldText, Execution: true, Page: 17,
				X: 395, Y: 670,
				Confidence: forms.ConfidenceLow,
				Note:       "\"day of ___ (month, year)\". Dated at signing — wet-sign only.",
			},
			{
				Key: "declarant_signature", Label: "Declarant signature",
				Kind: forms.FieldText, Execution: true, Page: 17,
				X: 185, Y: 385,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Signed\" line (yTop 397.27). Wet-sign only.",
			},
			{
				Key: "witness1_signature", Label: "First witness signature",
				Kind: forms.FieldText, Execution: true, Page: 17,
				X: 290, Y: 134,
				Confidence: forms.ConfidenceLow,
				Note:       "First witness line (yTop ~648). Two witnesses required; wet-sign only.",
			},
			{
				Key: "witness2_signature", Label: "Second witness signature",
				Kind: forms.FieldText, Execution: true, Page: 17,
				X: 290, Y: 105,
				Confidence: forms.ConfidenceLow,
				Note:       "Second witness line (yTop ~677). Wet-sign only.",
			},
		},
	}
}
