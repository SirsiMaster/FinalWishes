# ADR-016: Stack Convergence — One Unified Tech Stack
**Status:** PROPOSED  
**Date:** 2026-02-10  
**Author:** Antigravity (Agent)  
**Deciders:** Cylton Collymore  

---

## 1. Context & Problem

The Sirsi Nexus ecosystem has accumulated **significant tech debt through stack fragmentation.** What started as rapid prototyping has produced a codebase that combines:

| Category | Current Count | Languages/Formats |
|:---------|:-------------|:-----------------|
| **Static HTML pages** | 94+ files | Raw HTML (handwritten, no framework) |
| **Plain JavaScript** | 77+ files | .js (Node.js + browser, mixed CommonJS/ESM) |
| **TypeScript/TSX** | 61 files | .ts, .tsx (React 18 + Vite) |
| **Compiled JS (lib/)** | ~10 files | TSC output from sirsi-portal/functions |
| **Cloud Functions codebases** | 2 separate | `portal` (TypeScript) + `opensign` (JavaScript) |

### The Pitch Deck Promise (Slide 8)
The pitch deck presented to investors shows a clean, tiered stack:

```
Tier 01 // CORE KERNEL        → Rust    (Schema/Consensus)
Tier 02 // ORCHESTRATION       → Go      (Stack/Fabric)
Tier 03 // TRUST LAYER         → Hedera  (DLT/Verification)
Tier 04 // EDGE FABRIC         → Nginx   (Routing/Cache)
Tier 05 // INTELLIGENCE        → Python  (Logic/AI Support)
Tier 06 // DATA STATES         → TanStack (Query/Telemetry)
Tier 07 // IDENTITY            → Firebase (Auth/Sync)
Tier 08 // UX PLANE            → TS      (UI Delivery)
```

