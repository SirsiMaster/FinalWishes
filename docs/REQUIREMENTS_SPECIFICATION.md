# Requirements Specification
## FinalWishes - The Living Legacy Platform
**Version:** 2.0.0
**Date:** April 17, 2026
**Status:** Active — Updated to reflect production reality

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the FinalWishes platform — a living legacy and estate management platform that helps families preserve memories, organize assets, and plan for the future. Web-first (React 19 + Vite 8), with mobile deferred until web is stable.

### 1.2 Scope
FinalWishes transforms the chaotic estate settlement process into a streamlined protocol: **Intake → Verify → Notify → Distribute**, while also serving as a life companion for preserving memories and messages. The system serves three primary user types: Estate Owners (account holders planning their legacy), Executors (managing an estate post-death), and Heirs (receiving assets and memories).

### 1.3 Geographic Scope (MVP)
Initial launch supports **3 priority jurisdictions**:

| Region | States | Notes |
|--------|--------|-------|
| **Midwest** | Illinois, Minnesota | Different probate thresholds |
| **Mid-Atlantic** | Maryland | Register of Wills procedures |

*DC and Virginia deferred to post-MVP.*

### 1.4 Definitions
| Term | Definition |
|------|------------|
| Estate Owner | The individual whose estate is being managed (account holder) |
| Executor | Person(s) authorized to administer the estate after Owner's death |
| Heir | Beneficiary designated to receive assets and memories |
| Estate | The totality of assets, documents, memories, and digital footprint of the Owner |
| The Shepherd | FinalWishes' AI-powered guidance engine (chat, scoring, obituary drafting) |
| Protocol | The 4-phase estate settlement process |
| Soul Log | Voice/video/text diary with mood tagging and sealed delivery |
| Time Capsule | Scheduled message delivery to heirs at future dates |

---

## 2. Functional Requirements

> **Status Legend:** ✅ Implemented | ⏳ Deferred | 🔮 Future

### 2.1 User Management (FR-100)

#### FR-101: User Registration — ✅ Implemented
- System SHALL allow users to register via email/password *(OAuth deferred)*
- System SHALL require email verification before estate access (IdentityGate)
- System SHALL collect legal name during registration
- System SHALL support multi-factor authentication (TOTP MFA enrollment)
- **Implementation:** Firebase Auth with email/password, IdentityGate component blocks until verified, TOTP MFA via Firebase Identity Platform

#### FR-102: User Roles — ✅ Implemented
- System SHALL support roles: Owner (principal), Executor, Heir, Legal, CPA, Administrator
- System SHALL allow Owners to designate Executors and Heirs
- System SHALL enforce role-based access controls (RBAC via Firestore rules v5.0.0)
- **Implementation:** Firestore security rules with per-collection RBAC, IdentityGate tiered verification

#### FR-103: Identity Verification — ✅ Implemented
- System SHALL support tiered identity verification (ADR-035)
- Tier 1 (Owner): email verification
- Tier 2 (Executor/Heir/Legal/CPA): MFA + attestation signing
- System SHALL store attestation records permanently in Firestore
- **Implementation:** AttestationForm with canvas signature pad, perjury attestation, Firestore `attestations` collection

### 2.2 Estate Profile Management (FR-200)

#### FR-201: Asset Registry — ✅ Implemented
- System SHALL allow Owners to create an asset inventory
- System SHALL support asset categories: Financial, Real Estate, Vehicles, Digital, Personal Property
- System SHALL allow document attachment per asset
- System SHALL support manual entry
- **Implementation:** Firestore `estates/{id}/assets` subcollection, CRUD via estate-actions.ts

#### FR-202: Document Vault — ✅ Implemented
- System SHALL provide encrypted document storage (Cloud Storage + AES-256-GCM via Cloud KMS)
- System SHALL support file types: PDF, JPG, PNG, HEIC, DOC, DOCX, TXT (max 50MB)
- System SHALL allow category organization and tagging
- System SHALL maintain version history for documents (version badge in vault)
- **Implementation:** Cloud Storage signed URLs via Go API, Firestore metadata, drag-and-drop upload, preview modal, category filtering, document version history

#### FR-203: Beneficiary Designation — ✅ Implemented
- System SHALL allow Owners to assign Heirs to specific assets
- System SHALL support invitation-based heir onboarding with auto-match
- **Implementation:** Invitation system with Firestore triggers (autoMatchInvitation Cloud Function), estate_invitations collection

