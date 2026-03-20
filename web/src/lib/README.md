# Firestore Data Layer — Developer Guide

## Overview

FinalWishes uses a **client-side Firestore** data layer for real-time dashboard reads.
The Go API handles Cloud SQL PII operations and Cloud Storage signed URLs only.

## Architecture Decision

See [ADR-036: Firestore Direct Reads](../../docs/ADR-036-FIRESTORE-DIRECT-READS.md).

**Why not route through the Go API?**
- Firestore provides built-in real-time sync via `onSnapshot`
- Security is enforced by Firestore Rules v3.0.0 (not API-level auth)
- Eliminates Cloud Run provisioning as a blocker for Phase 1
- The Go API is reserved for Cloud SQL PII + Cloud Storage operations

## Files

| File | Purpose |
|------|---------|
| `firestore.ts` | Real-time data hooks (useEstate, useEstateAssets, etc.) |
| `estate-actions.ts` | Write operations (createEstate, addAsset, etc.) |
| `firebase.ts` | Firebase SDK initialization |
| `client.ts` | ConnectRPC client for Go API (signed URLs, PII) |

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
