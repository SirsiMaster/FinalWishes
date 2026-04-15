# Version Registry — FinalWishes Component Tracker
## Age, Date, Status of Every Component
**Last Updated:** 2026-04-14 — **Current Release:** v0.5.0

---

## Platform Applications

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **Web Dashboard** | 0.5.0 | 2026-02-17 | 2026-04-14 | ✅ Production (22 routes, 129 tests) | React 19 + Vite 8 + TanStack |
| **Landing Page** | 1.0.0 | 2026-02-17 | 2026-04-14 | ✅ Deployed | React (single route) |
| **Login Page** | 0.3.0 | 2026-03-01 | 2026-04-14 | ✅ Firebase Auth (email + username + MFA) | React + Firebase Auth |
| **iOS App** | — | — | — | Removed (Apr 2026) | Deferred until web stable |
| **Android App** | — | — | — | Removed (Apr 2026) | Deferred until web stable |
| **macOS Desktop** | — | — | — | Removed (Apr 2026) | Deferred until web stable |

## Backend Services

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **Go API (Cloud Run)** | 0.5.0 | 2026-03-01 | 2026-04-14 | ✅ Production — rev 11, ~10,500 lines | Go 1.26 + ConnectRPC + Firebase Admin |
| **Proto Definitions** | 0.2.0 | 2026-03-01 | 2026-04-14 | ✅ Active — 18 RPC methods, ~253 lines | Protobuf + ConnectRPC |
| **Firebase Functions** | 0.1.0 | 2026-03-17 | 2026-04-14 | ✅ Production — autoMatchInvitation | Node.js 20 |
| **Firestore Rules** | 5.0.0 | 2026-02-17 | 2026-04-14 | ✅ Production — comprehensive RBAC, ~573 lines | Firestore Rules DSL |

## Shared Libraries

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **shared/crypto** | — | — | — | Removed (Apr 2026) | Client-side encryption never used; Cloud KMS handles all encryption |
| **shared/types** | 1.0.0 | 2026-03-18 | 2026-04-14 | ✅ Active — proto-aligned type definitions | TypeScript |
| **shared/api-client** | — | — | — | Removed (Apr 2026) | Web uses ConnectRPC directly |

## Design System

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **Royal Neo-Deco Tokens** | 1.0.0 | 2026-02-17 | 2026-03-19 | ✅ Established | CSS Custom Properties |
| **globals.css** | 1.1.0 | 2026-02-17 | 2026-03-19 | ✅ 584 lines (shadcn/ui + Royal Neo-Deco) | Tailwind v4 + shadcn |
| **Sidebar** | 0.2.0 | 2026-03-01 | 2026-03-18 | ⚠️ Hardened, needs mobile | React |
| **AdminHeader** | 0.2.0 | 2026-03-01 | 2026-03-18 | ⚠️ Hardened | React |
| **shadcn/ui** | 0.1.0 | 2026-03-19 | 2026-03-19 | ✅ Initialized (Radix/Nova, 13 components) | shadcn + Radix |
| **Turborepo** | 2.8.x | 2026-03-19 | 2026-03-19 | ✅ Wired (web + shared workspaces) | Turborepo |
| **Antigravity Skills** | 1.0.0 | 2026-03-19 | 2026-03-19 | ✅ 26 skills, universal (`~/.gemini/antigravity/skills/`) | Markdown (SKILL.md) |

## Cloud Infrastructure

| Component | Version | Provisioned | Last Verified | Status | Service |
|-----------|:-------:|:-----------:|:-------------:|:------:|---------|
| **Firebase Auth** | 1.0.0 | 2026-02-17 | 2026-03-19 | ✅ Wired to React + Go API | Identity Platform |
| **Firestore** | — | 2026-02-17 | 2026-03-18 | ⚠️ Active, basic rules | Firestore |
| **Firebase Hosting** | — | 2026-02-17 | 2026-03-18 | ✅ Deployed | Firebase Hosting |
| **Cloud Storage** | — | 2026-02-17 | 2026-03-18 | ⚠️ Bucket exists, no app integration | Cloud Storage |
| **Cloud Run** | — | — | — | 🔲 Not provisioned | Cloud Run |
| **Cloud SQL** | — | — | — | 🔲 Not provisioned | Cloud SQL (PostgreSQL) |
| **Cloud KMS** | — | — | — | 🔲 Not provisioned | Cloud KMS |
| **Cloud Tasks** | — | — | — | 🔲 Not provisioned | Cloud Tasks |
| **Cloud Scheduler** | — | — | — | 🔲 Not provisioned | Cloud Scheduler |
| **Vertex AI** | — | — | — | 🔲 Not provisioned | Vertex AI |
| **Document AI** | — | — | — | 🔲 Not provisioned (Tier 3) | Document AI |
| **Cloud Armor** | — | — | — | 🔲 Not provisioned | Cloud Armor |
| **Cloud DNS** | — | — | — | 🔲 Not provisioned | Cloud DNS |

