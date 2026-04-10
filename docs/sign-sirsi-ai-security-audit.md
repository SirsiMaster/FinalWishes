# sign.sirsi.ai Security Audit Report

**Date:** April 9, 2026
**Auditor:** Claude Code (automated source review)
**Scope:** `SirsiNexusApp/packages/sirsi-sign/` (frontend), `SirsiNexusApp/packages/sirsi-opensign/` (backend/hosting), FinalWishes Go API proxy (`api/internal/opensign/`)
**Classification:** CONFIDENTIAL — Internal Use Only

---

## Executive Summary

This audit reviewed the sign.sirsi.ai codebase across three layers: the React frontend (`sirsi-sign`), the Node.js backend services (`contracts-grpc`), and the FinalWishes Go API proxy. The review identified **14 findings**: 3 CRITICAL, 4 HIGH, 4 MEDIUM, and 3 LOW severity issues.

The most severe issues are:
1. **Hardcoded MFA bypass codes** that completely defeat multi-factor authentication
2. **No server-side authentication** on the contracts-grpc service (CORS wildcard, no token verification)
3. **Client-side role determination** via email domain string matching stored in localStorage

These findings represent real exploitable vulnerabilities that affect FinalWishes consumers. The FinalWishes Go API proxy itself is reasonably well-protected (Firebase Auth middleware), but the upstream sign.sirsi.ai services it depends on have significant gaps.

---

## Findings

### FINDING-01: Hardcoded MFA Bypass Codes [CRITICAL]

**File:** `packages/sirsi-sign/src/components/auth/MFAGate.tsx`, line 29
**Code:**
```typescript
const BYPASS_CODES = ['123456', '999999', '000000'];
```

**Description:** Three static bypass codes are hardcoded in the client-side JavaScript. Any user can enter `123456`, `999999`, or `000000` as their MFA code and the gate accepts it without contacting any backend verification service (lines 133-138). This bypass is checked *before* the legitimate TOTP or SMS/email verification path.

**Impact:** MFA is completely defeated. Any attacker who authenticates with a stolen password can bypass the second factor. This renders the "Bipartite MFA Enforcement" claim in the login UI false. For FinalWishes, this means contract signing ceremonies and financial operations (Stripe/Plaid) that require MFA verification are unprotected.

**Remediation:** Remove the `BYPASS_CODES` constant and the client-side bypass check entirely. If admin recovery codes are needed, implement them server-side with single-use tokens stored in Firestore, rate-limited and audit-logged.

---

### FINDING-02: No Server-Side Authentication on contracts-grpc [CRITICAL]

**File:** `packages/sirsi-opensign/services/contracts-grpc/src/server.js`, lines 644-660

**Description:** The contracts-grpc HTTP server accepts `Authorization` headers in CORS configuration but **never verifies them**. There is no Firebase Admin SDK `verifyIdToken()` call anywhere in the request handling pipeline. The `Authorization` header is accepted but completely ignored.

Authentication is simulated by passing `userEmail` as a query/body parameter (line 688), which is self-reported by the client. The only access control is checking if the email is in a hardcoded `SUPER_ADMINS` array (line 277: `['cylton@sirsi.ai']`).

**Impact:** Any unauthenticated HTTP client can:
- List all contracts for any user by supplying their email
- Create, update, and delete contracts
- Create Stripe Checkout sessions
- Create Plaid Link tokens
- Access the full contract database

For FinalWishes, this means the contracts and financial data flowing through sign.sirsi.ai have no server-side access control.

**Remediation:** Add Firebase Admin SDK token verification middleware before all route handlers. Extract the user identity from the verified token (not from request body). Implement proper RBAC using Firebase custom claims.

---

### FINDING-03: Wildcard CORS on Backend API [CRITICAL]

**File:** `packages/sirsi-opensign/services/contracts-grpc/src/server.js`, line 647
**Code:**
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Description:** The contracts-grpc service allows requests from any origin. Combined with FINDING-02 (no server-side auth), this means any website on the internet can make authenticated-looking requests to the contracts API from a user's browser.

