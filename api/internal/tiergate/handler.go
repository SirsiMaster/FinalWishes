// Package tiergate exposes media usage and tier-gating endpoints.
package tiergate

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/iterator"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	"github.com/sirsi-technologies/finalwishes-api/internal/payments"
)

// Handler serves tier-gating endpoints.
type Handler struct {
	fs *firestore.Client
}

// NewHandler creates a tier-gate handler.
func NewHandler(fs *firestore.Client) *Handler {
	return &Handler{fs: fs}
}

// mediaUsageResponse is the JSON payload for GET /media-usage.
type mediaUsageResponse struct {
	Tier           string        `json:"tier"`
	MediaCount     int           `json:"mediaCount"`
	VideoCount     int           `json:"videoCount"`
	Limits         limitsPayload `json:"limits"`
	CanUploadMedia bool          `json:"canUploadMedia"`
	CanUploadVideo bool          `json:"canUploadVideo"`
}

type limitsPayload struct {
	MaxMedia  int `json:"maxMedia"`
	MaxVideos int `json:"maxVideos"`
}

// HandleMediaUsage returns the current media/video counts and tier limits
// for the given estate.
func (h *Handler) HandleMediaUsage(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	estateID := chi.URLParam(r, "estateId")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Verify estate access via estate_users junction
	euDocID := userID + "_" + estateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Read estate tier
	estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to read estate document")
		writeError(w, http.StatusInternalServerError, "Failed to read estate")
		return
	}

	tier := "free"
	if t, _ := estateSnap.DataAt("tier"); t != nil {
		if s, ok := t.(string); ok && s != "" {
			tier = s
		}
	}

	limits := payments.GetTierLimits(tier)

	// Count media across subcollections
	estateColl := h.fs.Collection("estates").Doc(estateID)
	docCount := countCollection(ctx, estateColl.Collection("documents"))
	heirloomCount := countCollection(ctx, estateColl.Collection("heirlooms"))

	// Memoirs need video vs non-video split
	videoCount, nonVideoMemoirCount := countMemoirs(ctx, estateColl.Collection("memoirs"))

	mediaCount := docCount + heirloomCount + nonVideoMemoirCount

	canUploadMedia := limits.MaxMedia < 0 || mediaCount < limits.MaxMedia
	canUploadVideo := limits.MaxVideos < 0 || (limits.MaxVideos > 0 && videoCount < limits.MaxVideos)

	writeJSON(w, http.StatusOK, mediaUsageResponse{
		Tier:       tier,
		MediaCount: mediaCount,
		VideoCount: videoCount,
		Limits: limitsPayload{
			MaxMedia:  limits.MaxMedia,
			MaxVideos: limits.MaxVideos,
		},
		CanUploadMedia: canUploadMedia,
		CanUploadVideo: canUploadVideo,
	})
}

// countCollection returns the number of documents in a Firestore collection.
func countCollection(ctx context.Context, coll *firestore.CollectionRef) int {
	count := 0
	iter := coll.Documents(ctx)
	defer iter.Stop()
	for {
		_, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		count++
	}
	return count
}

// countMemoirs counts video and non-video memoirs separately.
// Videos are identified by type == "youtube".
func countMemoirs(ctx context.Context, coll *firestore.CollectionRef) (videos, nonVideos int) {
	iter := coll.Documents(ctx)
	defer iter.Stop()
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		data := doc.Data()
		if t, ok := data["type"].(string); ok && t == "youtube" {
			videos++
		} else {
			nonVideos++
		}
	}
	return
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"error": map[string]interface{}{
			"code":    http.StatusText(status),
			"message": message,
		},
	})
}
