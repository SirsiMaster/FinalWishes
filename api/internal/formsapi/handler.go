// Package formsapi exposes the statutory-form fill engine over HTTP.
//
// Routes (mounted under /api/v1/forms, behind auth):
//
//	GET  /api/v1/forms                 — list supported forms + their fields
//	GET  /api/v1/forms/{formId}        — one form's field schema
//	POST /api/v1/forms/{formId}/fill   — fill the form; returns application/pdf
package formsapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/forms"
	"github.com/sirsi-technologies/finalwishes-api/internal/forms/maps"
)

// Handler serves the statutory-form endpoints. It holds no state — the engine
// and blanks are embedded — so a zero value is usable.
type Handler struct{}

// NewHandler returns a forms HTTP handler.
func NewHandler() *Handler { return &Handler{} }

// fieldSchema is the client-facing description of one form field.
type fieldSchema struct {
	Key       string `json:"key"`
	Label     string `json:"label,omitempty"`
	Kind      string `json:"kind"`
	Required  bool   `json:"required"`
	Execution bool   `json:"execution"`
	Page      int    `json:"page"`
}

// formSchema is the client-facing description of one form.
type formSchema struct {
	FormID       string `json:"formId"`
	Title        string `json:"title"`
	Jurisdiction string `json:"jurisdiction"`
	Citation     string `json:"citation"`
	PageCount    int    `json:"pageCount"`
	// Fillable lists the fields a caller may supply. Execution fields
	// (signature/witness/notary) are reported but flagged — the engine never
	// stamps them (wet-sign default).
	Fields []fieldSchema `json:"fields"`
}

func schemaOf(m *forms.CoordinateMap) formSchema {
	fs := formSchema{
		FormID:       m.FormID,
		Title:        m.Title,
		Jurisdiction: m.Jurisdiction,
		Citation:     m.Citation,
		PageCount:    m.PageCount,
		Fields:       make([]fieldSchema, 0, len(m.Fields)),
	}
	for _, f := range m.Fields {
		fs.Fields = append(fs.Fields, fieldSchema{
			Key:       f.Key,
			Label:     f.Label,
			Kind:      string(f.Kind),
			Required:  f.Required,
			Execution: f.Execution,
			Page:      f.Page,
		})
	}
	return fs
}

// HandleListForms: GET /api/v1/forms — all supported forms with their schemas.
func (h *Handler) HandleListForms(w http.ResponseWriter, r *http.Request) {
	ids := maps.SupportedFormIDs()
	out := make([]formSchema, 0, len(ids))
	for _, id := range ids {
		if m, ok := maps.Lookup(id); ok {
			out = append(out, schemaOf(m))
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"forms": out})
}

// HandleGetForm: GET /api/v1/forms/{formId} — one form's schema.
func (h *Handler) HandleGetForm(w http.ResponseWriter, r *http.Request) {
	formID := chi.URLParam(r, "formId")
	m, ok := maps.Lookup(formID)
	if !ok {
		writeErr(w, http.StatusNotFound, fmt.Sprintf("unknown form %q", formID))
		return
	}
	writeJSON(w, http.StatusOK, schemaOf(m))
}

// HandleFillForm: POST /api/v1/forms/{formId}/fill — body is a JSON object of
// {fieldKey: value}; responds with the filled PDF (application/pdf).
//
// Execution fields are never stamped even if supplied. If required fields are
// missing the PDF is still returned (a partial draft for review) and the
// missing keys are reported in the X-Forms-Missing-Required header.
func (h *Handler) HandleFillForm(w http.ResponseWriter, r *http.Request) {
	formID := chi.URLParam(r, "formId")

	var values map[string]string
	if r.Body != nil && r.ContentLength != 0 {
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&values); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
			return
		}
	}

	pdf, report, err := maps.FillByID(formID, values)
	if err != nil {
		var unknown maps.ErrUnknownForm
		switch {
		case errors.As(err, &unknown):
			writeErr(w, http.StatusNotFound, unknown.Error())
		case errors.Is(err, forms.ErrSourceMismatch):
			// Embedded blank corrupted — operational failure, fail loud.
			log.Error().Err(err).Str("form", formID).Msg("forms: embedded blank integrity failure")
			writeErr(w, http.StatusInternalServerError, "form source integrity check failed")
		default:
			log.Error().Err(err).Str("form", formID).Msg("forms: fill failed")
			writeErr(w, http.StatusInternalServerError, "failed to generate form")
		}
		return
	}

	if len(report.MissingRequired) > 0 {
		w.Header().Set("X-Forms-Missing-Required", strings.Join(report.MissingRequired, ","))
	}
	if len(report.SkippedExecution) > 0 {
		w.Header().Set("X-Forms-Skipped-Execution", strings.Join(report.SkippedExecution, ","))
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.pdf"`, formID))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdf)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