**Impact:** Enables cross-origin attacks. A malicious website could make requests to the contracts-grpc endpoints and exfiltrate contract data, create fraudulent checkout sessions, or manipulate contract states. This is a direct CSRF vector when combined with the lack of authentication.

**Remediation:** Restrict `Access-Control-Allow-Origin` to an allowlist: `sign.sirsi.ai`, `sirsi-sign.web.app`, `finalwishes.app`, and localhost for development. Reject all other origins.

---

### FINDING-04: Client-Side Role Determination via Email Domain [HIGH]

**File:** `packages/sirsi-sign/src/components/auth/Login.tsx`, lines 57-62
**Code:**
```typescript
if (email.toLowerCase().includes('@sirsi.ai')) {
    localStorage.setItem('sirsi_user_role', 'provider');
} else {
    localStorage.setItem('sirsi_user_role', 'client');
}
```

**Description:** User roles are determined client-side by checking if the email address contains `@sirsi.ai`, then stored in `localStorage`. Any user can modify `localStorage` via browser DevTools to escalate their role to `provider`. If any UI components conditionally render admin functionality based on this value, it creates a privilege escalation path.

**Impact:** Any authenticated user can set themselves as a `provider` by editing localStorage. While backend enforcement (if it existed) would prevent actual data access, UI-level privilege escalation can expose admin interfaces and workflows.

**Remediation:** Remove client-side role assignment. Use Firebase custom claims set server-side (e.g., `{ role: 'provider' }`) and verify them via `user.getIdTokenResult()`. Never trust localStorage for authorization decisions.

---

### FINDING-05: MFA State Stored in sessionStorage [HIGH]

**File:** `packages/sirsi-sign/src/components/auth/MFAGate.tsx`, lines 28, 82, 510-511
**Code:**
```typescript
const SESSION_KEY = 'sirsi_mfa_verified';
sessionStorage.setItem(SESSION_KEY, 'true');

export function isMFASessionVerified(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
}
```

**Description:** MFA verification state is tracked exclusively in the browser's `sessionStorage`. There is no server-side session, token claim, or cryptographic proof that MFA was completed. Any JavaScript running in the same origin can set `sessionStorage.setItem('sirsi_mfa_verified', 'true')` to bypass MFA.

The `ProtectedRoute` component (line 55) checks this value to decide whether to redirect to the MFA page. This is the sole MFA enforcement mechanism for the application.

**Impact:** XSS or browser extension code can bypass MFA. Even without an attack, the MFA "verification" is purely cosmetic — the backend has no way to know if MFA was actually completed for a given request. Financial operations that claim MFA enforcement (per Authorization Policy Section 4.3) are not actually protected at the API level.

**Remediation:** After successful MFA verification, the backend should set a Firebase custom claim (e.g., `mfaVerifiedAt: timestamp`) and force a token refresh. Backend endpoints should check this claim and reject requests where MFA is stale or absent.

---

### FINDING-06: Secrets Stored in Firestore (Not Secret Manager) [HIGH]

**File:** `packages/sirsi-opensign/services/contracts-grpc/src/server.js`, lines 25-44
**Code:**
```javascript
const vaultDoc = await db.collection('vault').doc('production').get();
const secrets = vaultDoc.data();
if (secrets.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = secrets.STRIPE_SECRET_KEY;
```

**Description:** Production secrets (Stripe secret key, Stripe webhook secret, Plaid client ID/secret, SendGrid API key) are stored in a Firestore collection called `vault`. Firestore is a database, not a secret manager. Secrets in Firestore are:
- Not encrypted at the application layer (only at-rest by Google)
- Accessible to anyone with Firestore read permissions
- Not rotation-managed
- Not audit-logged for access
- Visible in Firestore console to any project admin

**Impact:** If Firestore security rules are misconfigured (or if an attacker gains a service account token), all production payment and email credentials are exposed. The Stripe secret key enables arbitrary charges, refunds, and customer data access.