#### FR-204: Digital Asset Management — 🔮 Future
- System SHALL support cryptocurrency wallet addresses (view-only)
- System SHALL support social media account inventory
- System SHALL support subscription service tracking
- *Not yet implemented. No current timeline.*

### 2.3 Intake Phase (FR-300)

#### FR-301: Document Intelligence — ✅ Implemented
- System SHALL perform AI analysis on uploaded documents
- System SHALL auto-extract relevant data
- **Implementation:** AI document analysis handler exists in Go API (Genkit/Gemini integration)

#### FR-302: Asset Discovery — ⏳ Deferred to Tier 2
- System SHALL integrate with financial account discovery
- *Plaid permanently out of scope. Alternative discovery mechanism TBD.*

#### FR-303: Contact Import — ⏳ Deferred
- System SHALL allow manual contact entry *(partially via heir/executor invitation)*
- Device contact import not yet implemented

### 2.4 Verify Phase (FR-400)

#### FR-401: Death Certificate Processing — ⏳ Deferred to Tier 3
- System SHALL accept death certificate upload
- System SHALL perform OCR extraction of death certificate data
- *Not yet implemented. Post-settlement workflow.*

#### FR-402: Executor Activation — ⏳ Deferred to Tier 3
- System SHALL send notification to designated Executors upon death verification
- System SHALL require Executor identity re-verification
- System SHALL provide cooling-off period before asset access
- *Full activation workflow not yet implemented. Basic executor role assignment exists.*

#### FR-403: Beneficiary Notification — ⏳ Deferred to Tier 3
- System SHALL notify Heirs of their designation (after Executor activation)
- *Invitation-based notification exists; post-death notification workflow deferred.*

### 2.5 Notify Phase (FR-500)

#### FR-501: Institution Notification — ⏳ Deferred to Tier 3
- System SHALL generate legally-compliant notification letters
- System SHALL support institution templates for launch states (IL, MN, MD)
- *Not yet implemented.*

#### FR-502: Government Notifications — ⏳ Deferred to Tier 3
- System SHALL provide state-specific probate guidance for launch states
- *Not yet implemented.*

#### FR-503: Account Freeze Requests — ⏳ Deferred to Tier 3
- *Not yet implemented.*

### 2.6 Distribute Phase (FR-600)

#### FR-601: Asset Transfer — ⏳ Deferred to Tier 3
- System SHALL generate asset transfer documents
- System SHALL track transfer completion status
- *Not yet implemented.*

#### FR-602: Final Accounting — 🔮 Future
- *Not yet implemented.*

#### FR-603: Estate Closure — 🔮 Future
- *Not yet implemented.*

### 2.7 Automation Engine — "The Shepherd" (FR-700)

#### FR-701: Workflow Orchestration — ⏳ Deferred
- *Basic task guidance exists via Shepherd chat. Full workflow orchestration not yet implemented.*

#### FR-702: Smart Reminders — ⏳ Deferred
- *Cloud Scheduler integration not yet implemented. No deadline-based reminders.*

#### FR-703: AI Assistant (The Shepherd) — ✅ Implemented
- System SHALL provide contextual help and guidance via chat panel
- System SHALL answer estate administration questions
- System SHALL suggest next actions based on estate state
- System SHALL provide obituary drafting assistance
- System SHALL calculate estate completion scoring
- System SHALL persist conversation history
- **Implementation:** Shepherd chat panel with Firestore-persisted messages, section-specific nudges, Genkit/Gemini AI backend, obituary drafting, completion scoring

### 2.8 Communication (FR-800)

#### FR-801: In-App Messaging — ⏳ Deferred
- *Not yet implemented. No secure messaging between estate members.*

#### FR-802: Notifications — ✅ Partially Implemented
- System SHALL support email notifications (Gmail API via Cloud Function)
- System SHALL support toast notifications for in-app actions (Sonner)
- *Push notifications and SMS for critical alerts deferred.*

### 2.9 Life Companion Features (FR-900) — New

#### FR-901: Soul Log — ✅ Implemented
- System SHALL allow voice, video, and text diary entries
- System SHALL support mood tagging
- System SHALL support visibility modes: private, shared, sealed
- System SHALL support voice transcription via Vertex AI
- **Implementation:** Soul Log page with composer dialog, upload progress, transcription retry, Firestore `estates/{id}/soul-log` subcollection

