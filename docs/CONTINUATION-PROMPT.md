# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 20, 2026 (v8.0)
**Priority:** Phase A COMPLETE → Phase 2 (Cloud SQL PII Vault + Production Deploy)

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **26 skills** installed at `~/.gemini/antigravity/skills/`. **Check relevant skills before every task.**

---

## Phase 1 — COMPLETE ✅

Phase 1 (Data Layer + Go API Foundation) is **fully complete**. Here's everything delivered:

### Version History (v0.4.0 → v0.7.0)

| Version | Deliverable |
|---------|------------|
| 0.4.0 | ADR-036 (Firestore Direct Reads), security rules, Cloud Functions |
| 0.5.0 | Firestore hooks, 16 composite indexes, 4 estate dashboard pages |
| 0.5.1 | Create Estate onboarding (/estates/create) |
| 0.5.2 | Invitation system + beneficiaries integration |
| 0.6.0 | Settings page v2.0, ALL pages wired to Firestore |
| 0.6.1 | Code splitting — 4 chunks |
| 0.6.2 | Dead code cleanup — removed 1,815 lines + React Query |
| **0.7.0** | **Infrastructure Independence — standalone GCP/Firebase + CI/CD + repo cleanup** |

---

## Phase A: Infrastructure Independence — COMPLETE ✅

FinalWishes is now **operationally independent** from SirsiMaster. Completed March 20, 2026.

### What Was Done

| Step | Status | Details |
|------|:------:|--------|
| Create GCP project `finalwishes-prod` | ✅ | ACTIVE, linked to Sirsimaster billing |
| Firebase project initialization | ✅ | Firestore (nam5), Auth, Storage |
| Firestore rules + 16 indexes deployed | ✅ | Identical to old project |
| Firebase Auth configured | ✅ | Email/password + localhost authorized |
| Test data seeded (Lockhart estate) | ✅ | All 7 collections populated |
| 13 config files migrated | ✅ | 71 insertions, 40 deletions — config only |
| Naming unification sweep | ✅ | All `legacy-estate-os` references purged |
| CI/CD pipeline migrated | ✅ | Both GitHub Actions → `finalwishes-prod` |
| GCP service account created | ✅ | `github-actions@finalwishes-prod.iam.gserviceaccount.com` |
| GitHub secret rotated | ✅ | `FIREBASE_SERVICE_ACCOUNT_FINALWISHES_PROD` (old deleted) |
| Blaze plan upgrade | ✅ | Pay-as-you-go active |
| Cloud Functions deployed | ✅ | `api` + `autoMatchInvitation` both live |
| Public invoker policy set | ✅ | API accessible from web |
| Hosting deployed | ✅ | Live at `finalwishes-prod.web.app` |
| Repo cleanup | ✅ | 24 dead files removed (7,259 lines) |
| Npm vulnerabilities fixed | ✅ | Mobile: 13→0, Functions: high→0 |
| Merged to main | ✅ | CI/CD auto-deploy triggered |
| Functions package renamed | ✅ | `legacy-estate-functions` → `finalwishes-functions` |

### Coupling Audit Results (Zero Runtime Dependencies)

| Check | Result |
|-------|--------|
| npm imports from Sirsi packages | **0** |
| TypeScript imports from Sirsi | **0** |
| Go module imports from Sirsi | **0** |
| UCS component imports | **0** |

### Live Infrastructure

| Resource | Value |
|----------|-------|
| **GCP Project** | `finalwishes-prod` |
| **Live Site** | `https://finalwishes-prod.web.app` |
| **API Endpoint** | `https://api-qyjuke2xea-uc.a.run.app` |
| **Health Check** | `curl https://api-qyjuke2xea-uc.a.run.app/api/health` |
| **Firebase Console** | `https://console.firebase.google.com/project/finalwishes-prod` |
| **GitHub Secret** | `FIREBASE_SERVICE_ACCOUNT_FINALWISHES_PROD` |
| **Service Account** | `github-actions@finalwishes-prod.iam.gserviceaccount.com` |

