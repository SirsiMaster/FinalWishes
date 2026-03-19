# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 18, 2026 (v2.1)
**Priority:** Phase 0 (Stabilize) → Phase 0.5 (Tool Acquisition) → Phase 1 (Infrastructure)

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

## The Project

**FinalWishes** is a $95,000 "Living Legacy" platform (MSA-2025-111-FW, SOW-2025-001). It lets a person organize memories, documents, final instructions, and asset designations — then control when and how that legacy reaches their heirs.

**Contract was pivoted Feb 17, 2026** from a $175K probate-focused platform to a $95K Google-first media preservation platform. The executed contract lives at `SirsiNexusApp/packages/sirsi-opensign/public/finalwishes/contracts/printable-msa.html`.

## Canon Documents (Read These First)

| Document | Path |
|----------|------|
| **GEMINI.md** | `GEMINI.md` |
| **Canonical Development Plan** | `docs/CANONICAL_DEVELOPMENT_PLAN.md` |
| **Product Specification** | `docs/PRODUCT_SPECIFICATION.md` |
| **Data Model Lock** | `docs/DATA_MODEL_LOCK.md` |
| **Version Registry** | `docs/VERSION_REGISTRY.md` |
| **Changelog** | `CHANGELOG.md` |
| **ADR Index** | `docs/ADR-INDEX.md` |
| **ADR-033** | `docs/ADR-033-DESIGN-SYSTEM-ACCELERATION.md` |

## Critical Architecture Decisions

1. **KEEP ConnectRPC / Proto** — Do NOT switch to REST. The proto-based ConnectRPC stack stays. `web/src/gen/estate/v1/estate_pb` is the canonical client interface.
2. **Keep Lockhart Demo Data** — The Proxy fallback in `client.ts` stays as demo mode, but the real data stack gets built alongside it. Gate demo behind `?demo=true`.
3. **Turborepo** — `turbo.json` is stubbed at repo root. Wire it into `package.json` when workspaces are ready.
4. **NemoClaw / Nemotron** — NVIDIA's open-weight legal AI model. Used for legal document intelligence (contract analysis, will/trust parsing, legal Q&A). The Nemotron service is built as a **shared capability** that gets exported to Sirsi Nexus. (See Phase 0.5)

## Technology Stack

| Layer | Tech |
|-------|------|
| Web | React 18, Vite, TanStack (Router/Query), shadcn/ui, Tailwind |
| Mobile | React Native, Expo, NativeWind |
| Desktop | Tauri (Rust) |
| Backend | **Go + ConnectRPC + Protobuf** on Cloud Run |
| Database | Firestore + Cloud SQL (PostgreSQL) |
| Auth | Firebase Auth + Identity Platform (MFA) |
| Encryption | Cloud KMS + Web Crypto API (AES-256-GCM) |
| AI (Guidance) | Firebase Genkit + Vertex AI (Gemini Pro/Flash) |
| AI (Legal) | **NemoClaw + NVIDIA Nemotron 3** (self-hosted or via NIM) |
| Media | YouTube Data API v3 + Google Photos API |
| E-Sign/Pay/Bank | Sirsi Sign (sign.sirsi.ai) — consumes OpenSign, Stripe, Plaid |
| Email | Firebase Extension: Trigger Email |
| Push | Firebase Cloud Messaging (FCM) |
| Monorepo | **Turborepo** (stubbed) |

## Git State

- **Branch:** `main` (merged from `develop`, tagged `v0.1.0-alpha`)
- **Remote:** `github.com:SirsiMaster/FinalWishes.git`
- **After merge, both `main` and `develop` should be pushed**

## What's Built vs. What's Broken

### Built ✅
- Landing page (deployed at `legacy-estate-os.web.app`)
- Login UI (Royal Neo-Deco glass)
- Dashboard shells (9 routes, Lockhart mock data)
- Memoirs page (VideoCard, PhotoCard, cinema viewer)
- Client-side encryption (`shared/crypto/`)
- Shared types (`shared/types/`)
- Design tokens (`globals.css`, 326 lines)
- Firebase Hosting

### Broken / Mock ❌
- **Auth is fake** — localStorage, not Firebase Auth
- **All data is mock** — `client.ts` Proxy returns hardcoded Lockhart data
- **Go API is empty** — zero working endpoints
- **Cloud SQL / KMS / Cloud Run** — not provisioned
- **`web/dist/` in git** — build artifact committed, needs gitignore
- **No CI/CD** — manual deploys

