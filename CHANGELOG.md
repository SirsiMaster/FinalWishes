# Changelog — FinalWishes
All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

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

## [Unreleased]
### Planned
- Phase 1, Week 2: Firestore security rules, real data wiring, Cloud SQL/KMS
- Phase 2: Vault, YouTube Memorials, Google Photos, Lockbox, Capsules, Shepherd AI

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
