# Architecture Design Document
## FinalWishes - The Estate Operating System
**Version:** 4.0.0
**Date:** December 5, 2025

---

## 1. Architecture Overview

### 1.1 Development Model
**AI-Assisted Development** - This platform is built using Claude and AI tools as the development team, with human oversight only. No traditional human development team.

### 1.2 System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SYSTEMS                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Stripe    SendGrid    Vertex AI    Firebase Auth    App Stores          │
└────────┬──────────┬─────────┬───────────┬───────────────┬───────────────┘
         │          │         │           │               │
         └──────────┴─────────┴───────────┴───────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────┐
│                    MYSHEPHERD PLATFORM                     │
├───────────────────────────────────────────────────────────┤
│   ┌─────────────────────────────────────────────────┐     │
│   │              Client Applications                 │     │
│   │  ┌─────────────┐ ┌─────────┐ ┌─────────────┐   │     │
│   │  │ React Web   │ │ React   │ │ React       │   │     │
│   │  │ (Vite)      │ │ Native  │ │ Native      │   │     │
│   │  │             │ │ iOS     │ │ Android     │   │     │
│   │  └─────────────┘ └─────────┘ └─────────────┘   │     │
│   └──────────────────────┬──────────────────────────┘     │
│                          │                                │
│   ┌──────────────────────┴──────────────────────────┐    │
│   │                  Go API (Cloud Run)              │    │
│   │     Chi Router + Domain Services + Repository    │    │
│   └──────────────────────┬──────────────────────────┘    │
│                          │                                │
│          ┌───────────────┼───────────────┐                │
│          │               │               │                │
│   ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐        │
│   │  Firestore  │ │  Cloud SQL  │ │   Cloud     │        │
│   │ (Real-time) │ │   (PII)     │ │   Storage   │        │
│   └─────────────┘ └─────────────┘ └─────────────┘        │
│                          │                                │
│                   ┌──────┴──────┐                         │
│                   │  Cloud KMS  │                         │
│                   │ (Encryption)│                         │
│                   └─────────────┘                         │
│                          │                                │
│                   ┌──────┴──────┐                         │
│                   │  Vertex AI  │                         │
│                   │  (LLM Agent)│                         │
│                   └─────────────┘                         │
└───────────────────────────────────────────────────────────┘
```

### 1.3 Technology Stack (GCP)

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Web Frontend** | React 18 + Vite | Fast builds, modern React, excellent DX |
| **Mobile Apps** | React Native + Expo | 60-70% code sharing, native performance |
| **Backend API** | Go on Cloud Run | Official Firebase SDK, fast cold starts, AI-friendly |
| **Database** | Firestore + Cloud SQL | Real-time sync + relational PII storage |
| **Auth** | Firebase Authentication | MFA support, multiple providers, secure |
| **Storage** | Cloud Storage | Client-side encrypted documents |
| **Key Management** | Cloud KMS (software) | AES-256 encryption, $13K/yr cheaper than HSM |
| **Hosting** | Firebase Hosting | Global CDN, automatic SSL |
| **AI/LLM** | Vertex AI | Process intelligence, document understanding |
| **CI/CD** | GitHub Actions | Automated deployment to Cloud Run + Firebase |

**Architecture Decision Records:** See `docs/ADR-001-ARCHITECTURE-DECISIONS.md`

### 1.4 Architecture Principles

1. **Security First** - All data encrypted at rest (AES-256) and in transit (TLS 1.3)
2. **API-First** - All functionality exposed via versioned REST APIs
3. **Stateless Services** - Horizontal scaling without session affinity
4. **Client-Side Encryption** - Documents encrypted before upload
5. **Observable** - Comprehensive logging via Cloud Logging
6. **Fail Gracefully** - Circuit breakers, fallbacks, graceful degradation

---

## 2. Backend Architecture (Go)

### 2.1 Project Structure

```
api/
├── cmd/
│   └── api/
│       └── main.go              # Application entry point
├── internal/
│   ├── api/
│   │   ├── handlers/            # HTTP handlers
│   │   ├── middleware/          # Auth, logging, rate limiting
│   │   └── routes.go            # Route definitions
│   ├── domain/
│   │   ├── user/                # User domain logic
│   │   ├── estate/              # Estate domain logic
│   │   ├── asset/               # Asset domain logic
│   │   ├── document/            # Document domain logic
│   │   └── notification/        # Notification domain logic
│   ├── repository/
│   │   ├── firestore/           # Firestore implementations
│   │   └── cloudsql/            # Cloud SQL implementations (PII)
│   ├── service/
│   │   ├── auth/                # Firebase Auth integration
│   │   ├── storage/             # Cloud Storage integration
│   │   ├── kms/                 # Cloud KMS integration
│   │   ├── payment/             # Stripe integration
│   │   └── email/               # SendGrid integration
│   └── config/
│       └── config.go            # Configuration management
├── pkg/
│   ├── validator/               # Input validation
│   ├── crypto/                  # Encryption utilities
│   └── logger/                  # Structured logging
├── Dockerfile
├── cloudbuild.yaml
└── go.mod
```

### 2.2 Key Components

#### HTTP Server
- **Framework:** Chi Router (lightweight, stdlib compatible)
- **Middleware Stack:**
  - Request ID generation
  - Structured logging (Cloud Logging)
  - CORS configuration
  - Firebase Auth token validation
  - Rate limiting (100 req/min per user)
  - Request/response compression

#### Domain Layer
- Business logic isolated from HTTP layer
- Interface-based dependencies for testability
- Domain events for cross-cutting concerns

#### Repository Layer
- **Firestore** for real-time data (estates, assets, documents)
- **Cloud SQL** for sensitive PII (SSN, account numbers)
- Repository pattern with interfaces

### 2.3 API Design

```
Base URL: https://api.finalwishes.app/v1

