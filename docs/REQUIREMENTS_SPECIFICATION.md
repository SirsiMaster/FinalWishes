# Requirements Specification
## MyShepherd - The Estate Operating System
**Version:** 1.1.0
**Date:** November 26, 2025
**Status:** Draft - Pending Approval

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the MyShepherd platform—an AI-powered estate management system designed to automate end-of-life administration across web, iOS, and Android platforms.

### 1.2 Scope
Legacy transforms the chaotic 18-month estate settlement process into a streamlined 4-phase protocol: **Intake → Verify → Notify → Distribute**. The system serves three primary user types: Principals (account holders planning their estate), Executors (managing an estate post-death), and Heirs (receiving assets).

### 1.3 Geographic Scope (MVP)
Initial launch supports **5 jurisdictions** with state-specific probate rules and institution templates:

| Region | States | Notes |
|--------|--------|-------|
| **Midwest** | Illinois, Minnesota | Different probate thresholds |
| **Mid-Atlantic** | District of Columbia, Virginia, Maryland | Common metro area (DC/MD/VA) |

*Additional states targeted for v1.1+ (including Michigan)*

### 1.4 Definitions
| Term | Definition |
|------|------------|
| Principal | The individual whose estate is being managed (account owner) |
| Executor | Person(s) authorized to administer the estate after Principal's death |
| Heir | Beneficiary designated to receive assets |
| Estate | The totality of assets, documents, and digital footprint of the Principal |
| Shepherd | Legacy's AI-powered workflow automation engine |
| Protocol | The 4-phase estate settlement process |

---

## 2. Functional Requirements

### 2.1 User Management (FR-100)

#### FR-101: User Registration
- System SHALL allow users to register via email/password or OAuth (Google, Apple)
- System SHALL require email verification before account activation
- System SHALL collect legal name, date of birth, and phone number during registration
- System SHALL support multi-factor authentication (MFA) enrollment

#### FR-102: User Roles
- System SHALL support four roles: Principal, Executor, Heir, Administrator
- System SHALL allow Principals to designate up to 3 Executors
- System SHALL allow Principals to designate unlimited Heirs
- System SHALL enforce role-based access controls (RBAC)

#### FR-103: Identity Verification
- System SHALL integrate with identity verification provider (e.g., Plaid Identity, Persona)
- System SHALL verify government-issued ID for Principals and Executors
- System SHALL store verification status and expiration date
- System SHOULD support biometric verification on mobile devices

### 2.2 Estate Profile Management (FR-200)

#### FR-201: Asset Registry
- System SHALL allow Principals to create an asset inventory
- System SHALL support asset categories: Financial, Real Estate, Vehicles, Digital, Personal Property
- System SHALL allow document attachment per asset (deeds, titles, statements)
- System SHALL support manual entry and automated discovery via Plaid/Yodlee

#### FR-202: Document Vault
- System SHALL provide encrypted document storage
- System SHALL support file types: PDF, JPG, PNG, HEIC (max 50MB per file)
- System SHALL allow folder organization and tagging
- System SHALL maintain version history for all documents

#### FR-203: Beneficiary Designation
- System SHALL allow Principals to assign Heirs to specific assets
- System SHALL support percentage-based distribution
- System SHALL support conditional distributions (age requirements, milestones)
- System SHALL generate printable beneficiary designation forms

#### FR-204: Digital Asset Management
- System SHALL support cryptocurrency wallet addresses (view-only)
- System SHALL support social media account inventory
- System SHALL support subscription service tracking
- System SHALL provide digital asset transfer instructions

### 2.3 Intake Phase (FR-300)

#### FR-301: Document Scanning
- System SHALL support camera-based document capture on mobile
- System SHALL perform OCR on uploaded documents
- System SHALL auto-extract relevant data (names, dates, account numbers)
- System SHALL flag potential duplicate documents

#### FR-302: Asset Discovery
- System SHALL integrate with Plaid for bank/investment account discovery
- System SHALL search public records for real estate holdings
- System SHALL identify unclaimed property via state databases
- System SHOULD use AI to suggest missing assets based on patterns

#### FR-303: Contact Import
- System SHALL allow import of contacts from device (with permission)
- System SHALL categorize contacts: Family, Financial, Legal, Medical
- System SHALL support manual contact entry
- System SHALL validate contact information format

### 2.4 Verify Phase (FR-400)

#### FR-401: Death Certificate Processing
- System SHALL accept death certificate upload (Principal or Executor)
- System SHALL perform OCR extraction of death certificate data
- System SHALL validate death certificate against SSA Death Master File (where legal)
- System SHALL require confirmation from designated Executor

#### FR-402: Executor Activation
- System SHALL send notification to designated Executors upon death verification
- System SHALL require Executor identity re-verification
- System SHALL require at least 2-of-3 Executor confirmation for estates >$100K
- System SHALL provide 72-hour cooling-off period before asset access

#### FR-403: Beneficiary Notification
- System SHALL notify Heirs of their designation (after Executor activation)
- System SHALL require Heir identity verification before distribution
- System SHALL provide inheritance acceptance/rejection workflow

### 2.5 Notify Phase (FR-500)

