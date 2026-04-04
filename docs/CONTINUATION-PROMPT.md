# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — April 3, 2026 (v10.0)
**Priority:** Sprint 3 COMPLETE → Sprint 4 (YouTube Memorials + Media) + Sprint 5 (Production Hardening)

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **26 skills** installed at `~/.gemini/antigravity/skills/`. **Check relevant skills before every task.**

---

## Phase 1 & 2 — COMPLETE ✅

### Version History (v0.4.0 → v0.8.1)

| Version | Deliverable |
|---------|------------|
| 0.4.0 | ADR-036 (Firestore Direct Reads), security rules, Cloud Functions |
| 0.5.0 | Firestore hooks, 16 composite indexes, 4 estate dashboard pages |
| 0.5.1 | Create Estate onboarding (`/estates/create`) |
| 0.5.2 | Invitation system + beneficiaries integration |
| 0.6.0 | Settings page v2.0, ALL pages wired to Firestore |
| 0.7.0 | Full build verified, CI/CD migrated to `finalwishes-prod` |
| 0.8.0 | PII Vault — Cloud KMS envelope encryption (AES-256-GCM) + Cloud SQL |
| 0.8.1 | Email System (Firebase Extension) + CI/CD lint fix |
| **0.9.0** | **Document Vault — Upload/Download/Preview/Delete with signed URLs** |

---

## What Was Done This Session (v0.8.0 + v0.8.1)

### v0.8.0 — PII Vault (Cloud SQL + Cloud KMS)
- **Cloud KMS Key Ring** provisioned: `finalwishes-keyring` (us-central1)
  - `pii-vault-key`: AES-256 symmetric, 365-day auto-rotation
  - `document-vault-key`: For future document encryption
- **Cloud SQL PostgreSQL 15** instance: `finalwishes-pii-vault`
  - Database: `pii_vault`, User: `vault_admin`
  - Password stored in Secret Manager: `vault-db-password`
- **Go API PII Vault** — 3 new packages:
  - `api/internal/crypto/kms.go` — Envelope encryption (KMS KEK → AES-256-GCM DEK → per-estate AAD)
  - `api/internal/vault/repository.go` — Cloud SQL CRUD with encryption
  - `api/internal/vault/handlers.go` — REST API with Firebase Auth + audit logging
- **Documentation canonized**: ADR-037, DATA_MODEL.md §9, SECURITY_COMPLIANCE.md §12, ARCHITECTURE_DESIGN.md §5.2
- **All merged to main and pushed to production**

### v0.8.1 — Email System + CI Fix
- **Firebase Trigger Email Extension** (`firebase/firestore-send-email@0.2.6`)
  - Extension is **ACTIVE** on `finalwishes-prod`
  - Configured for **SendGrid SMTP** (independent from Sirsi Gmail)
  - Secret Manager entry created: `ext-firestore-send-email-SMTP_PASSWORD`
  - **⚠️ ACTION NEEDED: Populate with SendGrid API key** (see §Activation below)
- **Email TypeScript helpers** (`web/src/lib/email.ts`)
  - `sendInvitationEmail()`, `sendWelcomeEmail()`, `sendNotificationEmail()`, `sendPasswordResetNotification()`
  - `useEmailService()` — React hook with user context
- **3 Handlebars templates seeded** to Firestore `email_templates` collection
  - `invitation` — Team invite with role badge
  - `welcome` — Onboarding guide
  - `notification` — Estate notifications with gold accent callout
- **Firestore rules v4.0** — §9: `mail` + `email_templates` collections
- **ESLint config FIXED** — Root cause of ALL CI lint failures:
  - Old config referenced `eslint-config-next` (wrong framework — we use Vite)
  - Replaced with proper `@eslint/js` + `typescript-eslint` + `react-hooks` + `react-refresh`
  - Result: **0 errors, 102 warnings** (lint now passes)
- **React compiler fixes** — 2 errors → 0:
  - `InviteTeamMember.tsx` — setState-in-effect pattern fixed
  - `firestore.ts` — Wrapped synchronous setState in `startTransition`

---

## ⚠️ ACTIVATION STEP — SendGrid API Key

The email extension is deployed and active, but emails won't send until the SendGrid API key is set:

