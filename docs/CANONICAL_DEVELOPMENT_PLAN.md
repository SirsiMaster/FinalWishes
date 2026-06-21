# FinalWishes — Canonical Development Plan
## The Living Legacy Platform — Google-First Implementation
**Version:** 3.0.0 — **Date:** April 7, 2026 — **Author:** Claude (consolidated from Antigravity v2.0.0)
**Contract:** MSA-2025-111-FW | SOW-2025-001 | **$95,000 Fixed Bid** | 16 Weeks

---

> [!IMPORTANT]
> This plan is aligned to the **executed contract** (Feb 17, 2026 pivot) at `SirsiNexusApp/packages/sirsi-opensign/public/finalwishes/contracts/printable-msa.html`. The original $175K probate-focused scope was replaced with a $95K "Living Legacy" platform. State engines, Plaid direct integration, and Lob are deferred to future add-on modules.

---

## 1. Contract Architecture

### Tier 1: Core Platform ($95,000) — THIS IMPLEMENTATION

The "Living Legacy" — a vault-grade media preservation and directive management platform.

| Core Module | Description |
|-------------|-------------|
| **Vault Architecture** | Zero-knowledge encryption (Cloud KMS + AES-256) for all legacy assets |
| **Legacy Engine ("The Shepherd")** | Time-capsule scheduling, memory curation logic, AI guidance |
| **Media Integration** | YouTube API (video memorials) + Cloud Storage (photo uploads). Google Photos API deferred. |
| **Web App** | React 19/Vite + TanStack Router + shadcn/ui (web-first; mobile/desktop deferred) |

### Tier 2: Purchased Add-Ons (Contracted, Scope Impacts Design)

| Module | Price | Impact on This Build |
|--------|:-----:|---------------------|
| **Branding & Identity** | $30,000 | ✅ **Purchased.** Sets Royal Neo-Deco visual language, typography (Cinzel/Inter), color palette. All UI work must conform to this identity. |
| **Maintenance & Support** | $18,000 | 12-month post-launch SLA. No dev impact now. |

### Tier 3: Future Add-On Modules (NOT purchased — deferred development)

| Module | Price | Timeline | Dependency |
|--------|:-----:|:--------:|-----------|
| Estate Administration | $25,000 | 6 weeks | Requires Tier 1 complete |
| Probate Engine (MD/IL/MN) | $35,000 | 10 weeks | Requires Estate Admin |
| Advanced AI | $15,000 | 4 weeks | Requires Shepherd v1 |
| Financial Integration (Plaid direct) | $20,000 | 5 weeks | Plaid available via Sirsi Sign now |

---

## 2. Sirsi Sign — The Consumable Services Layer

> [!IMPORTANT]
> Sirsi Sign (`sign.sirsi.ai`) is a **portfolio service** consumed by all Sirsi companies. FinalWishes does NOT build its own signing, payment, or bank-linking infrastructure. These services are consumed via API.

### What Sirsi Sign Provides to FinalWishes

| Service | Inside Sirsi Sign | FW Integration | Custom Code |
|---------|-------------------|----------------|:-----------:|
| **E-Signatures** | OpenSign (self-hosted) | REST API calls | ~10 lines |
| **Payments** | Stripe (Card, ACH, Wire) | REST API calls | ~10 lines |
| **Bank Linking** | Plaid (Link, Balances) | REST API calls | ~10 lines |
| **MFA Ceremony** | TOTP, SMS, Email | REST API calls | ~10 lines |
| **PDF Generation** | Puppeteer | REST API calls | ~10 lines |
| **Wire Instructions** | Secure email delivery | REST API calls | ~10 lines |

```
┌───────────────────────────────────────────────┐
│              FinalWishes App                   │
│   (Web + Mobile + Desktop)                     │
│                                                │
│   "I need a signature" ──► Sirsi Sign API      │
│   "I need a payment"   ──► Sirsi Sign API      │
│   "I need bank data"   ──► Sirsi Sign API      │
│   "I need MFA"         ──► Sirsi Sign API      │
│   "I need a PDF"       ──► Sirsi Sign API      │
│                                                │
│   EVERYTHING ELSE      ──► Direct GCP          │
└───────────────────────────────────────────────┘
```

