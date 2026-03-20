# ADR-036: Firestore Direct Reads for Dashboard

## Status
**Accepted** — March 19, 2026

## Context

The FinalWishes dashboard (9 route pages) was initially wired to read data through the ConnectRPC Go API (`estateClient`). However:

1. The Go API is deployed on Cloud Run, which is not yet provisioned for production
2. Dashboard data (estates, assets, heirs, documents, notifications) lives in Firestore
3. Routing reads through the Go API adds unnecessary latency (client → API → Firestore → API → client)
4. Firestore provides built-in real-time sync via `onSnapshot` — the Go API would lose this capability
5. Firestore Security Rules v3.0.0 already enforce access control at the database level

## Decision

Dashboard pages read directly from Firestore using the client SDK (`firebase/firestore`).

The Go API is reserved for:
- **Cloud SQL PII operations** (SSN, DOB, account numbers — Phase 2)
- **Cloud Storage signed URLs** (vault document upload/download)
- **Admin operations** that require server-side enforcement beyond Firestore Rules

### Implementation
- Created `web/src/lib/firestore.ts` — real-time hooks using `onSnapshot`
- Created `web/src/lib/estate-actions.ts` — write operations using Firestore client SDK
- Updated 4 dashboard route pages to use Firestore hooks instead of `estateClient`
- Preserved the `estateClient` import in `vault.tsx` for signed URL generation

## Consequences

### What becomes easier
- Dashboard works without Cloud Run provisioned
- Real-time data updates without polling or manual invalidation
- Simpler data flow (no API middleware layer for reads)
- Faster time-to-data (single Firestore round trip)

### What becomes harder
- Must maintain comprehensive Firestore Security Rules (already done — v3.0.0)
- PII-sensitive fields cannot be stored in Firestore (by design — Cloud SQL handles PII)
- Server-side aggregations or computed fields need Cloud Functions instead of API endpoints

### What stays the same
- Go API still handles Cloud Storage signed URLs
- Go API still handles future Cloud SQL PII vault
- Firestore Security Rules remain the primary access control mechanism
