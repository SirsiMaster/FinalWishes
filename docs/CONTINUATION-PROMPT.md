# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 18, 2026
**Priority:** Start Phase 0 (Stabilize & Merge), then Phase 1 (Real Infrastructure)

---

## Who You Are

You are **Antigravity**, the AI agent for the **FinalWishes** project — "The Estate Operating System." Read `GEMINI.md` at the repo root before doing anything. It contains all operational rules.

## The Project

**FinalWishes** is a $95,000 "Living Legacy" platform (MSA-2025-111-FW, SOW-2025-001). It is NOT a probate tool. It lets a person (the Principal) organize memories, documents, final instructions, and asset designations — then control exactly how and when that legacy is delivered to their heirs.

**The contract was pivoted on Feb 17, 2026** from a $175K probate-focused platform to a $95K Google-first media preservation and directive management platform. The pivot record lives at:
- `closed_conversations/2026-02-17-FinalWishes-Contract-Overhaul.md`
- The executed contract: `SirsiNexusApp/packages/sirsi-opensign/public/finalwishes/contracts/printable-msa.html`

## Canon Documents (Read These First)

| Document | Path | What It Contains |
|----------|------|-----------------|
| **GEMINI.md** | `/Development/FinalWishes/GEMINI.md` | All operational rules, design system, stack |
| **Canonical Development Plan** | `docs/CANONICAL_DEVELOPMENT_PLAN.md` | Google-first feature→service mapping, tiers, roadmap |
| **Product Specification** | `docs/PRODUCT_SPECIFICATION.md` | Every screen, feature, API route, data flow |
| **Data Model Lock** | `docs/DATA_MODEL_LOCK.md` | Locked Firestore + Cloud SQL schemas |
| **ADR Index** | `docs/ADR-INDEX.md` | All 33 architectural decision records |
| **ADR-033** | `docs/ADR-033-DESIGN-SYSTEM-ACCELERATION.md` | shadcn/ui + cross-portfolio reuse strategy |

## Technology Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Web | React 18, Vite, TanStack (Router/Query), shadcn/ui | Tailwind CSS, Royal Neo-Deco theme |
| Mobile | React Native, Expo, NativeWind | Shared logic with web via `shared/` |
| Desktop | Tauri (Rust) | Wraps the web app |
| Backend | Go (Golang) on Cloud Run | REST+JSON (migrating from ConnectRPC) |
| Database | Firestore + Cloud SQL (PostgreSQL) | Firestore for metadata, Cloud SQL for PII |
| Auth | Firebase Auth + Identity Platform | MFA (TOTP), custom claims |
| Encryption | Cloud KMS + Web Crypto API (AES-256-GCM) | Client-side encrypt, Cloud KMS for key management |
| AI | Firebase Genkit + Vertex AI (Gemini) | The Shepherd guidance engine |
| Media | YouTube Data API v3 + Google Photos API | Video memorials + photo galleries |
| E-Sign/Pay/Bank | Sirsi Sign (sign.sirsi.ai) | Consumes OpenSign, Stripe, Plaid as services |
| Email | Firebase Extension: Trigger Email | Zero-code — write to Firestore, email sent |
| Push | Firebase Cloud Messaging (FCM) | Time capsule delivery, death alerts |

## Design System: Royal Neo-Deco

- **Background:** Deep Royal Blue gradient (NOT black, NOT emerald)
- **Primary:** Royal Blue `#133378` / `#1E3A5F` / `#2563EB`
- **Accent:** Metallic Gold `#C8A951` (NO gradients on buttons)
- **Headings:** Cinzel (serif, uppercase tracking)
- **Body:** Inter (sans-serif)
- **Components:** 24px rounded glass cards, gold borders, film grain overlay
- **Branding & Identity** ($30K add-on) was purchased — all UI must conform

## Current State of the Codebase

### What's Built and Working
- ✅ Landing page — deployed at `legacy-estate-os.web.app`
- ✅ Login page — UI built (Royal Neo-Deco glass aesthetic)
- ✅ Dashboard — 9 route files with UI shells (uses mock Lockhart data)
- ✅ Memoirs page — VideoCard, PhotoCard, cinema-grade viewer modal
- ✅ Client-side encryption — `shared/crypto/index.ts`
- ✅ Shared types — `shared/types/index.ts`
- ✅ CSS design system — `web/src/styles/globals.css` (326 lines)
- ✅ Firebase Hosting — live deployment