**FinalWishes never touches Stripe, Plaid, or OpenSign directly.** All financial/signing operations route through the Sirsi Sign rail.

---

## 3. Feature → Google Service Matrix (Current Implementation)

### 3.1 Authentication & Identity

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| User registration (email/password, Google, Apple) | **Firebase Auth** | None |
| Multi-factor auth (TOTP) | **Firebase Auth** (Identity Platform) | None |
| Email verification | **Firebase Auth** | None |
| Password reset | **Firebase Auth** | None |
| Session management (JWT) | **Firebase Auth** | None |
| Role-based access (Principal, Executor, Heir, Admin) | **Firebase Custom Claims** | ~20 lines |
| Biometric login (mobile) | **Firebase Auth** + Expo SecureStore | Deferred (mobile not in scope for Tier 1) |

### 3.2 Data Storage

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Estate metadata + real-time sync | **Firestore** | None |
| Asset inventory | **Firestore** (subcollection) | None |
| Beneficiary/executor data | **Firestore** (subcollection) | None |
| Audit trail | **Firestore** + **Cloud Audit Logs** | None |
| Activity feed (real-time) | **Firestore** (onSnapshot) | None |
| Access control | **Firestore Security Rules** | Rules DSL only |
| PII storage (SSN, DOB, legal names) | **Cloud SQL** (PostgreSQL, encrypted) | ~200 lines Go |

### 3.3 Document Vault & Encryption

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| File storage (documents, PDFs) | **Cloud Storage** (Standard) | None |
| Archive storage (old memoirs) | **Cloud Storage** (Nearline) | None |
| Client-side encryption (AES-256-GCM) | **Web Crypto API** | Deferred — server-side KMS handles encryption |
| Server-side key management (DEK/KEK) | **Cloud KMS** | None |
| Signed upload/download URLs | **Cloud Storage** | ~50 lines Go |
| Image thumbnails (auto-generated) | **Firebase Extension: Resize Images** | None (install extension) |
| File type validation | **Cloud Storage** triggers | ~20 lines |

### 3.4 Video Memorials (YouTube Integration)

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Video upload (unlisted) | **YouTube Data API v3** | ~30 lines |
| Video storage + CDN | **YouTube** | None (free, unlimited) |
| Video transcoding (all formats) | **YouTube** | None (automatic) |
| Video playback (embedded) | **YouTube IFrame Player API** | ~20 lines React |
| Video thumbnails | **YouTube** | None (auto-generated) |
| Video privacy (unlisted = link-only) | **YouTube** | None |
| In-app video recording (mobile) | **Expo Camera** → YouTube upload | ~50 lines |

**Why YouTube:** Eliminates ALL video infrastructure. No transcoding servers, no CDN costs, no storage costs. A single API call replaces ~$15K of custom video engineering.

### 3.5 Photo Galleries (Google Photos Integration)

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Photo album creation | **Google Photos API** | ~30 lines |
| Photo upload + organization | **Google Photos API** | ~20 lines |
| Photo sharing (shared albums) | **Google Photos API** | ~15 lines |
| Photo gallery display | **Google Photos API** (mediaItems) | ~40 lines React |
| Photo storage + CDN | **Google Photos** | None (free with Google account) |

### 3.6 The Shepherd — AI Guidance Engine

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| AI routing + orchestration | **sirsi-ai SDK** (Go) | ~100 lines (handler defs) |
| LLM access (primary) | **Claude Opus** (via sirsi-ai) | None (SDK handles) |
| LLM access (fallback) | **Genkit** (Vertex AI Gemini) | Config only |
| Legacy guidance Q&A | **sirsi-ai** (structured prompts) | Prompts only |
| Obituary generation assistance | **Claude Opus** (creative, high temp) | Prompts only |
| Estate completion score | **Go handler** (structured output → JSON) | ~50 lines |
| Memory curation suggestions | **Claude Opus** (recommendation) | Prompts only |
| Legal disclaimers (guardrails) | **sirsi-ai** (system prompt) | Config only |