**Remediation:** Migrate all secrets to Google Secret Manager. Access them via the Secret Manager API at service startup. Configure Cloud Run to inject secrets as environment variables from Secret Manager. Delete the Firestore `vault` collection after migration.

---

### FINDING-07: Upstream Error Body Forwarded to Client [HIGH]

**File:** `FinalWishes/api/internal/opensign/handler.go`, lines 100-103
**Code:**
```go
body, _ := io.ReadAll(resp.Body)
log.Error().Int("status", resp.StatusCode).Str("body", string(body)).Msg("OpenSign API error")
http.Error(w, fmt.Sprintf("Signing provider error: %s", string(body)), http.StatusBadGateway)
```

**Description:** When the upstream OpenSign API returns an error, the full error body is forwarded to the FinalWishes client. Upstream error responses may contain internal infrastructure details, API key fragments, Firestore paths, or stack traces.

**Impact:** Information leakage. An attacker probing the API can learn about internal service architecture, backend technology stack, and potentially credentials from verbose error messages.

**Remediation:** Log the full upstream error server-side but return a generic error message to the client: `"Signing service temporarily unavailable"`. Include a correlation ID for debugging.

---

### FINDING-08: Unauthenticated Public Contract Routes [MEDIUM]

**File:** `packages/sirsi-sign/src/router.config.tsx`, lines 76-86
**Code:**
```typescript
// CLIENT-FACING: No ProtectedRoute — these are public links sent to clients
const contractsProjectRoute = createRoute({
    path: '/contracts/$projectId',
    component: AgreementWorkflow,
});
```

**Description:** The `/contracts` and `/contracts/:projectId` routes render the full `AgreementWorkflow` component without any authentication wrapper. While this is intentionally designed for client-facing signing links, the `AgreementWorkflow` component loads contract data, system settings, and renders financial information.

**Impact:** Contract details (including client names, emails, financial amounts, and payment status) are accessible to anyone with the URL. If project IDs are guessable or enumerable, an attacker can browse arbitrary contracts. The component also reads query parameters (`client`, `email`, `company`) that could be used for phishing.

**Remediation:** Implement time-limited, cryptographically signed URLs for public contract access (e.g., JWT or HMAC-signed links). Validate the signer's identity matches the email in the contract. Add rate limiting on public contract access.

---

### FINDING-09: No Input Validation on OpenSign Proxy [MEDIUM]

**File:** `FinalWishes/api/internal/opensign/handler.go`, lines 14-19, 28-32

**Description:** The `CreateEnvelopeHandler` accepts `templateId`, `signerName`, `signerEmail`, and `redirectUrl` without any validation:
- `templateId` is not validated against an allowlist of known templates
- `signerEmail` is not validated as a proper email format
- `redirectUrl` is passed directly to the upstream API with no URL validation, enabling potential open redirect or SSRF
- No maximum request body size is enforced

**Impact:** An attacker could supply a malicious `redirectUrl` pointing to a phishing site, inject arbitrary template IDs, or send oversized payloads. The `redirectUrl` is particularly concerning as it controls where signers are sent after completing a ceremony.

**Remediation:** Validate `signerEmail` format. Validate `redirectUrl` against an allowlist of permitted domains (e.g., `finalwishes.app`, `sign.sirsi.ai`). Validate `templateId` against known templates. Enforce a maximum body size.

---

### FINDING-10: Webhook Signature Verification Bypass in Development [MEDIUM]

**File:** `packages/sirsi-opensign/services/contracts-grpc/src/server.js`, lines 718-726
**Code:**
```javascript
if (!webhookSecret) {
    console.warn('... processing unverified (dev only)');
    event = body;
}
```

**Description:** If `STRIPE_WEBHOOK_SECRET` is not configured, the webhook handler processes the request body as a trusted Stripe event without any signature verification. If this configuration is accidentally missing in production, an attacker can forge webhook events to mark contracts as paid, trigger settlement flows, or manipulate payment state.