## Execution Phases

### PHASE 0: Stabilize & Merge (~2 days)
- Landing page viewport font audit
- Dashboard ELI5 sweep (remove "Shard"/"Protocol"/"Enclave")
- Remove `web/dist/` from git
- ✅ **DONE: `develop` → `main` merge + `v0.1.0-alpha` tag**

### PHASE 0.5: Tool Acquisition & Staging (~3 days) ← NEW
Acquire/configure/verify ALL tools before writing application code:

**Google Cloud APIs to Enable:**
- YouTube Data API v3, Google Photos Library API
- Vertex AI API, Document AI API (future)
- Cloud KMS, Cloud Tasks, Cloud Scheduler
- Firebase Extensions: Trigger Email, Resize Images

**npm Packages to Install:**
- `firebase` (client SDK), `firebase-admin` (server SDK)
- `@connectrpc/connect`, `@connectrpc/connect-web`, `@bufbuild/protobuf`
- `shadcn/ui` (init + core components)
- `tiptap` (rich text editor for directives)
- `@react-pdf/renderer` (PDF generation)
- `sonner` (toast notifications)
- `recharts` (charts for completion score)
- `turbo` (monorepo runner)

**Go Modules to Install:**
- `firebase.google.com/go/v4` (Firebase Admin)
- `connectrpc.com/connect` (ConnectRPC server)
- `github.com/jackc/pgx/v5` (Cloud SQL PostgreSQL)
- `cloud.google.com/go/kms` (Cloud KMS)
- `cloud.google.com/go/storage` (Cloud Storage)
- `github.com/firebase/genkit/go` (Genkit AI)
- `google.golang.org/api/youtube/v3` (YouTube API)

**NVIDIA NemoClaw Stack:**
- Evaluate deployment: local (Apple Silicon) vs GCP (NVIDIA NIM / Cloud Run GPU)
- Pull Nemotron 3 Nano or Super model weights (HuggingFace)
- Prototype legal document processing flow
- Design as shared `ai/nemoclaw/` package exportable to Sirsi Nexus

**Verification:**
- Each tool: install → import → "hello world" test → confirm version in VERSION_REGISTRY

### PHASE 1: Real Infrastructure (Weeks 1-4)
1. Firebase Auth SDK (replace localStorage)
2. Go API: ConnectRPC endpoints (users, estates, assets, documents)
3. Firestore security rules (estate-scoped)
4. Cloud SQL + Cloud KMS provisioning
5. Wire frontend to real Firestore/API data
6. CI/CD (GitHub Actions → Firebase Hosting + Cloud Run)
7. shadcn/ui Royal Neo-Deco theming

### PHASE 2: Core Features (Weeks 5-10)
1. Document Vault — Cloud Storage + KMS encryption
2. Video Memorials — YouTube Data API
3. Photo Galleries — Google Photos API
4. Digital Lockbox — encrypted credentials
5. Final Directives — tiptap + PDF + Sirsi Sign
6. Time Capsules — Cloud Tasks scheduled delivery
7. The Shepherd AI — Genkit + Vertex AI (Gemini)
8. NemoClaw Legal Intelligence — Nemotron 3 for document analysis
9. Beneficiary Management — invitations + email
10. Notifications — real-time Firestore + FCM

### PHASE 3: Mobile & Desktop (Weeks 9-12)
### PHASE 4: QA, Security & Launch (Weeks 13-16)

## Rules

1. **ConnectRPC / Proto stays** — do NOT switch to REST
2. **Lockhart demo mode stays** — gate behind `?demo=true`
3. **Branding & Identity ($30K purchased)** — all UI must conform
4. **State engines are NOT in scope** — $35K add-on, deferred
5. **Browser subagent:** `ccollymo@alumni.chicagobooth.edu` Chrome profile (Rule 28)
6. **Git identity:** `SirsiMaster` exclusively
7. **No slate/grey text** — `#0F172A` dark or `#133378` Royal Blue only
8. **Update VERSION_REGISTRY.md** after every component change

---

**Ready. Start by reading `GEMINI.md`, then execute Phase 0 remaining tasks, then Phase 0.5.**
