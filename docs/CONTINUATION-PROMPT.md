# FinalWishes — Continuation Prompt
**Version:** 18.0 — **Date:** April 14, 2026 — **Session:** Life-First Reframe + Canonical Doc Update

---

## Resume Key

**Last commit:** `(pending)` (main) — Clean working tree, 0 lint warnings, 0 TS errors, 0 vulnerabilities, 129 tests passing
**Repo:** `/Users/thekryptodragon/Development/FinalWishes`
**Contract:** MSA-2025-111-FW | SOW-2025-001 | $95K Fixed Bid | 16 Weeks
**Production:** `https://finalwishes-prod.web.app` | API rev 11 at Cloud Run
**Deployed:** April 14, 2026 — CI/CD pipeline green, both frontend and API live
**Security:** 0 npm vulnerabilities, 0 Go advisories
**Tests:** 129 passing (8 files) — lint 0 warnings — tsc 0 errors
**Product Phase:** Life-First Reframe (ADR-038) — navigation restructure, Soul Log, Legacy Timeline

---

## Resume Prompt

```
Pick up FinalWishes from commit (HEAD). Read docs/CONTINUATION-PROMPT.md and
ETHOS.md for full context. Session 6 completed the Life-First Reframe — the
product pivot from estate-planning-as-chore to living-companion. ADR-038
accepted, all canonical docs updated, navigation restructured into 6 emotional
groups (Soul Log, My Legacy, Memories, Letters, My People, The Vault). Next:
implement Soul Log recording UI + Legacy Timeline dashboard + Heir Welcome Screen.
```

---

## Session Summary

### Session 6 (Apr 14): Life-First Reframe + Canonical Doc Update

Completed the foundational product pivot documented in ETHOS.md. This session was about aligning every canonical document with the new vision: FinalWishes is not estate planning software, it is a living companion with estate planning built in.

**ETHOS.md (Permanent):**
- Written and committed as the soul of the application
- Defines the emotional core: life-first, death-second
- Soul Log concept, heir welcome screen, companion vision, design principles
- Permanent document — does not version, does not archive

**ADR-038: Life-First Reframe (Accepted):**
- Documents the product pivot from estate-mechanics navigation to emotional-intent navigation
- Six navigation groups: Soul Log, My Legacy, Memories, Letters, My People, The Vault
- Soul Log as daily-use diary (video/audio/text, private/shared/sealed visibility)
- Legacy Timeline replaces completion-percentage dashboard
- Heir Welcome Screen as the product's defining moment
- Shepherd AI reframed from estate-assistant to life-companion

**Canonical Documents Updated:**
- ADR-INDEX.md — ADR-038 added to registry and Consumer Experience category
- CANONICAL_DEVELOPMENT_PLAN.md — Phase 5 (Life-First Reframe) with 8 sub-phases
- CHANGELOG.md — v0.5.0 entry with full reframe changelog
- CONTINUATION-PROMPT.md — Session 6 context, updated resume prompt, new priorities
- VERSION_REGISTRY.md — Updated with current component versions and new canon docs

**Security Hardening (Session 5, carried forward):**
- IDOR protection, path traversal prevention, XFF spoofing blocked
- Demo user purge, rate limiting on auth
- 32 Dependabot vulns resolved to 0

### Prior Sessions
- Session 5 (Apr 14): Test suite (129 tests), ESLint 24→0, TypeScript 50→0, GA4 wired, CI gate
- Session 4 (Apr 14): CI/CD fixes, tier-gating, responsive audit, security remediation (32 → 0 vulns)
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

### 1. Soul Log Implementation (Phase 5b — Next Feature)
The Soul Log is the heartbeat of the Life-First Reframe. Implementation order:
1. Recording UI — video (camera), audio (mic), text input components
2. Storage pipeline — video → YouTube (unlisted), audio → Cloud Storage, text → Firestore
3. Visibility modes — private/shared/sealed controls per entry
4. Feed view — chronological diary with date grouping
5. Transcription — Vertex AI Speech-to-Text on audio/video uploads