#### FR-902: Time Capsules — ✅ Implemented
- System SHALL allow scheduled message delivery to heirs at future dates
- System SHALL support deferred delivery via Cloud Tasks
- **Implementation:** Cloud Tasks time capsule deferred delivery engine, Firestore subcollection

#### FR-903: Heirloom Registry — ✅ Implemented
- System SHALL allow physical asset inventory with photos
- System SHALL support Cloud Storage photo uploads for heirlooms
- **Implementation:** Heirloom Registry page with photo upload, tier-gated media limits

#### FR-904: Life Chapters — ✅ Implemented
- System SHALL allow narrative organization of life memoirs
- System SHALL support themed chapters (childhood, military, career, parenthood)
- System SHALL support date ranges, descriptions, cover images
- System SHALL allow linking Soul Log and Memories entries into chapters
- **Implementation:** Life Chapters page with CRUD, entry picker, cover image upload, Firestore `estates/{id}/life-chapters` subcollection

#### FR-905: Public Memorial Pages — ✅ Implemented
- System SHALL provide shareable memorial pages without requiring an account
- System SHALL support QR code generation for sharing
- **Implementation:** Public memorial route with QR code sharing

#### FR-906: Events & Broadcasting — ✅ Implemented
- System SHALL support funeral, memorial, and repast event pages
- System SHALL support RSVP functionality
- **Implementation:** Events/broadcasting pages for funeral, memorial, and repast ceremonies

#### FR-907: Digital Lockbox — ✅ Implemented
- System SHALL provide encrypted credential storage
- System SHALL use Cloud KMS field-level encryption
- **Implementation:** Lockbox page with AES-256-GCM envelope encryption via Cloud KMS

#### FR-908: Auto-save for Directives — ✅ Implemented
- System SHALL auto-save directive content with debounced persistence
- System SHALL use 1.5-second debounce interval
- **Implementation:** TipTap editor with debounced auto-save (1.5s), replaces manual "Save Draft"

#### FR-909: OpenSign Document Signing — ✅ Implemented
- System SHALL support e-signature ceremony via Sirsi Sign (OpenSign)
- System SHALL integrate signing workflow into the frontend
- **Implementation:** Go API proxies to OpenSign via `/api/v1/opensign/*`, frontend signing ceremony wired

#### FR-910: Per-Person Content Visibility — ✅ Implemented
- System SHALL support granular access control per heir on directives
- System SHALL allow Owners to specify which heirs can view specific content
- **Implementation:** Per-person content visibility on directive documents

#### FR-911: Owner Welcome Experience — ✅ Implemented
- System SHALL provide life-first emotional onboarding for new Owners
- System SHALL present the product as a living companion, not a death-planning tool
- **Implementation:** Estate Owner Welcome screen with emotional framing

#### FR-912: Heir Welcome Sacred Moment — ✅ Implemented
- System SHALL present heirs with the Owner's portrait, voice messages, and heirlooms on first login
- System SHALL create a sacred, emotional moment for the heir
- **Implementation:** Heir Welcome screen with Owner's legacy content

#### FR-913: SMS Invitation Queue — ✅ Implemented
- System SHALL support phone number collection for heir invitations
- System SHALL queue SMS notifications for delivery
- **Implementation:** SMS invitation queue with phone number input

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-100)

#### NFR-101: Response Time
- API response time SHALL be <200ms for 95th percentile requests
- Page load time SHALL be <3 seconds on 4G connection
- Document upload SHALL process within 30 seconds (up to 50MB)

#### NFR-102: Scalability
- System SHALL support 100,000 concurrent users
- System SHALL auto-scale based on demand
- Database SHALL support 10TB+ of document storage

#### NFR-103: Availability
- System SHALL maintain 99.9% uptime (excluding planned maintenance)
- Planned maintenance SHALL occur during off-peak hours (2-6 AM ET)
- System SHALL provide status page for service health

### 3.2 Security (NFR-200)

#### NFR-201: Data Encryption
- All data at rest SHALL be encrypted using AES-256
- All data in transit SHALL use TLS 1.3
- Document encryption keys SHALL be unique per user

#### NFR-202: Access Control
- System SHALL implement role-based access control (RBAC)
- System SHALL enforce session timeout after 30 minutes of inactivity
- System SHALL support IP-based access restrictions