```bash
# 1. Create a SendGrid account at sendgrid.com (free tier = 100 emails/day)
# 2. Generate an API key with "Mail Send" permission (starts with SG.)
# 3. Store it in Secret Manager:
printf 'SG.your-key-here' | gcloud secrets versions add \
  ext-firestore-send-email-SMTP_PASSWORD --data-file=- \
  --project=finalwishes-prod
```

Once set, the extension immediately starts processing documents in the `mail` collection.

---

## Live GCP Infrastructure (`finalwishes-prod`)

| Service | Resource | Details |
|---------|----------|---------|
| **Cloud KMS** | `finalwishes-keyring` | us-central1, 2 keys (pii-vault, document-vault) |
| **Cloud SQL** | `finalwishes-pii-vault` | PostgreSQL 15, db-f1-micro, SSD, auto-backup |
| **Secret Manager** | `vault-db-password` | Cloud SQL vault_admin password |
| **Secret Manager** | `ext-firestore-send-email-SMTP_PASSWORD` | SendGrid API key (needs population) |
| **Firebase Extension** | `firestore-send-email@0.2.6` | **ACTIVE**, SendGrid SMTP, us-central1 |
| **Firestore** | `(default)` | nam5, rules v4.0, 16 composite indexes |
| **Firebase Hosting** | `finalwishes-prod` | React SPA, TLS 1.3 |
| **Firebase Auth** | MFA (TOTP) | Firebase Identity Platform |

---

## Build vs. Buy Analysis (COMPLETED)

Full analysis artifact: `~/.gemini/antigravity/brain/3821c756-e1a4-45fd-adc5-97872a89274f/build_vs_buy_analysis.md`

**Key decisions made:**

| Sprint | Decision | Savings |
|--------|----------|---------|
| Sprint 2 (Email) | ✅ **BUY** — Firebase Extension | ~450 lines Go code, 2 days |
| Sprint 3 (Document Vault) | ✅ **HYBRID** — Cloud Storage + Go API signed URLs + react-dropzone | 1 day |
| Sprint 4 (Memorials) | **BUY** — react-player + Cloud Storage (drop Google Photos API) | 1.5 days |
| Sprint 5 (Production) | **CONFIG** — Cloud Run auto-SSL, Cloud Armor WAF | 2 days |

**Total: 11-17 days → 3-4 days (40% reduction)**

---

## Remaining Sprints

### Sprint 3: Document Vault (Cloud Storage) — ✅ COMPLETE (v0.9.0)
**What was built:**
- Drag-and-drop upload via `react-dropzone` with multi-file support + progress bars
- Cloud Storage signed URLs (Go API) for both upload (PUT, 15 min) and download (GET, 1 hour)
- Firestore metadata recording after upload (`estates/{estateId}/documents`)
- Document preview modal (images + PDFs inline)
- Document archive (soft delete with confirmation)
- Category filtering (Legal/Financial/Personal) with auto-inference from filename
- Go API REST endpoint: `GET /api/v1/documents/download-url?storageKey=...`
- File validation: 50 MB max, allowed MIME types enforced

### Sprint 4: YouTube Memorials + Media — ~4-6 hours
**What to build:**
- YouTube URL input → `react-player` iframe embed (~30 lines)
- Photo gallery with Cloud Storage upload (~100 lines)
- **DO NOT** use Google Photos API (deprecated embedding, unreliable links)
- Optional deferred: Google Photos import wizard

