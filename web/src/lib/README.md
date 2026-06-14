# Core Libraries — Developer Guide

> Client-side services: auth, real-time data, encryption, analytics, and API transport.

## Files

Every non-test module under `web/src/lib` is listed below with its one-line purpose and
governing ADR (per Rule 30 — shipped modules carry a developer-facing README). The
`forms.ts` and `email.ts` modules also have dedicated deep-dives in
[`README-forms.md`](./README-forms.md) and [`README-email.md`](./README-email.md).

### Platform & data transport

| File | Purpose | ADR |
|------|---------|-----|
| `firebase.ts` | Firebase app initialization (Auth, Firestore, Analytics, Performance) | ADR-034 |
| `auth.tsx` | React Auth context/provider — email + username login, MFA support, demo mode | ADR-034 |
| `mfa.ts` | TOTP enrollment and verification (Google Authenticator, 1Password, Authy) | ADR-034 |
| `firestore.ts` | Real-time Firestore hooks via `onSnapshot` (client-side direct reads) | ADR-036 |
| `estate-actions.ts` | Firestore write operations (createEstate, addAsset, etc.) | ADR-036 |
| `client.ts` | ConnectRPC transport for Go API (signed URLs, PII operations) | ADR-037 |

### Access control & gating

| File | Purpose | ADR |
|------|---------|-----|
| `persona.ts` | **Single source of truth for estate-scoped access** — sidebar nav, route guards, the Shepherd companion, and tests all import the persona/role boundary | ADR-046 |
| `tier-gating.ts` | Client-side tier definitions + React hook that fetches the estate's entitlement tier (Stripe) | ADR-035 |
| `invitations.ts` | Estate invitation system — create, send, auto-match on registration (email-verified seizure-safe) | ADR-046 |

### Flagship features (full subsystems — see Architecture below)

| File | Purpose | ADR |
|------|---------|-----|
| `probate.ts` | Probate API client — drives the pluggable state-machine settlement engine (`/api/v1/probate/*`) | ADR-043 |
| `shepherd.ts` | **The Shepherd** — client for the live AI guidance engine (`/api/v1/guidance/*`), the voice and heart of FinalWishes | ADR-040 |
| `shepherd-prompts.ts` | Pure functions that transform estate context into contextual Shepherd prompts | ADR-040 |
| `useGuidanceScore.ts` | Fetches the Shepherd guidance Score — backend computes a deterministic plan (`api/internal/guidance`) | ADR-040 |
| `google-photos-import.ts` | Google Photos import via the Picker API — minimal scope, PII-clean, server-mediated media download (CR-12) | ADR-045 |
| `doc-intelligence.ts` | Document Intelligence — sends uploaded vault documents to the Go API for AI structured analysis | ADR-043 |

### Estate utilities & UX

| File | Purpose | ADR |
|------|---------|-----|
| `forms.ts` | Statutory Forms API client — coordinate-overlay fill engine (see `README-forms.md`) | ADR-002 §4 |
| `search.ts` | Client-side search hook across all estate Firestore subcollections | ADR-036 |
| `export.ts` | Estate Data Export — generates a ZIP archive of all estate data for compliance/portability | ADR-002 §6 |
| `wizardDraft.ts` | Estate-creation wizard draft persistence (device-local `localStorage`) | ADR-006 |
| `useResumables.ts` | Surfaces in-progress work so a returning user can resume exactly where they left off | ADR-038 |
| `analytics.ts` | Firebase Performance + GA4 wrappers for business-critical events | — |
| `email-templates.ts` | Royal Neo-Deco HTML email templates with inline CSS | ADR-039 |
| `email.ts` | Email utility helpers (see `README-email.md`) | ADR-039 |
| `us-states.ts` | The 50 US states + DC — shared so every "state" field is a complete dropdown | — |
| `animations.tsx` | Shared motion primitives for the Royal Neo-Deco design system | ADR-033 |
| `utils.ts` | Shared utility helpers | — |

## Flagship Subsystem Architecture

Three of these modules are not utility helpers — they are the client surfaces of full,
ADR-backed features. A short orientation for each:

### Persona-Based Access Control (`persona.ts`, ADR-046)