#### FR-501: Institution Notification
- System SHALL generate legally-compliant notification letters
- System SHALL support institution templates for 5 launch states (IL, MN, DC, VA, MD)
- System SHALL track notification status (sent, received, acknowledged)
- System SHOULD support certified mail integration (via Lob or similar) in v1.1

#### FR-502: Government Notifications
- System SHALL generate IRS Form SS-4 (EIN application for estate)
- System SHALL generate credit bureau notification requests
- System SHALL track Social Security Administration notification
- System SHALL provide state-specific probate guidance for 5 launch states:
  - Illinois: Small estate affidavit threshold, supervised vs. independent administration
  - Minnesota: Informal probate, summary administration options (UPC simplified)
  - District of Columbia: Standard vs. abbreviated probate
  - Virginia: Qualification requirements, commissioner of accounts
  - Maryland: Register of Wills procedures, orphans' court

#### FR-503: Account Freeze Requests
- System SHALL generate account freeze request letters
- System SHALL track freeze confirmation status
- System SHALL provide fraud monitoring alerts during settlement

### 2.6 Distribute Phase (FR-600)

#### FR-601: Asset Transfer
- System SHALL generate asset transfer documents
- System SHALL track transfer completion status
- System SHALL support partial distributions
- System SHALL require Executor approval for each transfer

#### FR-602: Final Accounting
- System SHALL generate estate accounting report
- System SHALL track all inflows/outflows during settlement
- System SHALL calculate and report taxable events
- System SHALL generate Form 1041 preparation data

#### FR-603: Estate Closure
- System SHALL provide checklist for estate closure requirements
- System SHALL generate final distribution report
- System SHALL archive estate records (7-year retention)
- System SHALL notify all parties of estate closure

### 2.7 Automation Engine - "Shepherd" (FR-700)

#### FR-701: Workflow Orchestration
- System SHALL execute automated task sequences
- System SHALL support conditional workflow branching
- System SHALL allow pause/resume of automation
- System SHALL provide audit trail of all automated actions

#### FR-702: Smart Reminders
- System SHALL send deadline-based reminders
- System SHALL support multi-channel notifications (email, SMS, push)
- System SHALL escalate overdue tasks to designated contacts
- System SHALL learn from user interaction patterns

#### FR-703: AI Assistant
- System SHALL provide contextual help and guidance
- System SHALL answer common estate administration questions
- System SHALL suggest next actions based on estate state
- System SHOULD provide document drafting assistance

### 2.8 Communication (FR-800)

#### FR-801: In-App Messaging
- System SHALL provide secure messaging between Principals, Executors, and Heirs
- System SHALL support file attachments in messages
- System SHALL maintain message history with encryption

#### FR-802: Notifications
- System SHALL support push notifications (iOS/Android)
- System SHALL support email notifications with customizable preferences
- System SHALL support SMS notifications for critical alerts

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

| Integration | Purpose | Priority |
|-------------|---------|----------|
| Plaid | Bank account linking, asset discovery | P0 |
| Auth0/Clerk | Authentication, MFA | P0 |
| Stripe | Payment processing | P0 |
| Lob | Certified mail, letter printing | P1 |
| Persona | Identity verification | P1 |
| Twilio | SMS notifications | P1 |
| SendGrid | Email delivery | P1 |
| AWS S3 | Document storage | P0 |
| AWS Textract | Document OCR | P1 |

### 4.2 API Requirements
- System SHALL expose RESTful API with JSON responses
- System SHALL implement API versioning (v1, v2, etc.)
- System SHALL rate limit API requests (1000/hour per user)
- System SHALL provide webhook support for integrations

---

## 5. Constraints

### 5.1 Technical Constraints
- Backend MUST be implemented using Firebase Functions
- Web frontend MUST be PWA-capable
- Mobile delivery MUST be via PWA (native apps post-MVP)
- Database MUST be Firestore
- Infrastructure MUST be hosted on Firebase/GCP

### 5.2 Business Constraints
- MVP MUST be delivered within 4 months (16 weeks)
- Initial launch MUST support 6 US states: IL, MI, MN, DC, VA, MD
- Legal review REQUIRED for all automated notifications
- State expansion to remaining 44 states in post-MVP releases

### 5.3 Regulatory Constraints
- System MUST NOT provide legal advice
- System MUST include disclaimers on generated documents
- System MUST comply with state-specific probate laws

---

## 6. Acceptance Criteria

### 6.1 MVP Acceptance
- [ ] User can register and complete identity verification
- [ ] User can create estate profile with assets and documents
- [ ] User can designate Executors and Heirs
- [ ] Executor can activate estate after death verification
- [ ] System generates notification letters for institutions in 6 launch states
- [ ] System provides state-specific probate guidance (IL, MI, MN, DC, VA, MD)
- [ ] System provides audit trail of all actions
- [ ] PWA installable on iOS and Android devices
- [ ] 99.9% uptime during launch week

---

## Appendix A: Requirement Traceability Matrix

| Requirement ID | User Story | Test Case | Status |
|---------------|------------|-----------|--------|
| FR-101 | US-001 | TC-001 | Pending |
| FR-102 | US-002 | TC-002 | Pending |
| ... | ... | ... | ... |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | MyShepherd Team | Initial draft |
| 1.1.0 | 2025-11-26 | Claude | 6-state MVP scope (IL, MI, MN, DC, VA, MD), Firebase/GCP constraints, 4-month timeline |