### 3.7 Time Capsule & Scheduled Delivery

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Schedule future message delivery | **Cloud Tasks** (deferred execution) | ~40 lines Go |
| Recurring reminders | **Cloud Scheduler** (cron) | Config only |
| Push notifications (mobile/web) | **Firebase Cloud Messaging** (FCM) | ~30 lines |
| Death-trigger verification | **Firestore** (status change listener) | ~50 lines |
| Cooling-off period (72-hour hold) | **Cloud Tasks** (delayed execution) | ~20 lines |

### 3.8 Digital Lockbox

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Secure credential storage | **Firestore** + **Cloud KMS** (encrypted fields) | ~80 lines Go |
| Account transition instructions | **Firestore** (subcollection) | None |
| Heirloom registry (physical assets) | **Firestore** + **Cloud Storage** (photos) | ~40 lines React |

### 3.9 Email & Communications

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Transactional email (invitations, alerts) | **Firebase Extension: Trigger Email** | None |
| Email templates | **Firestore** (templates collection) | Templates only |
| Notification digests | **Cloud Scheduler** + Extension | None |

### 3.10 Analytics & Monitoring

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| User analytics | **Google Analytics 4** (GA4) | None |
| Crash reporting | **Firebase Crashlytics** | None |
| Performance monitoring | **Firebase Performance** | None |
| Error tracking | **Cloud Error Reporting** | None |
| Uptime monitoring | **Cloud Monitoring** | None |
| Log aggregation | **Cloud Logging** | None |

### 3.11 Hosting & Deployment

| Feature | Google Service | Custom Code |
|---------|--------------|:-----------:|
| Web hosting (CDN + SSL) | **Firebase Hosting** | None |
| API hosting (serverless) | **Cloud Run** | Dockerfile |
| Preview deployments (PR previews) | **Firebase Hosting** (preview channels) | None |
| CI/CD pipeline | **GitHub Actions** → Cloud Build | Config |
| Domain management | **Cloud DNS** | None |

---

## 4. Custom Code Summary (Actual — April 2026)

| Component | Language | Lines | Status |
|-----------|----------|:-----:|--------|
| Go API (Cloud Run) | Go | ~10,500 | ✅ Production — auth, vault, ConnectRPC, KMS, OpenSign proxy, Genkit AI, Cloud Tasks, rate limiting |
| React web app | TypeScript/React | ~16,700 | ✅ Production — 22 routes, 20 shadcn components, Royal Neo-Deco theme |
| Firestore security rules | Rules DSL | ~573 | ✅ Production — v5.0.0, comprehensive RBAC |
| Tests (Vitest + Playwright) | TypeScript | ~1,750 | ✅ Active — 105 unit + 9 E2E |
| Proto definitions | Protobuf | ~253 | ✅ Active — 18 RPC methods |
| Firestore triggers | Node.js | ~118 | ✅ Production — autoMatchInvitation |
| Shared types | TypeScript | ~97 | ✅ Active — proto-aligned type definitions |

**Total custom code: ~30,000 lines** (up from ~6,100 at v0.10.0)
**Total Google-managed services: 13 active (Firebase Auth, Firestore, Cloud SQL, Cloud KMS, Cloud Storage, Cloud Run, Firebase Hosting, Gmail API, Cloud Build, Secret Manager, IAM, Cloud DNS, Cloud Tasks)**

> **Removed (April 2026):** `shared/crypto/` (client-side encryption never used), `shared/api-client/` (web uses ConnectRPC), React Native mobile (~0 lines actual), Tauri desktop (~0 lines actual)

---

## 5. Monthly Infrastructure Cost (OpEx)

| Service | Monthly Cost |
|---------|:------------:|
| Google Cloud (Run + SQL + Storage + KMS) | ~$60/mo |
| Firebase (Auth, Hosting, Firestore, FCM, Extensions) | Free tier |
| YouTube Data API | Free (10K quota units/day) |
| Claude Opus (via sirsi-ai) | ~$15/1M tokens (primary AI) |
| Vertex AI Gemini (fallback) | ~$5/1M tokens |
| OpenSign (via Sirsi Sign) | $20/mo |
| Gmail API (domain-wide delegation) | Free (Workspace included) |
| **Total** | **~$80/mo + AI usage** |

