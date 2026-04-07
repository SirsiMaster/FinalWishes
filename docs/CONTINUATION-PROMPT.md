# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — April 7, 2026 (v11.0)
**Priority:** Stack Consolidation COMPLETE → Sprint 5 (Testing + Production Hardening)

---

## Who You Are

You are **Claude**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `CLAUDE.md` at the repo root first. It has all operational rules.

---

## Current State (v0.10.0 + Stack Consolidation)

### What Exists and Works
- **Web App**: React 19 + Vite 8 + TanStack Router + shadcn/ui + Tailwind v4
- **Go API**: Chi + ConnectRPC on Cloud Run — auth, vault, OpenSign proxy, signed URLs
- **Database**: Firestore (real-time) + Cloud SQL PostgreSQL 15 (PII vault)
- **Security**: Cloud KMS envelope encryption (AES-256-GCM, per-estate AAD), 3-tier identity verification
- **CI/CD**: GitHub Actions (web) + Cloud Build (API) — deploys to Firebase Hosting + Cloud Run
- **E-Sign**: Go API proxies to sign.sirsi.ai via `/api/v1/opensign/*`
- **Email**: Firebase Extension (SendGrid) — Firestore trigger on `mail` collection
- **Firestore Triggers**: `autoMatchInvitation` — auto-grants estate access on user registration

### Version History

| Version | Deliverable |
|---------|------------|
| 0.4.0 | Firestore Direct Reads (ADR-036), security rules, Cloud Functions |
| 0.5.0-0.5.2 | Firestore hooks, indexes, estate dashboard, onboarding, invitations |
| 0.6.0 | Settings page, ALL pages wired to Firestore |
| 0.7.0 | Full build verified, CI/CD migrated to `finalwishes-prod` |
| 0.8.0-0.8.1 | PII Vault (Cloud KMS + Cloud SQL), Email System (SendGrid) |
| 0.9.0 | Document Vault — Upload/Download/Preview/Delete with signed URLs |
| 0.10.0 | YouTube Memorials + Photo Gallery |
| **0.11.0** | **Stack consolidation: deleted mobile/desktop scaffolds, consolidated to single Go backend, cleaned dead deps, updated all canonical docs** |

---

## What Was Done This Session (v0.11.0 — Stack Consolidation)

### Deleted (dead weight)
- `mobile/` — broken Expo scaffold (missing assets, screens, crashes)
- `desktop/` — empty Tauri shell (config only)
- `shared/api-client/`, `shared/crypto/` — never imported
- `shared/constants/`, `shared/validators/`, `improvements/` — empty directories
- `web/out/` — old Next.js build artifacts
- 3 docs: PORTFOLIO_CANONICAL_STANDARD (superseded), COMMUNICATION_PLAN (aspirational), TRAINING_DOCUMENTATION (stub)
- QA_PLAN.md merged into TEST_PLAN.md

### Consolidated
- Firebase Functions: stripped from Express app (502 lines) to Firestore trigger only (108 lines)
- Removed hardcoded mock data from production Functions
- Removed `/api/**` → Functions rewrite from firebase.json
- Express + cors removed from Functions dependencies

### Cleaned
- `zustand`, `next-themes`, `@tanstack/react-query-devtools` removed from web
- `sonner.tsx` fixed (next-themes import → hardcoded dark theme)
- `go.work` version fixed (1.25→1.24)

### Updated Docs
- CLAUDE.md → v2.0.0 (tech stack, architecture rules, shared services)
- CANONICAL_DEVELOPMENT_PLAN.md → v3.0.0 (actual code counts, Phase 3 = testing, acceptance criteria with checkboxes)
- TEST_PLAN.md → v2.0.0 (merged QA gates, correct stack references)
- ADR-INDEX: ADR-009, 017, 018 marked Superseded
- PROJECT_MANAGEMENT.md, POST_IMPLEMENTATION_REVIEW.md archived

### Verified
- Web build: passes (130ms, 1.18MB total)
- Go API: `go vet` clean, 32 tests pass with race detector
- Zero regressions

---

## What's Next (Sprint 5 — Testing + Production Hardening)

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Add frontend tests (Vitest + RTL) — auth, hooks, vault | 2-3 days |
| P0 | Add error boundaries for Firestore failures | 1 day |
| P0 | Fix ESLint exhaustive-deps warnings properly | 1 day |
| P1 | Staging environment (Firebase preview + Cloud Run revision) | 1 day |
| P1 | Playwright E2E tests (onboarding, vault, beneficiaries) | 2-3 days |
| P1 | Go integration tests (Firestore emulator + test PostgreSQL) | 2 days |
| P2 | The Shepherd (Genkit AI guidance engine) | 3-5 days |
| P2 | Digital Lockbox (encrypted credentials) | 2 days |
| P2 | Time Capsule (Cloud Tasks scheduled delivery) | 2 days |
| P2 | Final Directives (ethical wills, funeral prefs, PDF export) | 2 days |

---

## Key File Paths

| Purpose | Path |
|---------|------|
| Canonical config | `CLAUDE.md` |
| Dev plan | `docs/CANONICAL_DEVELOPMENT_PLAN.md` |
| Go API entry | `api/cmd/api/main.go` |
| Web entry | `web/src/main.tsx` |
| Routes | `web/src/routes/` |
| Auth context | `web/src/lib/auth.tsx` |
| Firestore hooks | `web/src/lib/firestore.ts` |
| ConnectRPC client | `web/src/lib/client.ts` |
| PII Vault | `api/internal/vault/` |
| Encryption | `api/internal/crypto/kms.go` |
| Proto definitions | `proto/estate/v1/estate.proto` |
| Firestore rules | `firestore.rules` |
| Firestore triggers | `functions/index.js` |

---

## Architecture (Single-Backend)

```
Web (React 19/Vite) → Firebase Auth (direct)
                     → Firestore (onSnapshot, direct reads)
                     → Go API (Cloud Run, ConnectRPC)
                         → Cloud SQL (PII, encrypted)
                         → Cloud KMS (envelope encryption)
                         → Cloud Storage (signed URLs)
                         → sign.sirsi.ai (OpenSign proxy)

Firestore Triggers (Firebase Functions):
  └── autoMatchInvitation
```

All HTTP API endpoints live in the Go API. Firebase Functions handle Firestore triggers only.
