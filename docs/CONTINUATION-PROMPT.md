# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 19, 2026 (v6.0)
**Priority:** Phase 1 Week 3 Complete → Phase 2 (Cloud SQL PII Vault + Deployment)

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **26 skills** installed at `~/.gemini/antigravity/skills/`. **Check relevant skills before every task.**

---

## What Was Just Completed (v0.5.0 → v0.6.1)

### Phase 1, Week 2 — Data Layer + Invitations (ALL COMPLETE ✅)

| Sprint | Deliverable | Commit |
|--------|------------|--------|
| 1 | Firestore hooks (useEstate, useEstateAssets, etc.) | `a28b5eb` |
| 2 | Auto-match invitation Cloud Function | `a28b5eb` |
| 3 | Firestore composite indexes (16 total) | `a28b5eb` |
| 4 | Create Estate onboarding flow (/estates/create) | `4dd0b9f` |
| 5 | Invitation system (invitations.ts + beneficiaries) | `be3fb04` |

### Phase 1, Week 3 — Settings + Performance (ALL COMPLETE ✅)

| Sprint | Deliverable | Commit |
|--------|------------|--------|
| 1 | Wire ALL remaining pages to Firestore | `f70d7d1` |
| 2 | Settings page v2.0 (profile card, toggles, saves) | `50fe89f` |
| 3 | Code splitting — bundle 1093KB → 464KB (-57%) | `d6b67fe` |
| 4 | Go API health check + auth middleware verified | N/A (verified) |
| – | CHANGELOG v0.5.0-0.6.1 | `dc388ac` |

### Key Architecture Decisions
- **ADR-036**: Dashboard reads Firestore directly (not Go API) — all pages now live
- **Go API role**: Cloud Storage signed URLs + Cloud SQL PII (Phase 2)
- **Invitation flow**: Create pending → auto-link → Cloud Function on signup
- **Code splitting**: 4 chunks (firebase-core, firebase-data, framework, app)

### Build Output
```
dist/firebase-core.js    117 KB (app + auth)
dist/firebase-data.js    236 KB (firestore + storage)
dist/framework.js        274 KB (react + router)
dist/index.js            464 KB (app code — under 600KB limit)
dist/index.css           151 KB
```

### Key Files Created/Modified This Session
```
NEW:
  web/src/lib/invitations.ts         — Invitation lifecycle (268 lines)
  web/src/routes/estates.create.tsx  — Create Estate onboarding (210 lines)

REWRITTEN:
  web/src/routes/estates.$estateId.settings.tsx  — Premium Settings v2.0
  web/src/routes/estates.$estateId.memoirs.tsx   — Firestore reads
  web/src/routes/estates.$estateId.obituary.tsx  — Firestore reads + saves
  web/src/routes/estates.$estateId.estates.tsx   — Firestore reads + name resolution
  web/src/routes/estates.$estateId.beneficiaries.tsx — Invitation system
  web/src/lib/firestore.ts                       — Exported useDocument/useCollection
  web/vite.config.ts                             — Code splitting config
```

### Known Issues / Blockers
1. **Cloud Functions deploy** requires Blaze plan — currently on Spark
2. **Cloud SQL** not provisioned yet — needed for Phase 2 PII Vault
3. **SendGrid** not integrated — invitations don't send email (TODO)
4. **Pre-existing TS error** in `estates.$estateId.index.tsx` line 4 (navigate params)
5. **React Query still imported** in some legacy dashboard.* routes (deferred cleanup)

---

## Phase 2 — Recommended Next Steps

### Sprint 1: Upgrade Firebase to Blaze Plan
- Required for Cloud Functions deployment
- Required for Cloud SQL provisioning
- Required for production-grade GCS usage

### Sprint 2: Deploy Cloud Functions
- `autoMatchInvitation` — fires on user signup
- Test invitation → signup → auto-link flow end-to-end

### Sprint 3: Cloud SQL Instance + Schema
- Create Cloud SQL instance (PostgreSQL)
- Run initial migration for PII tables (SSN, financial data)
- Wire Go API to Cloud SQL connection pool

### Sprint 4: Legacy Dashboard Route Cleanup
- Remove unused `dashboard.*` route files
- Clean up remaining React Query imports
- Tree-shake unused estateClient methods

### Sprint 5: Production Deployment
- Configure Firebase Hosting for SPA
- Deploy Go API to Cloud Run
- Set up domain + SSL

---

## Git State
```
Branch: develop
Latest: dc388ac (docs: CHANGELOG v0.6.0-0.6.1)
Remote: SirsiMaster/FinalWishes → origin/develop (synced)
Total commits this session: 10
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
