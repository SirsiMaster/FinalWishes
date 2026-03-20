# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 19, 2026 (v7.0)
**Priority:** Phase 1 COMPLETE → Phase 2 (Cloud SQL PII Vault + Production Deploy)

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **26 skills** installed at `~/.gemini/antigravity/skills/`. **Check relevant skills before every task.**

---

## Phase 1 — COMPLETE ✅

Phase 1 (Data Layer + Go API Foundation) is **fully complete**. Here's everything delivered:

### Version History (v0.4.0 → v0.6.2)

| Version | Deliverable |
|---------|------------|
| 0.4.0 | ADR-036 (Firestore Direct Reads), security rules, Cloud Functions |
| 0.5.0 | Firestore hooks, 16 composite indexes, 4 estate dashboard pages |
| 0.5.1 | Create Estate onboarding (/estates/create) |
| 0.5.2 | Invitation system + beneficiaries integration |
| 0.6.0 | Settings page v2.0, ALL pages wired to Firestore |
| 0.6.1 | Code splitting — 4 chunks |
| **0.6.2** | **Dead code cleanup — removed 1,815 lines + React Query** |

### Architecture (ADR-036 Fully Realized)
```
┌────────────────────────────────────────┐
│  React Dashboard (TanStack Router)     │
│  ├── useDocument / useCollection       │ ← Firestore real-time
│  ├── estateClient (signed URLs)        │ ← Go API for GCS only
│  └── Firebase Auth (MFA ready)         │
├────────────────────────────────────────┤
│  Firestore (NoSQL)                     │
│  ├── estates/{id}                      │
│  ├── estates/{id}/assets               │
│  ├── estates/{id}/heirs                │
│  ├── estates/{id}/executors            │
│  ├── estates/{id}/documents            │
│  ├── estates/{id}/governance/*         │
│  ├── estates/{id}/notifications        │
│  ├── estate_users (junction)           │
│  └── estate_invitations                │
├────────────────────────────────────────┤
│  Go API (Cloud Run)                    │
│  ├── /health                           │
│  ├── ConnectRPC + Firebase Auth        │
│  └── Cloud Storage signed URLs         │
├────────────────────────────────────────┤
│  Cloud Functions                       │
│  └── autoMatchInvitation (on signup)   │
└────────────────────────────────────────┘
```

### Build Output (Final)
```
Modules: 296
dist/firebase-core.js    118 KB
dist/firebase-data.js    236 KB
dist/framework.js        274 KB
dist/index.js            337 KB  ← was 1,093KB (-69%)
dist/index.css           126 KB  ← was 151KB (-17%)
```

### Key Files
```
Core Data Layer:
  web/src/lib/firestore.ts         — Firestore hooks (useDocument, useCollection, 7 domain hooks)
  web/src/lib/invitations.ts       — Invitation lifecycle (268 lines)
  web/src/lib/estate-actions.ts    — Estate CRUD (createEstate, addAsset, addHeir, etc.)
  web/src/lib/auth.tsx             — Firebase Auth + profile listener
  web/src/lib/client.ts            — estateClient for Go API (Cloud Storage only)

Dashboard Pages (all Firestore-powered):
  web/src/routes/estates.$estateId.dashboard.tsx
  web/src/routes/estates.$estateId.assets.tsx
  web/src/routes/estates.$estateId.beneficiaries.tsx
  web/src/routes/estates.$estateId.vault.tsx
  web/src/routes/estates.$estateId.memoirs.tsx
  web/src/routes/estates.$estateId.obituary.tsx
  web/src/routes/estates.$estateId.settings.tsx
  web/src/routes/estates.$estateId.estates.tsx
  web/src/routes/estates.$estateId.notifications.tsx
  web/src/routes/estates.$estateId.attestation.tsx
  web/src/routes/estates.create.tsx

Infrastructure:
  firestore.rules          — Full security rules with role-based access
  firestore.indexes.json   — 16 composite indexes
  functions/               — Cloud Functions (autoMatchInvitation)
  api/                     — Go API (health, ConnectRPC, GCS)
```

### Removed This Session
- `@tanstack/react-query` — uninstalled from package.json
- 9 legacy `dashboard.*` route files (stubbed to null)
- All `useQuery` / `useMutation` / `useQueryClient` calls from estate pages

---

## Phase 2 — Recommended Next Steps

### Sprint 1: Firebase Blaze Upgrade
- Required for Cloud Functions deploy
- Required for Cloud SQL provisioning
- Required for production-grade Cloud Storage

### Sprint 2: Cloud Functions Deploy
- Deploy `autoMatchInvitation`
- Test: signup → auto-link invitation flow

### Sprint 3: Cloud SQL + PII Vault
- Provision PostgreSQL on Cloud SQL
- Schema: `pii_vault`, `financial_accounts`, `encrypted_documents`
- Wire Go API connection pool

### Sprint 4: SendGrid Integration
- Wire invitation emails
- Template: estate invitation notification
- Template: account verification

### Sprint 5: Production Deployment
- Firebase Hosting SPA config
- Cloud Run deploy for Go API
- Domain + SSL setup
- Smoke test all dashboards

---

## Git State
```
Branch: develop
Latest: 6abfa62 (docs: CHANGELOG v0.6.2)
Remote: SirsiMaster/FinalWishes → origin/develop (synced)
Total commits this session: 13
```

## Quick Commands
```bash
cd /Users/thekryptodragon/Development/FinalWishes

# Web dev server
cd web && npm run dev

# Build verification
cd web && npx vite build

# Go API (mock mode)
cd api && go run ./cmd/api/
# Health check: curl http://localhost:8080/health

# Deploy Firestore rules + indexes
firebase deploy --only firestore --project legacy-estate-os

# Deploy Cloud Functions (requires Blaze plan)
firebase deploy --only functions --project legacy-estate-os
```
