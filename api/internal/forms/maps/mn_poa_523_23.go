package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// MNStatutoryPOA returns the coordinate map for the Minnesota Statutory Short
// Form Power of Attorney, Minn. Stat. § 523.23.
//
// Coordinates were derived from positioned-text extraction of the official
// Minnesota Attorney General blank (poppler `pdftotext -bbox`), not estimated
// by eye. The blank is 612x792, flat (no AcroForm), 5 pages. The blank uses a
// top-left origin; pdfcpu stamps from the bottom-left, so every Y below is
//
//	Y_pdfcpu = pageHeight(792) - (yMin_topleft + baselineOffset≈10.5)
//
// placing the value's baseline on the form's underscore rule. The yMin values
// are the top of each underscore-run glyph box as reported by pdftotext -bbox.
//
// Fillable body content lives on:
//   - Page 1: PRINCIPAL name/address, ATTORNEY(S)-IN-FACT name/address, First
//     Successor name/address, joint/several selection, EXPIRATION DATE.
//   - Page 2: the (A)-(N) power checkboxes (operative content).
//
// All execution fields (the "In Witness Whereof" principal signature/date on
// page 3 and the notary acknowledgment block) are marked Execution=true and are
// NEVER stamped — the form is wet-signed and notarized by default. The
// attorney-in-fact specimen-signature block on page 4 is likewise execution.
//
// NOTE: This is a real legal document. No field text is authored by an LLM; the
// engine only places the principal's own data onto the official blank.
func MNStatutoryPOA() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "mn_poa_523_23",
		Title:            "Minnesota Statutory Short Form Power of Attorney",
		Jurisdiction:     "MN",
		Citation:         "Minn. Stat. § 523.23 (Statutory Short Form Power of Attorney)",
		BlankFile:        "docs/forms-phase0/blanks/mn_poa_523_23.pdf",
		BlankSHA256:      "bd49b1a608ef6c13b4d068649ca0a64375e234e207a8e5682478755b9e4669b3",
		PageCount:        5,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Times-Roman",
		DefaultSize:      10,
		Fields: []forms.Field{
			// --- PRINCIPAL (Name and Address), page 1 ---
			// Three centered rules at xMin 194.40, xMax 425.19.
			{
				Key: "principal_name", Label: "Principal full legal name",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 198, Y: 568.0, MaxWidth: 225,
				Confidence: forms.ConfidenceHigh,
				Note:       "PRINCIPAL rule 1, underscore yMin 213.50, xMin 194.40; baseline 792-(213.50+10.5).",
			},
			{
				Key: "principal_address_line1", Label: "Principal street address",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 198, Y: 555.3, MaxWidth: 225,
				Confidence: forms.ConfidenceHigh,
				Note:       "PRINCIPAL rule 2, underscore yMin 226.22.",
			},
			{
				Key: "principal_address_line2", Label: "Principal city, state, ZIP",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 198, Y: 542.7, MaxWidth: 225,
				Confidence: forms.ConfidenceHigh,
				Note:       "PRINCIPAL rule 3, underscore yMin 238.81.",
			},

			// --- ATTORNEY(S)-IN-FACT (Name and Address), page 1 (left column) ---
			// Six rules at xMin 80.17, xMax 267.25. We map the first three (one
			// attorney name + two address lines); rules 4-6 are for a second
			// attorney-in-fact and stay blank unless the caller supplies them.
			{
				Key: "aif_name", Label: "Attorney-in-fact full legal name",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 82, Y: 403.5, MaxWidth: 183,
				Confidence: forms.ConfidenceHigh,
				Note:       "ATTORNEY(S)-IN-FACT rule 1, underscore yMin 378.00, xMin 80.17.",
			},
			{
				Key: "aif_address_line1", Label: "Attorney-in-fact street address",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 82, Y: 390.9, MaxWidth: 183,
				Confidence: forms.ConfidenceHigh,
				Note:       "ATTORNEY(S)-IN-FACT rule 2, underscore yMin 390.59.",
			},
			{
				Key: "aif_address_line2", Label: "Attorney-in-fact city, state, ZIP",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 82, Y: 378.2, MaxWidth: 183,
				Confidence: forms.ConfidenceHigh,
				Note:       "ATTORNEY(S)-IN-FACT rule 3, underscore yMin 403.31.",
			},

			// --- First Successor Attorney-in-Fact, page 1 (right column) ---
			// Name rule starts after the "First Successor" label at xMin 395.16;
			// the two address rules below start at xMin 318.73.
			{
				Key: "successor_name", Label: "First successor attorney-in-fact name",
				Kind: forms.FieldText, Page: 1,
				X: 397, Y: 403.5, MaxWidth: 108,
				Confidence: forms.ConfidenceHigh,
				Note:       "First Successor name rule, underscore yMin 378.00, xMin 395.16 (after label).",
			},
			{
				Key: "successor_address_line1", Label: "First successor street address",
				Kind: forms.FieldText, Page: 1,
				X: 320, Y: 390.9, MaxWidth: 185,
				Confidence: forms.ConfidenceHigh,
				Note:       "First Successor rule 2, underscore yMin 390.59, xMin 318.73.",
			},
			{
				Key: "successor_address_line2", Label: "First successor city, state, ZIP",
				Kind: forms.FieldText, Page: 1,
				X: 320, Y: 378.2, MaxWidth: 185,
				Confidence: forms.ConfidenceHigh,
				Note:       "First Successor rule 3, underscore yMin 403.31.",
			},

			// --- Joint / several selection, page 1 ---
			// "____ Each attorney-in-fact may independently..." and
			// "____ All attorneys-in-fact must jointly..." Mark on the leading
			// underscore box (xMin 90.02). Glyph centered slightly inside.
			{
				Key: "agents_several", Label: "Each attorney-in-fact may independently exercise the powers",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 1,
				X: 97, Y: 251.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"Each attorney-in-fact may independently\" box, underscore yMin 529.80, xMin 90.02.",
			},
			{
				Key: "agents_joint", Label: "All attorneys-in-fact must jointly exercise the powers",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 1,
				X: 97, Y: 226.5,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"All attorneys-in-fact must jointly\" box, underscore yMin 555.00, xMin 90.02.",
			},

			// --- Expiration date (optional), page 1 ---
			// "____________ _____, ____________ / Use Specific Month Day Year".
			// Single text field anchored at the month rule (xMin 318.72). The
			// caller may format "Month Day, Year" to span the rule visually.
			{
				Key: "expiration_date", Label: "Expiration date (optional)",
				Kind: forms.FieldText, Page: 1,
				X: 320, Y: 239.1, MaxWidth: 200,
				Confidence: forms.ConfidenceLow,
				Note:       "EXPIRATION DATE rule, underscore yMin 542.41, xMin 318.72. Single field spans month/day/year rules; LOW until visually tuned for the split rules.",
			},

			// --- Powers (A)-(N), page 2 ---
			// Each is a leading "____" checkbox at xMin ~72; glyph centered ~x79.
			// (A) is on its own line at yMin 213.50; (B)-(N) run 378.02 .. 529.79.
			{
				Key: "power_a", Label: "(A) real property transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 568.0,
				Confidence: forms.ConfidenceHigh,
				Note:       "(A) box, underscore yMin 213.50, xMin 72.00.",
			},
			{
				Key: "power_b", Label: "(B) tangible personal property transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 403.5,
				Confidence: forms.ConfidenceHigh,
				Note:       "(B) box, underscore yMin 378.02.",
			},
			{
				Key: "power_c", Label: "(C) bond, share, and commodity transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 390.9,
				Confidence: forms.ConfidenceHigh,
				Note:       "(C) box, underscore yMin 390.62.",
			},
			{
				Key: "power_d", Label: "(D) banking transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 378.2,
				Confidence: forms.ConfidenceHigh,
				Note:       "(D) box, underscore yMin 403.34.",
			},
			{
				Key: "power_e", Label: "(E) business operating transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 365.6,
				Confidence: forms.ConfidenceHigh,
				Note:       "(E) box, underscore yMin 415.94.",
			},
			{
				Key: "power_f", Label: "(F) insurance transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 353.0,
				Confidence: forms.ConfidenceHigh,
				Note:       "(F) box, underscore yMin 428.53.",
			},
			{
				Key: "power_g", Label: "(G) beneficiary transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 340.2,
				Confidence: forms.ConfidenceHigh,
				Note:       "(G) box, underscore yMin 441.25.",
			},
			{
				Key: "power_h", Label: "(H) gift transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 327.6,
				Confidence: forms.ConfidenceHigh,
				Note:       "(H) box, underscore yMin 453.85.",
			},
			{
				Key: "power_i", Label: "(I) fiduciary transactions",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 314.9,
				Confidence: forms.ConfidenceHigh,
				Note:       "(I) box, underscore yMin 466.57.",
			},
			{
				Key: "power_j", Label: "(J) claims and litigation",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 302.3,
				Confidence: forms.ConfidenceHigh,
				Note:       "(J) box, underscore yMin 479.16.",
			},
			{
				Key: "power_k", Label: "(K) family maintenance",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 289.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "(K) box, underscore yMin 491.76.",
			},
			{
				Key: "power_l", Label: "(L) benefits from military service",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 277.0,
				Confidence: forms.ConfidenceHigh,
				Note:       "(L) box, underscore yMin 504.48.",
			},
			{
				Key: "power_m", Label: "(M) records, reports, and statements",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 264.4,
				Confidence: forms.ConfidenceHigh,
				Note:       "(M) box, underscore yMin 517.07.",
			},
			{
				Key: "power_n", Label: "(N) all of the powers listed in (A) through (M) above",
				Kind: forms.FieldCheckbox, Glyph: "X", Page: 2,
				X: 79, Y: 251.7,
				Confidence: forms.ConfidenceHigh,
				Note:       "(N) box, underscore yMin 529.79.",
			},

			// --- Execution block (page 3): NEVER stamped. Wet-sign + notarize. ---
			// "In Witness Whereof I have hereunto signed my name this ___day of
			// ___________, 20___." then "(Signature of Principal)" rule, then the
			// notary acknowledgment block.
			{
				Key: "execution_day", Label: "Day of month principal signs",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 340, Y: 314.9,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"this ___day\" on the In-Witness-Whereof line, underscore yMin 466.58, xMin 337.56. Wet-sign only.",
			},
			{
				Key: "execution_month", Label: "Month principal signs",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 400, Y: 314.9,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"of ___________,\" month rule, underscore yMin 466.58, xMin 396.97. Wet-sign only.",
			},
			{
				Key: "execution_year", Label: "Year principal signs (after 20)",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 500, Y: 314.9,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"20______.\" year rule, underscore yMin 466.58, xMin 483.62. Wet-sign only.",
			},
			{
				Key: "principal_signature", Label: "Signature of Principal",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 328, Y: 277.0,
				Confidence: forms.ConfidenceHigh,
				Note:       "(Signature of Principal) rule, underscore yMin 504.49, xMin 324.02. Wet-sign only.",
			},
			{
				Key: "notary_day", Label: "Acknowledgment day",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 392, Y: 188.4,
				Confidence: forms.ConfidenceHigh,
				Note:       "Acknowledgment \"this ___day\", underscore yMin 593.06, xMin 389.65. Notary completes.",
			},
			{
				Key: "notary_month", Label: "Acknowledgment month",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 441, Y: 188.4,
				Confidence: forms.ConfidenceHigh,
				Note:       "Acknowledgment month rule, underscore yMin 593.06, xMin 438.49. Notary completes.",
			},
			{
				Key: "notary_year", Label: "Acknowledgment year (after 20)",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 524, Y: 188.4,
				Confidence: forms.ConfidenceHigh,
				Note:       "Acknowledgment \"20___,\" year rule, underscore yMin 593.06, xMin 508.33. Notary completes.",
			},
			{
				Key: "notary_principal_name", Label: "Name of Principal (acknowledged before notary)",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 90, Y: 175.8, MaxWidth: 205,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"by ____ (Insert Name of Principal)\" rule, underscore yMin 605.66, xMin 86.42. Notary completes.",
			},
			{
				Key: "notary_signature", Label: "Signature of Notary Public or other Official",
				Kind: forms.FieldText, Execution: true, Page: 3,
				X: 292, Y: 137.9,
				Confidence: forms.ConfidenceHigh,
				Note:       "(Signature of Notary Public or other Official) rule, underscore yMin 643.58, xMin 288.00. Notary completes.",
			},

			// --- Attorney(s)-in-fact acknowledgment + specimen signature (page 4) ---
			// Two right-column rules (acknowledgment, "Notarization not required")
			// at yMin 162.98 / 175.57, plus the specimen-signature block. All
			// execution: the attorney-in-fact signs in wet ink to accept the role.
			{
				Key: "aif_acknowledgment_signature", Label: "Attorney-in-fact acknowledgment signature",
				Kind: forms.FieldText, Execution: true, Page: 4,
				X: 318, Y: 618.5,
				Confidence: forms.ConfidenceHigh,
				Note:       "Acknowledgment rule 1, underscore yMin 162.98, xMin 315.00. Wet-sign only.",
			},
			{
				Key: "aif_specimen_signature", Label: "Specimen signature of attorney(s)-in-fact",
				Kind: forms.FieldText, Execution: true, Page: 4,
				X: 316, Y: 543.3,
				Confidence: forms.ConfidenceHigh,
				Note:       "Specimen Signature block rule 1 (right column), underscore yMin 238.79, xMin 312.71. Wet-sign only.",
			},
		},
	}
}
