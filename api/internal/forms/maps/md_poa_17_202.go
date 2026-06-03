package maps

import "github.com/sirsi-technologies/finalwishes-api/internal/forms"

// MDStatutoryPOA returns the coordinate map for the Maryland Statutory Form
// Personal Financial Power of Attorney, Md. Code, Est. & Trusts § 17-202.
//
// SOURCE DERIVATION: the pinned blank is the official General Assembly of
// Maryland publication of the § 17-202 statutory form (Microsoft Word 2013
// export, 612x792, flat — no AcroForm). Page 1 carries a minor statute-web
// publication wrapper ("[Previous][Next]", "§17–202.") that is part of the
// official artifact and is intentionally left intact. Page 10 ends the same
// way ("[Previous][Next]"). The fillable underscore rules are the real
// statutory blanks.
//
// COORDINATES are from positioned-text extraction (poppler `pdftotext -bbox`,
// top-left origin word boxes), not estimated by eye. pdfcpu stamps from the
// bottom-left, so every Y below is
//
//	Y_pdfcpu = pageHeight(792) - (yTop + baselineOffset≈10.5)
//
// placing the value's baseline on the form's underscore rule. The proof raster
// in docs/forms-phase0/proof/ (md_poa_17_202_p2/p3/p9) confirms the vertical
// baseline before the form is treated as production-ready.
//
// FORM STRUCTURE: this MD form grants ALL powers by statutory text (no per-
// power checkboxes), so no individual powers are mapped. The principal
// identifies once on page 1 ("I, ___" under DESIGNATION OF AGENT). The agent
// block is on page 2; the successor + second-successor blocks on page 3; the
// optional termination date on page 8. The full execution block (principal
// signature/date/name, your address/telephone, notary acknowledgment, and
// Witness #1 (page 9) + Witness #2 (page 10) attestations) is marked
// Execution=true and is NEVER stamped — the form is wet-signed and notarized.
func MDStatutoryPOA() *forms.CoordinateMap {
	return &forms.CoordinateMap{
		FormID:           "md_poa_17_202",
		Title:            "Maryland Statutory Form Personal Financial Power of Attorney",
		Jurisdiction:     "MD",
		Citation:         "Md. Code, Est. & Trusts § 17-202 (Maryland Statutory Form — Personal Financial Power of Attorney)",
		BlankFile:        "docs/forms-phase0/blanks/md_poa_17_202.pdf",
		BlankSHA256:      "31509bd76317cb39d74311ccdc6c8317af804a0a3e054852e9d6d3343c5043a6",
		PageCount:        10,
		ExecutionDefault: "wet-sign",
		DefaultFont:      "Helvetica",
		DefaultSize:      10,
		Fields: []forms.Field{
			// --- Page 1: principal identification (DESIGNATION OF AGENT path) ---
			{
				Key: "principal_name", Label: "Principal full legal name (after \"I,\")",
				Kind: forms.FieldText, Required: true, Page: 1,
				X: 88, Y: 89.2, MaxWidth: 445,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"I, ___,\" rule under DESIGNATION OF AGENT (underscore xMin 83.6, yTop 692.30); baseline = 792-(692.30+10.5). The matching \"(Name of Principal)\" caption sits at the top of page 2.",
			},

			// --- Page 2: agent name / address / telephone ---
			{
				Key: "agent_name", Label: "Agent full legal name",
				Kind: forms.FieldText, Required: true, Page: 2,
				X: 165, Y: 637.4, MaxWidth: 372,
				Confidence: forms.ConfidenceHigh,
				Note:       "After \"Name of Agent:\" (underscore xMin 161.6, yTop 144.07); baseline = 792-(144.07+10.5).",
			},
			{
				Key: "agent_address", Label: "Agent address",
				Kind: forms.FieldText, Required: true, Page: 2,
				X: 171, Y: 608.5, MaxWidth: 366,
				Confidence: forms.ConfidenceHigh,
				Note:       "After \"Agent’s Address:\" (underscore xMin 167.9, yTop 172.99).",
			},
			{
				Key: "agent_phone", Label: "Agent telephone number",
				Kind: forms.FieldText, Page: 2,
				X: 236, Y: 579.7, MaxWidth: 300,
				Confidence: forms.ConfidenceHigh,
				Note:       "After \"Agent’s Telephone Number:\" (underscore xMin 232.99, yTop 201.79).",
			},

			// --- Page 2: coagent (OPTIONAL) ---
			{
				Key: "coagent_name", Label: "Coagent full legal name (optional)",
				Kind: forms.FieldText, Page: 2,
				X: 178, Y: 392.1, MaxWidth: 356,
				Confidence: forms.ConfidenceHigh,
				Note:       "First \"Name of Coagent:\" rule in DESIGNATION OF COAGENTS (underscore xMin 174.3, yTop 389.38). Optional; left blank in single-agent default. Coagent address/phone/second coagent not mapped (rarely used; tune on demand).",
			},

			// --- Page 2: successor agent name ---
			{
				Key: "successor_agent_name", Label: "Successor agent full legal name",
				Kind: forms.FieldText, Page: 2,
				X: 222, Y: 89.2, MaxWidth: 315,
				Confidence: forms.ConfidenceHigh,
				Note:       "After \"Name of Successor Agent:\" (underscore xMin 218.8, yTop 692.30).",
			},

			// --- Page 3: successor agent address / telephone + second successor ---
			{
				Key: "successor_agent_address", Label: "Successor agent address",
				Kind: forms.FieldText, Page: 3,
				X: 127, Y: 680.8, MaxWidth: 410,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"Successor Agent’s Address:\" rule (underscore xMin 123.5, yTop 100.75).",
			},
			{
				Key: "successor_agent_phone", Label: "Successor agent telephone number",
				Kind: forms.FieldText, Page: 3,
				X: 189, Y: 637.4, MaxWidth: 350,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"Successor Agent’s Telephone Number:\" rule (underscore xMin 185.2, yTop 144.07).",
			},
			{
				Key: "second_successor_agent_name", Label: "Second successor agent full legal name (optional)",
				Kind: forms.FieldText, Page: 3,
				X: 176, Y: 550.9, MaxWidth: 362,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"Name of Second Successor Agent:\" rule (underscore xMin 172.4, yTop 230.59). Optional; second-successor address/phone not mapped (tune on demand).",
			},

			// --- Page 8: termination date (OPTIONAL) ---
			{
				Key: "termination_date", Label: "Termination date (optional)",
				Kind: forms.FieldText, Page: 8,
				X: 313, Y: 594.1, MaxWidth: 180,
				Confidence: forms.ConfidenceHigh,
				Note:       "\"shall terminate on ___, 20__\" rule (underscore xMin 309.5, yTop 187.39). Enter the day/month; the printed \"20__\" tail is separate. Use a specific calendar date per the caption.",
			},

			// --- Pages 8-9: SIGNATURE & ACKNOWLEDGMENT (execution). NEVER stamped. ---
			{
				Key: "principal_signature", Label: "Your Signature",
				Kind: forms.FieldText, Execution: true, Page: 8,
				X: 75, Y: 396, MaxWidth: 250,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Your Signature\" rule on page 8 (yTop ~388). Wet-sign only; placement non-binding (never stamped).",
			},
			{
				Key: "principal_sign_date", Label: "Date principal signs",
				Kind: forms.FieldText, Execution: true, Page: 8,
				X: 410, Y: 396, MaxWidth: 120,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Date\" rule beside Your Signature on page 8. Wet-sign only.",
			},
			{
				Key: "principal_name_printed", Label: "Your Name Printed",
				Kind: forms.FieldText, Execution: true, Page: 8,
				X: 75, Y: 367, MaxWidth: 460,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Your Name Printed\" rule on page 8. Wet-sign block; never stamped.",
			},
			{
				Key: "principal_address_exec", Label: "Your Address (execution block)",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 706, MaxWidth: 460,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Your Address\" rules (yTop 71.93/86.35) page 9. Execution block; never stamped.",
			},
			{
				Key: "principal_telephone_exec", Label: "Your Telephone Number (execution block)",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 648, MaxWidth: 460,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Your Telephone Number\" rule (yTop 129.67) page 9. Never stamped.",
			},

			// --- Page 9: notary acknowledgment (execution). NEVER stamped. ---
			{
				Key: "notary_county", Label: "Notary acknowledgment county",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 162, Y: 590, MaxWidth: 370,
				Confidence: forms.ConfidenceLow,
				Note:       "\"(COUNTY) OF ___\" rule (yTop 187.39) page 9, STATE OF MARYLAND. Notary completes; never stamped.",
			},
			{
				Key: "notary_date", Label: "Notary acknowledgment date",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 532, MaxWidth: 150,
				Confidence: forms.ConfidenceLow,
				Note:       "\"acknowledged before me on ___ (Date)\" rule (yTop 245.11) page 9. Never stamped.",
			},
			{
				Key: "notary_principal_name", Label: "Notary block — Name of Principal",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 110, Y: 489, MaxWidth: 220,
				Confidence: forms.ConfidenceLow,
				Note:       "\"By ___ (Name of Principal) to be his/her act\" rule (yTop 288.34) page 9. Never stamped.",
			},
			{
				Key: "notary_signature", Label: "Signature of Notary",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 446, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Signature of Notary\" rule (yTop 331.66) page 9. Never stamped.",
			},
			{
				Key: "notary_commission_expires", Label: "Notary commission expires",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 210, Y: 417, MaxWidth: 124,
				Confidence: forms.ConfidenceLow,
				Note:       "\"My commission expires: ___\" rule (yTop 360.46) page 9. Never stamped.",
			},

			// --- Page 9: WITNESS #1 ATTESTATION (execution). NEVER stamped. ---
			{
				Key: "witness1_signature", Label: "Witness #1 signature",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 219, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #1 Signature\" rule (yTop 562.44) page 9. Wet-sign only.",
			},
			{
				Key: "witness1_name_printed", Label: "Witness #1 name printed",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 190, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #1 Name Printed\" rule (yTop 591.36) page 9. Never stamped.",
			},
			{
				Key: "witness1_address", Label: "Witness #1 address",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 161, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #1 Address\" rules (yTop 620.19/634.59) page 9. Never stamped.",
			},
			{
				Key: "witness1_telephone", Label: "Witness #1 telephone number",
				Kind: forms.FieldText, Execution: true, Page: 9,
				X: 75, Y: 118, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #1 Telephone Number\" rule (yTop 663.51) page 9. Never stamped.",
			},

			// --- Page 10: WITNESS #2 ATTESTATION (execution). NEVER stamped. ---
			{
				Key: "witness2_signature", Label: "Witness #2 signature",
				Kind: forms.FieldText, Execution: true, Page: 10,
				X: 75, Y: 710, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #2 Signature\" rule (yTop 71.93) page 10. Wet-sign only.",
			},
			{
				Key: "witness2_name_printed", Label: "Witness #2 name printed",
				Kind: forms.FieldText, Execution: true, Page: 10,
				X: 75, Y: 681, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #2 Name Printed\" rule (yTop 100.75) page 10. Never stamped.",
			},
			{
				Key: "witness2_address", Label: "Witness #2 address",
				Kind: forms.FieldText, Execution: true, Page: 10,
				X: 75, Y: 652, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #2 Address\" rules (yTop 129.67/144.07) page 10. Never stamped.",
			},
			{
				Key: "witness2_telephone", Label: "Witness #2 telephone number",
				Kind: forms.FieldText, Execution: true, Page: 10,
				X: 75, Y: 609, MaxWidth: 260,
				Confidence: forms.ConfidenceLow,
				Note:       "\"Witness #2 Telephone Number\" rule (yTop 172.99) page 10. Never stamped.",
			},
		},
	}
}
