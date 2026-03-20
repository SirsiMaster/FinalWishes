# Changelog — FinalWishes
All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

---

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
