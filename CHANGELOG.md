# Changelog — FinalWishes
All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

---

## [Unreleased]
### Added
- `docs/ga-evidence/README.md` — evidence artifact convention for `/goal: finalwishes-tier1-ga` per Codex review revision #5. Defines `docs/ga-evidence/ga-c{N}-{slug}-{YYYY-MM-DD}.md` naming, required contents per artifact, and the 8-criterion ownership index. Seeded as part of acknowledging the Tier 1 GA goal v2 proposal.
- `docs/ga-evidence/cr-04-dependabot-2026-05-20.md` — blocked CR-04 Dependabot sweep evidence recording the GitHub API access failure and local verification commands.
- `docs/ga-evidence/cr-05-domain-2026-05-20.md`, `docs/ga-evidence/cr-07-stripe-portal-2026-05-20.md`, and `docs/ga-evidence/cr-08-opensign-2026-05-20.md` — owner-gated GA evidence/checklists for DNS/TLS, Stripe Customer Portal, and OpenSign template readiness.
- `docs/ADR-044-LEGAL-RAG-CORPUS.md`, `api/internal/guidance/rag.go`, `api/internal/guidance/schema.sql`, `api/cmd/rag-eval`, and `docs/legal-corpus/` — CR-10 legal RAG architecture foundation using PostgreSQL + pgvector, `gemini-embedding-001`, official-source provenance, citation return payloads, and citation-abstention behavior.
- `docs/ga-evidence/cr-10-rag-2026-05-20.md` — CR-10 evidence artifact marking the architecture foundation ready while authoritative corpus ingestion and probe-set scoring remain before `MET`.
- `api/internal/googlephotos/` — CR-12 Google Photos import package (Picker-flow handler + client + content hashing) wired into `api/cmd/api/main.go`. Imports selected photos into the encrypted vault bucket; completes wiring that `main.go` already referenced.
- `api/internal/forms/` — statutory-form coordinate-overlay engine (Phase 1a). Generic Go-native `Fill()` over a per-form `CoordinateMap`, stamping official FLAT government PDFs via pdfcpu (library import). Proven on the IL Statutory Short Form Power of Attorney for Property (755 ILCS 45): SHA256 source fail-closed, execution fields never stamped (wet-sign default), true-flatten output assertion. Human-review proof under `docs/forms-phase0/proof/`.

### Changed
- `docs/ga-evidence/README.md` — upgraded to v3/12-criteria convention per codex v3 review (R2). New naming: `docs/ga-evidence/cr-{NN}-{slug}-{YYYY-MM-DD}.md`. Index expanded from 8 to 12 criteria (engineering / operational / scope-expansion). Added `ADR required` column (R3) flagging CR-09 mobile, CR-11 Lob, CR-12 Google Photos (YES) and CR-10 RAG (conditional). Added pass/fail security clauses (R4) for CR-08 OpenSign wiring path, CR-11 PII-in-logs prohibition, CR-12 OAuth-scope disclosure. Governing canon now references v3 proposal + v3.1 patch. Router state (decision artifact and codex review migration) recorded locally under gitignored `.agents/idea-router/`.
- `api/internal/payments/handlers.go` — added `APP_BASE_URL` support so Stripe checkout and Billing Portal return URLs can switch to `https://finalwishes.app` after CR-05 passes without another code change.
- `api/internal/guidance/handler.go` and `api/internal/guidance/genkit.go` — legal-topic chat now injects retrieved corpus context when RAG is configured and instructs Shepherd to cite or abstain for legal claims.

---

## [0.10.2] — 2026-05-20
### Fixed
- Corrected Illinois small-estate guidance copy to match ADR-043 and the implemented $150K threshold with vehicles excluded.
- Updated the estate settlement guide to describe implemented multi-executor quorum approval instead of marking it as future work.

---

## [0.10.1] — 2026-05-19
### C3 — Documentation, Testing, Timeline, Quorum, GCP Evaluation

### Added
- **10 developer READMEs** — guards, landing, layout, search, skeletons, styles, gen, functions, shared, api (Rule 30 compliance — 25 total READMEs)
- **3 user guides** — soul-log, estate-settlement, events-broadcasting (25 total guides in `docs/user-guides/`)
- **24 Cloud Function unit tests** — Jest tests for `autoMatchInvitation`, `sendMail`, `sendSMS`, `guardianInactivityCheck` with mocked Firestore/Gmail
- **SettlementGantt component** — Recharts horizontal bar chart showing probate deadlines as a visual timeline with "Today" marker and urgency color coding
- **Multi-executor quorum (2-of-3)** — `quorum.go` with propose/vote/list/config endpoints, `QuorumPanel.tsx` approval UI, email notifications to co-executors
- **4 new probate API routes** — `/api/v1/probate/quorum/{config,actions,propose,vote}`
- **Vault retention & legal holds** — `retention.go` + `retention_handler.go`: apply/release event-based holds on vault documents during probate, 2 new routes at `/api/v1/vault/holds/{apply,release}`
- **GCP Native Services Evaluation** — `docs/GCP-NATIVE-SERVICES-EVALUATION.md`: keep OpenSign (no GCP e-sign API), augment Cloud Storage with retention policies + legal holds, defer appointment booking

### Changed
- Probate page now includes Settlement Timeline (Gantt) and Quorum Panel sections
- `lib/probate.ts` extended with quorum API client (4 new functions + 4 types)
- Probate API endpoint count: 18 → 22

---

## [0.10.0] — 2026-05-18
### Illinois Probate Engine — Full Estate Settlement Support

### Added
- **Illinois probate engine** (`api/internal/probate/`) — pluggable `StateEngine` interface with Illinois as first implementation (ADR-043)
- **Estate lifecycle state machine** — `active → death_reported → executor_confirmed → in_probate → probate_complete → closed` with transition guards and audit trail
- **Illinois rules** — 60-day inventory deadline, 6-month creditor claims, $150K small estate threshold (SB83 2025, vehicles excluded)
- **17-item Cook County probate checklist** with form references (CCP0315, CCP0312/0313, VSD 773/774, TODI)
- **12 API endpoints** at `/api/v1/probate/*` — transitions, status, checklist, death cert analysis, executor activation, form templates
- **Death certificate AI analysis** — integrates with existing docintell; extracted facts require executor confirmation before state changes
- **Single-executor activation flow** — role confirmation, phase transition, email notification to heirs
- **Cook County form preparation** — 4 templates (Petition, Inventory, Small Estate Affidavit, Oath/Bond) pre-filled from estate data
- **Non-dead-end probate dashboard** — phase-aware `NextActionCard` with actionable guidance for every estate state
- **Probate page** (`/estates/$estateId/probate`) — deadline tracking, completion toggles, form links
- **19 Go unit tests** — state transitions, threshold evaluation, deadline computation, checklist
- **Firestore rules** — `probate` + `probate_audit` subcollections
- **Illinois estate planning user guide** (35+ forms, 4 advance directives, Cook County procedures)