`persona.ts` is the **single source of truth** for who can see and do what in an estate.
Sidebar navigation, route guards, the Shepherd companion, and the test suite all import
the persona/role resolver rather than re-deriving access. Estate-scoped roles map to a
3-layer boundary (UI gate → route guard → Firestore Rules) so that a UI-layer mistake
cannot leak data — the Firestore boundary is authoritative. Soul Log read-privacy
(per-recipient `sharedWith` UIDs) is enforced here and in the rules together.

### The Shepherd (`shepherd.ts`, `shepherd-prompts.ts`, `useGuidanceScore.ts`, ADR-040)

The Shepherd is the live AI guidance engine. `shepherd-prompts.ts` builds contextual
prompts from estate state (pure functions, fully testable), `shepherd.ts` is the transport
to `/api/v1/guidance/*` (Claude Opus via the `sirsi-ai` shared service per ADR-040), and
`useGuidanceScore.ts` surfaces the deterministic guidance Score the backend computes
(`api/internal/guidance/handler.go`). Legal answers are grounded in the RAG corpus
(ADR-044) with citation abstention — never fabricated (Rule 9).

### Illinois Probate Engine (`probate.ts`, ADR-043)

`probate.ts` is the thin client for the pluggable state-machine probate engine
(`/api/v1/probate/*`). The state machine itself lives in the Go API; the client drives
step transitions and renders the settlement workflow. Illinois is the first pluggable
jurisdiction; the engine is state-agnostic by design.

## Architecture

Firestore reads happen **client-side** (ADR-036) — no Go API round-trip for dashboard data. Security is enforced by Firestore Rules v5.0.0 (`firestore.rules`). The Go API handles Cloud SQL PII (ADR-037), Cloud Storage, and KMS operations only.

## Hooks Reference

### Generic Hooks (internal)
- `useDocument<T>(path)` — Subscribe to a single Firestore document
- `useCollection<T>(path, constraints)` — Subscribe to a collection with query constraints

### Domain Hooks (exported)

| Hook | Collection | Returns |
|------|-----------|---------|
| `useEstate(estateId)` | `estates/{id}` | `FirestoreResult<Estate>` |
| `useEstateAssets(estateId)` | `estates/{id}/assets` | `FirestoreListResult<Asset>` |
| `useEstateHeirs(estateId)` | `estates/{id}/heirs` | `FirestoreListResult<Heir>` |
| `useEstateExecutors(estateId)` | `estates/{id}/executors` | `FirestoreListResult<Executor>` |
| `useEstateDocuments(estateId)` | `estates/{id}/documents` | `FirestoreListResult<VaultDocument>` |
| `useUserEstates(userId)` | `estate_users` | `FirestoreListResult<EstateUser>` |
| `useEstateNotifications(estateId)` | `estates/{id}/notifications` | `FirestoreListResult<EstateNotification>` |

### Return Shape

```typescript
interface FirestoreResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface FirestoreListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}
```

## Write Operations

All writes go through `estate-actions.ts`. Functions return `{ success, id?, error? }`.

| Function | What it does |
|----------|-------------|
| `createEstate({ name, principalId })` | Creates estate + estate_users junction |
| `updateEstate(estateId, data)` | Updates estate metadata |
| `addAsset({ estateId, name, category, ... })` | Adds asset to subcollection |
| `updateAsset(estateId, assetId, data)` | Updates asset |
| `archiveAsset(estateId, assetId)` | Soft-deletes asset |
| `addHeir({ estateId, fullName, email, ... })` | Adds heir to subcollection |
| `updateHeir(estateId, heirId, data)` | Updates heir |
| `addExecutor({ estateId, fullName, email, ... })` | Adds executor |
| `createDocumentRecord({ estateId, ... })` | Creates vault doc metadata |
| `archiveDocument(estateId, docId)` | Soft-deletes document |

## Security

All reads/writes are protected by Firestore Security Rules v5.0.0 (`firestore.rules`).
Key rules:
- Only estate principals can write to their estates
- Estate users can read estates they have access to
- Subcollection access inherits from parent estate
- Data shape validation on all writes