Authentication:
  POST   /auth/register
  POST   /auth/login
  POST   /auth/logout
  POST   /auth/refresh
  POST   /auth/mfa/setup
  POST   /auth/mfa/verify

Users:
  GET    /users/me
  PUT    /users/me
  DELETE /users/me

Estates:
  POST   /estates
  GET    /estates
  GET    /estates/:id
  PUT    /estates/:id
  DELETE /estates/:id

Assets:
  POST   /estates/:id/assets
  GET    /estates/:id/assets
  GET    /estates/:id/assets/:assetId
  PUT    /estates/:id/assets/:assetId
  DELETE /estates/:id/assets/:assetId

Documents:
  POST   /estates/:id/documents/upload-url
  POST   /estates/:id/documents/:docId/confirm
  GET    /estates/:id/documents
  GET    /estates/:id/documents/:docId/download
  DELETE /estates/:id/documents/:docId

Beneficiaries:
  POST   /estates/:id/executors
  GET    /estates/:id/executors
  DELETE /estates/:id/executors/:execId
  POST   /estates/:id/heirs
  GET    /estates/:id/heirs
  DELETE /estates/:id/heirs/:heirId

Notifications:
  POST   /estates/:id/notifications/generate
  GET    /estates/:id/notifications
  PUT    /estates/:id/notifications/:notifId
```

---

## 3. Frontend Architecture (React)

### 3.1 Web Application Structure

```
web/
├── src/
│   ├── app/
│   │   ├── routes/              # React Router routes
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── estates/
│   │   │   └── settings/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── components/
│   │   ├── ui/                  # Design system (shadcn/ui)
│   │   ├── forms/               # Form components
│   │   ├── layouts/             # Layout components
│   │   └── features/            # Feature-specific components
│   ├── lib/
│   │   ├── api.ts               # API client (fetch + React Query)
│   │   ├── auth.ts              # Firebase Auth utilities
│   │   ├── crypto.ts            # Client-side encryption
│   │   └── utils.ts             # Helper functions
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useEstate.ts
│   │   └── useDocuments.ts
│   ├── stores/
│   │   └── zustand/             # State management
│   └── styles/
│       └── globals.css          # Tailwind + custom styles
├── public/
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### 3.2 Key Patterns