## [0.9.1] — 2026-05-18
### Security Hardening
- Demo mode auth bypass gated behind `DEMO_MODE=true` (default: disabled, 3 tests)
- Stripe webhook silent failures fixed (error logging added)
- Stripe portal validates active subscription
- otel 1.39→1.43, protobufjs+uuid fixed, 0 high/critical npm vulns
- `.env.example` created (17 env vars)

---

## [0.9.0] — 2026-04-17
### Sessions 9–11: Infrastructure Hardening, Gap Remediation, Life Companion Features

### Added (Session 9 — April 16)
- **Toast notifications** — Sonner provider wired globally, 6 key user actions now have success/error feedback
- **Email verification gate** — IdentityGate blocks estate access until email is verified
- **API client retry interceptor** — Exponential backoff with 2 retries on transient failures
- **Gmail API Cloud Function** — `sendMail` trigger replaces SendGrid; domain-wide delegation via admin@sirsi.ai, zero vendor cost
- **Storage rules v2.0.0** — Deployed (was deny-all); supports signed URL uploads

### Added (Session 10 — April 17)
- **Gap analysis and remediation plan** — Systematic audit of all known gaps from Session 9 deep audit
- **Owner experience priority** — Life companion vision documented and prioritized over settlement mechanics
- **Life companion vision** — Documented as deferred long-term direction

### Added (Session 11 — April 17)
- **Auto-save for directives** — Debounced 1.5-second TipTap persistence replaces manual "Save Draft" button
- **OpenSign signing ceremony** — Frontend wired to Go API `/api/v1/opensign/*` proxy; e-signature workflow functional
- **Estate Owner Welcome screen** — Life-first emotional onboarding for new owners
- **Heir Welcome verified** — Confirmed functional: owner portrait, voice messages, heirloom presentation
- **Public memorial pages** — Shareable without account, QR code generation for invitations and sharing
- **Events & broadcasting pages** — Funeral, memorial, and repast ceremony pages with RSVP
- **SMS invitation queue** — Phone number collection + SMS notification queuing for heir invitations
- **Per-person content visibility** — Granular access control per heir on directive documents
- **Document version history** — Version badge displayed in vault for tracked documents