#### NFR-203: Audit Logging
- System SHALL log all user actions with timestamps
- System SHALL log all API access with request/response metadata
- Audit logs SHALL be immutable and retained for 7 years

#### NFR-204: Compliance
- System SHALL comply with SOC 2 Type II requirements
- System SHALL comply with GDPR for EU users
- System SHALL comply with CCPA for California users
- System SHOULD pursue HIPAA compliance for medical document handling

### 3.3 Usability (NFR-300)

#### NFR-301: Accessibility
- Web application SHALL meet WCAG 2.1 AA standards
- Mobile applications SHALL support screen readers
- System SHALL support font size adjustment

#### NFR-302: Localization
- System SHALL support English (US) at launch
- System SHOULD support Spanish within 6 months post-launch
- System SHALL use Unicode throughout

#### NFR-303: Cross-Platform Consistency
- UI/UX SHALL be consistent across web, iOS, and Android
- Feature parity SHALL be maintained within 2 weeks of release

### 3.4 Reliability (NFR-400)

#### NFR-401: Data Integrity
- System SHALL perform daily database backups
- System SHALL support point-in-time recovery (last 30 days)
- System SHALL validate data integrity on write operations

#### NFR-402: Disaster Recovery
- Recovery Point Objective (RPO) SHALL be <1 hour
- Recovery Time Objective (RTO) SHALL be <4 hours
- System SHALL maintain geographically distributed backups

### 3.5 Maintainability (NFR-500)

#### NFR-501: Code Quality
- Code coverage SHALL be >80% for unit tests
- All code SHALL pass linting without warnings
- All PRs SHALL require code review approval

#### NFR-502: Documentation
- All APIs SHALL have OpenAPI documentation
- All services SHALL have README documentation
- Architecture decisions SHALL be recorded in ADRs

---

## 4. External Interface Requirements

### 4.1 Third-Party Integrations

| Integration | Purpose | Priority | Status |
|-------------|---------|----------|--------|
| Firebase Auth | Authentication, TOTP MFA | P0 | ✅ Live |
| Stripe | Payment processing ($29/$99 tiers) | P0 | ✅ Live |
| Cloud Storage | Document storage (signed URLs) | P0 | ✅ Live |
| Cloud KMS | Envelope encryption (AES-256-GCM) | P0 | ✅ Live |
| Cloud SQL | PII vault (PostgreSQL 15) | P0 | ✅ Live |
| Gmail API | Email delivery (domain-wide delegation) | P0 | ✅ Live |
| OpenSign | E-signature ceremonies | P1 | ✅ Wired |
| Genkit/Gemini | AI Shepherd (chat, scoring, obituary) | P1 | ✅ Live |
| Vertex AI | Voice transcription (Soul Log) | P1 | ✅ Live |
| Cloud Tasks | Time capsule deferred delivery | P1 | ✅ Live |
| ~~Plaid~~ | ~~Bank account linking~~ | — | Permanently removed |
| ~~SendGrid~~ | ~~Email delivery~~ | — | Replaced by Gmail API |
| ~~Auth0/Clerk~~ | ~~Authentication~~ | — | Replaced by Firebase Auth |
| ~~AWS S3/Textract~~ | ~~Storage/OCR~~ | — | Replaced by GCP services |

### 4.2 API Requirements
- System SHALL expose RESTful API with JSON responses
- System SHALL implement API versioning (v1, v2, etc.)
- System SHALL rate limit API requests (1000/hour per user)
- System SHALL provide webhook support for integrations

---

## 5. Constraints

### 5.1 Technical Constraints
- Web frontend: React 19 + Vite 8 + TanStack Router + TailwindCSS v4 + shadcn/ui
- Backend API: Go 1.26 on Cloud Run (Chi + ConnectRPC)
- Event triggers: Firebase Cloud Functions (Node.js 22) — Firestore triggers only
- Database: Hybrid — Cloud SQL (PostgreSQL 15) for PII/vault + Firestore for real-time
- Infrastructure MUST be hosted on Firebase/GCP
- Mobile delivery deferred until web is stable

### 5.2 Business Constraints
- Target deadline: May 15, 2026
- Initial launch MUST support 3 US states: IL, MN, MD (DC/VA deferred)
- Legal review REQUIRED for all automated notifications
- State expansion to remaining states in post-MVP releases

