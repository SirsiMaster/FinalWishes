# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 19, 2026 (v5.0)
**Priority:** Phase 1 Week 2 Complete → Phase 1 Week 3 (Go API PII Vault + Settings)

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **26 skills** installed at `~/.gemini/antigravity/skills/`. **Check relevant skills before every task.**

---

## What Was Just Completed (v0.5.0 → v0.5.2)

### Phase 1, Week 2 — Data Layer + Invitations (ALL COMPLETE ✅)

| Sprint | Deliverable | Commit | Status |
|--------|------------|--------|:------:|
| 1 | Firestore hooks (`useEstate`, `useEstateAssets`, etc.) | `a28b5eb` | ✅ |
| 2 | Auto-match invitation Cloud Function | `a28b5eb` | ✅ |
| 3 | Firestore composite indexes (16 total) | `a28b5eb` | ✅ |
| 4 | Create Estate onboarding flow (`/estates/create`) | `4dd0b9f` | ✅ |
| 5 | Invitation system (invitations.ts + beneficiaries wiring) | `be3fb04` | ✅ |
| – | CHANGELOG v0.5.0-0.5.2 | `6d28198` | ✅ |

### Key Files Created/Modified
```
NEW:
  web/src/lib/firestore.ts         — Real-time Firestore hooks (229 lines)
  web/src/lib/estate-actions.ts    — Write operations (179 lines)
  web/src/lib/invitations.ts       — Invitation lifecycle (268 lines)
  web/src/lib/README.md            — Developer documentation
  web/src/routes/estates.create.tsx — Create Estate onboarding (210 lines)
  docs/ADR-036-FIRESTORE-DIRECT-READS.md — Architecture decision
  
MODIFIED:
  web/src/routes/estates.$estateId.dashboard.tsx     — Firestore hooks
  web/src/routes/estates.$estateId.assets.tsx        — Firestore hooks + addAsset
  web/src/routes/estates.$estateId.beneficiaries.tsx — Invitation system
  web/src/routes/estates.$estateId.vault.tsx         — Firestore hooks
  web/src/routes/estates.$estateId.notifications.tsx — Firestore hooks
  web/src/routes/dashboard.tsx                       — First-time user detection
  functions/index.js                                 — autoMatchInvitation trigger
  firestore.indexes.json                             — estate_invitations index
```

### Architecture Decisions
- **ADR-036**: Dashboard reads Firestore directly (not Go API) — saves latency, enables real-time
- **Go API role**: Cloud Storage signed URLs + Cloud SQL PII (Phase 2) + admin operations
- **Invitation flow**: Create pending → auto-link if user exists → Cloud Function handles on signup

### Known Issues / Blockers
1. **Cloud Functions deploy** requires Blaze (pay-as-you-go) plan — currently on Spark
2. **Cloud SQL** not provisioned yet — needed for Phase 2 PII Vault
3. **SendGrid** not integrated yet — invitations don't send email (TODO logged)
4. **Pre-existing TS error** in `estates.$estateId.index.tsx` line 4 (navigate params type)
5. **Chunk size warning** — 1MB JS bundle needs code splitting (deferred optimization)

---

## Phase 1, Week 3 — Recommended Sprint Plan

### Sprint 1: Wire Remaining Dashboard Pages
- Memoirs page → Firestore hooks
- Obituary page → Firestore hooks
- Settings page → Firestore hooks
- Estates list page → Firestore hooks

### Sprint 2: Settings Page — Governance + Profile
- Wire settings to read/write governance settings from Firestore
- Profile editing (name, email display, role display)
- MFA status indicator connected to real auth state

### Sprint 3: Go API Local Development
- Verify Go API starts locally with GOOGLE_CLOUD_PROJECT unset (mock mode)
- Test ConnectRPC health endpoint
- Test signed URL endpoint with real GCS bucket

### Sprint 4: Cloud SQL Schema + Migration
- Create Cloud SQL instance (if billing allows)
- Run initial schema migration for PII tables
- Wire Go API to Cloud SQL for PII operations

### Sprint 5: Code Splitting + Performance
- Implement lazy loading for route components
- Split Firebase SDK into separate chunks
- Target < 500KB initial JS bundle

---

## Git State
```
Branch: develop
Latest: 6d28198 (docs: CHANGELOG v0.5.2)
Remote: SirsiMaster/FinalWishes → origin/develop (synced)
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

# Deploy Firestore rules + indexes
firebase deploy --only firestore --project legacy-estate-os

# Deploy Cloud Functions (requires Blaze plan)
firebase deploy --only functions --project legacy-estate-os
```