### CI/CD Pipeline

| Trigger | What Happens |
|---------|-------------|
| Push to `main` | Lint → Build → Deploy to `finalwishes-prod.web.app` (live) |
| Open a PR | Build → Deploy preview channel → Comment with preview URL |
| Push to `develop` | Lint + build check only (no deploy) |

### What Remains on SirsiMaster (Legacy)

| Item | Status | Notes |
|------|:------:|-------|
| `legacy-estate-os` GCP project | 🟡 Intact | Untouched fallback — can be decommissioned when ready |
| GitHub repo URL | 🟡 `SirsiMaster/FinalWishes` | Phase B: transfer to `FinalWishesApp` org |
| Go module path | 🟡 `sirsi-technologies/finalwishes-api` | Phase C: cosmetic rename |
| Sirsi Sign redirect | 🟡 `contracts.html` → `sirsi-sign.web.app` | Phase C: business decision |

---

## Architecture (ADR-036 Fully Realized)
```
┌────────────────────────────────────────┐
│  React Dashboard (TanStack Router)     │
│  ├── useDocument / useCollection       │ ← Firestore real-time
│  ├── estateClient (signed URLs)        │ ← Go API for GCS only
│  └── Firebase Auth (MFA ready)         │
├────────────────────────────────────────┤
│  Firestore (NoSQL) — finalwishes-prod  │
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
│  Cloud Functions — finalwishes-prod    │
│  ├── api (Express, 512MB, HTTPS)       │
│  └── autoMatchInvitation (Firestore)   │
└────────────────────────────────────────┘
```

### Build Output
```
Modules: 296
dist/firebase-core.js    118 KB
dist/firebase-data.js    236 KB
dist/framework.js        274 KB
dist/index.js            337 KB  ← was 1,093KB (-69%)
dist/index.css           126 KB  ← was 151KB (-17%)
Tracked files: 247 (was 271, -9%)
```

---

## Key Files
```
Core Data Layer:
  web/src/lib/firebase.ts          — Firebase SDK init (finalwishes-prod)
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
  .firebaserc                      — Points to finalwishes-prod
  firebase.json                    — Hosting, Functions, Firestore config
  firestore.rules                  — Full security rules with role-based access
  firestore.indexes.json           — 16 composite indexes
  functions/                       — Cloud Functions (api + autoMatchInvitation)
  api/                             — Go API (health, ConnectRPC, GCS)

CI/CD:
  .github/workflows/firebase-hosting-merge.yml        — Deploy on push to main
  .github/workflows/firebase-hosting-pull-request.yml  — PR preview channels
```

---

## Phase 2 — Recommended Next Steps (Application Development)