### 5.3 Regulatory Constraints
- System MUST NOT provide legal advice
- System MUST include disclaimers on generated documents
- System MUST comply with state-specific probate laws

---

## 6. Acceptance Criteria

### 6.1 MVP Acceptance
- [x] User can register and complete identity verification (Firebase Auth + IdentityGate)
- [x] User can create estate profile with assets and documents (Asset Registry + Document Vault)
- [x] User can designate Executors and Heirs (Invitation system + auto-match)
- [x] User can record voice/video/text memories (Soul Log + Life Chapters)
- [x] User can schedule future message delivery (Time Capsules)
- [x] User can sign documents electronically (OpenSign integration)
- [x] User can share memorial pages publicly (QR code sharing)
- [x] AI Shepherd provides guidance, scoring, and obituary drafting
- [ ] Executor can activate estate after death verification (Tier 3)
- [ ] System generates notification letters for institutions (Tier 3)
- [ ] System provides state-specific probate guidance (IL, MN, MD) (Tier 3)

---

## Appendix A: Requirement Traceability Matrix

| Requirement ID | Description | Status |
|---------------|-------------|--------|
| FR-101 | User Registration (Firebase Auth) | ✅ Implemented |
| FR-102 | User Roles (RBAC) | ✅ Implemented |
| FR-103 | Identity Verification (Attestations) | ✅ Implemented |
| FR-201 | Asset Registry | ✅ Implemented |
| FR-202 | Document Vault | ✅ Implemented |
| FR-203 | Beneficiary Designation | ✅ Implemented |
| FR-204 | Digital Asset Management | 🔮 Future |
| FR-301 | Document Intelligence | ✅ Implemented |
| FR-302 | Asset Discovery | ⏳ Deferred (Tier 2) |
| FR-303 | Contact Import | ⏳ Deferred |
| FR-401 | Death Certificate Processing | ⏳ Deferred (Tier 3) |
| FR-402 | Executor Activation | ⏳ Deferred (Tier 3) |
| FR-403 | Beneficiary Notification | ⏳ Deferred (Tier 3) |
| FR-501 | Institution Notification | ⏳ Deferred (Tier 3) |
| FR-502 | Government Notifications | ⏳ Deferred (Tier 3) |
| FR-503 | Account Freeze Requests | ⏳ Deferred (Tier 3) |
| FR-601 | Asset Transfer | ⏳ Deferred (Tier 3) |
| FR-602 | Final Accounting | 🔮 Future |
| FR-603 | Estate Closure | 🔮 Future |
| FR-701 | Workflow Orchestration | ⏳ Deferred |
| FR-702 | Smart Reminders | ⏳ Deferred |
| FR-703 | AI Assistant (The Shepherd) | ✅ Implemented |
| FR-801 | In-App Messaging | ⏳ Deferred |
| FR-802 | Notifications | ✅ Partial (email + toasts) |
| FR-901 | Soul Log | ✅ Implemented |
| FR-902 | Time Capsules | ✅ Implemented |
| FR-903 | Heirloom Registry | ✅ Implemented |
| FR-904 | Life Chapters | ✅ Implemented |
| FR-905 | Public Memorial Pages | ✅ Implemented |
| FR-906 | Events & Broadcasting | ✅ Implemented |
| FR-907 | Digital Lockbox | ✅ Implemented |
| FR-908 | Auto-save for Directives | ✅ Implemented |
| FR-909 | OpenSign Document Signing | ✅ Implemented |
| FR-910 | Per-Person Content Visibility | ✅ Implemented |
| FR-911 | Owner Welcome Experience | ✅ Implemented |
| FR-912 | Heir Welcome Sacred Moment | ✅ Implemented |
| FR-913 | SMS Invitation Queue | ✅ Implemented |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | FinalWishes Team | Initial draft |
| 1.1.0 | 2025-11-26 | Claude | 6-state MVP scope, Firebase/GCP constraints, 4-month timeline |
| 2.0.0 | 2026-04-17 | Claude | Complete status audit: 8 FRs implemented, 13 deferred/future, 13 new Life Companion requirements (FR-901 through FR-913) added. Integration table updated to reflect actual GCP stack. Geographic scope narrowed to 3 states (IL, MN, MD). Tech constraints updated to reflect Go + React 19 + Vite 8 stack. |