#### State Management
- **Server State:** TanStack Query (React Query)
- **Client State:** Zustand (lightweight, hooks-based)
- **Forms:** React Hook Form + Zod validation

#### Styling
- **Framework:** Tailwind CSS
- **Components:** shadcn/ui (Radix-based)
- **Animations:** Framer Motion

#### Authentication
- Firebase Auth React SDK
- JWT stored in httpOnly cookies
- Silent token refresh

### 3.3 Design System

Following the established FinalWishes brand:
- **Colors:** Royal Blue (#1e3a8a), Gold (#C8A951), Navy (#0f172a)
- **Typography:** Cinzel (headings), Inter (body)
- **Components:** Glass panels, gold accents, status dots

---

## 4. Mobile Architecture (React Native)

### 4.1 Project Structure

```
mobile/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth screens
│   │   ├── (tabs)/              # Main tab navigation
│   │   └── _layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                  # Shared with web where possible
│   │   └── native/              # Native-specific components
│   ├── lib/
│   │   ├── api.ts               # Shared API client
│   │   ├── auth.ts              # Firebase Auth
│   │   ├── crypto.ts            # Encryption (shared)
│   │   └── storage.ts           # Secure storage
│   ├── hooks/                   # Shared with web
│   └── stores/                  # Shared with web
├── app.json                     # Expo config
├── eas.json                     # EAS Build config
└── package.json
```

### 4.2 Architecture Pattern

**Expo Router + Shared Logic:**
- File-based routing via Expo Router
- 60-70% code sharing with web (hooks, stores, API client)
- Native modules for biometrics, camera, secure storage

### 4.3 Key Features

| Feature | Implementation |
|---------|----------------|
| State Management | Zustand (shared with web) |
| Navigation | Expo Router |
| API Client | Shared fetch wrapper |
| Secure Storage | expo-secure-store |
| Biometrics | expo-local-authentication |
| Camera/Scan | expo-camera |
| Push Notifications | expo-notifications + FCM |

---

## 5. Infrastructure Architecture (GCP)

### 5.1 GCP Services

```
┌─────────────────────────────────────────────────────────────────┐
│                        Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      Cloud Run                             │  │
│  │   ┌─────────────┐                                         │  │
│  │   │  Go API     │  Auto-scaling 0-10 instances            │  │
│  │   │  Container  │  Min: 0, Max: 10                        │  │
│  │   └─────────────┘                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│       ┌──────────────────────┼──────────────────────┐           │
│       │                      │                      │           │
│  ┌────┴────┐           ┌─────┴─────┐          ┌─────┴─────┐    │
│  │Firestore│           │ Cloud SQL │          │  Cloud    │    │
│  │         │           │ PostgreSQL│          │  Storage  │    │
│  │Real-time│           │   (PII)   │          │  (Docs)   │    │
│  └─────────┘           └───────────┘          └───────────┘    │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ Firebase  │  │  Cloud    │  │  Cloud    │  │  Vertex   │    │
│  │   Auth    │  │    KMS    │  │  Logging  │  │    AI     │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Firebase Hosting                        │  │
│  │           React Web App + Marketing Site                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 GCP Services Summary

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Cloud Run** | Go API hosting | Auto-scaling 0-10, 512MB RAM |
| **Firestore** | Real-time database | Native mode, multi-region |
| **Cloud SQL** | PII storage | PostgreSQL 15, db-f1-micro |
| **Cloud Storage** | Document storage | Standard class, versioning |
| **Firebase Auth** | Authentication | Email, Google, Apple, MFA |
| **Cloud KMS** | Key management | Software keys, AES-256 |
| **Firebase Hosting** | Web hosting | Global CDN, auto SSL |
| **Cloud Logging** | Centralized logs | 30-day retention |
| **Vertex AI** | LLM processing | gemini-pro model |

### 5.3 Environment Strategy

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| **Development** | Local development | Docker Compose, Firebase emulators |
| **Staging** | Integration testing | Cloud Run (min 0), reduced capacity |
| **Production** | Live system | Cloud Run (min 1), full capacity |

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│ Client  │────▶│Firebase │────▶│   API   │
│         │◀────│ App     │◀────│  Auth   │◀────│         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                │               │               │
     │  1. Login      │               │               │
     │───────────────▶│               │               │
     │                │  2. Auth      │               │
     │                │──────────────▶│               │
     │                │  3. ID Token  │               │
     │                │◀──────────────│               │
     │                │               │               │
     │                │  4. API Call  │               │
     │                │  (Bearer token)               │
     │                │───────────────┼──────────────▶│
     │                │               │  5. Verify    │
     │                │  6. Response  │    token      │
     │                │◀──────────────┼───────────────│
```

### 6.2 Data Encryption

| Data Type | At Rest | In Transit | Key Management |
|-----------|---------|------------|----------------|
| User data | AES-256 (Firestore) | TLS 1.3 | Google-managed |
| PII | AES-256 (Cloud SQL) | TLS 1.3 | Google-managed |
| Documents | AES-256-GCM (client-side) | TLS 1.3 | Cloud KMS (per-estate) |
| Sessions | Firebase Auth | TLS 1.3 | Firebase-managed |

### 6.3 Client-Side Document Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Upload Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Client requests data encryption key (DEK) from API          │
│  2. API calls Cloud KMS to generate DEK encrypted with KEK      │
│  3. Client receives: plaintext DEK + encrypted DEK              │
│  4. Client encrypts document with plaintext DEK (AES-256-GCM)   │
│  5. Client uploads: encrypted document + encrypted DEK          │
│  6. Plaintext DEK is never stored or transmitted to server      │
│                                                                  │
│  Download reverses: API decrypts DEK via KMS, client decrypts   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Access Control

- **Role-Based Access Control (RBAC)**
  - Principal: Full access to own estate
  - Executor: Access after activation, limited pre-death
  - Heir: View-only after activation
  - Admin: System administration

- **Resource-Based Access**
  - Every resource scoped to estate_id
  - Middleware validates ownership on every request
  - Firestore security rules enforce client-side

---

## 7. Scalability & Performance

### 7.1 Scaling Strategy

| Component | Scaling Type | Trigger |
|-----------|--------------|---------|
| Cloud Run | Horizontal (0-10) | Concurrent requests > 80 |
| Firestore | Automatic | N/A |
| Cloud SQL | Vertical | Manual upgrade |
| Cloud Storage | Automatic | N/A |

### 7.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API P95 Latency | < 200ms | Cloud Logging |
| Cold Start | < 500ms | Cloud Run metrics |
| Page Load (LCP) | < 2.5s | Core Web Vitals |
| Time to Interactive | < 3.5s | Lighthouse |
| Error Rate | < 0.1% | Application logs |

---

## 8. Observability

### 8.1 Logging
- **Format:** Structured JSON
- **Levels:** DEBUG, INFO, WARN, ERROR
- **Storage:** Cloud Logging
- **Retention:** 30 days

### 8.2 Monitoring
- **Infrastructure:** Cloud Monitoring dashboards
- **Application:** Custom metrics via Cloud Monitoring
- **Uptime:** Cloud Monitoring uptime checks

### 8.3 Alerting

| Alert | Condition | Channel |
|-------|-----------|---------|
| High Error Rate | > 1% for 5 min | Email |
| High Latency | P95 > 500ms for 5 min | Email |
| Cloud Run Scaling | Instances > 8 | Email |

---

## 9. Disaster Recovery

### 9.1 Backup Strategy

| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Firestore | Continuous | 7 days PITR | Multi-region |
| Cloud SQL | Daily | 7 days | Same region |
| Cloud Storage | Real-time (versioning) | 30 days | Multi-region |

### 9.2 Recovery Objectives

- **RPO (Recovery Point Objective):** < 1 hour
- **RTO (Recovery Time Objective):** < 4 hours

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
| 2.0.0 | 2025-11-26 | Legacy Team | Added Go backend structure |
| 3.0.0 | 2025-12-05 | Claude | Complete rewrite for React+Go+React Native, GCP-only, FinalWishes branding |
| **4.0.0** | **2025-12-05** | **Claude** | **Rebranded to FinalWishes** |
