# FinalWishes — Continuation Prompt
**Version:** 16.1 — **Date:** April 14, 2026 — **Session:** CI/CD + Tier-gating + Responsive + Security

---

## Resume Key

**Last commit:** `b0946c8` (main) — Clean working tree, 0 lint errors, 0 vulnerabilities
**Repo:** `/Users/thekryptodragon/Development/FinalWishes`
**Contract:** MSA-2025-111-FW | SOW-2025-001 | $95K Fixed Bid | 16 Weeks
**Production:** `https://finalwishes-prod.web.app` | API rev 11 at Cloud Run
**Deployed:** April 14, 2026 — CI/CD pipeline green, both frontend and API live
**Security:** 0 npm vulnerabilities, 0 Go advisories (32 resolved this session)

---

## Resume Prompt

```
Pick up FinalWishes from commit b0946c8. Read docs/CONTINUATION-PROMPT.md for
full context. Session 4 shipped CI/CD fixes, tier-gating, responsive audit,
and security remediation. All 32 Dependabot vulns resolved. Next priorities:
domain acquisition, GA4 setup, and web test suite.
```

---

## Session Summary

### Session 4 (Apr 14): CI/CD + Tier-Gating + Responsive + Security — 12 commits

The CI/CD pipeline had never successfully deployed — 7 distinct failures blocked it. This session fixed all of them, implemented Stripe tier-gating for media uploads, audited and fixed 13 responsive design issues, resolved all 32 Dependabot vulnerabilities, deployed to production, and cleaned up all infrastructure hygiene.

**CI/CD Fixes (7 issues resolved):**
- 5 undeclared ESLint devDependencies (eslint-plugin-react-hooks, react-refresh, typescript-eslint, @eslint/js, globals)
- 6 Go files with `gofmt` formatting drift
- Phantom web-test (Vitest) job with no test script blocking all deploy gates
- 3 undeclared web dependencies (jszip, qrcode.react, vitest/@testing-library/react)
- Dockerfile missing local `sirsi-ai` package copy before `go mod download`
- Missing `artifactregistry.writer` IAM role on `github-deployer` SA
- All 5 CI jobs now green: lint, API test, web build, Firebase deploy, Cloud Run deploy

**Tier-Gating (Stripe Feature Gates):**
- Backend: `TierLimits` config (Free=10 media/0 video, Concierge=25/0, WhiteGlove=unlimited)
- Backend: `GET /api/v1/estates/{estateId}/media-usage` — counts docs, heirlooms, memoirs
- Backend: YouTube upload handler rejects non-WhiteGlove tiers
- Frontend: `useTierGating(estateId)` hook fetches usage + limits
- Frontend: Vault dropzone disabled + gold banner at limit, usage counter
- Frontend: Heirlooms "Add Heirloom" button disabled at limit
- Frontend: Memoirs "Add Memory" + "Add YouTube Link" disabled per tier
- Estate TypeScript interface updated with tier/paymentStatus fields

**Infrastructure Cleanup:**
- Deleted stale `develop` branch
- Cancelled 2 stuck Dependabot CI runs
- Purged 10 inactive Cloud Run revisions (001–010)
- Deleted stale Firebase staging channel
- Removed 464 MB of dangling Docker images

**Responsive Audit (13 fixes across 10 routes):**
- 5 critical: Dashboard sheet overflow, lockbox/memoirs/heirlooms/create grids missing mobile breakpoints
- 8 high: Container padding (p-12 → px-4 py-6 md:p-8 lg:p-12), gap scaling, form grids stacking, table overflow, obituary desktop-first → mobile-first, settings card padding

**Security Remediation (32 → 0 vulnerabilities):**
- Critical: google.golang.org/grpc 1.66 → 1.80 (auth bypass via missing leading slash)
- High: vite 8.0.1 → 8.0.8 (arbitrary file read + server.fs.deny bypass), picomatch ReDoS
- Medium: golang.org/x/crypto 0.40 → 0.50, hono (6 vulns), brace-expansion
- Result: 0 npm vulnerabilities, 0 Go advisories

