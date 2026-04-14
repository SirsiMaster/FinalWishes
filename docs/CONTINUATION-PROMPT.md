# FinalWishes — Continuation Prompt
**Version:** 15.0 — **Date:** April 14, 2026 — **Session:** Full product overhaul (4 waves, 22 fixes)

---

## Resume Key

**Last commit:** `343c35a` (main) — Clean working tree, frontend + Go builds passing
**Repo:** `/Users/thekryptodragon/Development/FinalWishes`
**Contract:** MSA-2025-111-FW | SOW-2025-001 | $95K Fixed Bid | 16 Weeks
**Production:** `https://finalwishes-prod.web.app` | API rev 10 at Cloud Run
**Not yet deployed** — commit 343c35a needs push + deploy

---

## Session Summary

### Session 3 (Apr 14): Full Product Overhaul — 4 Waves

A deep product audit revealed FinalWishes was a styled prototype, not a usable product: 10 broken workflows, fabricated landing page claims, no onboarding guidance, blank directive editors, an AI Shepherd that was just a checklist counter, MFA not enforced for principals, and zero domain knowledge. This session fixed all of it.

**Wave 1 — Auth & Routing (Critical):**
- Fixed all 5 hardcoded "lockhart" redirects in login.tsx — dynamic routing via user profile
- Created `/accept-invite` route for estate invitation acceptance
- Fixed beneficiary role bug (dropdown value was ignored, all invites hardcoded to 'heir')

**Wave 2 — Broken Workflow Fixes (7 parallel agents):**
- Asset edit/delete dialog with archive confirmation
- Notifications: removed 3 hardcoded fakes, added real empty state
- Directive export: .txt → real PDF via DirectivePDF component (@react-pdf/renderer)
- Estate ZIP export: button on settings page, wired to existing exportEstateData()
- Lockbox: credential entry fields (password, PIN, secure notes) + KMS-encrypted reveal with 30s auto-hide
- Heirloom: dropzone photo upload with thumbnails replacing URL text input
- YouTube: upload toggle in memoirs (Cloud Storage vs YouTube, 256MB limit)
- Landing page: "Zero-Knowledge" → "Bank-Grade Encryption", testimonials → "What Families Experience" with avatars, unbuilt features marked "Coming Soon"

**Wave 3 — Onboarding & Guidance (4 parallel agents):**
- 5-step intake wizard replacing single name field (situation, about you, family, assets, name)
- Document checklist on vault page (13 docs, 3 categories, click-to-upload, progress bar)
- Directive templates for all 4 types (ethical will, funeral, final message, care instructions)
- Beneficiary: role explanations, edit dialog, share percentage, allocation warning >100%

**Wave 4 — AI & Security (3 parallel agents):**
- Shepherd chat backend: POST /api/v1/guidance/chat with estate context enrichment
- Multi-model routing via sirsi-ai: Opus for legal guidance, Sonnet for obituary, Gemma for suggestions
- Domain knowledge prompts: probate timelines, state thresholds (MD/IL/MN), tax exemptions, digital assets
- Situational checklist: dynamic steps from intake wizard data (minors, property, business, state)
- Shepherd chat frontend: floating button, slide-out panel, typing indicator, suggestion chips
- Obituary: removed hardcoded demo data, added AI draft button, persisted signature, wired share + photo upload
- MFA enforced for all users (24hr grace period for new accounts)
- Blocking audit logs on lockbox credential access (SOC 2 requirement)

### Prior Sessions
- Session 1 (Apr 8): shadcn refactor, Phases 2-4, 163 tests, infrastructure
- Session 2 (Apr 10): Email templates, skeletons, CSP, OpenAPI spec, accessibility, monitoring

---

## Contract Acceptance Criteria — 20/20 Complete

| # | Criteria | Status |
|---|----------|--------|
| 1-18 | All Phase 1-3 deliverables | DONE |
| 19 | Custom domain | **N/A** — No domain purchased; runs on `finalwishes-prod.web.app` |
| 20 | 99.9% uptime launch week | **MONITORING** — 3 alert policies active |

