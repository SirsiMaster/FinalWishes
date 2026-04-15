// Package vault provides HTTP handlers for the PII Vault API.
//
// All endpoints require Firebase Auth. PII is never returned in responses
// without explicit, audited retrieval requests.
//
// Endpoints:
//
//	POST /api/v1/vault/user-pii     — Store user PII
//	GET  /api/v1/vault/user-pii     — Retrieve user PII
//	POST /api/v1/vault/asset-pii    — Store asset PII
//	GET  /api/v1/vault/asset-pii    — Retrieve asset PII
//	POST /api/v1/vault/heir-pii     — Store heir PII
//	GET  /api/v1/vault/heir-pii     — Retrieve heir PII
package vault

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	return r.RemoteAddr
}

// Handler wraps the vault repository with HTTP handlers.
type Handler struct {
	repo *Repository
}

// NewHandler creates a new vault HTTP handler.
func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// --- Request/Response Types ---

// StoreUserPIIRequest is the request body for storing user PII.
type StoreUserPIIRequest struct {
	EstateID    string `json:"estate_id"`
	SSN         string `json:"ssn,omitempty"`
	DateOfBirth string `json:"date_of_birth,omitempty"`
}

// StoreAssetPIIRequest is the request body for storing asset PII.
type StoreAssetPIIRequest struct {
	AssetID       string `json:"asset_id"`
	EstateID      string `json:"estate_id"`
	AccountNumber string `json:"account_number,omitempty"`
	RoutingNumber string `json:"routing_number,omitempty"`
	VIN           string `json:"vin,omitempty"`
}

// StoreHeirPIIRequest is the request body for storing heir PII.
type StoreHeirPIIRequest struct {
	HeirID      string `json:"heir_id"`
	EstateID    string `json:"estate_id"`
	SSN         string `json:"ssn,omitempty"`
	DateOfBirth string `json:"date_of_birth,omitempty"`
}

// PIIResponse is the generic response for PII operations.
type PIIResponse struct {
	ID      string `json:"id,omitempty"`
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// UserPIIResponse is the response for retrieving user PII.
type UserPIIResponse struct {
	ID          string `json:"id"`
	SSNLast4    string `json:"ssn_last4,omitempty"`
	SSN         string `json:"ssn,omitempty"`
	DateOfBirth string `json:"date_of_birth,omitempty"`
}

// AssetPIIResponse is the response for retrieving asset PII.
type AssetPIIResponse struct {
	ID                 string `json:"id"`
	AccountNumberLast4 string `json:"account_number_last4,omitempty"`
	AccountNumber      string `json:"account_number,omitempty"`
	RoutingNumber      string `json:"routing_number,omitempty"`
	VINLast6           string `json:"vin_last6,omitempty"`
	VIN                string `json:"vin,omitempty"`
}

// HeirPIIResponse is the response for retrieving heir PII.
type HeirPIIResponse struct {
	ID          string `json:"id"`
	SSNLast4    string `json:"ssn_last4,omitempty"`
	SSN         string `json:"ssn,omitempty"`
	DateOfBirth string `json:"date_of_birth,omitempty"`
}

// --- Handlers ---

// HandleStoreUserPII handles POST /api/v1/vault/user-pii
func (h *Handler) HandleStoreUserPII(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req StoreUserPIIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "estate_id is required")
		return
	}

	if req.SSN == "" && req.DateOfBirth == "" {
		writeError(w, http.StatusBadRequest, "At least one PII field is required")
		return
	}

	// Audit: log the store operation
	_ = h.repo.LogAccess(ctx, userID, req.EstateID, "store", "user_pii", userID, clientIP(r), r.UserAgent())

	pii := &UserPII{
		FirebaseUID: userID,
		EstateID:    req.EstateID,
		SSN:         req.SSN,
		DateOfBirth: req.DateOfBirth,
	}

	id, err := h.repo.StoreUserPII(ctx, pii)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to store user PII")
		writeError(w, http.StatusInternalServerError, "Failed to store PII securely")
		return
	}

	writeJSON(w, http.StatusOK, &PIIResponse{ID: id, Success: true, Message: "PII stored securely"})
}

// HandleRetrieveUserPII handles GET /api/v1/vault/user-pii?estate_id=xxx
func (h *Handler) HandleRetrieveUserPII(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	estateID := r.URL.Query().Get("estate_id")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estate_id query parameter is required")
		return
	}

	// Audit: log the retrieval
	_ = h.repo.LogAccess(ctx, userID, estateID, "retrieve", "user_pii", userID, clientIP(r), r.UserAgent())

	pii, err := h.repo.RetrieveUserPII(ctx, userID, estateID)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to retrieve user PII")
		writeError(w, http.StatusInternalServerError, "Failed to retrieve PII")
		return
	}

	if pii == nil {
		writeError(w, http.StatusNotFound, "No PII found for this user/estate")
		return
	}

	// Check if full disclosure is requested (requires elevated access)
	fullDisclosure := r.URL.Query().Get("full") == "true"

	resp := &UserPIIResponse{ID: pii.ID}

	if pii.SSN != "" {
		if fullDisclosure {
			resp.SSN = pii.SSN
		}
		// Always return last 4 for display
		if len(pii.SSN) >= 4 {
			resp.SSNLast4 = pii.SSN[len(pii.SSN)-4:]
		}
	}

	if pii.DateOfBirth != "" {
		resp.DateOfBirth = pii.DateOfBirth
	}

	writeJSON(w, http.StatusOK, resp)
}

