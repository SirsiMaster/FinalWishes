package auth

import "context"

// InjectUserIDForTest injects a user ID into the context for testing purposes.
// This uses the same context key as the real middleware, so handlers
// using UserIDFromContext will correctly read the injected UID.
//
// ONLY use this in tests — production code must go through the Firebase middleware.
func InjectUserIDForTest(ctx context.Context, uid string) context.Context {
	return context.WithValue(ctx, userIDKey, uid)
}
