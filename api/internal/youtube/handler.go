// Package youtube implements YouTube Data API v3 video uploads for the
// FinalWishes memoir system. Videos are uploaded as unlisted (link-only access)
// to YouTube, eliminating the need for self-hosted video infrastructure —
// free CDN, free transcoding, free storage.
package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	"github.com/sirsi-technologies/finalwishes-api/internal/payments"
)

// maxUploadSize is the maximum video file size we accept (256 MB).
const maxUploadSize = 256 << 20

// Handler serves YouTube video upload endpoints.
type Handler struct {
	yt *youtube.Service
	fs *firestore.Client
}

// NewHandler creates a YouTube handler using Application Default Credentials.
// The Cloud Run service account must have the YouTube Data API enabled and
// appropriate OAuth scopes.
func NewHandler(ctx context.Context, fs *firestore.Client) (*Handler, error) {
	svc, err := youtube.NewService(ctx,
		option.WithScopes(youtube.YoutubeUploadScope),
	)
	if err != nil {
		return nil, fmt.Errorf("youtube: failed to initialize service: %w", err)
	}
	return &Handler{yt: svc, fs: fs}, nil
}

// uploadResponse is the JSON response returned after a successful upload.
type uploadResponse struct {
	VideoID      string `json:"videoId"`
	EmbedURL     string `json:"embedUrl"`
	ThumbnailURL string `json:"thumbnailUrl"`
}

// videoStatusResponse is the JSON response for video processing status.
type videoStatusResponse struct {
	VideoID          string `json:"videoId"`
	UploadStatus     string `json:"uploadStatus"`
	ProcessingStatus string `json:"processingStatus"`
	PrivacyStatus    string `json:"privacyStatus"`
}

// HandleUploadVideo accepts a multipart file upload with metadata, uploads the
// video to YouTube as unlisted, and stores a memoir document in Firestore.
//
// Multipart fields:
//   - file: the video file (required)
//   - title: video title (required)
//   - description: video description (optional)
//   - estateId: the estate to attach this memoir to (required)
func (h *Handler) HandleUploadVideo(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	// Cap request body size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "File too large or invalid multipart form (max 256MB)")
		return
	}
	defer r.MultipartForm.RemoveAll()

	// Extract metadata fields
	title := r.FormValue("title")
	description := r.FormValue("description")
	estateID := r.FormValue("estateId")

	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	// Verify estate access via estate_users junction
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()

	euDocID := userID + "_" + estateID
	euSnap, err := h.fs.Collection("estate_users").Doc(euDocID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", estateID).Msg("YouTube upload denied — no estate access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	// Tier-gate: check video upload permission
	estateSnap, err := h.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Failed to read estate for tier check")
		writeError(w, http.StatusInternalServerError, "Failed to verify upload permissions")
		return
	}
	tier := "free"
	if t, _ := estateSnap.DataAt("tier"); t != nil {
		if s, ok := t.(string); ok && s != "" {
			tier = s
		}
	}
	limits := payments.GetTierLimits(tier)
	if limits.MaxVideos == 0 {
		writeError(w, http.StatusForbidden, "Video uploads require White Glove tier")
		return
	}

	// Get the uploaded file
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	// Build YouTube video metadata
	video := &youtube.Video{
		Snippet: &youtube.VideoSnippet{
			Title:       title,
			Description: description,
			CategoryId:  "22", // People & Blogs
		},
		Status: &youtube.VideoStatus{
			PrivacyStatus: "unlisted",
		},
	}

	log.Info().
		Str("user_id", userID).
		Str("estate_id", estateID).
		Str("title", title).
		Msg("Uploading video to YouTube")

	// Upload to YouTube
	call := h.yt.Videos.Insert([]string{"snippet", "status"}, video)
	call.Media(file)

	resp, err := call.Context(ctx).Do()
	if err != nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("YouTube upload failed")
		writeError(w, http.StatusInternalServerError, "Failed to upload video to YouTube")
		return
	}

	videoID := resp.Id
	embedURL := fmt.Sprintf("https://www.youtube.com/embed/%s", videoID)
	thumbnailURL := fmt.Sprintf("https://img.youtube.com/vi/%s/hqdefault.jpg", videoID)

	log.Info().
		Str("video_id", videoID).
		Str("estate_id", estateID).
		Msg("YouTube upload successful")

	// Store memoir document in Firestore
	memoirData := map[string]interface{}{
		"title":          title,
		"description":    description,
		"type":           "youtube",
		"youtubeVideoId": videoID,
		"youtubeUrl":     embedURL,
		"thumbnailUrl":   thumbnailURL,
		"visibility":     "family",
		"uploadedBy":     userID,
		"createdAt":      firestore.ServerTimestamp,
		"status":         "processing",
	}

	_, _, err = h.fs.Collection("estates").Doc(estateID).Collection("memoirs").Add(ctx, memoirData)
	if err != nil {
		// Video uploaded successfully but Firestore write failed — log but still return the video info
		log.Error().Err(err).Str("video_id", videoID).Str("estate_id", estateID).Msg("Failed to store memoir in Firestore (video uploaded successfully)")
	}

	writeJSON(w, http.StatusCreated, uploadResponse{
		VideoID:      videoID,
		EmbedURL:     embedURL,
		ThumbnailURL: thumbnailURL,
	})
}

