package estate

import (
	"context"
	"fmt"
	"os"
	"time"

	"cloud.google.com/go/storage"
	"github.com/rs/zerolog/log"

	"github.com/sirsi-technologies/finalwishes-api/internal/auth"
)

// SetDocumentHold places or removes a legal hold on a vault document.
// Legal holds prevent deletion regardless of retention policy — used during
// probate disputes or legal proceedings.
//
// objectPath: the Cloud Storage object key (e.g., "estates/{id}/vault/1234-will.pdf")
// hold: true to place hold, false to release
func (s *Server) SetDocumentHold(ctx context.Context, estateID, objectPath string, hold bool) error {
	if s.sc == nil {
		return fmt.Errorf("storage client not initialized")
	}

	bucketName := os.Getenv("VAULT_STORAGE_BUCKET")
	if bucketName == "" {
		bucketName = "finalwishes-vault"
	}

	obj := s.sc.Bucket(bucketName).Object(objectPath)
	attrs := storage.ObjectAttrsToUpdate{
		EventBasedHold: hold,
	}

	if _, err := obj.Update(ctx, attrs); err != nil {
		return fmt.Errorf("failed to update hold on %s: %w", objectPath, err)
	}

	action := "placed"
	if !hold {
		action = "released"
	}
	log.Info().
		Str("estate_id", estateID).
		Str("object", objectPath).
		Str("action", action).
		Msg("Document hold updated")

	return nil
}

// ApplyEstateHolds places legal holds on all vault documents for an estate.
// Called when the estate transitions to death_reported or enters settlement.
// This prevents any document from being deleted during the probate process.
func (s *Server) ApplyEstateHolds(ctx context.Context, estateID string) (int, error) {
	if s.sc == nil {
		return 0, fmt.Errorf("storage client not initialized")
	}

	bucketName := os.Getenv("VAULT_STORAGE_BUCKET")
	if bucketName == "" {
		bucketName = "finalwishes-vault"
	}

	prefix := fmt.Sprintf("estates/%s/vault/", estateID)
	bucket := s.sc.Bucket(bucketName)

	it := bucket.Objects(ctx, &storage.Query{Prefix: prefix})
	count := 0

	for {
		attrs, err := it.Next()
		if err != nil {
			break // iterator exhausted or error
		}

		// Skip objects already on hold
		if attrs.EventBasedHold {
			continue
		}

		obj := bucket.Object(attrs.Name)
		_, err = obj.Update(ctx, storage.ObjectAttrsToUpdate{
			EventBasedHold: true,
		})
		if err != nil {
			log.Warn().Err(err).Str("object", attrs.Name).Msg("Failed to apply hold to vault object")
			continue
		}
		count++
	}

	log.Info().
		Str("estate_id", estateID).
		Int("objects_held", count).
		Msg("Estate vault documents placed on legal hold")

	return count, nil
}

// ReleaseEstateHolds removes legal holds from all vault documents for an estate.
// Called when probate is complete and the estate is being closed.
func (s *Server) ReleaseEstateHolds(ctx context.Context, estateID string) (int, error) {
	if s.sc == nil {
		return 0, fmt.Errorf("storage client not initialized")
	}

	bucketName := os.Getenv("VAULT_STORAGE_BUCKET")
	if bucketName == "" {
		bucketName = "finalwishes-vault"
	}

	prefix := fmt.Sprintf("estates/%s/vault/", estateID)
	bucket := s.sc.Bucket(bucketName)

	it := bucket.Objects(ctx, &storage.Query{Prefix: prefix})
	count := 0

	for {
		attrs, err := it.Next()
		if err != nil {
			break
		}

		if !attrs.EventBasedHold {
			continue
		}

		obj := bucket.Object(attrs.Name)
		_, err = obj.Update(ctx, storage.ObjectAttrsToUpdate{
			EventBasedHold: false,
		})
		if err != nil {
			log.Warn().Err(err).Str("object", attrs.Name).Msg("Failed to release hold on vault object")
			continue
		}
		count++
	}

	log.Info().
		Str("estate_id", estateID).
		Int("objects_released", count).
		Msg("Estate vault document holds released")

	return count, nil
}

// RetentionMetadata returns retention information for a vault document.
type RetentionMetadata struct {
	ObjectPath     string    `json:"objectPath"`
	EventBasedHold bool      `json:"eventBasedHold"`
	RetentionUntil time.Time `json:"retentionUntil,omitempty"`
	Created        time.Time `json:"created"`
	Size           int64     `json:"size"`
}

// GetDocumentRetention returns retention metadata for a specific vault object.
func (s *Server) GetDocumentRetention(ctx context.Context, estateID, objectPath string) (*RetentionMetadata, error) {
	userID := auth.UserIDFromContext(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	if s.sc == nil {
		return nil, fmt.Errorf("storage client not initialized")
	}

	bucketName := os.Getenv("VAULT_STORAGE_BUCKET")
	if bucketName == "" {
		bucketName = "finalwishes-vault"
	}

	attrs, err := s.sc.Bucket(bucketName).Object(objectPath).Attrs(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to read object attributes: %w", err)
	}

	meta := &RetentionMetadata{
		ObjectPath:     objectPath,
		EventBasedHold: attrs.EventBasedHold,
		Created:        attrs.Created,
		Size:           attrs.Size,
	}

	if !attrs.RetentionExpirationTime.IsZero() {
		meta.RetentionUntil = attrs.RetentionExpirationTime
	}

	return meta, nil
}