---

## 6. Development Roadmap — Continuous Plan

### TIER 1: Core Platform ($95,000 — 16 Weeks)

#### Phase 1: Foundation & Vault (Weeks 1-4) — $24,000

| Week | Task | Google Service | Deliverable |
|:----:|------|---------------|-------------|
| 1 | Provision Cloud Run + Cloud SQL + Firestore | GCP Console | Infrastructure live |
| 1 | Configure Cloud KMS (AES-256 software keys) | Cloud KMS | Key ring + crypto key |
| 1 | Deploy Firestore security rules (production) | Firestore | Estate-scoped access |
| 1 | Configure Cloud Armor (WAF) | Cloud Armor | DDoS + IP filtering |
| 2 | Firebase Auth → real implementation (replace localStorage) | Firebase Auth + Identity Platform | Login + MFA working |
| 2 | Go API: Auth middleware + Users CRUD | Cloud Run | `/v1/users` endpoints |
| 2 | Go API: Estates CRUD + estate_users | Cloud Run | `/v1/estates` endpoints |
| 3 | Go API: Document upload + encryption flow | Cloud Run + Cloud Storage + Cloud KMS | Upload → encrypt → store |
| 3 | shadcn/ui initialization + Royal Neo-Deco theme (per Branding & Identity) | Firebase Hosting | Component library themed |
| 3 | Wire React dashboard to real Firestore data (React Query) | Firebase Hosting | Real data in dashboard |
| 4 | Install Firebase Extensions (Trigger Email, Resize Images) | Firebase Console | Zero-code email + thumbnails |
| 4 | CI/CD: GitHub Actions → Cloud Run + Firebase Hosting | GitHub Actions | Auto-deploy on push |
| 4 | OpenSign integration test via Sirsi Sign API | Sirsi Sign | Signing flow verified |

#### Phase 2: Core Logic & Legacy Engines (Weeks 5-10) — $28,000

| Week | Task | Google Service | Deliverable |
|:----:|------|---------------|-------------|
| 5 | YouTube Data API integration (unlisted video upload) | YouTube Data API v3 | Video memorials working |
| 5 | YouTube IFrame Player embed in React | YouTube IFrame API | Video playback in dashboard |
| 6 | Google Photos API integration (album creation, upload) | Google Photos API | Photo galleries working |
| 6 | Google Photos gallery display component | Google Photos API | Photo wall in memoirs page |
| 7 | Asset CRUD (5 categories + metadata) | Firestore | Asset management working |
| 7 | Beneficiary management (executors + heirs) | Firestore | Designation, invitation |
| 8 | Digital Lockbox (encrypted credentials, account instructions) | Firestore + Cloud KMS | Secure credential storage |
| 8 | Heirloom Registry (physical asset inventory with photos) | Firestore + Cloud Storage | Visual asset inventory |
| 9 | Genkit AI: Shepherd flow definitions (guidance, completion score) | Firebase Genkit + Vertex AI | AI guidance working |
| 9 | Genkit AI: Obituary generation assistance | Firebase Genkit | Creative writing flow |
| 10 | Time Capsule: scheduled message delivery | Cloud Tasks + Cloud Scheduler | Deferred delivery working |
| 10 | Final Directives: ethical wills + funeral preferences (PDF export) | `@react-pdf/renderer` | Directive PDF generation |

#### Phase 3: Production Hardening & Testing (Weeks 9-12) — $26,000

> [!NOTE]
> Mobile (Expo) and Desktop (Tauri) scaffolds removed in April 2026 consolidation.
> Phase 3 redirected to testing, staging environment, and production hardening.