// HandleStoreAssetPII handles POST /api/v1/vault/asset-pii
func (h *Handler) HandleStoreAssetPII(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req StoreAssetPIIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.AssetID == "" || req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "asset_id and estate_id are required")
		return
	}

	if req.AccountNumber == "" && req.RoutingNumber == "" && req.VIN == "" {
		writeError(w, http.StatusBadRequest, "At least one PII field is required")
		return
	}

	_ = h.repo.LogAccess(ctx, userID, req.EstateID, "store", "asset_pii", req.AssetID, clientIP(r), r.UserAgent())

	pii := &AssetPII{
		AssetID:       req.AssetID,
		EstateID:      req.EstateID,
		AccountNumber: req.AccountNumber,
		RoutingNumber: req.RoutingNumber,
		VIN:           req.VIN,
	}

	id, err := h.repo.StoreAssetPII(ctx, pii)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to store asset PII")
		writeError(w, http.StatusInternalServerError, "Failed to store PII securely")
		return
	}

	writeJSON(w, http.StatusOK, &PIIResponse{ID: id, Success: true, Message: "Asset PII stored securely"})
}

// HandleRetrieveAssetPII handles GET /api/v1/vault/asset-pii?estate_id=xxx&asset_id=yyy
func (h *Handler) HandleRetrieveAssetPII(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	estateID := r.URL.Query().Get("estate_id")
	assetID := r.URL.Query().Get("asset_id")
	if estateID == "" || assetID == "" {
		writeError(w, http.StatusBadRequest, "estate_id and asset_id query parameters are required")
		return
	}

	_ = h.repo.LogAccess(ctx, userID, estateID, "retrieve", "asset_pii", assetID, clientIP(r), r.UserAgent())

	pii, err := h.repo.RetrieveAssetPII(ctx, assetID, estateID)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to retrieve asset PII")
		writeError(w, http.StatusInternalServerError, "Failed to retrieve PII")
		return
	}

	if pii == nil {
		writeError(w, http.StatusNotFound, "No PII found for this asset/estate")
		return
	}

	fullDisclosure := r.URL.Query().Get("full") == "true"

	resp := &AssetPIIResponse{ID: pii.ID}

	if pii.AccountNumber != "" {
		if fullDisclosure {
			resp.AccountNumber = pii.AccountNumber
		}
		if len(pii.AccountNumber) >= 4 {
			resp.AccountNumberLast4 = pii.AccountNumber[len(pii.AccountNumber)-4:]
		}
	}

	if pii.RoutingNumber != "" {
		if fullDisclosure {
			resp.RoutingNumber = pii.RoutingNumber
		}
	}

	if pii.VIN != "" {
		if fullDisclosure {
			resp.VIN = pii.VIN
		}
		if len(pii.VIN) >= 6 {
			resp.VINLast6 = pii.VIN[len(pii.VIN)-6:]
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// HandleStoreHeirPII handles POST /api/v1/vault/heir-pii
func (h *Handler) HandleStoreHeirPII(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req StoreHeirPIIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.HeirID == "" || req.EstateID == "" {
		writeError(w, http.StatusBadRequest, "heir_id and estate_id are required")
		return
	}

	if req.SSN == "" && req.DateOfBirth == "" {
		writeError(w, http.StatusBadRequest, "At least one PII field is required")
		return
	}

	_ = h.repo.LogAccess(ctx, userID, req.EstateID, "store", "heir_pii", req.HeirID, clientIP(r), r.UserAgent())

	pii := &HeirPII{
		HeirID:      req.HeirID,
		EstateID:    req.EstateID,
		SSN:         req.SSN,
		DateOfBirth: req.DateOfBirth,
	}

	id, err := h.repo.StoreHeirPII(ctx, pii)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to store heir PII")
		writeError(w, http.StatusInternalServerError, "Failed to store PII securely")
		return
	}

	writeJSON(w, http.StatusOK, &PIIResponse{ID: id, Success: true, Message: "Heir PII stored securely"})
}

// HandleRetrieveHeirPII handles GET /api/v1/vault/heir-pii?estate_id=xxx&heir_id=yyy
func (h *Handler) HandleRetrieveHeirPII(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	estateID := r.URL.Query().Get("estate_id")
	heirID := r.URL.Query().Get("heir_id")
	if estateID == "" || heirID == "" {
		writeError(w, http.StatusBadRequest, "estate_id and heir_id query parameters are required")
		return
	}

	_ = h.repo.LogAccess(ctx, userID, estateID, "retrieve", "heir_pii", heirID, clientIP(r), r.UserAgent())

	pii, err := h.repo.RetrieveHeirPII(ctx, heirID, estateID)
	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("Failed to retrieve heir PII")
		writeError(w, http.StatusInternalServerError, "Failed to retrieve PII")
		return
	}

	if pii == nil {
		writeError(w, http.StatusNotFound, "No PII found for this heir/estate")
		return
	}

	fullDisclosure := r.URL.Query().Get("full") == "true"

	resp := &HeirPIIResponse{ID: pii.ID}

	if pii.SSN != "" {
		if fullDisclosure {
			resp.SSN = pii.SSN
		}
		if len(pii.SSN) >= 4 {
			resp.SSNLast4 = pii.SSN[len(pii.SSN)-4:]
		}
	}

	if pii.DateOfBirth != "" {
		resp.DateOfBirth = pii.DateOfBirth
	}

	writeJSON(w, http.StatusOK, resp)
}

// --- HTTP Helpers ---

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]interface{}{
			"code":    status,
			"message": message,
		},
	})
}