### The Reality Gap
**The current codebase does NOT match this pitch.** Examples:
- `printable-msa.html` is a static HTML document with inline JS — should be a React/TS component with print CSS
- `sirsi-opensign/functions/index.js` is 2300+ lines of plain JavaScript — should be TypeScript
- `sirsi-portal` has ~50 handwritten HTML pages for admin, investor portal, and pitch decks
- `sirsi-component-library` uses vanilla HTML/JS components instead of React/TS from `sirsi-ui`
- Two duplicate `verifyMFA` functions exist across two codebases (caused today's MFA bug)
- The `sngp` package is entirely static HTML
- Auth/security JS files (`security-init.js`, `auth-integration.js`) are duplicated across 3 packages

---

## 2. Decision

**Converge the entire Sirsi ecosystem to one unified stack** that matches the pitch deck tiering. All legacy HTML, plain JS, and duplicated code will be eliminated.

### Target Stack V5 (The Convergence Stack)

| Tier | Role | Technology | Source of Truth |
|:-----|:-----|:-----------|:---------------|
| **T1: Core Kernel** | Schema Validation, Cryptographic Primitives, WASM Modules | **Rust** | `packages/sirsi-core/` |
| **T2: Orchestration** | gRPC Services, Domain Logic, Cloud Run Backend | **Go** | `packages/sirsi-engine/` (replaces contracts-grpc) |
| **T3: Trust Layer** | Audit Trail, DLT Anchoring | **Hedera SDK (TS)** | `packages/sirsi-engine/hedera/` |
| **T4: Edge Fabric** | Reverse Proxy, SSL, Rate Limiting | **Nginx / Cloud Load Balancer** | `infra/nginx/` |
| **T5: Intelligence** | AI Guidance Engine, Document Analysis | **Python (Vertex AI)** | `packages/sirsi-ai/` |
| **T6: Data States** | Server/Client State, Caching, Real-time Sync | **TanStack Query + Router** | `packages/sirsi-app/src/` |
| **T7: Identity** | Auth, MFA, Session, Custom Claims | **Firebase Auth** | `packages/sirsi-auth/` (unified functions) |
| **T8: UX Plane** | All UI — web, admin, investor, contracts, vault | **TypeScript + React 19 + Vite** | `packages/sirsi-app/` |

---

## 3. What Gets Eliminated vs. What Stays

### 3.0 Classification: Three Types of HTML

Not all HTML is tech debt. The 86 HTML files fall into three categories:

| Category | Purpose | Action | Count |
|:---------|:--------|:-------|:------|
| **📄 Document Store HTML** | Web-viewable versions of .md governance, legal, and investor docs | **✅ KEEP** — These are the product | ~20 |
| **⚙️ Application HTML** | Admin dashboards, test pages, component demos with inline JS | **❌ CONVERT** to React/TS | ~55 |
| **🏠 SPA Entry Points** | `index.html` files that bootstrap Vite/React apps | **✅ KEEP** — Required by Vite | ~4 |

### 3.1 ✅ KEEP: Document Store HTML (~20 files)

These files are the **web-viewable rendered versions** of Markdown governance documents. They are intentional product artifacts served from the document store (Firebase Hosting). They MUST remain as `.html` for direct browser viewing, printing, and embedding.

| File(s) | Purpose | Source |
|:--------|:--------|:-------|
| `printable-msa.html` | Printable Master Services Agreement | Rendered from `CONTRACT.md` |
| `offerings.html` | Product offerings catalog | Rendered from `catalog.ts` |
| `sign.html` | E-signature execution page | Signing workflow |
| `payment.html` | Payment confirmation page | Stripe checkout return |
| `pitch-deck.html`, `pitch-deck-2.html` | Investor pitch decks | Rendered from pitch deck docs |
| `investor-onepager.html` | Investor one-pager | Rendered from investor docs |
| `BGC-Network-Advisory*.html` | Advisory network documents | Rendered from governance docs |
| `privacy.html`, `terms.html` | Legal compliance pages | Rendered from legal .md docs |
| `sngp/investor-portal/committee/*.html` | Committee docs (go-to-market, KPI, roadmap, etc.) | Rendered from committee .md docs |
| `sngp/investor-portal/data-room.html` | Investor data room | Document store view |
| `sngp/documentation.html` | Platform documentation | Rendered from docs/ |

**Rule:** Every `.md` governance document in `docs/` or `proposals/` SHOULD have a corresponding `.html` file in the web document store for user-facing viewing.

### 3.2 ❌ CONVERT: Application HTML (~55 files → React/TS)

These are interactive pages with inline JavaScript that duplicate functionality that belongs in the React app. They should be converted to React components.

| Package | Files | Replacement |
|:--------|:------|:-----------|
| `sirsi-portal/admin/` | analytics-dashboard, auth-test, create-invoice, data-room, documentation, grant-admin, monitoring, revenue-dashboard, seed-content, site-settings, system-status/* | React admin components |
| `sirsi-portal/admin/users/` | User management pages | React `UsersAccessControl.tsx` (already exists) |
| `sirsi-portal/sirsinexusportal/` | login, signup, developer-portal, developer-signup, investor-signup, pricing, payments, dashboards, debug-*, test-*, demo-*, template-* (~40 files) | React auth + admin routes |
| `sirsi-portal/` (root) | test_payment, test_methods, test-auth-flows, validate_payments, validation, well-known-*, minimal_test | Dev tools → React DevDashboard or deleted |
| `sirsi-component-library/` | sidebar.html, admin-header.html, universal-header.html, header-template.html | Already replaced by `sirsi-ui` TSX |

### 3.3 ✅ KEEP: SPA Entry Points (~4 files)

| File | Purpose |
|:-----|:--------|
| `finalwishes-contracts/index.html` | Vite SPA entry point |
| `sirsi-opensign/public/index.html` | Firebase Hosting SPA entry |
| `sirsi-portal/admin/index.html` | Admin SPA entry |
| `sngp/index.html` | SNGP homepage |

### 3.4 ❌ CONVERT: Plain JavaScript (77 files → TypeScript)

| Category | Files | Replacement |
|:---------|:------|:-----------|
| `sirsi-opensign/functions/index.js` | 1 file, 2300+ lines | TypeScript (`sirsi-auth/functions/`) |
| Auth/Security scripts (duplicated 3x) | `auth-integration.js`, `firebase-init.js`, `secure-auth.js`, `security-init.js` | Firebase SDK called from React |
| Admin JS | `user-management.js`, `security-management.js`, `fresh-theme-toggle.js` | React admin components |
| Investor JS | `access-control.js`, `data-room-*.js`, `document-search.js`, `shared.js` | React investor components |
| Portal JS | `analytics-*.js`, `api-service.js`, `auth-fix.js`, `session-manager.js` | TanStack Query + React hooks |
| Component Library JS | `sidebar.js`, `admin-header.js`, `universal-header.js` | `sirsi-ui` TSX components |
| Build artifacts | `sirsi-portal/functions/lib/*.js` | TSC output (stays, but from unified TS source) |

### 3.5 ❌ MERGE: Duplicate Function Codebases (2 → 1)

Currently:
- `sirsi-portal/functions/` (codebase: `portal`) — TypeScript, 17 functions
- `sirsi-opensign/functions/` (codebase: `opensign`) — JavaScript, 3 functions

**Target:** One unified `sirsi-auth` codebase in TypeScript. All 20 functions from one source.

---

## 4. Migration Phases

### Phase 0: Foundation (Week 1) ⭐ START HERE
**Goal:** Unify the Cloud Functions and eliminate the duplicate `verifyMFA` bug class forever.

1. Create `packages/sirsi-auth/functions/` with TypeScript
2. Merge all 20 Cloud Functions from `portal` + `opensign` into one codebase
3. Standardize all Firestore field names (camelCase everywhere)
4. Configure single `firebase.json` entry for unified deployment
5. Delete `sirsi-opensign/functions/index.js` and `sirsi-portal/functions/`
6. Deploy and verify

**Deliverable:** One Cloud Functions codebase, zero duplicate logic.

### Phase 1: Frontend Convergence (Weeks 2-3)
**Goal:** Convert all application-logic HTML to React. Preserve document-store HTML.

1. **Application HTML → React Components**
   - Convert admin dashboard pages to React admin module
   - Convert sirsinexusportal/* interactive pages to React routes
   - Convert test/debug/demo pages to DevDashboard or delete
   - Delete `sirsi-component-library` HTML (already replaced by `sirsi-ui` TSX)

2. **Document Store HTML → Maintained + Improved**
   - Keep `printable-msa.html`, pitch decks, legal pages, investor materials
   - Add a **build pipeline** to auto-generate document HTML from `.md` sources
   - Ensure document HTML uses the Royal Neo-Deco design language
   - Document the `.md → .html` rendering pipeline in DEPLOYMENT_GUIDE.md

3. **Investor Portal → React Module**
   - Convert investor-portal interactive pages into React route components
   - Committee docs (read-only HTML) stay as document store artifacts
   - Interactive data-room features become React components

4. **Kill sngp/ package** — static pages absorbed into sirsi-app (React) + document store (HTML)

**Deliverable:** Zero application-logic HTML. Document-store HTML preserved and pipeline-managed.

### Phase 2: TanStack Integration (Week 4)
**Goal:** Replace ad-hoc state management with TanStack ecosystem.

1. Replace React Router with **TanStack Router** (file-based, type-safe)
2. Replace raw `httpsCallable` + `useEffect` patterns with **TanStack Query**
3. Keep Zustand for local client state (complementary, not competing)
4. Add **TanStack Table** for admin data grids (contracts, users, etc.)

**Deliverable:** Type-safe routing, automatic caching, no manual loading states.

### Phase 3: Go Orchestration Engine (Weeks 5-8)
**Goal:** Move business logic from Cloud Functions to Go gRPC on Cloud Run.

1. Expand existing `contracts-grpc` into `sirsi-engine`
2. Migrate domain logic:
   - Contract CRUD → Go gRPC service
   - Payment orchestration (Stripe, Plaid) → Go service
   - Email dispatch → Go service (SendGrid)
   - MFA verification → Go service (keep Firebase Auth for identity)
3. Cloud Functions reduced to:
   - Auth triggers (onCreate, onDelete)
   - Scheduled jobs (cleanup, reports)
   - Webhook entry points (Stripe, etc.)
4. Frontend communicates with Go backend via ConnectRPC (gRPC-Web)

**Deliverable:** Go is the brain, Firebase is the identity layer.

### Phase 4: Rust Core (Weeks 9-12)
**Goal:** Introduce Rust for cryptographic and validation workloads.

1. Build `packages/sirsi-core/` with Rust
2. Compile to WebAssembly for in-browser execution:
   - Document hash verification (SHA-256 evidence chain)
   - Schema validation (contract structure)
   - Cryptographic signature verification
3. Build native binary for server-side:
   - Batch document processing
   - Compliance scanning
4. Integrate via WASM in React and via FFI in Go

**Deliverable:** Provable computation at the edge and on the server.

### Phase 5: Trust & AI Layers (Weeks 13-16)
**Goal:** Wire in Hedera and Vertex AI.

1. **Hedera:** Anchor document hashes to HCS (Hedera Consensus Service) for immutable audit trail
2. **Vertex AI:** Deploy Sirsi Persona as a conversational guidance engine
3. **Python wrapper** for Vertex AI inference + RAG pipeline

**Deliverable:** The full 8-tier stack is live.

---

## 5. Repository Structure (Post-Convergence)

```
SirsiNexusApp/
├── packages/
│   ├── sirsi-app/              # T8: UX Plane (React 19 + Vite + TanStack)
│   │   ├── src/
│   │   │   ├── routes/         # TanStack Router (file-based)
│   │   │   │   ├── vault/
│   │   │   │   ├── admin/
│   │   │   │   ├── investor/
│   │   │   │   ├── contracts/
│   │   │   │   └── auth/
│   │   │   ├── components/     # Shared UI
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # Zustand (client state)
│   │   │   ├── queries/        # TanStack Query definitions
│   │   │   ├── lib/            # Firebase, gRPC clients
│   │   │   └── data/           # catalog.ts + templates
│   │   └── vite.config.ts
│   │
│   ├── sirsi-ui/               # Shared component library (TSX)
│   │
│   ├── sirsi-auth/             # T7: Identity (Unified Cloud Functions - TS)
│   │   └── functions/
│   │       └── src/index.ts    # All callable + trigger functions
│   │
│   ├── sirsi-engine/           # T2: Orchestration (Go gRPC on Cloud Run)
│   │   ├── cmd/server/main.go
│   │   ├── internal/
│   │   │   ├── contracts/
│   │   │   ├── payments/
│   │   │   ├── mfa/
│   │   │   └── notifications/
│   │   ├── proto/              # Protobuf definitions
│   │   └── Dockerfile
│   │
│   ├── sirsi-core/             # T1: Core Kernel (Rust → WASM + native)
│   │   ├── src/lib.rs
│   │   ├── Cargo.toml
│   │   └── wasm/               # WASM build output
│   │
│   ├── sirsi-ai/               # T5: Intelligence (Python + Vertex AI)
│   │   └── main.py
│   │
│   └── prisma/                 # Database schema (already exists)
│
├── proto/                      # Global Protobuf definitions (buf.build)
├── infra/                      # T4: Nginx + Cloud config
│   ├── nginx/
│   └── terraform/
│
├── firebase.json               # Single root firebase.json
└── GEMINI.md
```

---

## 6. What This Eliminates

| Eliminated | Count | Replaced By |
|:-----------|:------|:-----------|
| Application-logic HTML | ~55 files | React routes + TanStack |
| Plain JavaScript files | 77 | TypeScript (strict mode) |
| Duplicate Cloud Function codebases | 2 → 1 | `sirsi-auth` |
| Handwritten auth/security scripts | 12 | Firebase SDK in React |
| `sirsi-component-library` (HTML/JS) | entire package | `sirsi-ui` (TSX) |
| `sngp` interactive pages | absorbed | `sirsi-app` (React) |
| `sirsi-opensign/functions` (JS) | merged | `sirsi-auth` (TS) |
| `sirsi-portal/functions` (TS) | merged | `sirsi-auth` (TS) |

### What STAYS

| Preserved | Count | Reason |
|:----------|:------|:-------|
| Document Store HTML | ~20 files | Web-viewable versions of .md governance docs |
| SPA Entry Points | ~4 files | Required by Vite/Firebase Hosting |
| TSC Build Artifacts | ~10 files | Compiled output from TypeScript sources |
| Config files (`.config.js`) | ~5 files | Vite, Tailwind, PostCSS, ESLint configs |

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|:-----|:---------|:-----------|
| Breaking live contract flow | 🔴 Critical | Phase 0 first (backend only), Phase 1 maintains all routes |
| Investor portal downtime | 🟡 Medium | Feature-flag new React investor routes, sunset HTML after parity |
| Document HTML formatting | 🟢 Low | Document HTML is preserved and improved with Royal Neo-Deco styling |
| Go migration scope creep | 🟡 Medium | Phase 3 is additive — Cloud Functions keep working throughout |

---

## 8. Success Criteria

- [ ] All **application-logic** HTML converted to React components (zero interactive HTML with inline JS)
- [ ] All **document-store** HTML files present and properly styled with Royal Neo-Deco
- [ ] `find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/lib/*" -not -path "*/dist/*" -not -name "*.config.js"` returns **0 results**
- [ ] Single `firebase deploy --only functions` deploys ALL functions
- [ ] `npx tsc --noEmit` passes across the entire repo
- [ ] Pitch deck slide 8 matches the actual deployed architecture
- [ ] Every **interactive UI surface** is a React component
- [ ] Every `.md` governance doc has a corresponding `.html` in the document store
- [ ] `.md → .html` rendering pipeline documented and automated

---

## References
- ADR-001: Architecture Decisions
- ADR-013: Hierarchical URL Structure
- ADR-014: Bipartite Execution Protocol
- ADR-015: OpenSign Convergence
- GEMINI.md Section 3: Stack V4 (superseded by V5)
- Pitch Deck Slide 8: "Technical Bedrock. Autonomous Core."