| Week | Task | Google Service | Deliverable |
|:----:|------|---------------|-------------|
| 9 | Vitest + React Testing Library setup for web | — | Frontend test infrastructure |
| 9 | Test auth flows, Firestore hooks, vault operations | — | 80%+ coverage on critical paths |
| 10 | Playwright E2E test suite (critical user journeys) | — | Automated regression |
| 10 | Staging environment (Firebase preview channel + Cloud Run revision) | Firebase Hosting + Cloud Run | Staging URL live |
| 11 | ESLint rule fixes (react-hooks/exhaustive-deps) | — | Zero warnings |
| 11 | Error boundaries for Firestore subscription failures | — | Graceful error handling |
| 12 | Performance optimization (Lighthouse, Core Web Vitals) | Firebase Performance | LCP < 2.5s verified |
| 12 | Go API integration tests (Firestore emulator + test PostgreSQL) | — | Backend integration coverage |

#### Phase 4: QA, Integration & Launch (Weeks 13-16) — $17,000

| Week | Task | Google Service | Deliverable |
|:----:|------|---------------|-------------|
| 13 | Playwright E2E test suite (critical flows) | Playwright | Automated regression |
| 13 | Performance optimization (Lighthouse, Core Web Vitals) | Firebase Performance | Performance baseline |
| 14 | Internal security code review + hardening | Cloud Audit Logs + IAM | Security report |
| 14 | SOC 2 evidence collection (logging, access controls) | Cloud Logging + IAM | Compliance pack |
| 15 | App Store submission (iOS via TestFlight) | Apple App Store Connect | TestFlight build live |
| 15 | Play Store submission (Android via Internal Test Track) | Google Play Console | Internal test build |
| 16 | DNS switchover + production go-live | Cloud DNS + Firebase Hosting | `finalwishes.app` live |
| 16 | Production monitoring setup | Cloud Monitoring + Crashlytics | Alerts configured |

---

### TIER 2: Purchased Add-Ons (Post-Launch, Contracted)

#### Branding & Identity ($30,000 — 8 weeks, parallel with Tier 1)

> [!IMPORTANT]
> Branding & Identity is a **design deliverable**, not a code module. However, its output **directly drives** the technical design system. All shadcn/ui theming, color tokens, typography, and component styling in Tier 1 must conform to the Branding & Identity standards.

| Deliverable | Technical Impact |
|-------------|-----------------|
| Logo + mark system | Favicon, splash screens, app icons (iOS/Android/macOS) |
| Typography pairing (Cinzel + Inter) | `--font-heading` / `--font-body` CSS tokens |
| Color palette (Royal Blue + Gold) | shadcn/ui theme tokens (`--primary`, `--secondary`) |
| Figma design system (Web + Mobile) | Component specs for all dashboard pages |
| High-fidelity prototypes | Acceptance criteria for UI implementation |
| Asset production (icons, illustrations) | Lucide React icons + custom illustrations |

#### Maintenance & Support ($18,000 — 12 months post-launch)

| Coverage | Detail |
|----------|--------|
| Bug fixes | Defects reported via support channel |
| Security patches | Critical CVEs within 48 hours |
| Dependency updates | Monthly package audit |
| Uptime monitoring | 99.9% SLA |
| Priority support | Response within 4 business hours |

---

### TIER 3: Future Add-On Modules (NOT purchased — deferred)

> [!NOTE]
> These modules are priced and scoped in the contract as à la carte add-ons. When purchased, each extends the core platform. The architecture is designed to accommodate them without rework.

#### Estate Administration ($25,000 — 6 weeks)

| Feature | Google Service | Notes |
|---------|---------------|-------|
| Death certificate upload + OCR | **Document AI** (Form Parser) | Pre-trained US form model |
| Executor activation workflow | **Firestore** + **Cloud Tasks** | 72-hour cooling-off via Cloud Tasks |
| Multi-executor confirmation (2-of-3) | **Firestore** (transaction) | Quorum logic |
| Notification letter generation | `@react-pdf/renderer` | Template-based letters |
| Estate state machine | **Firestore** | active → death_reported → executor_confirmed → in_settlement → closed |
| Heir inheritance acceptance/rejection | **Firestore** + FCM | Push notification → action |

#### Probate Engine — MD/IL/MN ($35,000 — 10 weeks)

