package opensign

import (
	"context"
	"net/http"

	"cloud.google.com/go/firestore"
	"github.com/rs/zerolog/log"
)

// signerResolver resolves the legally-required signer identity (the estate PRINCIPAL)
// for an envelope. A non-zero httpStatus signals rejection and clientMsg is the
// safe-to-surface error; httpStatus == 0 means email/name are populated and verified.
//
// WHY this is a seam: the signer of a legal directive/POA must be the estate principal,
// never the authenticated caller (an executor/admin only initiates). Resolution needs a
// live Firestore client (estates/{id}.principalId) + Firebase Auth (verified email),
// neither of which can be constructed offline — so tests inject a fake resolver while
// production uses firebaseSignerResolver. (claude-home signer=principal decision
// 2026-06-14; Refs ADR-047.)
type signerResolver interface {
	resolveSigner(ctx context.Context, estateID, fallbackName string) (email, name string, httpStatus int, clientMsg string)
}

// firebaseSignerResolver resolves the principal from estates/{id}.principalId via
// Firestore, then loads the principal's verified identity from Firebase Auth.
type firebaseSignerResolver struct {
	fs         *firestore.Client
	authClient userLookup
}

func (r *firebaseSignerResolver) resolveSigner(ctx context.Context, estateID, fallbackName string) (string, string, int, string) {
	// The estate record holds principalId (the principal's Firebase UID) — written at
	// estate creation (web/src/lib/estate-actions.ts createEstate).
	if r.fs == nil {
		return "", "", http.StatusServiceUnavailable, "Signer identity service unavailable"
	}
	estateSnap, err := r.fs.Collection("estates").Doc(estateID).Get(ctx)
	if err != nil || estateSnap == nil || !estateSnap.Exists() {
		return "", "", http.StatusBadRequest, "Estate has no principal on record"
	}
	principalID, _ := estateSnap.Data()["principalId"].(string)
	if principalID == "" {
		return "", "", http.StatusBadRequest, "Estate has no principal on record"
	}

	// Defensive: in production the auth client is always wired; locally it may be nil.
	if r.authClient == nil {
		return "", "", http.StatusServiceUnavailable, "Signer identity service unavailable"
	}

	principal, err := r.authClient.GetUser(ctx, principalID)
	if err != nil || principal == nil {
		log.Error().Err(err).Str("estate_id", estateID).Msg("Could not resolve estate principal from Firebase Auth")
		return "", "", http.StatusBadGateway, "Could not resolve estate principal"
	}

	// The required gate: a directive cannot be signed against an unverified principal
	// email — that would let an unverified/unowned address be named as the legal signer.
	if !principal.EmailVerified {
		return "", "", http.StatusForbidden, "The estate principal's email is not verified; signing cannot proceed"
	}

	signerEmail := principal.Email
	if signerEmail == "" {
		return "", "", http.StatusBadRequest, "The estate principal has no email on record"
	}

	signerName := principal.DisplayName
	if signerName == "" {
		signerName = fallbackName
	}
	if signerName == "" {
		signerName = signerEmail
	}
	return signerEmail, signerName, 0, ""
}
