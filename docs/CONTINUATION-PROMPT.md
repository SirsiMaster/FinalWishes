# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 19, 2026 (v3.0)
**Priority:** Phase 1 (Real Infrastructure) — Phase 0 & 0.5 are COMPLETE

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **19 skills** installed universally at `~/.gemini/antigravity/skills/`. They activate automatically by context. Key skills: `frontend-design`, `security-guidance`, `firebase`, `golang-pro`, `grpc-golang`, `react-best-practices`, `shadcn`, `ui-ux-pro-max`, `test-driven-development`.

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
3. **Turborepo WIRED** — `turbo.json` v2 tasks format, workspaces: `web` + `shared`. Build verified: `turbo build` → 312 modules, 0 errors.
4. **NemoClaw / Nemotron** — NVIDIA's open-weight legal AI model. Used for legal document intelligence. Deferred to Phase 2.
5. **Best-in-class design** — Every interface must be PREMIUM. 19 design skills support this. No AI slop, no generic layouts.

## Technology Stack

| Layer | Tech | Status |
|-------|------|:------:|
| Web | React 18, Vite, TanStack (Router/Query), shadcn/ui, Tailwind v4 | ✅ |
| Mobile | React Native, Expo, NativeWind | 🔲 |
| Desktop | Tauri (Rust) | 🔲 |
| Backend | **Go + ConnectRPC + Protobuf** on Cloud Run | 🔲 |
| Database | Firestore + Cloud SQL (PostgreSQL) | ⚠️ Firestore only |
| Auth | Firebase Auth + Identity Platform (MFA) | ⚠️ localStorage mock |
| Encryption | Cloud KMS + Web Crypto API (AES-256-GCM) | 🔲 |
| AI (Guidance) | Firebase Genkit + Vertex AI (Gemini Pro/Flash) | 🔲 |
| AI (Legal) | **NemoClaw + NVIDIA Nemotron 3** | 🔲 Deferred |
| Media | YouTube Data API v3 + Google Photos API | 🔲 |
| E-Sign/Pay/Bank | Sirsi Sign (sign.sirsi.ai) | ✅ External |
| Monorepo | **Turborepo** | ✅ Wired |

## Git State

- **Branch:** `develop` (latest: `0e95452`)
- **Remote:** `github.com:SirsiMaster/FinalWishes.git`
- **Clean working tree** — all Phase 0 + 0.5 committed & pushed

## What's Built vs. What's Broken

### Built ✅
- Landing page (deployed at `legacy-estate-os.web.app`)
- Login UI (Royal Neo-Deco glass)
- Dashboard shells (9 routes, Lockhart mock data) — **ELI5 swept, all jargon removed**
- Memoirs page (VideoCard, PhotoCard, cinema viewer)
- Client-side encryption (`shared/crypto/`)
- Shared types (`shared/types/`)
- Design tokens (`globals.css`, 584 lines — Royal Neo-Deco + shadcn)
- Firebase Hosting
- **shadcn/ui** — 13 components (Radix + Nova)
- **Turborepo** — wired with v2 tasks
- **npm packages** — firebase, sonner, recharts, @react-pdf/renderer, tiptap

### Broken / Mock ❌
- **Auth is fake** — localStorage, not Firebase Auth
- **All data is mock** — `client.ts` Proxy returns hardcoded Lockhart data
- **Go API is empty** — zero working endpoints
- **Cloud SQL / KMS / Cloud Run** — not provisioned
- **No CI/CD** — manual deploys

## Completed Phases

### ✅ PHASE 0: Stabilize (DONE — March 19)
- ✅ Removed `web/dist/` from git
- ✅ Hardened `.gitignore` (root + web)
- ✅ Landing page font audit — no issues
- ✅ Dashboard ELI5 sweep — 9 routes scrubbed (Shard/Protocol/Enclave → Estate/Document/Family)

### ✅ PHASE 0.5: Tool Acquisition (DONE — March 19)
- ✅ shadcn/ui initialized (Radix + Nova, 13 components)
- ✅ Turborepo wired (web + shared workspaces)
- ✅ npm packages installed (firebase, sonner, recharts, tiptap, react-pdf)
- ✅ Build verified (312 modules, 0 errors, 3.6s)
- ✅ **19 Antigravity skills installed** (frontend-design, security-guidance, firebase, golang-pro, grpc-golang, react-best-practices, react-native-architecture, react-patterns, shadcn, tailwind-design-system, ui-ux-pro-max, api-design-principles, security-auditor, test-driven-development, systematic-debugging, webapp-testing, web-performance-optimization, go-concurrency-patterns, notebooklm)
- ⏳ Go modules — deferred to first endpoint
- ⏳ NemoClaw — deferred to Phase 2

## PHASE 1: Real Infrastructure (START HERE)

### Week 1 — Authentication & API Foundation
1. **Firebase Auth SDK** — replace localStorage with real Firebase Auth
   - Wire `firebase/auth` into the app
   - Login/logout flow, session persistence
   - MFA (TOTP) setup with Identity Platform
2. **Go API scaffold** — first ConnectRPC endpoints
   - `UserService.GetUser`, `EstateService.GetEstate`
   - Cloud Run Dockerfile
   - Wire `connectrpc.com/connect` + `firebase.google.com/go/v4`

### Week 2 — Data Layer
3. **Firestore security rules** — estate-scoped, owner/beneficiary roles
4. **Wire dashboard to real data** — replace mock Proxy with Firestore reads
5. **Cloud SQL provisioning** — PostgreSQL for PII vault
6. **Cloud KMS** — encryption key management

### Week 3 — Design System & Components
7. **shadcn/ui Royal Neo-Deco theming** — customize all 13 components
   - Primary: Royal Blue (#133378)
   - Accent: Metallic Gold (#C8A951)
   - Glass cards, film grain, gold borders
8. **Component library** — build reusable estate-specific components

### Week 4 — CI/CD & Deployment
9. **GitHub Actions** — lint, build, deploy
10. **Firebase Hosting** — preview channels for PRs
11. **Cloud Run** — Go API auto-deploy from `develop`
12. **Merge to main** — `v0.2.0-alpha` release

## Rules

1. **ConnectRPC / Proto stays** — do NOT switch to REST
2. **Lockhart demo mode stays** — gate behind `?demo=true`
3. **Branding & Identity ($30K purchased)** — all UI must conform
4. **State engines are NOT in scope** — $35K add-on, deferred
5. **Browser subagent:** `ccollymo@alumni.chicagobooth.edu` Chrome profile (Rule 28)
6. **Git identity:** `SirsiMaster` exclusively
7. **No slate/grey text** — `#0F172A` dark or `#133378` Royal Blue only
8. **Update VERSION_REGISTRY.md** after every component change
9. **Best-in-class design** — 19 skills enforce premium aesthetics. No generic UI.
10. **Sprint plan before code** — Rule 17. Present plan, get approval, then build.

---

**Ready. Start by reading `GEMINI.md`, then present a Sprint Plan for Phase 1, Week 1.**
