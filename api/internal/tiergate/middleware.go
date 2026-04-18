package tiergate

import (
	"context"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	"github.com/sirsi-technologies/finalwishes-api/internal/payments"
)

// EnforceMediaLimit returns middleware that blocks media upload requests
// when the estate has exceeded its tier's media quota.
//
// Apply this to routes that accept file uploads or create media documents.
// It reads {estateId} from the URL path via chi.URLParam.
func EnforceMediaLimit(fs *firestore.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			estateID := chi.URLParam(r, "estateId")
			if estateID == "" {
				// No estate ID in route — skip enforcement (let handler deal with it)
				next.ServeHTTP(w, r)
				return
			}

			userID, err := auth.RequireUserID(r.Context())
			if err != nil {
				writeError(w, http.StatusUnauthorized, "Authentication required")
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
			defer cancel()

			// Verify estate access
			euDocID := userID + "_" + estateID
			euSnap, err := fs.Collection("estate_users").Doc(euDocID).Get(ctx)
			if err != nil || !euSnap.Exists() {
				writeError(w, http.StatusForbidden, "You do not have access to this estate")
				return
			}

			// Read estate tier
			estateSnap, err := fs.Collection("estates").Doc(estateID).Get(ctx)
			if err != nil {
				log.Error().Err(err).Str("estate_id", estateID).Msg("Tier gate: failed to read estate")
				writeError(w, http.StatusInternalServerError, "Failed to verify tier")
				return
			}

			tier := "free"
			if t, _ := estateSnap.DataAt("tier"); t != nil {
				if s, ok := t.(string); ok && s != "" {
					tier = s
				}
			}

			limits := payments.GetTierLimits(tier)

			// Unlimited tier — skip counting
			if limits.MaxMedia < 0 {
				next.ServeHTTP(w, r)
				return
			}

			// Count current media usage
			estateColl := fs.Collection("estates").Doc(estateID)
			docCount := countCollection(ctx, estateColl.Collection("documents"))
			heirloomCount := countCollection(ctx, estateColl.Collection("heirlooms"))
			_, nonVideoMemoirCount := countMemoirs(ctx, estateColl.Collection("memoirs"))
			mediaCount := docCount + heirloomCount + nonVideoMemoirCount

			if mediaCount >= limits.MaxMedia {
				log.Info().
					Str("estate_id", estateID).
					Str("tier", tier).
					Int("current", mediaCount).
					Int("limit", limits.MaxMedia).
					Msg("Tier gate: media limit exceeded")
				writeError(w, http.StatusForbidden,
					"Media upload limit reached for your current plan. Upgrade to continue uploading.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// EnforceVideoLimit returns middleware that blocks video upload requests
// when the estate has exceeded its tier's video quota.
func EnforceVideoLimit(fs *firestore.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			estateID := chi.URLParam(r, "estateId")
			if estateID == "" {
				next.ServeHTTP(w, r)
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
			defer cancel()

			estateSnap, err := fs.Collection("estates").Doc(estateID).Get(ctx)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "Failed to verify tier")
				return
			}

			tier := "free"
			if t, _ := estateSnap.DataAt("tier"); t != nil {
				if s, ok := t.(string); ok && s != "" {
					tier = s
				}
			}

			limits := payments.GetTierLimits(tier)

			// Unlimited or no video restriction
			if limits.MaxVideos < 0 {
				next.ServeHTTP(w, r)
				return
			}
			if limits.MaxVideos == 0 {
				writeError(w, http.StatusForbidden,
					"Video uploads are not available on your current plan. Upgrade to White Glove for video support.")
				return
			}

			// Count current videos
			estateColl := fs.Collection("estates").Doc(estateID)
			videoCount, _ := countMemoirs(ctx, estateColl.Collection("memoirs"))

			if videoCount >= limits.MaxVideos {
				writeError(w, http.StatusForbidden,
					"Video upload limit reached for your current plan. Upgrade to continue uploading videos.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