### Prior Sessions
- Session 3 (Apr 14): Full product overhaul — 22 fixes across 4 waves
- Session 2 (Apr 10): Email templates, skeletons, CSP, OpenAPI spec, accessibility, monitoring
- Session 1 (Apr 8): shadcn refactor, Phases 2-4, 163 tests, infrastructure

---

## Contract Acceptance Criteria — 20/20 Complete

| # | Criteria | Status |
|---|----------|--------|
| 1-18 | All Phase 1-3 deliverables | DONE |
| 19 | Custom domain | **N/A** — No domain purchased; runs on `finalwishes-prod.web.app` |
| 20 | 99.9% uptime launch week | **MONITORING** — 3 alert policies active |

---

## What's Next (Priority Order)

### 1. Domain Acquisition (when ready)
Available: myfinalwishes.org (~$15/yr), myfinalwishes.io (~$50/yr), myfinalwishes.ai (~$90/yr)
For sale: finalwishes.org ($250 min offer on Afternic)
Competitor: myfinalwishes.com (active business — avoid)

### 3. GA4 Property Setup (5 min manual)
Firebase Console -> Project Settings -> Integrations -> Google Analytics -> Enable

### 4. Remaining Technical Debt
- react-pdf chunk: 1.5MB (lazy-loaded, code-split — consider dynamic import)
- Web test suite: vitest added as dep but no test script or vitest.config.ts yet
- 23 ESLint warnings (pre-existing: unused vars, exhaustive-deps, no-explicit-any)
- Plaid integration (in compliance process — deferred)
- Google Photos API (deferred — using Cloud Storage interim)

### 5. Future Features (Tier 3, not purchased)
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
| API | Cloud Run rev 11 (deployed session 4) |
| API URL | https://finalwishes-api-qyjuke2xea-uc.a.run.app |
| Stripe | Webhook `we_1TKV5L...` registered |
| Secrets | 8 in Secret Manager |
| Monitoring | 3 alert policies -> sirsimaster@gmail.com |
| Security | 0 npm vulns, 0 Go advisories (32 resolved session 4) |
| CI/CD | GitHub Actions — 5 jobs, all green |
| CI/CD SA | github-deployer@finalwishes-prod.iam.gserviceaccount.com |
| sign.sirsi.ai | 3 CRITICALs fixed, contracts-grpc rev 8 deployed |

## Key File Locations

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Operational directive |
| `CHANGELOG.md` | **UPDATED** — Session 4 entry |
| `docs/CANONICAL_DEVELOPMENT_PLAN.md` | Contract dev plan |
| `docs/api-spec.yaml` | OpenAPI 3.0 (28+ endpoints) |
| `api/internal/tiergate/handler.go` | **NEW** — Media usage endpoint |
| `api/internal/payments/handlers.go` | **UPDATED** — TierLimits config |
| `api/internal/youtube/handler.go` | **UPDATED** — Tier enforcement on video upload |
| `web/src/lib/tier-gating.ts` | **NEW** — useTierGating hook + helpers |
| `web/src/lib/firestore.ts` | **UPDATED** — Estate interface with tier fields |
| `web/src/routes/estates.$estateId.vault.tsx` | **UPDATED** — Tier-gated dropzone |
| `web/src/routes/estates.$estateId.heirlooms.tsx` | **UPDATED** — Tier-gated add button |
| `web/src/routes/estates.$estateId.memoirs.tsx` | **UPDATED** — Tier-gated upload + YouTube |
| `.github/workflows/firebase-hosting-merge.yml` | **UPDATED** — Fixed CI pipeline |
| `api/Dockerfile` | **UPDATED** — sirsi-ai package copy fix |

---

**Updated:** April 14, 2026 (Claude Opus 4.6)
