package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/rs/zerolog/log"
)

// contextKey is an unexported type for context keys
type contextKey string

const (
	userIDKey contextKey = "userID"
	tokenKey  contextKey = "firebaseToken"
)

// Middleware returns an HTTP middleware that verifies Firebase ID tokens.
// Routes protected by this middleware require a valid "Authorization: Bearer <token>" header.
func Middleware(authClient *firebaseAuth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":{"code":"UNAUTHENTICATED","message":"Missing authorization header"}}`, http.StatusUnauthorized)
				return
			}

			// Must be "Bearer <token>"
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, `{"error":{"code":"UNAUTHENTICATED","message":"Invalid authorization format. Expected: Bearer <token>"}}`, http.StatusUnauthorized)
				return
			}
			idToken := parts[1]

			// Verify the Firebase ID token
			token, err := authClient.VerifyIDToken(r.Context(), idToken)
			if err != nil {
				log.Warn().Err(err).Msg("Firebase token verification failed")
				http.Error(w, `{"error":{"code":"UNAUTHENTICATED","message":"Invalid or expired token"}}`, http.StatusUnauthorized)
				return
			}

			// Inject user ID and token into context
			ctx := context.WithValue(r.Context(), userIDKey, token.UID)
			ctx = context.WithValue(ctx, tokenKey, token)

			log.Debug().
				Str("uid", token.UID).
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Msg("Authenticated request")

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalMiddleware is like Middleware but does not reject unauthenticated requests.
// If a valid token is present, the user ID is injected into context.
// If no token or invalid token, the request proceeds without auth context.
func OptionalMiddleware(authClient *firebaseAuth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				parts := strings.SplitN(authHeader, " ", 2)
				if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
					token, err := authClient.VerifyIDToken(r.Context(), parts[1])
					if err == nil {
						ctx := context.WithValue(r.Context(), userIDKey, token.UID)
						ctx = context.WithValue(ctx, tokenKey, token)
						r = r.WithContext(ctx)
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// UserIDFromContext extracts the Firebase UID from the request context.
// Returns empty string if not authenticated.
func UserIDFromContext(ctx context.Context) string {
	uid, _ := ctx.Value(userIDKey).(string)
	return uid
}

// TokenFromContext extracts the verified Firebase token from the request context.
// Returns nil if not authenticated.
func TokenFromContext(ctx context.Context) *firebaseAuth.Token {
	token, _ := ctx.Value(tokenKey).(*firebaseAuth.Token)
	return token
}

// RequireUserID extracts the user ID from context and returns an error if not present.
// Use this in ConnectRPC service methods for cleaner auth checks.
func RequireUserID(ctx context.Context) (string, error) {
	uid := UserIDFromContext(ctx)
	if uid == "" {
		return "", fmt.Errorf("authentication required")
	}
	return uid, nil
}
