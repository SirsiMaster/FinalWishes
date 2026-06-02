package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// HCPOACaringInfo returns the coordinate map for the Illinois Statutory Short
// Form Power of Attorney for Health Care (755 ILCS 45/4-10), as carried by the
// CaringInfo Illinois advance-directive packet.
//
// SOURCE DERIVATION: the CaringInfo packet ships as a fillable AcroForm. The
// pinned blank here (il_hcpoa_caringinfo_flat.pdf) is that packet with its empty
// AcroForm widgets removed via forms.FlattenAcroForm — a one-time, offline,
// mechanical flatten that leaves all printed statutory text/labels intact and
// yields a true-flat PDF (zero form fields). The original AcroForm source
// (il_caringinfo_advance_directives.pdf) is retained in-house for provenance.
// The HCPOA form occupies pages 11 (principal + agent), 15 (principal signature
// + date), and 16 (witness) of the 17-page packet.
//
// Coordinates are from positioned-text extraction (pdftotext -bbox) and marked
// ConfidenceLow — the agent fields use a caption-below-the-line layout, so the
// vertical placement is tuned against the proof raster before production use.
func HCPOACaringInfo() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "il_hcpoa_caringinfo",
		Title:            "Illinois Statutory Short Form Power of Attorney for Health Care",
		Jurisdiction:     "IL",
		Citation:         "755 ILCS 45/4-10 (Statutory Short Form POA for Health Care)",
		BlankFile:        "docs/forms-phase0/blanks/il_hcpoa_caringinfo_flat.pdf",
		BlankSHA256:      "de7ae3d6c0bac40efa61b2bcb1677a2a677adbd33550021c7bcda5013ec7315d",
		PageCount:        17,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Helvetica",
		DefaultSize:      10,
		Fields: []forms.Field{
			// --- Page 11: principal + agent ---
			{
				Key: "principal_name", Label: "Principal full legal name (My name)",
				Kind: forms.FieldText, Required: true, Page: 11,
				X: 320, Y: 610, MaxWidth: 210,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"My name (Print your full name):\" (label ends x314, yTop 172.03).",
			},
			{
				Key: "principal_address", Label: "Principal address (My address)",
				Kind: forms.FieldText, Required: true, Page: 11,
				X: 215, Y: 581, MaxWidth: 315,
				Confidence: forms.ConfidenceLow,
				Note:       "After \"My address:\" (yTop 200.95).",
			},
			{
				Key: "agent_name", Label: "Health care agent full name",
				Kind: forms.FieldText, Required: true, Page: 11,
				X: 145, Y: 508, MaxWidth: 370,
				Confidence: forms.ConfidenceLow,
				Note:       "On the line ABOVE the \"(Agent name)\" caption (caption yTop 288.01).",
			},
			{
				Key: "agent_address", Label: "Health care agent address",
				Kind: forms.FieldText, Required: true, Page: 11,
				X: 145, Y: 478, MaxWidth: 370,
				Confidence: forms.ConfidenceLow,
				Note:       "Line above the \"(Agent address)\" caption (caption yTop 316.93).",
			},
			{
				Key: "agent_phone", Label: "Health care agent phone",
				Kind: forms.FieldText, Page: 11,
				X: 145, Y: 449, MaxWidth: 250,
				Confidence: forms.ConfidenceLow,
				Note:       "Line above the \"(Agent phone number)\" caption (caption yTop 345.91).",
			},

			// --- Pages 15-16: execution block. NEVER stamped (wet-sign + witness). ---
			{
				Key: "principal_signature", Label: "Principal signature",
				Kind: forms.FieldText, Execution: true, Page: 15,
				X: 215, Y: 517,
				Confidence: forms.ConfidenceLow,
				Note:       "\"My signature:\" line (yTop 265.33). Wet-sign only.",
			},
			{
				Key: "principal_date", Label: "Date principal signs",
				Kind: forms.FieldText, Execution: true, Page: 15,
				X: 215, Y: 488,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Today's date:\" line (yTop 294.31). Wet-sign only.",
			},
			{
				Key: "witness_signature", Label: "Witness signature",
				Kind: forms.FieldText, Execution: true, Page: 16,
				X: 210, Y: 461,
				Confidence: forms.ConfidenceLow,
				Note:       "Witness signature line (yTop ~321). One witness required; wet-sign only.",
			},
			{
				Key: "witness_printed_name", Label: "Witness printed name",
				Kind: forms.FieldText, Execution: true, Page: 16,
				X: 210, Y: 273,
				Confidence: forms.ConfidenceLow,
				Note:       "Witness printed-name line (yTop 509.41). Wet-sign only.",
			},
		},
	}
}