// HandleGetVideoStatus checks the processing status of a YouTube video.
// Query params: video_id (required), estateId (required)
func (h *Handler) HandleGetVideoStatus(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.RequireUserID(r.Context())
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	videoID := r.URL.Query().Get("video_id")
	if videoID == "" {
		writeError(w, http.StatusBadRequest, "video_id is required")
		return
	}

	estateID := r.URL.Query().Get("estateId")
	if estateID == "" {
		writeError(w, http.StatusBadRequest, "estateId is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Verify estate access via estate_users junction before exposing YouTube
	// status or mutating any memoir document.
	euSnap, err := h.fs.Collection("estate_users").Doc(userID + "_" + estateID).Get(ctx)
	if err != nil || !euSnap.Exists() {
		log.Warn().Str("user_id", userID).Str("estate_id", estateID).Msg("YouTube status denied — no estate access")
		writeError(w, http.StatusForbidden, "You do not have access to this estate")
		return
	}

	call := h.yt.Videos.List([]string{"status", "processingDetails"})
	call.Id(videoID)

	resp, err := call.Context(ctx).Do()
	if err != nil {
		log.Error().Err(err).Str("video_id", videoID).Msg("Failed to get YouTube video status")
		writeError(w, http.StatusInternalServerError, "Failed to check video status")
		return
	}

	if len(resp.Items) == 0 {
		writeError(w, http.StatusNotFound, "Video not found")
		return
	}

	item := resp.Items[0]
	status := videoStatusResponse{
		VideoID:       videoID,
		UploadStatus:  item.Status.UploadStatus,
		PrivacyStatus: item.Status.PrivacyStatus,
	}

	if item.ProcessingDetails != nil {
		status.ProcessingStatus = item.ProcessingDetails.ProcessingStatus
	}

	// If processing is complete, update the Firestore memoir status
	if item.Status.UploadStatus == "processed" {
		h.updateMemoirStatus(r.Context(), videoID, "ready")
	}

	writeJSON(w, http.StatusOK, status)
}

// updateMemoirStatus finds the memoir document by YouTube video ID and updates its status.
func (h *Handler) updateMemoirStatus(ctx context.Context, videoID, status string) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Query across all estates for the memoir with this video ID
	iter := h.fs.CollectionGroup("memoirs").Where("youtubeVideoId", "==", videoID).Limit(1).Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		log.Warn().Err(err).Str("video_id", videoID).Msg("Could not find memoir to update status")
		return
	}

	if _, err := doc.Ref.Update(ctx, []firestore.Update{
		{Path: "status", Value: status},
	}); err != nil {
		log.Error().Err(err).Str("video_id", videoID).Msg("Failed to update memoir status")
	}
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
