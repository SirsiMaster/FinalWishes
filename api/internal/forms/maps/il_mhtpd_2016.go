package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// MentalHealthDeclaration2016 returns the coordinate map for the Illinois
// Declaration for Mental Health Treatment (755 ILCS 43, Mental Health Treatment
// Preference Declaration Act), the official IDPH blank (rev. 04/04/16).
//
// The blank is flat (no AcroForm), 4 pages, US Letter, SHA-pinned. This map
// covers the single-value core: declarant identity (name, date of birth, p1)
// and the primary + successor attorney-in-fact appointments (name/address/
// phone, pp.2-3). The signature/date and witness lines (p3) are Execution=true
// and never stamped (wet-sign; two witnesses required).
//
// NOT MAPPED (documented limitation): the variable preference sections —
// symptom list, psychotropic-medication consent/refusal lists, ECT and
// admission preferences. These are free-text areas; they can be added later as
// Multiline fields once their per-section extents are tuned.
//
// Coordinates from pdftotext -bbox, ConfidenceLow pending the proof-tuning pass.
func MentalHealthDeclaration2016() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "il_mhtpd_2016",
		Title:            "Illinois Declaration for Mental Health Treatment",
		Jurisdiction:     "IL",
		Citation:         "755 ILCS 43 (Mental Health Treatment Preference Declaration Act)",
		BlankFile:        "docs/forms-phase0/blanks/il_mhtpd_2016.pdf",
		BlankSHA256:      "3d03480aa524f1601d866fe4065eb15719529bdc1142f2877e5cd12bbc5af771",
		PageCount:        4,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Helvetica",
		DefaultSize:      9,
		Fields: []forms.Field{
			// --- Page 1: declarant identity ---
			{
				Key: "declarant_name", Label: "Declarant full legal name (after \"I\")",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 46, Y: 679, MaxWidth: 250,
				Confidence: forms.ConfidenceLow,
				Note:       "\"I___\" rule (x36–301, yTop 103.48).",
			},
			{
				Key: "declarant_dob", Label: "Declarant date of birth",
				Kind: forms.FieldText, Page: 1,
				X: 348, Y: 679, MaxWidth: 120,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"born on\" (x324, yTop 103.48).",
			},

			// --- Page 2: primary attorney-in-fact ---
			{
				Key: "aif_name", Label: "Attorney-in-fact name",
				Kind: forms.FieldText, Page: 2,
				X: 80, Y: 204, MaxWidth: 415,
				Confidence: forms.ConfidenceLow,
				Note:       "\"NAME___\" (yTop 578.01).",
			},
			{
				Key: "aif_address", Label: "Attorney-in-fact address",
				Kind: forms.FieldText, Page: 2,
				X: 92, Y: 183, MaxWidth: 405,
				Confidence: forms.ConfidenceLow,
				Note:       "\"ADDRESS___\" (yTop 599.88).",
			},
			{
				Key: "aif_phone", Label: "Attorney-in-fact telephone",
				Kind: forms.FieldText, Page: 2,
				X: 110, Y: 161, MaxWidth: 390,
				Confidence: forms.ConfidenceLow,
				Note:       "\"TELEPHONE#___\" (yTop 621.72).",
			},

			// --- Page 3: successor attorney-in-fact ---
			{
				Key: "successor_aif_name", Label: "Successor attorney-in-fact name",
				Kind: forms.FieldText, Page: 3,
				X: 80, Y: 647, MaxWidth: 415,
				Confidence: forms.ConfidenceLow,
				Note:       "Successor \"NAME___\" (yTop 135.64).",
			},
			{
				Key: "successor_aif_address", Label: "Successor attorney-in-fact address",
				Kind: forms.FieldText, Page: 3,
				X: 92, Y: 621, MaxWidth: 405,
				Confidence: forms.ConfidenceLow,
				Note:       "Successor \"ADDRESS___\" (yTop 160.96).",
			},
			{
				Key: "successor_aif_phone", Label: "Successor attorney-in-fact telephone",
				Kind: forms.FieldText, Page: 3,
				X: 110, Y: 596, MaxWidth: 390,
				Confidence: forms.ConfidenceLow,
				Note:       "Successor \"TELEPHONE#___\" (yTop 186.28).",
			},

			// --- Page 3: execution. NEVER stamped (wet-sign + two witnesses). ---
			{
				Key: "principal_signature", Label: "Principal signature + date",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 255, Y: 520,
				Confidence: forms.ConfidenceLow,
				Note:       "\"(Signature of Principal/Date)\" caption (yTop 279.02). Wet-sign only.",
			},
			{
				Key: "witness1_signature", Label: "First witness signature",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 55, Y: 432,
				Confidence: forms.ConfidenceLow,
				Note:       "First witness line (below WITNESSES header yTop 300.61). Wet-sign only.",
			},
			{
				Key: "witness2_signature", Label: "Second witness signature",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 55, Y: 342,
				Confidence: forms.ConfidenceLow,
				Note:       "Second witness line. Wet-sign only.",
			},
		},
	}
}
