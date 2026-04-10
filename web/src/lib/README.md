# Core Libraries — Developer Guide

> Client-side services: auth, real-time data, encryption, analytics, and API transport.

## Files

| File | Purpose |
|------|---------|
| `firebase.ts` | Firebase app initialization (Auth, Firestore, Analytics, Performance) |
| `auth.tsx` | React Auth context/provider — email + username login, MFA support, demo mode |
| `mfa.ts` | TOTP enrollment and verification (Google Authenticator, 1Password, Authy) |
| `firestore.ts` | Real-time Firestore hooks via `onSnapshot` (ADR-036) |
| `estate-actions.ts` | Firestore write operations (createEstate, addAsset, etc.) |
| `invitations.ts` | Estate invitation system — create, send, auto-match on registration |
| `analytics.ts` | Firebase Performance + GA4 wrappers for business-critical events |
| `client.ts` | ConnectRPC transport for Go API (signed URLs, PII operations) |
| `email.ts` | Email utility functions |
| `utils.ts` | Shared utility helpers |

## Architecture

Firestore reads happen **client-side** (ADR-036) — no Go API round-trip for dashboard data. Security is enforced by Firestore Rules v3.0.0. The Go API handles Cloud SQL PII, Cloud Storage, and KMS operations only.

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

All reads/writes are protected by Firestore Security Rules v3.0.0 (`firestore.rules`).
Key rules:
- Only estate principals can write to their estates
- Estate users can read estates they have access to
- Subcollection access inherits from parent estate
- Data shape validation on all writes