| Feature | Google Service | Notes |
|---------|---------------|-------|
| Maryland MDEC (Tyler Odyssey) guidance | Custom Go logic | Register of Wills rules |
| Illinois eCourt (Cook County) guidance | Custom Go logic | Probate Division rules |
| Minnesota MNCIS e-filing guidance | Custom Go logic | District Court rules |
| Dynamic 18-month Gantt chart | `recharts` | Executor timeline |
| Proactive court deadline alerts | **Cloud Scheduler** + FCM | Inventory due in 90 days, etc. |
| Ready-to-Print PDF packages | Go PDF stamper | Court-specific form templates |

#### Advanced AI ($15,000 — 4 weeks)

| Feature | Google Service | Notes |
|---------|---------------|-------|
| Advanced RAG with legal corpus | **Vertex AI Vector Search** | Embeddings for probate code |
| Document drafting assistance | **Genkit** (advanced flows) | Will/trust draft suggestions |
| Smart asset discovery suggestions | **Genkit** | "Based on your profile, you may be missing..." |
| Conversation memory | **Firestore** + **Genkit** | Multi-turn context |

#### Financial Integration — Plaid Direct ($20,000 — 5 weeks)

> [!NOTE]
> Plaid is **already available** via Sirsi Sign. This add-on provides **deep, direct integration** — pulling transactions, liabilities, and investment details beyond what the Sirsi Sign rail exposes.

| Feature | Google Service | Notes |
|---------|---------------|-------|
| Plaid Link (12,000+ institutions) | Plaid API (direct) | Deep account linking |
| Transaction history | Plaid API | Spending analysis |
| Liability tracking | Plaid API | Debt inventory |
| Investment portfolio view | Plaid API | Retirement/brokerage |
| Real estate valuation estimates | Zillow/Redfin API | Property values |

---

### Phase 5: Life-First Reframe (Post-Tier 1 — ADR-038)

> [!IMPORTANT]
> This phase implements the product pivot from estate-planning-as-chore to living-companion-with-estate-planning. See [ETHOS.md](/ETHOS.md) for the full vision and [ADR-038](/docs/ADR-038-LIFE-FIRST-REFRAME.md) for the architectural decision.

#### 5a. Navigation Restructure

| Task | Description | Deliverable |
|------|-------------|-------------|
| Route reorganization | Restructure all existing routes into 6 emotional groups | Updated TanStack Router file tree |
| Sidebar redesign | Replace estate-mechanics nav with Soul Log, My Legacy, Memories, Letters, My People, The Vault | New sidebar component |
| Mobile nav | Bottom tab bar with 6 group icons | Responsive navigation |
| Route aliases | Ensure old routes redirect to new group locations | No broken links |

**Six Navigation Groups:**

| Group | Contains | Existing Routes Mapped |
|-------|----------|----------------------|
| Soul Log | Video/audio/text diary entries | NEW (net-new feature) |
| My Legacy | Time capsules, ethical wills, directives, obituary | `/directives`, `/time-capsules` |
| Memories | Photos, videos, heirlooms, stories | `/memoirs`, `/heirlooms` |
| Letters | Sealed letters, future-dated messages | NEW (extracted from time capsules) |
| My People | Beneficiaries, executors, guardians, invitations | `/beneficiaries`, `/settings` (people section) |
| The Vault | Assets, documents, lockbox, financials | `/vault`, `/assets`, `/lockbox` |

#### 5b. Soul Log (Core New Feature)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Recording UI | Video (camera), audio (mic), text input | Soul Log entry creation screen |
| Visibility modes | Private, Shared (tagged beneficiaries), Sealed (future delivery) | Entry privacy controls |
| Storage | Video → YouTube (unlisted), audio → Cloud Storage, text → Firestore | Multi-backend storage |
| Feed view | Chronological diary feed with date grouping | Soul Log feed page |
| Transcription | Vertex AI Speech-to-Text for audio/video entries | Auto-generated transcripts |
| Search | Full-text search across transcripts and text entries | Soul Log search |

