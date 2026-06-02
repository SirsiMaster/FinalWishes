// Package forms implements a coordinate-overlay PDF fill engine for flat
// (non-AcroForm) statutory forms.
//
// Phase 1a scope: prove the overlay spine on ONE official flat Illinois form,
// the Statutory Short Form Power of Attorney for Property (July 2011 revision).
//
// Design principles (per the Phase-1a proposal and Codex's gate):
//   - One generic overlay spine. The engine knows nothing about any specific
//     form; per-form behaviour lives entirely in a CoordinateMap (Go struct +
//     JSON). Do NOT special-case any form in engine code.
//   - Print-ready / wet-sign by default. The engine NEVER auto-fills execution
//     fields (signature, witness, notary). Those are marked Execution=true in
//     the map and are skipped even if a value is supplied.
//   - Fail closed on source-integrity mismatch. Before stamping, the blank's
//     SHA256 is re-hashed and compared to the map's pinned digest; any mismatch
//     refuses the fill.
//   - True non-editability. The target is already flat (no AcroForm); the engine
//     asserts the output reports zero form fields before returning.
//
// pdfcpu is imported as a Go library (no shelling to a binary).
package forms

// FieldKind classifies how a value is rendered onto the page.
type FieldKind string

const (
	// FieldText stamps a string value at the field's coordinate.
	FieldText FieldKind = "text"
	// FieldCheckbox stamps a glyph (default "X") at the field's coordinate
	// when the supplied value is truthy ("true", "yes", "x", "1", "on").
	FieldCheckbox FieldKind = "checkbox"
)

// Confidence flags how trustworthy a coordinate is. First-pass maps authored
// without positioned-text extraction are LOW and require human visual tuning
// before the form is treated as production-ready.
type Confidence string

const (
	ConfidenceHigh Confidence = "high"
	ConfidenceLow  Confidence = "low"
)

// Field is one placeable element on a form.
type Field struct {
	// Key is the domain data key (matches a key in the values map passed to
	// Fill). For checkboxes the value is interpreted as truthy/falsey.
	Key string `json:"key"`

	// Label is a human-readable description of what this field is, used only
	// for documentation and tuning. Not rendered.
	Label string `json:"label,omitempty"`

	// Kind is "text" or "checkbox".
	Kind FieldKind `json:"kind"`

	// Required marks a field that MUST receive a (non-execution) value.
	Required bool `json:"required,omitempty"`

	// Execution marks signature / witness / notary fields. The engine NEVER
	// stamps these — they stay blank for wet-signing. A value supplied for an
	// execution field is ignored (and reported by Fill).
	Execution bool `json:"execution,omitempty"`

	// Page is the 1-based page number to stamp on.
	Page int `json:"page"`

	// X, Y are PDF points measured from the page's bottom-left origin. The
	// value's bottom-left corner is anchored here (pdfcpu pos:bl + off:X Y).
	X float64 `json:"x"`
	Y float64 `json:"y"`

	// Font is a pdfcpu core font name (e.g. "Helvetica", "Times-Roman").
	Font string `json:"font,omitempty"`

	// Size is the font size in points.
	Size float64 `json:"size,omitempty"`

	// MaxWidth, if > 0, is the available width in points. Text wider than this
	// is wrapped (when Multiline) or flagged (when not) — see engine.
	MaxWidth float64 `json:"maxWidth,omitempty"`

	// Multiline allows wrapping across LineHeight-spaced lines within MaxWidth.
	Multiline bool `json:"multiline,omitempty"`

	// LineHeight is the points between wrapped lines (defaults to Size*1.2).
	LineHeight float64 `json:"lineHeight,omitempty"`

	// Glyph is the checkbox mark (defaults to "X"). Ignored for text fields.
	Glyph string `json:"glyph,omitempty"`

	// Confidence flags whether the coordinate is tuned (high) or a first-pass
	// estimate awaiting human visual tuning (low).
	Confidence Confidence `json:"confidence"`

	// Note carries tuning guidance for low-confidence coordinates.
	Note string `json:"note,omitempty"`
}

// CoordinateMap is the per-form overlay configuration. It is the ONLY thing
// that differs between forms; the engine is generic over it.
type CoordinateMap struct {
	// FormID is a stable identifier, e.g. "il_poa_property_2011".
	FormID string `json:"formId"`

	// Title is human-readable.
	Title string `json:"title"`

	// Jurisdiction, e.g. "IL".
	Jurisdiction string `json:"jurisdiction"`

	// Citation is the governing statute, e.g. "755 ILCS 45/ Art. III".
	Citation string `json:"citation"`

	// BlankFile is the path (relative to repo root or absolute) of the blank
	// PDF this map targets. Documentation only; callers pass the path to Fill.
	BlankFile string `json:"blankFile"`

	// BlankSHA256 is the lowercase hex SHA256 of the exact blank bytes this map
	// was authored against. The engine fails closed on mismatch.
	BlankSHA256 string `json:"blankSha256"`

	// PageCount is the expected page count of the blank (sanity check).
	PageCount int `json:"pageCount"`

	// ExecutionDefault documents the execution posture (always wet-sign in
	// Phase 1). Engine does not branch on it; it is informational.
	ExecutionDefault string `json:"executionDefault"`

	// DefaultFont / DefaultSize apply to fields that omit Font / Size.
	DefaultFont string  `json:"defaultFont"`
	DefaultSize float64 `json:"defaultSize"`

	// Fields are the placeable elements.
	Fields []Field `json:"fields"`
}

// fontOf returns the field's font or the map default.
func (m *CoordinateMap) fontOf(f Field) string {
	if f.Font != "" {
		return f.Font
	}
	if m.DefaultFont != "" {
		return m.DefaultFont
	}
	return "Helvetica"
}

// sizeOf returns the field's size or the map default.
func (m *CoordinateMap) sizeOf(f Field) float64 {
	if f.Size > 0 {
		return f.Size
	}
	if m.DefaultSize > 0 {
		return m.DefaultSize
	}
	return 10
}