**Impact:** If the webhook secret environment variable is unset in production (misconfiguration), anyone can POST fake Stripe events to the `/webhook` endpoint and mark contracts as `PAID` without actual payment.

**Remediation:** Fail hard if `STRIPE_WEBHOOK_SECRET` is not set in production. Add an environment check (e.g., `NODE_ENV === 'production'`) and refuse to start or refuse to process webhooks without the secret configured. Log an alert-level message.

---

### FINDING-11: No Rate Limiting on Any Endpoint [MEDIUM]

**Description:** Neither the contracts-grpc backend nor the sirsi-sign frontend implements rate limiting. There is no rate limiting middleware on:
- Login attempts (Firebase Auth has its own, but the MFA gate does not)
- MFA code verification attempts (unlimited brute-force possible)
- Contract listing/creation APIs
- Webhook endpoint
- Plaid Link token creation

The `BYPASS_CODES` issue (FINDING-01) makes this less urgent for MFA specifically, but once that is fixed, unlimited MFA attempts would allow brute-forcing 6-digit codes (1M combinations).

**Remediation:** Implement rate limiting at the Cloud Run service level or via Google Cloud Armor. At minimum: 5 MFA attempts per minute per user, 100 API requests per minute per user, 10 webhook requests per second globally.

---

### FINDING-12: Firebase Config Exposed in Client Bundle [LOW]

**File:** `packages/sirsi-sign/src/lib/firebase.ts`, lines 6-13
**Code:**
```typescript
const firebaseConfig = {
    apiKey: "AIzaSyDFd4RAvVZWy3G1geLudrq4KgDDsGr-jb8",
    authDomain: "sirsi-nexus-live.firebaseapp.com",
    projectId: "sirsi-nexus-live",
    ...
};
```

**Description:** Firebase client configuration is hardcoded in the source. While Firebase API keys are designed to be public (they identify the project, not grant access), the exposure of `projectId`, `messagingSenderId`, and `appId` provides reconnaissance information. Combined with weak Firestore rules, this could enable direct Firestore access from unauthorized apps.

**Impact:** Low direct risk (Firebase API keys are public by design), but provides attackers with project identification for targeted attacks. If Firestore rules have any gaps, this enables direct database access from custom apps.

**Remediation:** Move to environment variables via `VITE_FIREBASE_*` for cleaner configuration management. More importantly, ensure Firestore security rules are strict (the current rules in `firestore.rules` are reasonably well-structured but see FINDING-08 for the guest signing gap). Enable App Check to restrict API calls to legitimate app instances.

---

### FINDING-13: Stripe Live Publishable Key Hardcoded [LOW]

**File:** `packages/sirsi-sign/src/lib/stripe.ts`, lines 3-4
**Code:**
```typescript
const STRIPE_PUBLIC_KEY = 'pk_live_51ShDB5DHFENsYYPy...';
```

**Description:** The live Stripe publishable key is hardcoded. Like Firebase API keys, Stripe publishable keys are designed to be public (they can only create tokens, not charge cards). However, hardcoding makes key rotation difficult and the key is now in git history permanently.

**Impact:** Low. Publishable keys cannot be used for charges. But if the key needs rotation (e.g., after a compromise of the Stripe account), every deployed client must be updated.

**Remediation:** Move to `VITE_STRIPE_PUBLIC_KEY` environment variable. Set up Vite `.env` files for different environments (dev/staging/prod).

---

### FINDING-14: User Email Stored in localStorage [LOW]

**File:** `packages/sirsi-sign/src/components/auth/Login.tsx`, line 62
**Code:**
```typescript
localStorage.setItem('sirsi_user_email', email);
```

**Description:** The user's email address is stored in `localStorage` after login. `localStorage` persists indefinitely (unlike `sessionStorage`), is accessible to any JavaScript on the same origin, and is not cleared on logout (no `removeItem` call found).