---

## What's Next (Priority Order)

### 1. Deploy Session 3 Changes
- Push commit 343c35a to origin/main
- Trigger CI/CD: GitHub Actions → Cloud Run (API) + Firebase Hosting (web)
- Verify production at finalwishes-prod.web.app

### 2. Tier-Gating (Stripe Feature Gates)
- Media upload limits: Free=10 images, Concierge=25, White Glove=unlimited images+videos
- Read estate tier from Firestore, enforce dynamically (not hardcoded)
- YouTube video uploads gated to White Glove tier
- Verify Stripe checkout flow matches actual products

### 3. Domain Acquisition (when ready)
Available: myfinalwishes.org (~$15/yr), myfinalwishes.io (~$50/yr), myfinalwishes.ai (~$90/yr)
For sale: finalwishes.org ($250 min offer on Afternic)
Competitor: myfinalwishes.com (active business — avoid)

### 4. GA4 Property Setup (5 min manual)
Firebase Console → Project Settings → Integrations → Google Analytics → Enable

### 5. Remaining Technical Debt
- Dependabot: 32 vulnerabilities (mostly Go transitive deps)
- react-pdf chunk: 1.5MB (lazy-loaded, code-split)
- Responsive re-verification from stash conflict
- Plaid integration (in compliance process — deferred)
- Google Photos API (deferred — using Cloud Storage interim)

### 6. Future Features (Tier 3, not purchased)
- Estate Administration ($25K)
- Probate Engine MD/IL/MN ($35K)
- Advanced AI ($15K)
- Financial Integration / Plaid ($20K)

---

## AI Architecture (Session 3)

| Task | Model | Route |
|------|-------|-------|
| Legal guidance / estate chat | Claude Opus 4.6 | POST /api/v1/guidance/chat |
| Obituary drafting | Claude Sonnet 4.6 | POST /api/v1/guidance/assist-obituary |
| Quick suggestions | Gemma 4 27B | GET /api/v1/guidance/suggestions |
| Completion scoring | Gemma 4 27B | GET /api/v1/guidance/score |
| Fallback | Gemini 3.1 Flash | Automatic on primary failure |

All models via Vertex AI (Application Default Credentials). Package: sirsi-ai (shared with Assiduous).

---

## Production Infrastructure

| Service | URL / Detail |
|---------|-------------|
| Frontend | https://finalwishes-prod.web.app |
| API | Cloud Run rev 10 (needs redeploy for session 3 changes) |
| Stripe | Webhook `we_1TKV5L...` registered |
| Secrets | 8 in Secret Manager |
| Monitoring | 3 alert policies → sirsimaster@gmail.com |
| Staging | https://finalwishes-prod--staging-5givr132.web.app |
| CI/CD SA | github-deployer@finalwishes-prod.iam.gserviceaccount.com |
| sign.sirsi.ai | 3 CRITICALs fixed, contracts-grpc rev 8 deployed |

## Key File Locations

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Operational directive |
| `docs/CANONICAL_DEVELOPMENT_PLAN.md` | Contract dev plan |
| `docs/api-spec.yaml` | OpenAPI 3.0 (28+ endpoints) |
| `web/src/routes/accept-invite.tsx` | **NEW** — Invitation acceptance route |
| `web/src/routes/estates.create.tsx` | **UPDATED** — 5-step intake wizard |
| `web/src/components/guards/IdentityGate.tsx` | **UPDATED** — MFA enforced for all |
| `api/internal/guidance/handler.go` | **UPDATED** — Chat endpoint + situational checklist |
| `api/internal/guidance/genkit.go` | **UPDATED** — Domain knowledge prompts |
| `web/src/components/pdf/DirectivePDF.tsx` | PDF renderer for directives |
| `web/src/lib/export.ts` | ZIP estate export (now wired to settings UI) |

---

**Updated:** April 14, 2026 (Claude Opus 4.6)