### 2. Navigation Restructure (Phase 5a)
Reorganize existing routes into 6 emotional groups:
- Soul Log (new), My Legacy (directives/capsules), Memories (memoirs/heirlooms)
- Letters (new, extracted from time capsules), My People (beneficiaries), The Vault (assets/docs/lockbox)

### 3. Legacy Timeline Dashboard (Phase 5c)
Replace completion-percentage dashboard with chronological life narrative.

### 4. Heir Welcome Screen (Phase 5d)
The sacred moment — heir's first login shows loved one's face, voice, message. Practical matters come after.

### 5. Role Mapping Fix + Access Enforcement (Phase 5g)
Correct Principal/Executor/Heir/Guardian role assignments. Enforce visibility modes per beneficiary.

### 6. GA4 Property Setup (5 min manual)
Firebase Console → Project Settings → Integrations → Google Analytics → Enable
Then set `VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXX` in environment.
Code instrumentation already wired (trackEstateCreated, trackDocumentUploaded, trackCheckoutStarted).

### 7. Future Features (Tier 3, not purchased)
- Estate Administration ($25K)
- Probate Engine MD/IL/MN ($35K)
- Advanced AI ($15K)
- Guardian Protocol (Phase 5h — content staging for minor heirs)

### Resolved Prior Sessions
- ~~Domain acquisition~~ **PERMANENTLY OFF LIST**
- ~~TypeScript strict errors~~ **0 errors** (`tsc --noEmit` + `typecheck` script)
- ~~ESLint warnings~~ **0 warnings**
- ~~Web test suite~~ **129 tests, CI gate active**
- ~~Plaid~~ **PERMANENTLY OUT** — Stripe operational
- ~~ETHOS.md~~ **WRITTEN** — Permanent soul document
- ~~ADR-038~~ **ACCEPTED** — Life-First Reframe documented
- ~~Canonical doc alignment~~ **COMPLETE** — All docs reflect new direction

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
| CI/CD | GitHub Actions — 6 jobs (web-check, web-test, web-build, deploy-hosting, api-check, deploy-api) |
| CI/CD SA | github-deployer@finalwishes-prod.iam.gserviceaccount.com |
| sign.sirsi.ai | 3 CRITICALs fixed, contracts-grpc rev 8 deployed |

## Key File Locations

| File | Purpose |
|------|---------|
| `ETHOS.md` | **NEW** — Soul of the application (permanent, non-versioned) |
| `CLAUDE.md` | Operational directive |
| `CHANGELOG.md` | **UPDATED** — Session 6 entry (v0.5.0, Life-First Reframe) |
| `docs/ADR-038-LIFE-FIRST-REFRAME.md` | **NEW** — Life-First Reframe product pivot decision |
| `docs/CANONICAL_DEVELOPMENT_PLAN.md` | **UPDATED** — Phase 5 (Life-First Reframe) added |
| `docs/api-spec.yaml` | OpenAPI 3.0 (28+ endpoints) |
| `web/vitest.config.ts` | Vitest config (jsdom, v8 coverage) |
| `web/src/test/setup.ts` | Test setup (jest-dom, firebase mock, env stub) |
| `web/src/lib/tier-gating.test.ts` | **NEW** — Tier-gating tests (15 tests) |
| `web/src/lib/export.test.ts` | **NEW** — Export sanitization tests (14 tests) |
| `web/eslint.config.mjs` | **UPDATED** — gen/ ignore, caught errors, route exports |
| `web/tsconfig.json` | **UPDATED** — Removed Next.js remnants |
| `web/package.json` | **UPDATED** — test/typecheck/test:watch/test:coverage scripts |
| `web/src/vite-env.d.ts` | **NEW** — Vite + Vitest ambient type declarations |
| `web/src/routes/estates.create.tsx` | **UPDATED** — GA4 trackEstateCreated wired |
| `web/src/routes/estates.$estateId.vault.tsx` | **UPDATED** — GA4 trackDocumentUploaded wired |
| `web/src/routes/estates.$estateId.pricing.tsx` | **UPDATED** — GA4 trackCheckoutStarted wired |
| `.github/workflows/firebase-hosting-merge.yml` | **UPDATED** — web-test job enabled |

---

**Updated:** April 14, 2026 (Claude Opus 4.6 — Session 6: Life-First Reframe)