**Impact:** On shared computers, the email persists after the user navigates away. XSS attacks can read all localStorage data. This is PII leakage via client-side storage.

**Remediation:** Remove localStorage email storage. If needed for display, read from `auth.currentUser.email`. If needed for role checks, use Firebase custom claims instead.

---

## Prioritized Remediation Plan

### Phase 1: Before Launch (CRITICAL — This Week)

| # | Finding | Effort | Action |
|---|---------|--------|--------|
| 1 | FINDING-01 | 1 hour | Delete `BYPASS_CODES` and the client-side bypass check |
| 2 | FINDING-02 | 4 hours | Add Firebase Admin `verifyIdToken()` middleware to contracts-grpc |
| 3 | FINDING-03 | 1 hour | Replace `Access-Control-Allow-Origin: *` with domain allowlist |

### Phase 2: Within 2 Weeks (HIGH)

| # | Finding | Effort | Action |
|---|---------|--------|--------|
| 4 | FINDING-04 | 2 hours | Remove client-side role assignment; use Firebase custom claims |
| 5 | FINDING-05 | 4 hours | Move MFA state to Firebase custom claims with server-side verification |
| 6 | FINDING-06 | 3 hours | Migrate secrets from Firestore to Google Secret Manager |
| 7 | FINDING-07 | 1 hour | Return generic error messages from FinalWishes proxy |

### Phase 3: Within 30 Days (MEDIUM)

| # | Finding | Effort | Action |
|---|---------|--------|--------|
| 8 | FINDING-08 | 8 hours | Implement signed URLs for public contract access |
| 9 | FINDING-09 | 3 hours | Add input validation to OpenSign proxy handler |
| 10 | FINDING-10 | 1 hour | Fail-hard on missing webhook secret in production |
| 11 | FINDING-11 | 4 hours | Add rate limiting via Cloud Armor or middleware |

### Phase 4: Backlog (LOW)

| # | Finding | Effort | Action |
|---|---------|--------|--------|
| 12 | FINDING-12 | 1 hour | Move Firebase config to environment variables; enable App Check |
| 13 | FINDING-13 | 30 min | Move Stripe publishable key to environment variable |
| 14 | FINDING-14 | 30 min | Remove localStorage email storage |

---

## Impact on FinalWishes Integration

FinalWishes consumes sign.sirsi.ai via two paths:

1. **Go API Proxy** (`/api/v1/opensign/*`) — Protected by Firebase Auth middleware. This path is reasonably secure (FINDING-07 and FINDING-09 apply).

2. **Direct gRPC client** (contracts-grpc at `us-east4.run.app`) — Used by the sirsi-sign frontend. This path has NO server-side authentication (FINDING-02). Any FinalWishes data flowing through contracts-grpc (contracts, payment sessions, Plaid tokens) is exposed.

**Key risk for FinalWishes:** If FinalWishes contract signing links are shared (e.g., emailed to clients), the contract data is accessible without authentication to anyone who knows or guesses the project ID (FINDING-08). The MFA bypass (FINDING-01) means the "bipartite MFA" security claim in contracts and legal documents is currently unenforceable.

**Recommendation:** FinalWishes should not launch with contract signing functionality until FINDING-01, FINDING-02, and FINDING-03 are remediated in the SirsiNexusApp repo.

---

## Methodology

This audit was conducted as a static source code review of:
- `SirsiNexusApp/packages/sirsi-sign/src/` (React frontend — 60+ files)
- `SirsiNexusApp/packages/sirsi-opensign/services/contracts-grpc/src/server.js` (Node.js backend)
- `SirsiNexusApp/packages/sirsi-opensign/firestore.rules` (Firestore security rules)
- `FinalWishes/api/internal/opensign/handler.go` (Go API proxy)
- `FinalWishes/api/internal/auth/middleware.go` (Firebase Auth middleware)

No dynamic testing, penetration testing, or Cloud Run configuration review was performed. Findings are based on code as checked into the repository at the time of review.