### What's Broken / Not Real
- ❌ **Auth is fake** — `login.tsx` stores `{ authenticated: true }` in localStorage
- ❌ **All data is mock** — `web/src/lib/client.ts` has a Proxy that returns hardcoded Lockhart Estate data on 400ms timeout
- ❌ **Go API is empty** — project structure exists, zero working endpoints
- ❌ **ConnectRPC** — the client imports from `../gen/estate/v1/estate_pb` which references a proto-generated client. **Decision: switch to REST+JSON.**
- ❌ **Firestore rules** — basic, not estate-scoped
- ❌ **Cloud SQL** — not provisioned
- ❌ **Cloud KMS** — not provisioned
- ❌ **CI/CD** — manual deploys only
- ❌ **`develop` ≠ `main`** — 30+ commits on `develop` not merged. **Merge immediately.**
- ❌ **Build artifacts in git** — `web/dist/` is committed (should be gitignored)

### Key Files

| File | Purpose |
|------|---------|
| `web/src/lib/client.ts` | API client with mock Lockhart data fallback — **must be rewritten** |
| `web/src/routes/login.tsx` | Login UI — **must wire to Firebase Auth** |
| `web/src/routes/estates.$estateId.memoirs.tsx` | Memoirs page — **must wire to YouTube API** |
| `web/src/routes/index.tsx` | Landing page — polished, deployed |
| `web/src/styles/globals.css` | Design system tokens — Royal Neo-Deco |
| `web/src/components/layout/Sidebar.tsx` | Dashboard sidebar navigation |
| `web/src/components/layout/AdminHeader.tsx` | Dashboard header |
| `shared/crypto/index.ts` | AES-256-GCM encrypt/decrypt utilities |
| `shared/types/index.ts` | TypeScript types for Estate, Asset, Document, etc. |
| `api/scripts/seed/main.go` | Go seed script (mostly empty) |
| `functions/index.js` | Firebase Functions (basic Cloud Storage trigger) |

### Git State
- **Branch:** `develop` (HEAD)
- **Last commit:** `d764328` — "canon: complete product specification"
- **30+ commits ahead of `main`** — needs merge
- **13 Dependabot vulnerabilities** — non-blocking (node_modules)

## What To Do Next (In Order)

### PHASE 0: Stabilize & Merge (~2 days)
1. Landing page final viewport font audit + minor polish
2. Dashboard ELI5 sweep (remove "Shard"/"Protocol"/"Enclave" language)
3. Remove `web/dist/` from git, add to `.gitignore`
4. Merge `develop` → `main`, tag `v0.1.0-alpha`

### PHASE 1: Real Infrastructure (Weeks 1-4)
1. Firebase Auth SDK integration (replace localStorage)
2. Go API: rest endpoints (users, estates, assets, documents)
3. Firestore security rules (estate-scoped access)
4. Cloud SQL provisioning + PII tables
5. Cloud KMS key ring + crypto key
6. Wire React frontend to real Firestore/API data
7. CI/CD (GitHub Actions → Firebase Hosting + Cloud Run)
8. shadcn/ui initialization + Royal Neo-Deco theming

### PHASE 2: Core Features (Weeks 5-10)
1. Document Vault — Cloud Storage + KMS encryption flow
2. Video Memorials — YouTube Data API integration
3. Photo Galleries — Google Photos API integration
4. Digital Lockbox — encrypted credential storage
5. Final Directives — tiptap editor + PDF export + Sirsi Sign signing
6. Time Capsules — Cloud Tasks scheduled delivery
7. The Shepherd AI — Genkit flows + Vertex AI Gemini
8. Beneficiary Management — invitation emails + acceptance flow
9. Notifications — real-time Firestore + FCM push

### PHASE 3: Mobile & Desktop (Weeks 9-12)
### PHASE 4: QA, Security & Launch (Weeks 13-16)

Full details in the phased execution plan (artifact in conversation `344e7d88`).

## Sirsi Sign Integration

FinalWishes **consumes** Sirsi Sign at `sign.sirsi.ai` — it does NOT build its own:
- **E-Signatures** → OpenSign (already deployed)
- **Payments** → Stripe (already integrated)
- **Bank Linking** → Plaid (already integrated)
- **MFA Ceremony** → Already built
- **PDF Generation** → Puppeteer (already running)

Per MSA §4.6: *"These integrations shall route through Provider's infrastructure."*

## Critical Rules

1. **Branding & Identity** ($30K) was purchased — all UI must conform to its design specs
2. **State engines (MD/IL/MN probate) are NOT in scope** — they're a $35K add-on
3. **Plaid direct integration is NOT in scope** — bank linking is consumed via Sirsi Sign
4. **Browser subagent** must use `ccollymo@alumni.chicagobooth.edu` Chrome profile (Rule 28)
5. **Identity**: All Git/Firebase work uses `SirsiMaster` account exclusively
6. **No slate/grey text** — use only `#0F172A` (dark) or `#133378` (Royal Blue)
7. **No gradients on buttons** — solid Metallic Gold `#C8A951` only
8. **Git repo**: `github.com/SirsiMaster/FinalWishes`, local at `/Users/thekryptodragon/Development/FinalWishes`

---

**Ready to resume. Start by reading `GEMINI.md`, then execute Phase 0.**
