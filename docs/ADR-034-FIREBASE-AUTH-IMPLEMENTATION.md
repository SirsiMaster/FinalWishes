# ADR-034: Firebase Auth Implementation
**Status:** Accepted  
**Date:** 2026-03-19  
**Author:** Antigravity  
**Supersedes:** None

---

## Context

FinalWishes previously used hardcoded test accounts and localStorage for authentication (Phase 0). This was appropriate for UI development but is unacceptable for real data access. The platform requires:

1. Real user registration and login
2. Session persistence across page reloads
3. Token-based API authentication (JWT)
4. Support for both email and username login
5. Path to MFA (TOTP) via Identity Platform

## Decision

### Provider: Firebase Auth (Identity Platform)

Firebase Auth is the authentication provider for FinalWishes, consumed via the Firebase JavaScript SDK (`firebase@^12.11.0`) on the client and the Firebase Admin Go SDK (`firebase.google.com/go/v4`) on the API server.

### Key Design Choices

#### 1. Username + Email Login
Firebase Auth natively only supports email+password. To support username login:

- **Firestore `usernames` collection**: `usernames/{username_lowercase}` → `{ email, uid, createdAt }`
- At login: if the identifier doesn't contain `@`, resolve the username to an email via Firestore lookup, then authenticate with the resolved email
- At registration: atomically create the Firebase Auth account, Firestore user profile (`users/{uid}`), and username index (`usernames/{username}`)
- Username uniqueness is enforced by Firestore document ID

> The `usernames` collection is an **operational index**, not a core data model entity. It does not hold PII beyond the email address (which is also stored in Firebase Auth itself).

#### 2. Auth Context Provider
- React `AuthProvider` wraps the entire app in `main.tsx`
- `onAuthStateChanged` listener manages session state
- `useAuth()` hook exposes: `user`, `profile`, `loading`, `signIn`, `signUp`, `signOut`, `resetPassword`
- Session persistence is handled by Firebase Auth's default `browserLocalPersistence`

#### 3. Route Protection
- `AuthGuard` component wraps protected route layouts
- Redirects to `/login` if no authenticated user
- Shows loading spinner during Firebase initialization

#### 4. API Authentication
- Go API middleware extracts `Authorization: Bearer <token>` header
- Firebase Admin SDK verifies the ID token
- User UID is injected into request context
- ConnectRPC client injects the token via transport interceptor

#### 5. Demo Mode Preservation
- `?demo=true` query parameter activates the Lockhart demo data fallback
- Demo mode uses the old hardcoded test accounts and Proxy client
- This ensures demo presentations work without real Firebase accounts

## Alternatives Considered

| Alternative | Reason Rejected |
|------------|----------------|
| **Auth0** | External dependency, not Google-first, additional cost |
| **Clerk** | Third-party, no native GCP integration, vendor lock-in |
| **Supabase Auth** | Competing ecosystem, not aligned with Firebase/GCP stack |
| **Custom JWT** | Unnecessary complexity; Firebase Auth provides JWTs with Claims out of the box |

## Consequences

### Positive
- Real authentication with industry-standard security (Firebase Auth)
- Session persistence (no more localStorage)
- JWT tokens for API authentication (verified server-side)
- Username login provides familiar UX
- Clear upgrade path to MFA via Identity Platform
- Custom Claims can encode user roles without additional Firestore reads

### Negative
- Username lookup adds one Firestore read per login (acceptable latency)
- Firestore security rules must allow unauthenticated reads on `usernames` collection (read-only)
- MFA requires separate Identity Platform configuration (deferred to next sprint)

## Files Created/Modified

| File | Action |
|------|--------|
| `web/src/lib/firebase.ts` | Created — Firebase app initialization |
| `web/src/lib/auth.tsx` | Created — Auth provider, hooks, username resolution |
| `web/src/components/guards/AuthGuard.tsx` | Created — Route protection |
| `web/src/routes/login.tsx` | Modified — Firebase Auth + registration form |
| `web/src/routes/estates.$estateId.tsx` | Modified — useAuth instead of localStorage |
| `web/src/routes/dashboard.tsx` | Modified — useAuth instead of localStorage |
| `web/src/components/layout/Sidebar.tsx` | Modified — useAuth for user data + signOut |
| `web/src/lib/client.ts` | Modified — Firebase token interceptor |
| `api/internal/auth/middleware.go` | Created — Firebase Admin token verification |
| `api/cmd/api/main.go` | Modified — Firebase Admin init + auth middleware |

---

**Signed,**  
**Antigravity (The Agent)**