### Sprint 1: Cloud SQL + PII Vault
- Provision PostgreSQL on Cloud SQL (finalwishes-prod project)
- Schema: `pii_vault`, `financial_accounts`, `encrypted_documents`
- Wire Go API connection pool
- Cloud KMS encryption keys (key ring creation is NOW — immutable, can't move later)

### Sprint 2: SendGrid Integration
- Wire invitation emails
- Template: estate invitation notification
- Template: account verification
- Template: password reset

### Sprint 3: Document Vault (Cloud Storage)
- File upload/download via Go API signed URLs
- Document metadata in Firestore
- Client-side encryption with Cloud KMS
- PDF viewer in Vault page

### Sprint 4: YouTube Memorials + Google Photos
- YouTube API integration for memorial videos
- Google Photos API for gallery integration
- Media player in Memoirs page

### Sprint 5: Production Hardening
- Custom domain setup (after Phase B)
- Cloud Run production deployment for Go API
- Load testing and performance audit
- SOC 2 readiness checklist

---

## Phase B — Identity & Organization (When Ready)

FinalWishes needs her own domain, email, and organizational presence.

| Task | What | Effort | Notes |
|------|------|:------:|-------|
| **Register domain** | `finalwishes.app` (or chosen alt) | 10 min | Via registrar (Squarespace, Namecheap, Google Domains) |
| **Google Workspace** | Business Starter on new domain | 30 min | `admin@finalwishes.app`, `support@...` |
| **GitHub org transfer** | `SirsiMaster/FinalWishes` → `FinalWishesApp` | 5 min | Auto-redirect from old URL, all clones work |
| **Update git remote** | `git remote set-url origin git@github.com:FinalWishesApp/FinalWishes.git` | 1 min | Old URL still redirects |
| **Firebase custom domain** | Map `app.finalwishes.app` → Firebase Hosting | 15 min | DNS A/CNAME verification |
| **Cloud Run domain** | Map `api.finalwishes.app` → Cloud Run | 15 min | DNS verification |
| **DNS config** | MX (email) + A/CNAME (hosting) + SPF/DKIM/DMARC | 20 min | For Workspace email deliverability |
| **Apple Developer** | Enroll under FinalWishes entity | $99/yr | Required for iOS App Store |
| **Google Play** | Developer account | $25 once | Required for Android |

**Estimated cost:** ~$17/month + $25 one-time

---

## Phase C — Full Decoupling (Deferred — As Needed)

These items are **not urgent** and can happen organically:

| Task | What | Priority | Notes |
|------|------|:--------:|-------|
| **Go module rename** | `sirsi-technologies/finalwishes-api` → `finalwishes/api` | P3 | Cosmetic, no functional impact |
| **Sirsi Sign independence** | Build own signing or keep consuming as service | P3 | Consuming is fine — legitimate vendor relationship |
| **Doc cleanup** | Update `SirsiNexusApp` references in docs/ADRs | P3 | Purely cosmetic |
| **GEMINI.md update** | Remove Shared Services Map references | P2 | Do when other changes happen |
| **contracts.html** | Redirect to own signing or keep Sirsi Sign | P3 | Business decision, not technical |
| **UCS fork** | Fork shared components if needed in future | P4 | Currently **nothing is imported** — no action needed |

---

## Git State
```
Branch: develop (synced with main)
Latest: 6e6d020 (security: Fix npm vulnerabilities across all workspaces)
Remote: SirsiMaster/FinalWishes → origin/develop + origin/main (synced)
main ← develop merged (CI/CD deploy triggered)
Commits this session: 5 (infra migration + naming + CI/CD + cleanup + security)
Total commits: ~20
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
firebase deploy --only firestore --project finalwishes-prod

# Deploy Cloud Functions
firebase deploy --only functions --project finalwishes-prod

# Deploy Hosting (manual — CI/CD handles this on push to main)
firebase deploy --only hosting --project finalwishes-prod

# Deploy everything
firebase deploy --project finalwishes-prod

# Check live API health
curl -s https://api-qyjuke2xea-uc.a.run.app/api/health

# Merge develop → main (triggers CI/CD deploy)
git checkout main && git merge develop --no-edit && git push origin main && git checkout develop
```

## Npm Vulnerability Status
```
Root:      0 vulnerabilities ✅
Web:       0 vulnerabilities ✅
Mobile:    0 vulnerabilities ✅
Functions: 9 low (deep in @google-cloud transitive deps — awaiting Google upstream fix)
```

## Security Notes
- Firebase Auth: email/password enabled, `localhost` in authorized domains
- Firestore rules: v3.0.0 — role-based, 8 collection groups, no wildcards
- Cloud Functions: public invoker on `api`, Firestore trigger on `autoMatchInvitation`
- Service account: `github-actions@finalwishes-prod.iam.gserviceaccount.com` (hosting admin + run viewer + API keys viewer)
- Old `FIREBASE_SERVICE_ACCOUNT_LEGACY_ESTATE_OS` GitHub secret: **DELETED**
