# Version Registry — FinalWishes Component Tracker
## Age, Date, Status of Every Component
**Last Updated:** 2026-03-19 — **Current Release:** v0.1.2-alpha

---

## Platform Applications

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **Web Dashboard** | 0.1.0-alpha | 2026-02-17 | 2026-03-18 | ⚠️ UI Shells (mock data) | React 18 + Vite + TanStack |
| **Landing Page** | 1.0.0 | 2026-02-17 | 2026-03-18 | ✅ Deployed | React (single route) |
| **Login Page** | 0.1.0 | 2026-03-01 | 2026-03-18 | ⚠️ UI only (localStorage) | React |
| **iOS App** | 0.0.1 | 2026-03-18 | 2026-03-18 | 🔲 Stubs | React Native + Expo |
| **Android App** | 0.0.1 | 2026-03-18 | 2026-03-18 | 🔲 Stubs | React Native + Expo |
| **macOS Desktop** | 0.0.1 | 2026-03-18 | 2026-03-18 | 🔲 Config only | Tauri (Rust) |

## Backend Services

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **Go API (Cloud Run)** | 0.0.1 | 2026-03-01 | 2026-03-17 | 🔲 Scaffold, no endpoints | Go + ConnectRPC |
| **Proto Definitions** | 0.0.1 | 2026-03-01 | 2026-03-17 | 🔲 EstateService only | Protobuf + ConnectRPC |
| **Firebase Functions** | 0.1.0 | 2026-03-17 | 2026-03-17 | ⚠️ Cloud Storage trigger | Node.js |
| **Firestore Rules** | 0.1.0 | 2026-02-17 | 2026-03-17 | ⚠️ Basic, not estate-scoped | Firestore Rules DSL |

## Shared Libraries

| Component | Version | Created | Last Modified | Status | Tech |
|-----------|:-------:|:-------:|:-------------:|:------:|------|
| **shared/crypto** | 1.0.0 | 2026-03-18 | 2026-03-18 | ✅ Complete | TypeScript (Web Crypto API) |
| **shared/types** | 1.0.0 | 2026-03-18 | 2026-03-18 | ✅ Complete | TypeScript |
| **shared/api-client** | 0.1.0 | 2026-03-18 | 2026-03-18 | ⚠️ Mock fallback proxy | TypeScript |

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
| **Firebase Auth** | — | 2026-02-17 | 2026-03-18 | ⚠️ Provisioned, not wired to app | Identity Platform |
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
| **GEMINI.md** | 1.1.0 | 2026-02-17 | 2026-03-18 | ✅ Active |
| **CANONICAL_DEVELOPMENT_PLAN.md** | 2.0.0 | 2026-03-18 | 2026-03-18 | ✅ Active |
| **PRODUCT_SPECIFICATION.md** | 1.0.0 | 2026-03-18 | 2026-03-18 | ✅ Active |
| **DATA_MODEL_LOCK.md** | 1.0.0 | 2026-03-17 | 2026-03-17 | 🔒 Locked |
| **CHANGELOG.md** | 1.0.0 | 2026-03-18 | 2026-03-18 | ✅ Active |
| **VERSION_REGISTRY.md** | 1.1.0 | 2026-03-18 | 2026-03-19 | ✅ Active |

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