### Sprint 5: Production Hardening — ~1 day
**What to build:**
- Cloud Run deployment for Go API (`gcloud run deploy`)
- Cloud SQL Auth Proxy automatic via Cloud Run sidecar (zero code)
- SSL/TLS automatic via Cloud Run (Let's Encrypt)
- Cloud Armor WAF ($5/mo) for DDoS protection
- k6 load testing scripts
- SOC 2 compliance documentation (custom — this is our IP)
- SMS MFA via Firebase Identity Platform phone provider

---

## Key Files Changed This Session

### New Files
| File | Purpose |
|------|---------|
| `api/internal/crypto/kms.go` | Cloud KMS envelope encryption service |
| `api/internal/vault/repository.go` | Cloud SQL PII CRUD + audit logging |
| `api/internal/vault/handlers.go` | PII Vault REST API handlers |
| `api/internal/vault/README.md` | Developer README (Rule 30) |
| `web/src/lib/email.ts` | Email helpers (Firestore → Extension → SendGrid) |
| `web/src/lib/README-email.md` | Email system developer README |
| `extensions/firestore-send-email.env` | Firebase extension config |
| `scripts/seed-email-templates.js` | Email template seeder |
| `docs/user-guides/how-your-information-is-protected.md` | PII Vault user guide |
| `docs/user-guides/email-notifications-and-sms.md` | Email + SMS MFA user guide |
| `docs/ADR-037-cloud-sql-pii-vault.md` | PII Vault architecture decision |

### Modified Files
| File | Changes |
|------|---------|
| `firebase.json` | Added extensions manifest |
| `firestore.rules` | v3.0 → v4.0: §9 mail + email_templates |
| `web/eslint.config.mjs` | **Replaced** broken Next.js config with Vite |
| `web/src/lib/firestore.ts` | React compiler fix (startTransition) |
| `web/src/components/estate/InviteTeamMember.tsx` | React compiler fix |
| `CHANGELOG.md` | v0.8.0 + v0.8.1 entries |
| `docs/ADR-INDEX.md` | ADR-037 added |
| `docs/DATA_MODEL.md` | §9 updated to live Cloud SQL schema |
| `docs/SECURITY_COMPLIANCE.md` | §12 live infrastructure |
| `docs/ARCHITECTURE_DESIGN.md` | GCP services table updated |
| `api/cmd/api/main.go` | Wired Cloud SQL, KMS, vault routes |
| `api/go.mod` | Added cloud.google.com/go/kms, lib/pq |

---

## Git State

```
Branch: develop (up to date with origin/develop)
Latest: ec1d4fa fix(email): Add DATABASE_REGION param
Main:   ec1d4fa (synced with develop)
Status: Clean working tree
```

---

## Technical Stack Quick Reference

| Layer | Tech | Notes |
|-------|------|-------|
| Web | React 18 + Vite + TailwindCSS | `web/` directory |
| API | Go 1.24 + Chi router | `api/` directory |
| DB (PII) | Cloud SQL PostgreSQL 15 | Envelope encrypted |
| DB (Real-time) | Firestore | Direct client reads (ADR-036) |
| Auth | Firebase Auth + TOTP MFA | Identity Platform |
| Email | Firebase Extension → SendGrid | `mail` collection triggers |
| Encryption | Cloud KMS → AES-256-GCM | Per-estate AAD |
| Hosting | Firebase Hosting | `web/dist` |
| CI/CD | GitHub Actions | `.github/workflows/firebase-hosting-merge.yml` |

---

## Known Issues

1. **ESLint warnings (102)** — Mostly unused vars and react-refresh cosmetic. Not blocking CI.
2. **TypeScript strict mode** — 1 Tanstack Router type error (params type mismatch). Cosmetic, doesn't affect build.
3. **Dependabot** — 3 vulnerabilities flagged (2 high, 1 low). Check GitHub Security tab.
4. **SMS MFA** — Firebase Identity Platform phone provider not yet configured. Deferred to Sprint 5.

---

## Commands Reference

```bash
# Dev
cd web && npm run dev            # React dev server (port 3000)
cd api && go run ./cmd/api       # Go API server

# Build verification
cd web && npm run lint && npm run build
cd api && go vet ./... && go build ./cmd/api

# Deploy
git push origin develop          # CI runs lint + build
git checkout main && git merge develop --no-edit && git push origin main  # Production deploy

# Firebase
firebase deploy --only firestore:rules --project=finalwishes-prod
firebase deploy --only extensions --project=finalwishes-prod
firebase deploy --only hosting --project=finalwishes-prod

# Secret Manager
gcloud secrets list --project=finalwishes-prod
```

---

**Session Metrics:**
- Commits: 4 (`918a5c8`, `9dff8fc`, `36b7f06`, `ec1d4fa`)
- Versions shipped: v0.8.0 (PII Vault), v0.8.1 (Email + CI Fix)
- Lines of code added: ~2,000+ (Go + TypeScript + templates + docs)
- Engineering time saved via buy decisions: ~40%

**Signed, Antigravity**
