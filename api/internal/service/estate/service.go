package estate

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"connectrpc.com/connect"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
	estatev1 "github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1"
	"github.com/sirsi-technologies/finalwishes-api/internal/gen/estate/v1/estatev1connect"
)

// Server implements the EstateService with Google Cloud integrations.
//
// SURFACE SCOPE (2026-06-14): EstateService intentionally implements ONLY the
// RPCs the product actually consumes. Today that is GenerateUploadUrl (the
// signed-URL issuer used by every vault/memoir/obituary/time-capsule uploader —
// see web/src/lib/client.ts). The estate read/write surface (ListEstates,
// GetEstateMetadata, ListAssets, AddAsset, ListBeneficiaries, AddBeneficiary,
// ListVaultDocuments, ListMemoirs, UploadMemoir, GetObituary, SaveObituary,
// GetAIInsight, GetGovernanceSettings, ListNotifications, RegisterEstate) is
// served directly from Firestore by the React app, and AI guidance is served by
// internal/guidance (HandleGetScore -> advisor.GenerateInsight, Claude Opus +
// RAG). Those proto RPCs therefore have ZERO consumers.
//
// Rather than ship handlers that fabricated "34% complete" / "Lockhart Estate" /
// "Sarah Johnson" demo data — which masked real Firestore failures on the live
// path and shipped invented AI text — we deliberately do NOT override them here.
// The embedded UnimplementedEstateServiceHandler answers each unimplemented RPC
// with a clean connect.CodeUnimplemented ("... is not implemented"), an honest
// signal instead of fabricated data. When/if any of these become the canonical
// path, implement the real Firestore-backed handler here (gated by
// checkEstateAccess) and remove the corresponding direct-Firestore read in web/.
type Server struct {
	estatev1connect.UnimplementedEstateServiceHandler
	fs *firestore.Client
	sc *storage.Client
}

// NewServer returns an initialized server.
func NewServer(fs *firestore.Client, sc *storage.Client) *Server {
	return &Server{
		fs: fs,
		sc: sc,
	}
}

// checkEstateAccess verifies the caller is a member of the estate.
// If writeRequired is true, only principal, executor, and admin roles may proceed.
func (s *Server) checkEstateAccess(ctx context.Context, estateID string, writeRequired bool) error {
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		return connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("authentication required"))
	}
	if s.fs == nil {
		// Without an estate store we cannot prove membership; deny rather than
		// fall through to an unauthenticated grant.
		return connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("estate store not configured"))
	}
	docRef := s.fs.Collection("estate_users").Doc(userID + "_" + estateID)
	doc, err := docRef.Get(ctx)
	if err != nil || !doc.Exists() {
		return connect.NewError(connect.CodePermissionDenied, fmt.Errorf("access denied"))
	}
	if writeRequired {
		data := doc.Data()
		role, _ := data["role"].(string)
		if role != "principal" && role != "executor" && role != "admin" {
			return connect.NewError(connect.CodePermissionDenied, fmt.Errorf("insufficient permissions: role %q cannot perform write operations", role))
		}
	}
	return nil
}

// --- Vault & Storage (Signed URLs) ---
//
// GenerateUploadUrl is the only EstateService RPC the product consumes. It
// issues a short-lived V4 signed PUT URL (and a longer-lived GET URL) for a
// vault object, with a server-enforced byte cap, after verifying the caller has
// write access to the estate.

func (s *Server) GenerateUploadUrl(ctx context.Context, req *connect.Request[estatev1.GenerateUploadUrlRequest]) (*connect.Response[estatev1.GenerateUploadUrlResponse], error) {
	if err := s.checkEstateAccess(ctx, req.Msg.EstateId, true); err != nil {
		return nil, err
	}

	if s.sc == nil {
		return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("storage client not initialized"))
	}

	bucketName := os.Getenv("VAULT_STORAGE_BUCKET")
	if bucketName == "" {
		bucketName = "finalwishes-vault"
	}

	objectName := fmt.Sprintf("estates/%s/vault/%d-%s", req.Msg.EstateId, time.Now().UnixMilli(), filepath.Base(req.Msg.FileName))

	// Enforce a server-side upload byte cap. The signed URL constrains the PUT to
	// 0..maxUploadBytes via X-Goog-Content-Length-Range; the client MUST send the
	// matching header or GCS rejects the upload. Default 100 MB, overridable via env.
	maxUploadBytes := int64(104857600) // 100 MB
	if v := os.Getenv("MAX_UPLOAD_BYTES"); v != "" {
		if parsed, perr := strconv.ParseInt(v, 10, 64); perr == nil && parsed > 0 {
			maxUploadBytes = parsed
		}
	}
	contentLengthRange := fmt.Sprintf("X-Goog-Content-Length-Range:0,%d", maxUploadBytes)

	uploadURL, err := s.sc.Bucket(bucketName).SignedURL(objectName, &storage.SignedURLOptions{
		Scheme:      storage.SigningSchemeV4,
		Method:      "PUT",
		Expires:     time.Now().Add(15 * time.Minute),
		ContentType: req.Msg.ContentType,
		Headers:     []string{contentLengthRange},
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate signed upload URL: %w", err))
	}

	downloadURL, err := s.sc.Bucket(bucketName).SignedURL(objectName, &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "GET",
		Expires: time.Now().Add(7 * 24 * time.Hour),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate signed download URL: %w", err))
	}

	return connect.NewResponse(&estatev1.GenerateUploadUrlResponse{
		UploadUrl: uploadURL,
		FinalUrl:  downloadURL,
	}), nil
}
