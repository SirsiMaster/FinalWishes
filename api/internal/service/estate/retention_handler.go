package estate

import (
	"encoding/json"
	"net/http"

	"cloud.google.com/go/storage"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// HandleApplyEstateHolds returns an HTTP handler that places legal holds on all
// vault documents for an estate. Called when an estate enters settlement.
//
// POST /api/v1/vault/holds/apply
// Body: { "estateId": "xxx" }
func HandleApplyEstateHolds(sc *storage.Client) http.HandlerFunc {
	server := &Server{sc: sc}

	return func(w http.ResponseWriter, r *http.Request) {
		userID := auth.UserIDFromContext(r.Context())
		if userID == "" {
			http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
			return
		}

		var req struct {
			EstateID string `json:"estateId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.EstateID == "" {
			http.Error(w, `{"error":"estateId is required"}`, http.StatusBadRequest)
			return
		}

		count, err := server.ApplyEstateHolds(r.Context(), req.EstateID)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to apply estate holds")
			http.Error(w, `{"error":"Failed to apply holds"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"estateId":    req.EstateID,
			"objectsHeld": count,
			"status":      "holds_applied",
		})
	}
}

// HandleReleaseEstateHolds returns an HTTP handler that releases legal holds on all
// vault documents for an estate. Called when probate is complete and estate is closing.
//
// POST /api/v1/vault/holds/release
// Body: { "estateId": "xxx" }
func HandleReleaseEstateHolds(sc *storage.Client) http.HandlerFunc {
	server := &Server{sc: sc}

	return func(w http.ResponseWriter, r *http.Request) {
		userID := auth.UserIDFromContext(r.Context())
		if userID == "" {
			http.Error(w, `{"error":"Authentication required"}`, http.StatusUnauthorized)
			return
		}

		var req struct {
			EstateID string `json:"estateId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.EstateID == "" {
			http.Error(w, `{"error":"estateId is required"}`, http.StatusBadRequest)
			return
		}

		count, err := server.ReleaseEstateHolds(r.Context(), req.EstateID)
		if err != nil {
			log.Error().Err(err).Str("estate_id", req.EstateID).Msg("Failed to release estate holds")
			http.Error(w, `{"error":"Failed to release holds"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"estateId":        req.EstateID,
			"objectsReleased": count,
			"status":          "holds_released",
		})
	}
}