#### 5c. Legacy Timeline (Replaces Completion Dashboard)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Timeline component | Chronological view of all user activity (entries, uploads, milestones) | Legacy Timeline page |
| Milestone markers | Key life events (marriage, birth, deployment, retirement) | User-defined milestones |
| Estate health indicator | Secondary completion metric (replaces primary dashboard percentage) | Subtle progress widget |
| Activity integration | Pull from Soul Log, Memories, Letters, Vault activity | Unified timeline feed |

#### 5d. Heir Welcome Screen (The Sacred Moment)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Heir first-login detection | Detect first login after estate activation | Auth flow hook |
| Welcome screen | Full-screen: loved one's face, voice, personal message | Heir welcome page |
| Letter reveal | Display sealed letters addressed to this specific heir | Per-heir letter queue |
| Guided transition | After the emotional moment, guide heir to practical matters | Welcome → estate nav flow |
| Role-based content | Show only what the deceased chose to share with this heir | Visibility enforcement |

#### 5e. Voice Memoir Recording + Transcription

| Task | Description | Deliverable |
|------|-------------|-------------|
| MediaRecorder API | Browser-based audio/video recording | Recording component |
| Upload pipeline | Chunk upload → Cloud Storage → transcription trigger | Async upload flow |
| Vertex AI STT | Speech-to-Text transcription on upload complete | Auto-transcription |
| Transcript editing | User can review and edit auto-generated transcript | Transcript editor |

#### 5f. Shepherd AI Reframe

| Task | Description | Deliverable |
|------|-------------|-------------|
| Companion prompts | Rewrite Shepherd system prompts from estate-assistant to life-companion | Updated Genkit flows |
| Soul Log suggestions | "You haven't recorded in a while" / "Your anniversary is coming" | Proactive nudges |
| Memory curation | Suggest organizing entries into themed collections | Curation AI flow |
| Estate guidance | Retain all estate completion logic as secondary capability | Unchanged backend |

#### 5g. Role-Based Access Enforcement

| Task | Description | Deliverable |
|------|-------------|-------------|
| Role mapping fix | Correct Principal/Executor/Heir/Guardian role assignments | API + Firestore rules |
| Visibility enforcement | Soul Log entries respect visibility modes per beneficiary | Backend access checks |
| Heir content filtering | Heirs see only content tagged/shared with them | Query-level filtering |

#### 5h. Guardian Protocol (Future)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Guardian role definition | Trusted person who manages estate on behalf of minor heirs | Role + permissions spec |
| Guardian activation | Triggered when heir is under 18 at time of estate activation | Conditional access flow |
| Content staging | Guardian reviews content before minor heir sees it | Approval queue |

---

## 7. Architecture Diagram (Post-Consolidation — April 2026)

```
┌──────────────────────────────────────────────────────────┐
│                 FINALWISHES PLATFORM                       │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    Web App                           │  │
│  │  React 19 + Vite 8 + TanStack Router + shadcn/ui   │  │
│  │  Royal Neo-Deco (Cinzel + Inter, Royal Blue + Gold) │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────┼───────────────────────────┐    │
│  │                 shared/types                       │    │
│  └───────────────────────┼───────────────────────────┘    │
│                          │                                  │
│         ┌────────────────┼──────────────────┐              │
│         ▼                ▼                  ▼              │
│   Firebase Auth    Firestore          Go API (Cloud Run)  │
│   (direct)         (onSnapshot)       (ConnectRPC)        │
│                                            │               │
└────────────────────────────────────────────┼───────────────┘
                                             │
                    ┌────────────────────────┬┴──────────────┐
                    ▼                        ▼               ▼
         ┌──────────────────┐    ┌──────────────┐  ┌─────────────────┐
         │  GCP Services    │    │ Cloud SQL    │  │ Sirsi Sign      │
         │                  │    │ (PII Vault)  │  │ (sign.sirsi.ai) │
         │  Cloud Storage   │    │ PostgreSQL   │  │                 │
         │  Cloud KMS       │    │ AES-256-GCM  │  │ E-Signatures    │
         │  Vertex AI       │    │ Per-estate   │  │ Payments        │
         │  Cloud Tasks     │    │ AAD binding  │  │ (Stripe)        │
         │  Cloud Scheduler │    └──────────────┘  └─────────────────┘
         └──────────────────┘

Firestore Triggers (Firebase Functions — Node.js 20):
  └── autoMatchInvitation: grants estate access when invited users register
```