## Google API Integrations

| API | Version | Enabled | Integrated | Status | Notes |
|-----|:-------:|:-------:|:----------:|:------:|-------|
| **YouTube Data API v3** | — | 🔲 | 🔲 | 🔲 Not started | Video memorials |
| **Google Photos API** | — | 🔲 | 🔲 | 🔲 Not started | Photo galleries |
| **Firebase Genkit** | — | 🔲 | 🔲 | 🔲 Not started | AI orchestration |
| **FCM** | — | 🔲 | 🔲 | 🔲 Not started | Push notifications |
| **GA4** | — | 🔲 | 🔲 | 🔲 Not started | Analytics |

## Third-Party Integrations

| Service | Provider | Status | Consumed Via |
|---------|----------|:------:|-------------|
| **E-Signatures** | OpenSign | ⚠️ Available, not wired | Sirsi Sign (sign.sirsi.ai) |
| **Payments** | Stripe | ⚠️ Available, not wired | Sirsi Sign |
| **Bank Linking** | Plaid | ⚠️ Available, not wired | Sirsi Sign |
| **Email** | SendGrid / Firebase Extension | 🔲 Not configured | Firebase Extension |

## AI / ML Stack

| Component | Model / Tool | Status | Purpose |
|-----------|-------------|:------:|---------|
| **The Shepherd (Guidance)** | Gemini Pro/Flash via Genkit | 🔲 Not started | Legacy guidance, completion scoring |
| **NemoClaw / Nemotron** | NVIDIA Nemotron 3 Super | 🔲 Not started | Legal document intelligence, exportable to Sirsi Nexus |

## Canon Documents

| Document | Version | Created | Last Modified | Status |
|----------|:-------:|:-------:|:-------------:|:------:|
| **ETHOS.md** | — | 2026-04-14 | 2026-04-14 | ✅ Permanent (non-versioned) |
| **CLAUDE.md** | 2.0.0 | 2026-02-17 | 2026-04-07 | ✅ Active |
| **CANONICAL_DEVELOPMENT_PLAN.md** | 3.0.0 | 2026-03-18 | 2026-04-14 | ✅ Active (Phase 5 added) |
| **PRODUCT_SPECIFICATION.md** | 1.0.0 | 2026-03-18 | 2026-03-18 | ✅ Active |
| **DATA_MODEL_LOCK.md** | 1.0.0 | 2026-03-17 | 2026-03-17 | 🔒 Locked |
| **CHANGELOG.md** | 1.0.0 | 2026-03-18 | 2026-04-14 | ✅ Active (v0.5.0) |
| **VERSION_REGISTRY.md** | 2.0.0 | 2026-03-18 | 2026-04-14 | ✅ Active |
| **ADR-034** | 1.0.0 | 2026-03-19 | 2026-03-19 | ✅ Accepted |
| **ADR-038** | 1.0.0 | 2026-04-14 | 2026-04-14 | ✅ Accepted (Life-First Reframe) |
| **CONTINUATION-PROMPT.md** | 18.0 | 2026-02-17 | 2026-04-14 | ✅ Active (Session 6) |

---

### Status Legend
| Icon | Meaning |
|:----:|---------|
| ✅ | Complete / Deployed / Active |
| ⚠️ | Partially built / Needs work |
| 🔲 | Not started / Not provisioned |
| 🔒 | Locked — requires ADR to modify |

---

> [!IMPORTANT]
> This registry MUST be updated every time a component is added, modified, or its status changes. Include the date and version bump.