### Changed (Session 9)
- **Landing page credibility** — False social proof removed (fabricated user counts, review scores); pricing aligned to actual Stripe tiers ($29/$99)
- **Design normalization** — 7 files corrected from rogue colors to Royal Blue (#133378) palette
- **Node.js 22 runtime** — Cloud Functions upgraded from Node.js 20 (deprecated April 30, 2026)
- **Stripe redirect URLs** — Fixed to point to correct production domain

### Changed (Session 11)
- **10 canonical documents updated** — REQUIREMENTS_SPECIFICATION.md, CHANGELOG.md, and 8 others corrected for accuracy

### Removed (Session 9)
- **SendGrid dependency** — Replaced entirely by Gmail API Cloud Function

### Infrastructure
- Firebase Hosting: https://finalwishes-prod.web.app (deployed April 16–17)
- Cloud Functions: Node.js 22, us-central1 (autoMatchInvitation + sendMail)
- Storage rules: v2.0.0 live
- Firestore rules: v5.0.0 live

---

## [0.7.1] — 2026-04-15
### Session 7e: Production Deploy, Perf Audit, RBAC Enforcement

### Added
- **Lighthouse audit** — Performance 61, Accessibility 86, Best Practices 100, SEO 83
- **Role-based access enforcement** — Life Chapters: heirs/executors get read-only view; create/edit/delete/entry-picker hidden for non-principal roles
- **Hero image preload** — `<link rel="preload">` for hero-family.jpg + `preconnect` for Unsplash CDN

### Changed
- **Landing page images optimized** — Unsplash URLs downsized from `w=3840` to `w=1200`, `loading="lazy"` on all below-fold images, `fetchPriority="high"` on hero
- **Hero image compressed** — 675 KB → 282 KB via EXIF strip + 75% quality
- **Total landing transfer** — 4,971 KB → 1,542 KB (69% reduction)

### Deployed
- Firebase Hosting: https://finalwishes-prod.web.app
- Firestore rules: life-chapters (3o) + shepherd-messages (3p) live

---

## [0.7.0] — 2026-04-15
### Session 7d: Code Splitting + E2E Tests

### Added
- **Route-level code splitting** — 6 heaviest estate routes (soul-log, vault, timecapsule, dashboard, memoirs, lockbox) now use TanStack Router `.lazy.tsx` convention
  - Main bundle: **2,210 KB → 745 KB** (66% reduction)
  - Each route loads as a separate ~7-10 KB gzipped chunk on navigation
- **E2E tests** — `e2e/life-first-features.spec.ts` with 8 Playwright tests:
  - Soul Log: page load, composer dialog, written entry tab
  - Life Chapters: page load, create dialog, title validation
  - Section headers: all 7 sections verify distinctive SectionHeader
  - Page transitions: navigation between sections
  - Shepherd: FAB + chat panel

### Changed
- Updated `authenticated.spec.ts` to match new sidebar nav labels ("Photos & Videos" instead of "Memories")

---

## [0.6.2] — 2026-04-15
### Session 7c: Media Pipeline Polish, Cover Images, Shepherd Memory

### Added
- **Soul Log upload progress** — XHR upload with real-time percentage, step-by-step save status (Uploading → Saving → Transcribing)
- **Transcription retry** — Failed transcriptions now show a Retry button that re-fires the transcription request and updates status to `processing`
- **Chapter cover images** — Life Chapters form now supports cover image upload via Cloud Storage signed URLs, displayed as banner on chapter cards
- **Shepherd conversation memory** — Chat messages persisted to Firestore `estates/{id}/shepherd-messages` subcollection
  - Loads last 10 messages on panel open (replaces ephemeral state)
  - Both user messages and Shepherd replies saved with `serverTimestamp()`
  - Fire-and-forget persistence (non-blocking)
- **Firestore security rules** — `shepherd-messages` subcollection (rule 3p): read for estate access, create for estate writers

---

## [0.6.1] — 2026-04-15
### Session 7b: Page Transitions, Empty States, Shepherd Nudges, Security Rules

### Added
- **Page transitions** — Framer Motion `AnimatePresence` wraps estate Outlet with fade+slide (0.25s ease)
- **SectionEmptyState component** — Section-themed empty states with unique SVG illustrations per group
  - Soul Log: journal + heartbeat, Memories: photo stack + film, Letters: envelope + wax seal
  - My People: connected figures + shield, Vault: vault door + dial, Legacy: timeline + cards
- **Shepherd section nudges** — `getSectionNudge()` returns contextual per-section hints
  - 4-6 nudges per section, condition-gated (e.g. "Write to each heir" only if heirs exist)
  - Integrated into SectionHeader via `shepherdHint` prop
  - Compass icon + italic text in section accent color
- **Firestore security rules** — `life-chapters` subcollection (rule 3o): read for estate access, write for estate writers, delete for principal only

### Changed
- Estate layout `<Outlet>` wrapped with `AnimatePresence` + `motion.div` for section transitions
- Empty states in heirlooms, lockbox, directives, beneficiaries now use themed `SectionEmptyState`

---

## [0.6.0] — 2026-04-15
### Session 7a: Emotional Section Design + Life Chapters

### Added
- **SectionHeader component** — Shared emotional section header (`web/src/components/estate/SectionHeader.tsx`)
  - 7 distinct visual themes: Soul Log (amber), My Legacy (royal blue), Memories (rose), Letters (sage), My People (teal), The Vault (steel), Life Chapters (purple)
  - Gradient backgrounds, section icons, taglines, action slots, children slots
  - Replaces 10 bespoke page headers with consistent structure + distinct personality
- **Life Chapters feature** — Narrative life organization (`/estates/$estateId/life-chapters`)
  - Create themed chapters (childhood, military service, parenthood, career)
  - Date ranges, descriptions, cover images
  - Add entries from Soul Log and Memories into chapters
  - Remove entries, edit/archive chapters
  - Entry picker shows available unassigned entries
  - Firestore subcollection: `estates/{id}/life-chapters`
  - CRUD actions in `estate-actions.ts` (addLifeChapter, updateLifeChapter, archiveLifeChapter)
  - Types + hook in `firestore.ts` (LifeChapter, ChapterEntryRef, useLifeChapters)
- **Sidebar updated** — My Legacy group now has children: Legacy Timeline + Life Chapters (New badge)
- **Role permissions** — Life Chapters accessible to principal, admin, executor, heir
- **User guide** — `docs/user-guides/life-chapters.md`
- **Developer README** — SectionHeader docs added to `web/src/components/estate/README.md`

### Changed
- All 10 estate section pages now use SectionHeader for visual consistency
- CTA buttons colored per-section (rose for Memories, sage for Letters, teal for My People, steel for Vault)
- Removed unused Separator imports from assets and dashboard routes

---

## [0.5.0] — 2026-04-14
### Session 6: Life-First Reframe + Security Hardening

### Added
- **ETHOS.md** — Permanent document defining the soul of the application: life-first, not death-first
- **ADR-038: Life-First Reframe** — Product pivot from estate-planning-as-chore to living companion
  - Navigation restructure: 6 emotional groups (Soul Log, My Legacy, Memories, Letters, My People, The Vault)
  - Soul Log feature spec (video/audio/text diary with private/shared/sealed visibility modes)
  - Legacy Timeline (replaces completion-percentage dashboard)
  - Heir Welcome Screen (the sacred moment — loved one's face, voice, message on first login)
  - Voice memoir recording + Vertex AI transcription pipeline
  - Shepherd AI reframe from estate-assistant to life-companion
  - Guardian Protocol (future — content staging for minor heirs)
- **Phase 5 added to CANONICAL_DEVELOPMENT_PLAN.md** — Full roadmap for Life-First Reframe implementation
- All canonical documents updated to reflect new product direction

### Changed
- Navigation model: estate-mechanics grouping (assets/vault/lockbox) replaced with emotional-intent grouping
- Dashboard concept: completion percentage replaced with Legacy Timeline
- Shepherd AI positioning: estate completion assistant becomes life companion
- Product positioning: "estate operating system" becomes "living legacy platform"

### Security (Session 5 — carried forward)
- IDOR protection on all estate endpoints
- Path traversal prevention on document uploads
- X-Forwarded-For header spoofing blocked
- Demo user data purge on session end
- Rate limiting on auth endpoints

---

## [0.3.0] — 2026-04-14
### Session 5: Test Suite + Code Quality

### Added
- **Web test suite operational**: 129 tests across 8 files, all passing
  - New: tier-gating tests (15 tests — constants, helpers, hook with fetch mocking)
  - New: export sanitization tests (14 tests — ZIP structure, timestamp conversion, PII stripping)
  - Existing 6 test files (105 tests) now runnable with `npm test`
- `test`, `test:watch`, `test:coverage`, `typecheck` scripts in package.json
- **GA4 analytics wired** to key conversion points:
  - `trackEstateCreated` in estates.create.tsx (onboarding conversion)
  - `trackDocumentUploaded` in vault.tsx (engagement)
  - `trackCheckoutStarted` in pricing.tsx (revenue conversion)
  - Just needs `VITE_FIREBASE_MEASUREMENT_ID` env var once GA4 enabled in Console
- CI: `web-test` job enabled in pipeline (was commented out), gates `web-build`
- jsdom + @testing-library/jest-dom added as devDependencies

### Fixed
- **ESLint warnings**: 24 → 0 warnings
  - Removed 8 unused type imports in search.ts
  - Removed unused imports in SearchResults.tsx (useCallback, useNavigate)
  - Fixed missing `updateSearchQuery` in useCallback deps (AdminHeader.tsx — potential stale closure)
  - Replaced 3 `as any` casts in obituary.tsx with typed alternatives
  - Typed `editingAsset` state as `Asset | null` instead of `any` (assets route)
  - Added `caughtErrorsIgnorePattern` to ESLint config for `_err` convention
  - Excluded `src/gen/**` from ESLint (auto-generated protobuf code)
  - Suppressed `react-refresh/only-export-components` on shadcn button + TanStack route files
  - Added `allowExportNames` for TanStack Router conventions (Route, loader, action)
  - Inline-suppressed `no-explicit-any` on ConnectRPC proxy (genuinely dynamic types)

### Fixed (cont.)
- **TypeScript strict errors**: 50 → 0 (`tsc --noEmit` clean)
  - Added `vite/client` + `vitest/globals` ambient types via `vite-env.d.ts`
  - Fixed all `/login` navigate calls with `search: {}` (TanStack Router strict typing)
  - Typed `validateSearch` return as `{ invite?: string; demo?: boolean }`
  - Imported `UserProfile` from auth.tsx (was redefined locally in login.tsx)
  - Fixed test mock signatures for vi.fn spread compatibility
  - Fixed `AddHeirloomModal` missing `useTierGating` hook (tierUsage was undefined)
  - Added inline `timeAgo` utility to NotificationBell (was missing from utils export)
  - Fixed export.ts sanitize functions to accept readonly arrays

### Changed
- tsconfig.json: Removed Next.js remnants, added `vite/client` types
- ESLint config: Added `src/gen/**` to ignores, `caughtErrorsIgnorePattern`, TanStack route names, `no-explicit-any` off for test files
- **Plaid permanently out of scope** — zero code/dep references, Stripe integration operational

---

## [0.2.1] — 2026-04-14
### Session 4b: Responsive Audit + Security Remediation

### Fixed
- **Responsive**: 13 mobile-first breakpoint fixes across 10 estate routes (4cb1e3f)
  - Critical: Dashboard sheet overflow, lockbox/memoirs/heirlooms/create grid collapse
  - High: Container padding, gap scaling, form stacking, table overflow, settings cards
- **Security**: All 32 Dependabot vulnerabilities resolved (b0946c8)
  - Critical: grpc 1.66 → 1.80 (auth bypass via missing leading slash in :path)
  - High: vite 8.0.1 → 8.0.8, picomatch ReDoS
  - Medium: golang.org/x/crypto, hono (6 vulns), brace-expansion

---

## [0.2.0] — 2026-04-14
### Session 4a: CI/CD Pipeline Fix + Tier-Gating + Production Deploy

### Added
- **Tier-gating**: Stripe tier enforcement for media uploads (132cae0)
  - Backend: `GET /api/v1/estates/{estateId}/media-usage` endpoint
  - Backend: YouTube upload rejection for non-White Glove tiers
  - Frontend: `useTierGating` hook, gold upgrade banners on vault/heirlooms/memoirs
  - Limits: Free=10 media, Concierge=25, White Glove=unlimited + video
- `TierLimits` config in payments package (reusable across handlers)
- Estate interface updated with `tier`, `tierUpdatedAt`, `paymentStatus` fields

### Fixed
- **CI/CD pipeline fully unblocked** — 7 fixes across 4 commits:
  - Added 5 missing ESLint devDependencies (1192c8a)
  - Formatted 6 Go files with gofmt (1192c8a)
  - Removed phantom web-test job that blocked all deploys (e06d244)
  - Added 3 missing web dependencies: jszip, qrcode.react, vitest/@testing-library/react (758a091, 394b771)
  - Fixed Dockerfile to copy local `sirsi-ai` package before `go mod download` (cd19398)
  - Granted `artifactregistry.writer` IAM role to github-deployer SA

### Changed
- Deploy gates no longer require web-test job (re-enable when tests exist)
- Cloud Run deployed as rev 11 (session 3 + tier-gating changes)

### Removed
- Stale `develop` branch (never used)
- Stale Firebase staging channel (expired Apr 8 deployment)
- 10 inactive Cloud Run revisions (001–010)
- 464 MB of dangling Docker images

---

## [0.9.0] — 2026-04-17 (cont.)
### Pre-Session 9: Core Feature Completion (Sprints 3–6)

### Added
- Complete shadcn refactor: 17 pages + 2 layouts using 20 shadcn components (833f065, a5b4f20)
- YouTube Data API v3 integration for video memorials (692b96d)
- Genkit AI Shepherd v2 with Gemini Flash guidance flows (692b96d)
- Cloud Tasks time capsule deferred delivery engine (692b96d)
- PDF export for directives via @react-pdf/renderer (692b96d)
- Cloud KMS lockbox field-level encryption (692b96d)
- Heirloom Registry for physical asset inventory (692b96d)
- Playwright E2E smoke suite — 9 tests (b1d24c9)
- 105 unit tests with >80% critical path coverage (a2c9614)
- Cloud DNS zone configured for finalwishes.app
- SOC 2 evidence collection (9 files)
- Cloud Monitoring uptime check
- Firebase Resize Images extension deployed (a2c9614)

### Fixed
- HIGH-2: Subscription cancel metadata verification (adff2ff)
- HIGH-3: TipTap HTML sanitization with DOMPurify (adff2ff)
- Genkit panic recovery for missing GEMINI_API_KEY (c401b65)
- Frontend wired to Cloud Run API URL (98a74b2)
- npm audit: 0 vulnerabilities (98a74b2)

### Changed
- Go toolchain 1.24 → 1.26 (Dockerfile + go.mod + go.work) (adff2ff)
- Application-level rate limiting added (100 req/60s/IP) (692b96d)

---

## [0.10.0-alpha] — 2026-04-03
### YouTube Memorials + Photo Gallery (Sprint 4)
- **YouTube URL embedding** — paste any YouTube link to create a video memorial
  - Thumbnail preview on paste (YouTube API `hqdefault.jpg`)
  - Full-screen cinema playback via privacy-enhanced `youtube-nocookie.com` iframe
  - Zero bundle cost — native iframe embed instead of react-player (~500 KB saved)
- **Photo/video file upload** — Cloud Storage signed URLs (reuses vault pattern)
  - Upload modal with file picker
  - Media type selection (video/photo)
  - Visibility control (Private / Share with Heirs)
- **Memoir delete** — confirmation modal with permanent deletion from Firestore
- **Direct Firestore writes** — memoirs written directly to `estates/{estateId}/memoirs`
  - No longer routes through Go API for memoir metadata
  - Real-time list updates via Firestore `onSnapshot`
- **Cinema-grade viewer** — full-screen modal for all media types
  - YouTube: iframe embed with autoplay
  - Video files: native `<video>` player
  - Photos: full-resolution display
- **YouTube Add shortcut** — dedicated "Add YouTube Link" button in gallery header

### Refs
- Canon: PRODUCT_SPECIFICATION.md §3.5-3.6, CANONICAL_DEVELOPMENT_PLAN.md §3.4
- ADR: ADR-036 (Firestore Direct Reads)
- Changelog: v0.10.0 — YouTube Memorials + Photo Gallery

---

## [0.9.0-alpha] — 2026-04-03
### Document Vault — Full Upload/Download/Preview/Delete (Sprint 3)
- **Drag-and-drop upload** via `react-dropzone` with multi-file support
  - File validation: 50 MB max, allowed types (PDF, JPEG, PNG, HEIC, DOC, DOCX, TXT)
  - Real-time progress bar with XHR upload progress tracking
  - Automatic category inference from filename (Legal, Financial, Personal)
- **Upload→Firestore wiring** — uploaded files now recorded in `estates/{estateId}/documents`
  - Calls `createDocumentRecord()` after Cloud Storage PUT
  - Stores `storageKey`, `storageBucket`, `mimeType`, `fileSize`, `uploadedBy`
  - Firestore `onSnapshot` auto-refreshes document list
- **Download via signed URLs** — new Go API REST endpoint
  - `GET /api/v1/documents/download-url?storageKey=...` → 1-hour signed GET URL
  - Firebase Auth protected
- **Document preview modal** — inline viewing for images and PDFs
  - Image preview with `<img>` tag
  - PDF preview with `<iframe>` embed
  - Download button in preview header
- **Document archive (soft delete)** — confirmation modal with archive action
  - Sets `status: 'archived'` in Firestore (reversible)
- **Category filtering** — click folder cards to filter by Legal/Financial/Personal
  - Active category shown with Royal Blue highlight
  - "Show All" button to clear filter
- **Go API** — new `estate/download.go` handler for signed download URLs
- **Zero slate/grey text** — all text uses `#0F172A`, `#133378`, or `#C8A951` per Rule 27

### Refs
- Canon: ARCHITECTURE_DESIGN.md §5-6, PRODUCT_SPECIFICATION.md §3.4, API_SPECIFICATION.md §6
- ADR: ADR-036 (Firestore Direct Reads), ADR-037 (Cloud SQL PII Vault)
- Changelog: v0.9.0 — Document Vault

---

## [0.8.1-alpha] — 2026-03-20
### Email System (Firebase Extension — Buy Decision) + CI/CD Fix
- **Firebase Trigger Email Extension** (`firebase/firestore-send-email@0.2.6`) registered in manifest
  - Sends email by writing to Firestore `mail` collection → Extension → SendGrid SMTP
  - Zero Go backend code required
  - Handlebars templates stored in `email_templates` Firestore collection
- **Email TypeScript helpers** (`web/src/lib/email.ts`)
  - `sendInvitationEmail()` — estate team invitation
  - `sendWelcomeEmail()` — registration welcome
  - `sendNotificationEmail()` — estate deadline/update
  - `sendPasswordResetNotification()` — security audit notification
  - `useEmailService()` — React hook with user context
- **Email templates seeded** to Firestore (`email_templates` collection)
  - `invitation` — Royal Neo-Deco styled, team invite with role badge
  - `welcome` — onboarding guide with action items
  - `notification` — estate notifications with gold accent callout
- **Firestore rules v4.0.0** — §9 added: `mail` (user-create, extension-managed), `email_templates` (admin-only)
- **ESLint config fixed** — Replaced broken `eslint-config-next` with proper Vite + React + TypeScript config
  - This was the root cause of ALL CI lint failures since project creation
  - Added `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
  - 0 errors, 102 warnings (all warnings are cosmetic)
- **React compiler fixes** — Fixed setState-in-effect violations:
  - `InviteTeamMember.tsx` — Moved loadInvitations before useEffect, used .then() pattern
  - `firestore.ts` — Wrapped synchronous setLoading in startTransition

### Documentation (Rule 30)
- Developer README: `web/src/lib/README-email.md`
- User Guide: `docs/user-guides/email-notifications-and-sms.md` (includes SMS MFA notes)

### Refs
- Canon: GEMINI.md (Rule 30), ARCHITECTURE_DESIGN.md
- ADR: (Buy Decision — documented in README-email.md)
- Changelog: v0.8.1 — Email System + CI Fix

---

## [0.8.0-alpha] — 2026-03-20
### PII Vault — Estate-Grade Encryption Architecture (ADR-037)
- **Cloud KMS Key Ring** provisioned: `finalwishes-keyring` (us-central1)
  - `pii-vault-key`: AES-256 symmetric, 365-day auto-rotation, ENABLED
  - `document-vault-key`: AES-256 symmetric, 365-day auto-rotation, ENABLED
  - Key ring is **immutable** — names and locations cannot change
- **Cloud SQL PostgreSQL 15** instance: `finalwishes-pii-vault` (us-central1-c, db-f1-micro)
  - Database: `pii_vault` with dedicated `vault_admin` user
  - Tables: `user_pii`, `asset_pii`, `heir_pii`, `vault_audit_log`
  - Password stored in Secret Manager: `vault-db-password`
- **Go Crypto Service** (`api/internal/crypto/kms.go`)
  - Envelope encryption: random 256-bit DEK → AES-256-GCM → KMS-wrapped DEK
  - Per-estate AAD (Additional Authenticated Data) — cryptographic cross-estate prevention
  - Plaintext DEK zeroed from memory after use
- **Go Vault Repository** (`api/internal/vault/repository.go`)
  - Cloud SQL connection pool (5 max connections for Cloud Run horizontal scaling)
  - Idempotent migrations (CREATE TABLE IF NOT EXISTS)
  - Store/Retrieve for user PII, asset PII, heir PII
  - Audit logging on every vault operation
- **Go Vault API Handlers** (`api/internal/vault/handlers.go`)
  - `POST /api/v1/vault/user-pii` — Store user SSN, DOB
  - `GET  /api/v1/vault/user-pii` — Retrieve (masked by default, `?full=true` for full)
  - `POST /api/v1/vault/asset-pii` — Store account numbers, routing numbers, VINs
  - `GET  /api/v1/vault/asset-pii` — Retrieve (masked: last4/last6)
  - `POST /api/v1/vault/heir-pii` — Store heir SSN, DOB
  - `GET  /api/v1/vault/heir-pii` — Retrieve (masked)
  - All endpoints require Firebase Auth
- **main.go updated** — Vault initialization flow: KMS → Cloud SQL → Migrations → Routes
  - Graceful degradation: vault disabled if KMS or SQL unavailable (API still serves other routes)
  - Health endpoint updated to report vault + encryption status
- **IAM Permissions Granted**
  - Compute SA: `cloudsql.client`, `cloudkms.cryptoKeyEncrypterDecrypter`, `secretmanager.secretAccessor`
  - GitHub Actions SA: `cloudsql.client`, `cloudkms.cryptoKeyEncrypterDecrypter`
- **ADR-037** documented: Cloud SQL PII Vault architecture decision
- **ADR Index** updated with ADR-035, ADR-036, ADR-037
- **Go dependencies** added: `cloud.google.com/go/kms`, `github.com/lib/pq`
- **Documentation** (Rule 30):
  - Developer README: `api/internal/vault/README.md`
  - User Guide: `docs/user-guides/how-your-information-is-protected.md`

### Security Guarantees Delivered
| Property | Implementation |
|----------|---------------|
| Encryption at Rest | AES-256 (Cloud SQL disk) + AES-256-GCM (column-level KMS) |
| Encryption in Transit | TLS 1.3 with ECDHE (Cloud Run ↔ Cloud SQL) |
| Key Management | Cloud KMS, auto-rotate 365d, IAM-gated |
| PII Isolation | Separate PostgreSQL instance, server-only access |
| Estate Isolation | Per-estate AAD context, cryptographic cross-estate prevention |
| Audit Trail | Every PII access logged (user, estate, IP, timestamp) |
| Data Masking | SSN last4, account last4, VIN last6 by default |

### Infrastructure Provisioned
| Resource | Value |
|----------|-------|
| KMS Key Ring | `projects/finalwishes-prod/locations/us-central1/keyRings/finalwishes-keyring` |
| PII Vault Key | `pii-vault-key` (AES-256, auto-rotate) |
| Document Vault Key | `document-vault-key` (AES-256, auto-rotate) |
| Cloud SQL Instance | `finalwishes-pii-vault` (PostgreSQL 15, us-central1-c) |
| Cloud SQL IP | `34.27.85.125` |
| Database | `pii_vault` |
| DB User | `vault_admin` |
| DB Password | Secret Manager: `vault-db-password` |

### Refs
- Canon: GEMINI.md (Rule 26: PII/HIPAA Siloing), ARCHITECTURE_DESIGN.md §5-6, DATA_MODEL.md §9, SECURITY_COMPLIANCE.md §2, SOW §2.2
- ADR: ADR-037 (Cloud SQL PII Vault)
- Changelog: v0.8.0 — PII Vault
- Diagrams: ARCHITECTURE_DESIGN.md §5 (GCP Services) updated conceptually

---

### Infrastructure Independence — Standalone GCP/Firebase Project
- **Created standalone GCP project** `finalwishes-prod` — FinalWishes is now operationally independent from SirsiMaster
- **Firebase project** initialized with Firestore (nam5), Firebase Auth (email/password), Cloud Storage
- **Firestore rules + 16 composite indexes** deployed to new project
- **Firebase Auth** configured with email/password provider + localhost authorized domain
- **Test data seeded** — Lockhart estate fully populated in new Firestore
- **13 files updated** — config-only changes (zero logic/architecture modifications):
  - `.firebaserc` → `finalwishes-prod`
  - `web/src/lib/firebase.ts` → new SDK config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
  - `functions/index.js` → CORS origins, sourceProject, baseUrl
  - `api/scripts/seed/main.go` → default project fallback
  - `scripts/test-auth-flows.js` + `create-test-accounts.js` → projectId
  - `public/` HTML pages (4) + `improvements/` (1) → Firebase config blocks
  - `desktop/src-tauri/tauri.conf.json` → CSP domain allowlist
  - `README.md` → live site URL

### Business Context
- FinalWishes is an independent company that contracted Sirsi Technologies for development
- This migration separates FinalWishes infrastructure from the shared SirsiMaster GCP project
- The old `legacy-estate-os` project remains intact as a fallback
- Zero runtime code dependencies on Sirsi were found (audit confirmed: 0 npm imports, 0 TS imports, 0 Go imports)

### Refs
- Canon: GEMINI.md, ARCHITECTURE_DESIGN.md, COST_PROPOSAL.md
- ADR: ADR-036 (Firestore Direct Reads — unaffected)
- Changelog: v0.7.0 — Infrastructure Independence

---

## [0.6.2-alpha] — 2026-03-19
### Removed (Phase 1, Week 3 — Dead Code Cleanup)
- **Stubbed 9 legacy `dashboard.*` routes** — 1,815 lines of dead code removed
- **Uninstalled `@tanstack/react-query`** — all data fetching now uses Firestore hooks
- **Removed `QueryClientProvider`** from app root (`main.tsx`)

### Performance
- Modules: 343 → **296** (-14%)
- Main bundle: 464KB → **337KB** (-27%)
- CSS: 151KB → **126KB** (-17%)
- **Session total: 1,093KB → 337KB (-69%)**

## [0.6.1-alpha] — 2026-03-19
### Performance (Phase 1, Week 3 — Code Splitting)
- **Bundle splitting** via Vite `manualChunks` (Rolldown function API)
  - `firebase-core`: 118KB (app + auth)
  - `firebase-data`: 236KB (firestore + storage)
  - `framework`: 274KB (react + react-dom + tanstack router)
  - `index` (app code): **464KB** — 57% reduction from 1,093KB
- No build warnings at 600KB threshold

## [0.6.0-alpha] — 2026-03-19
### Added (Phase 1, Week 3 — Settings + Firestore Migration)
- **Settings page v2.0** — Complete rewrite with:
  - Profile card (avatar, name, email, role/MFA/verified badges)
  - Working toggle switches persisted to Firestore governance/settings
  - Dropdown selects for status report frequency and primary state
  - Save Changes button with dirty-state tracking and success feedback
  - Danger Zone section with delete estate placeholder
  - Decomposed into SettingsToggle, SettingsStatus, SettingsSelect components
- **Estate card name resolution** — Shows actual estate name from Firestore

### Changed
- **All estate pages now read from Firestore** (ADR-036 complete)
  - Memoirs → `useCollection` for reads, `estateClient` for GCS uploads
  - Obituary → `useDocument` for reads, direct `setDoc` for saves
  - Settings → `useDocument` for governance/settings
  - Estates list → `useUserEstates` + `useEstate` for name resolution
- **Exported `useDocument` and `useCollection`** generic hooks
- **Removed all React Query** (`useQuery`/`useMutation`) from estate pages
- **Go API verified** — health check + ConnectRPC auth middleware tested locally

## [0.5.2-alpha] — 2026-03-19
### Added (Phase 1, Week 2 — Invitation System)
- **Invitation service** (`web/src/lib/invitations.ts`) — Full invitation lifecycle
  - `sendEstateInvitation`: Creates invitation record + estate subcollection entry
  - Auto-links if invitee already has a FinalWishes account
  - `getEstateInvitations`: Lists all invitations for an estate
  - `revokeInvitation`: Marks invitation as revoked
  - `hasExistingInvitation`: Duplicate prevention
  - Backward-compatible exports for `InviteTeamMember` component

### Changed
- **Beneficiaries page** — Uses invitation system instead of direct heir creation
  - Shows auto-link feedback when invitee already has an account
  - Creates proper invitation trail for audit purposes

## [0.5.1-alpha] — 2026-03-19
### Added (Phase 1, Week 2 — Sprint 4: Create Estate Onboarding)
- **Create Estate page** (`/estates/create`) — Premium 2-step onboarding flow
  - Welcome screen with feature cards (Assets, Vault, Family)
  - Estate naming with auto-suggested placeholder based on user's last name
  - AES-256 + SOC 2 + HIPAA compliance badges
  - Creates Firestore estate document + estate_users junction record
  - Updates user profile with `primaryEstateId` and `primaryEstateName`
  - Auto-redirects to new estate's dashboard on creation

### Changed
- **Dashboard redirect** (`/dashboard`) — Now detects first-time users (no `primaryEstateId`)
  and routes to `/estates/create` instead of falling back to demo data

## [0.5.0-alpha] — 2026-03-19
### Added (Phase 1, Week 2 — Sprints 1-3: Data Layer + Auto-Match)
- **Firestore data hooks** (`web/src/lib/firestore.ts`) — Real-time `onSnapshot` hooks
  - `useEstate`, `useEstateAssets`, `useEstateHeirs`, `useEstateExecutors`
  - `useEstateDocuments`, `useUserEstates`, `useEstateNotifications`
  - Generic `useDocument<T>` and `useCollection<T>` with typed constraints
- **Estate write operations** (`web/src/lib/estate-actions.ts`)
  - `createEstate`, `addAsset`, `addHeir`, `addExecutor`
  - `createDocumentRecord`, `archiveAsset`, `archiveDocument`, `updateEstate`
- **Auto-match invitation Cloud Function** (`autoMatchInvitation`)
  - Firestore trigger on `users/{uid}` document creation
  - Checks `estate_invitations` for matching email
  - Auto-creates `estate_users` records with audit logging
  - Batched write for atomicity
- **ADR-036** — Firestore Direct Reads for Dashboard
- **Developer README** — `web/src/lib/README.md`

### Changed
- **Dashboard page** — Wired to Firestore hooks (was ConnectRPC mock client)
- **Assets page** — Wired to Firestore hooks + `addAsset` write action
- **Beneficiaries page** — Wired to Firestore hooks + `addHeir` write action
- **Vault page** — Document list from Firestore, upload still via Go API signed URLs
- **Notifications page** — Wired to Firestore hooks with fallback data

### Infrastructure
- **Firestore indexes deployed** — 16 composite indexes including new `estate_invitations` (email+status)


## [0.3.0-alpha] — 2026-03-19
### Added (Phase 1. — Identity Verification & Governance)
- **TOTP MFA Enrollment** — QR code generation, 6-digit verification, status display in Settings
  - Uses Firebase Identity Platform TOTP provider
  - Role-aware UI: "Required" badge for fiduciaries, "Optional" for principals
  - Fiduciaries cannot unenroll MFA (enforced)
- **IdentityGate Component** — Route-level gate for tiered identity verification (ADR-035)
  - Tier 1 (principal): passes through without gate
  - Tier 2 (heir/executor/legal/cpa): must complete MFA + attestation
  - Step-by-step wizard UI for incomplete verification
- **AttestationForm Component** — Canvas-based signature pad + legal declaration
  - Perjury attestation: "I attest under penalty of perjury..."
  - Base64 signature capture (mouse + touch)
  - Stored permanently in Firestore `attestations` collection
- **Attestation route** — `/estates/:estateId/attestation`
- **Firestore rules for attestations** — create/read/update controls, no deletes
- **UserProfile roles expanded** — added `legal` and `cpa` to role union type
- **Email verification** — `sendEmailVerification` on registration, gold banner + resend
- **MFA login challenge** — TOTP code input when Firebase returns `auth/multi-factor-auth-required`
- **Identity Platform enabled** — TOTP + SMS MFA providers activated on `legacy-estate-os`
- **10 Mermaid workflow diagrams** — `docs/IDENTITY-WORKFLOW-DIAGRAMS.md`
  1. Complete Auth State Machine
  2. Registration Flow
  3. Sign-In Flow (email/username + MFA)
  4. TOTP MFA Enrollment
  5. Tiered Identity Gate (ADR-035)
  6. Attestation Signing Flow
  7. Route Protection Hierarchy
  8. Firestore Data Flow
  9. Security Enforcement Layers
  10. End-to-End Fiduciary Onboarding
- **ADR-035** — Tiered Identity Verification architecture decision
- **Rule 29 (Commit Traceability)** — cross-ref canon docs, version, changelog, diagrams, ADRs
- **Rule 30 (Feature Documentation)** — user-facing How-To + developer README per feature
- **User guides** — `docs/user-guides/two-factor-authentication.md`, `identity-verification.md`
- **Developer README** — `web/src/components/identity/README.md`
- **CLAUDE.md** — mirrored from GEMINI.md for Claude/Antigravity agent

### Changed
- **13 files migrated from localStorage to useAuth()** — complete elimination of `localStorage.getItem('finalwishes_user')`
  - AdminHeader, dashboard.index, dashboard.obituary, dashboard.settings, dashboard.beneficiaries, dashboard.vault, dashboard.notifications, dashboard.assets, dashboard.memoirs, dashboard.estates, estates.$estateId.dashboard, estates.$estateId.obituary, estates.$estateId.estates
- **GEMINI.md** bumped to v1.2.0 (Traceability Hardened)
- Estate layout wraps `<Outlet>` with `<IdentityGate>` for fiduciary gating
- Role labels map expanded: legal → "Legal Counsel", cpa → "CPA Advisor"
- Firestore rules: user create now accepts `legal` and `cpa` roles
- **MFAEnrollment extracted** from dashboard.settings.tsx → shared component (`-216` lines inline, `+1` import)
  - Used by both `/dashboard/settings` and `/estates/:estateId/settings`
- **Login page** — "Forgot password?" dead link replaced with full reset flow
  - `'forgot'` mode added to mode state machine (signin → signup → forgot → mfa)
  - Pre-fills email from identifier if it contains `@`

### Added (Phase 1 cont. — Session 2)
- **EmailVerificationBanner** — gold banner between header and content
  - Shows when `emailVerified === false`
  - "Resend Email" button with loading/sent/cooldown states
  - Dismiss button (per-session, reappears next visit)
- **Password reset flow** — form with email input + gold "Send Reset Link" button
  - Anti-enumeration: always shows success regardless of email existence
  - (Security-guidance skill applied)
- **Firestore Security Rules v3.0.0** — complete hardening
  - 8 collection groups with explicit rules (no wildcards)
  - Data shape validation on all `create` operations
  - Least privilege: heirs/legal/cpa = READ-ONLY everywhere
  - Immutable: audit_logs, timeline, attestations (no update/delete)
  - Payments, notifications: backend-only creation
  - `estate_users` junction table with principal-managed access
  - Default deny documented explicitly
  - Deployed to `legacy-estate-os` (0 errors, 0 warnings)
- **Role-Based Invitation System** — complete team onboarding
  - `InviteTeamMember` component: form with role selector cards, member list, status badges, revoke
  - `lib/invitations.ts`: Firestore CRUD for `estate_invitations` collection
  - Firestore rules for `estate_invitations`: principal-only create, email-based invitee read
  - Wired into `/estates/:estateId/settings`
- **User guides** (Rule 30):
  - `docs/user-guides/email-verification.md`
  - `docs/user-guides/password-reset.md`
  - `docs/user-guides/data-privacy.md`
  - `docs/user-guides/inviting-team-members.md`
- **Developer READMEs** (Rule 30):
  - `web/src/components/estate/README.md`
  - Updated `web/src/components/identity/README.md` (MFA + Email banner added)

### Refs
- Canon: GEMINI.md (§2 Rules 29-30, §6 Knowledge), IDENTITY-WORKFLOW-DIAGRAMS.md, CHANGELOG.md
- ADRs: ADR-034 (Firebase Auth), ADR-035 (Tiered Identity Verification)
- Diagrams: All 10 diagrams created (§1-§10)
- Skills applied: firebase, security-auditor, security-guidance, react-patterns, react-best-practices

---

## [0.2.0-alpha] — 2026-03-19
### Added (Phase 1, Week 1 — Authentication & API Foundation)
- **Firebase Auth SDK wired to React** — `web/src/lib/firebase.ts` initializes Firebase app, auth, and Firestore
- **Auth context provider** — `web/src/lib/auth.tsx` with `AuthProvider` and `useAuth()` hook
  - `signIn(identifier, password)` — supports **email or username** login
  - `signUp({ email, username, password, firstName, lastName })` — creates Firebase account + Firestore profile + username index
  - `signOut()` — Firebase sign out
  - `resetPassword(email)` — Firebase password reset email
  - Username → email resolution via `usernames/{username}` Firestore collection
- **Route protection** — `AuthGuard` component wraps estate routes, redirects to `/login` if unauthenticated
- **Login page rewired** — replaced hardcoded `TEST_ACCOUNTS` with Firebase `signInWithEmailAndPassword`
  - Sign-in mode: email or username + password
  - Sign-up mode: first name, last name, username, email, password
  - Form validation, loading states, error messages
  - `?demo=true` preserves Lockhart demo data for presentations
- **Go API auth middleware** — `api/internal/auth/middleware.go`
  - Firebase Admin SDK token verification (`firebase.google.com/go/v4`)
  - `Authorization: Bearer <token>` header extraction
  - User UID injected into request context
  - Optional middleware variant for mixed-auth routes
- **ConnectRPC auth headers** — transport interceptor injects Firebase ID token on every API request
- **ADR-034** — Firebase Auth Implementation decision documented

### Changed
- `estates.$estateId.tsx` — replaced `localStorage.getItem` with `useAuth()` hook
- `dashboard.tsx` — replaced localStorage redirect with Firebase auth check
- `Sidebar.tsx` — replaced localStorage user data with `useAuth()` profile, `signOut` via Firebase
- `client.ts` — demo proxy now gated behind `?demo=true` instead of always-on fallback
- Go API `main.go` — Firebase Admin SDK initialization, auth middleware on ConnectRPC routes

### Fixed
- Login label colors changed from `text-slate-400` to `text-[#133378]/40` per Rule 27 (no slate text)
- Security badge text changed from `text-slate-400` to `text-[#133378]/40`

---

## [0.1.2-alpha] — 2026-03-19
### Added (Phase 0.5b — Skill Arsenal)
- **26 Antigravity skills installed universally** — covers all 3 Sirsi repos (FinalWishes, SirsiNexusApp, Assiduous)
- **Sources audited:** Anthropic claude-code plugins (12), antigravity-awesome-skills (1,273+), skills.sh, antigravity-kit, ios-agentic-skills
- **Custom skills created:** `frontend-design` (adapted from Anthropic with Royal Neo-Deco overrides), `security-guidance` (HIPAA/PII-aware, adapted from Anthropic hook), `real-estate-platform` (no community equivalent — built from scratch for Assiduous)
- **Community skills installed:** `firebase`, `golang-pro`, `grpc-golang`, `go-concurrency-patterns`, `react-best-practices`, `react-native-architecture`, `react-patterns`, `shadcn`, `tailwind-design-system`, `ui-ux-pro-max`, `api-design-principles`, `database-design`, `security-auditor`, `test-driven-development`, `systematic-debugging`, `webapp-testing`, `web-performance-optimization`, `stripe-integration`, `payment-integration`, `startup-financial-modeling`, `legal-advisor`, `gdpr-data-handling`
- **Continuation prompt updated to v3.1** — full skill roster, Phase 1 start point

---

## [0.1.1-alpha] — 2026-03-19
### Fixed (Phase 0)
- **Removed `web/dist/` from git** — build artifacts no longer tracked
- **Hardened `.gitignore`** — covers dist/, out/, build/, .env*, .DS_Store, *.tsbuildinfo
- **Dashboard ELI5 sweep** — purged all internal jargon ("Shard", "Protocol", "Enclave", "Governance") from 9 dashboard route files. Replaced with consumer terms: "Estate", "Document", "Family", "Settings"

### Added (Phase 0.5 — Tool Acquisition)
- **shadcn/ui initialized** — Radix + Nova preset, 13 core components (button, card, dialog, input, label, select, tabs, textarea, badge, avatar, dropdown-menu, separator, sonner)
- **Turborepo wired** — root `package.json` workspaces (`web`, `shared`), `turbo.json` v2 tasks format
- **npm packages installed** — `firebase`, `sonner`, `recharts`, `@react-pdf/renderer`, `@tiptap/react`, `@tiptap/starter-kit`
- **Build verified** — 312 modules, 0 errors via `turbo build`

---

## [0.1.0-alpha] — 2026-03-18
### Added
- **Landing Page** — Full marketing page deployed at `legacy-estate-os.web.app`
  - Sapphire Royal Neo-Deco glass aesthetic
  - Real financial statistics ($72B unclaimed, $3.2T unplanned)
  - Responsive hero section, feature cards, trust indicators
- **Login Page** — Royal Neo-Deco glass login with password toggle
- **Dashboard UI Shells** — 9 route files for estate management
  - `dashboard.index` — Home with completion score, quick actions
  - `dashboard.assets` — Asset inventory list
  - `dashboard.vault` — Document vault
  - `dashboard.memoirs` — Video/photo galleries with cinema viewer
  - `dashboard.beneficiaries` — Executor/heir list
  - `dashboard.obituary` — Directive/obituary editor
  - `dashboard.notifications` — Activity feed
  - `dashboard.settings` — User settings
  - `dashboard.estates` — Multi-estate management
- **Scoped Estate Routes** — `estates.$estateId.*` mirror routes
- **Lockhart Demo Estate** — Hardcoded fallback data for demo/investor presentations
- **Sidebar + AdminHeader** — Royal Neo-Deco themed navigation
- **Multi-Platform Scaffolding**
  - `mobile/` — React Native Expo stubs (iOS/Android)
  - `desktop/` — Tauri configuration (macOS)
  - `shared/` — Types, API client, crypto utilities
- **Client-Side Encryption** — `shared/crypto/index.ts` (AES-256-GCM)
- **Shared TypeScript Types** — `shared/types/index.ts`
- **CSS Design System** — `globals.css` (326 lines Royal Neo-Deco tokens)
- **Firebase Hosting** — Live deployment with CDN
- **5 Development Workflows** — api, browser-testing, devops, firebase, web
- **Canon Documentation**
  - `CANONICAL_DEVELOPMENT_PLAN.md` — Google-First $95K plan
  - `PRODUCT_SPECIFICATION.md` — Complete product spec (750 lines)
  - `DATA_MODEL_LOCK.md` — Locked Firestore + Cloud SQL schemas
  - 33 Architecture Decision Records (ADR-001 through ADR-033)

### Known Issues
- Auth uses localStorage (NOT Firebase Auth) — Phase 1 fix
- All dashboard data is mock (Lockhart fallback proxy) — Phase 1 fix
- Go API has project structure but zero working endpoints — Phase 1
- `web/dist/` committed to git (build artifact) — Phase 0 fix

---

## [0.0.1] — 2026-02-17
### Added
- Initial project structure
- Contract pivot from $175K probate platform to $95K Living Legacy platform
- Firebase project provisioned (`legacy-estate-os`)
- Royal Neo-Deco design language established