> **Note (April 2026):** Mobile (Expo) and Desktop (Tauri) removed from Tier 1 scope.
> Will be rebuilt as add-on when web product is stable and client approves.

---

## 8. Scope Freeze Rules

| Rule | Enforcement |
|------|------------|
| **State engines are NOT in Tier 1** | No MD/IL/MN probate code until Estate Admin add-on is purchased |
| **Direct Plaid is NOT in Tier 1** | Bank linking available via Sirsi Sign; deep integration deferred |
| **Lob is NOT in Tier 1** | No physical mail automation until Estate Admin add-on |
| **Branding & Identity informs design** | All UI must conform to B&I deliverables (Figma specs, color palette) |
| **Sirsi Sign is consumed, not built** | FinalWishes never touches Stripe/Plaid/OpenSign directly |
| **shadcn/ui is the component foundation** | Per ADR-033, no hand-coded primitives |

---

## 9. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|-----------|
| YouTube API quota limits | Low | Medium | 10K units/day is generous; monitor usage |
| Google Photos API deprecation | Low | High | Fall back to Cloud Storage + custom gallery |
| Vertex AI cost overruns | Medium | Low | Use Gemini Flash (cheapest); set budget alerts |
| Sirsi Sign downtime | Low | High | FW can operate without signing/payment temporarily |
| App Store rejection | Medium | High | Follow Apple HIG; prepare for review iterations |
| Scope creep into Tier 3 | High | High | Scope freeze rules (§8) enforced by ADR |

---

## 10. Acceptance Criteria (Tier 1 Complete)

### Implemented (v0.10.0)
- [x] User can register and log in with MFA (TOTP)
- [x] User can create an estate and add assets
- [x] User can upload documents to encrypted vault (signed URLs + Cloud KMS)
- [x] User can embed YouTube video memorials + upload photos
- [x] User can designate executors and heirs (invitation system)
- [x] PII encrypted at rest (Cloud SQL + AES-256-GCM + per-estate AAD)
- [x] All UI conforms to Royal Neo-Deco (Branding & Identity)
- [x] 3-tier identity verification (password → MFA → attestation)
- [x] CI/CD pipeline live (GitHub Actions + Cloud Build)
- [x] Production deployed at finalwishes-prod.web.app

### Remaining (Tier 1 completion)
- [x] The Shepherd provides AI-guided completion suggestions (Genkit) — (692b96d)
- [x] User can store credentials in digital lockbox — (692b96d)
- [x] User can create ethical wills and final directives (PDF) — (692b96d)
- [x] User can schedule time capsule message delivery (Cloud Tasks) — (692b96d)
- [x] E2E tests pass for all critical flows (Playwright) — 9 tests (b1d24c9)
- [x] Frontend test coverage > 80% (Vitest) — 105 tests (a2c9614)
- [x] Staging environment operational — Firebase preview channel
- [x] SOC 2 evidence collected — 9 files
- [x] Production domain live — **finalwishes-prod.web.app is the SOLE production site** (`finalwishes.app` was never owned; unowned refs scrubbed in #19). No DNS switchover pending.
- [ ] 99.9% uptime during launch week

### Deferred (not Tier 1)
- [x] **iOS app SHIPPED** — Capacitor web-to-native shell (ADR-048, #20/#22), signed under Apple Team `9D382WV988`, TestFlight-ready (`docs/ios/TESTFLIGHT.md`). Android still deferred.
- [ ] Desktop app (deferred indefinitely)
- [x] **Google Photos import SHIPPED** — Picker API frontend flow (CR-12, ADR-045, #5); runtime consent (scope + test-user) is the only owner-gated step.

---

**Updated:** April 14, 2026 (Claude — Phase 5: Life-First Reframe added per ADR-038)
**Canon Established:** March 18, 2026 (Antigravity)
**Source of Truth:** MSA-2025-111-FW + SOW-2025-001 (Feb 17 Pivot)
