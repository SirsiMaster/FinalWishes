# Statement of Work (SOW)
## MyShepherd Platform Development

**Document Version:** 4.0.0
**Date:** December 5, 2025
**Proposal Valid Until:** February 28, 2026

---

## 1. Executive Summary

This Statement of Work (SOW) defines the scope, deliverables, timeline, and terms for the development of the **MyShepherd Platform** — a cross-platform estate settlement application serving web, iOS, and Android users.

**Core Mission:** Shepherd users through every step of the estate settlement journey—whether manual or automated. Where government systems lack digital interfaces, we BUILD THE CONNECTOR and become the benchmark for eventual state adoption.

### Project Overview

| Attribute | Value |
|-----------|-------|
| **Product** | MyShepherd - The Estate Operating System |
| **Duration** | 5 months (20 weeks) |
| **Investment** | $95,000 |
| **Development Model** | AI-Assisted (Gemini 3.0 + Vertex AI) |
| **Launch States** | Maryland, Illinois, Minnesota |

---

| Layer | Technology |
|-------|------------|
| **Web Frontend** | React 18 + Vite + TailwindCSS |
| **Mobile Apps** | React Native + Expo |
| **Backend API** | Go (Golang) on Cloud Run |
| **Database** | Firestore (real-time) + Cloud SQL (PII) |
| **Authentication** | Firebase Auth + MFA |
| **Storage** | Cloud Storage (client-side encrypted) |
| **Infrastructure** | Google Cloud Platform |

---

## 2. Project Objectives

### 2.1 Business Objectives

1. Launch complete platform (web + iOS + Android) within 5 months
2. Shepherd users through every step of estate settlement (manual or automated)
3. Build connectors for states without e-filing (DC, Virginia)
4. Create definitive probate form library (~75 forms across 5 states)
5. Full integration with Plaid, Lob, and DocuSign
6. Establish foundation for SOC 2 Type II certification

### 2.2 Technical Objectives

1. Build secure, scalable backend on Go + Cloud Run
2. Deliver React web application with modern UX
3. Deploy native iOS and Android apps via React Native
4. Implement AES-256 encryption with Cloud KMS
5. Pass external penetration testing

---

## 3. Scope of Work

### 8.1 Detailed Timeline Breakdown

**Phase 1: Foundation & "The Vault" (Weeks 1-4)**
*   **Week 1**: GCP Setup, Repo init, CI/CD Pipelines (Github -> Cloud Run), DB Schema Design (SQL + NoSQL).
*   **Week 2**: Auth System (MFA / Magic Links), User Profiles, core API scaffolding in Go.
*   **Week 3**: **The Document Vault**. Encrypted upload/download flows, client-side encryption logic.
*   **Week 4**: "Assets & Liabilities" Inventory module. Frontend dashboards (React).

**Phase 2: Core Estate logic & AI (Weeks 5-10)**
*   **Week 5**: Probate Logic Engine (State machines for MD, IL, MN).
*   **Week 6**: **Gemini 3.0 Integration**. "The Shepherd" chat interface and RAG pipeline.
*   **Week 7**: **DocuSeal Integration**. Form mapping, e-signature flows for probate forms.
*   **Week 8**: Alpha Release. Internal testing of end-to-end estate closure flow.

**Phase 3: Deep Integrations & Mobile (Weeks 11-16)**
*   **Week 9**: Plaid Integration (Bank syncing).
*   **Week 10**: Lob Integration (Snail mail automation).
*   **Week 11**: React Native kickoff (iOS/Android shell).
*   **Week 12**: Mobile: Feature parity with Web (Biometrics, Camera scan).
*   **Week 13-16**: **Mobile Beta**. Polishing interactions, offline mode, push notifications.

**Phase 4: Launch & Polish (Weeks 17-20)**
*   **Week 17**: Security Hardening (Pen Test coordination).
*   **Week 18**: SOC 2 Evidence collection / Documentation.
*   **Week 19**: App Store Submission & Review management.
*   **Week 20**: **GO LIVE**. Production deployment.

### 8.2 The Team Structure
*   **Lead Architect (Human)**: 15+ years exp. Oversees all major decisions. Ensures scalability.
*   **AI Stack Leader (Claude)**: Acts as the "10x Developer", writing 90% of the code, tests, and docs.
*   **Product Manager (Human)**: Aligns features with venture goals, manages scope.
*   **Security Specialist (Agentic)**: Continuous scanning of dependencies and infrastructure.

### 3.1 Backend Development (Go on Cloud Run)

| Deliverable | Description |
|-------------|-------------|
| RESTful API | Go (Gin/Echo framework) with OpenAPI documentation |
| Authentication | Firebase Auth integration with JWT validation |
| Database Layer | Firestore (real-time data) + Cloud SQL (PII) |
| Document Processing | Upload, encryption, OCR via Cloud Vision |
| Notification Engine | Email (SendGrid), letter generation |
| Background Jobs | Cloud Tasks for async processing |
| API Gateway | Cloud Endpoints with rate limiting |

### 3.2 Web Application (React + Vite)

| Feature | Description |
|---------|-------------|
| User Authentication | Email/password, Google OAuth, MFA (TOTP) |
| Principal Dashboard | Estate overview, progress tracking, quick actions |
| Executor Dashboard | Task management, document access, notifications |
| Heir Dashboard | View-only access, distribution tracking |
| Estate Management | Create, edit, archive estates |
| Asset Inventory | 5 categories (Financial, Property, Digital, Personal, Insurance) |
| Document Vault | Upload, encrypt, organize, share documents |
| Notification Center | In-app notifications, email preferences |
| Institution Letters | Generate, track, mail notification letters |
| Settings | Profile, security, preferences |

### 3.3 Mobile Applications (React Native + Expo)

| Feature | iOS | Android |
|---------|-----|---------|
| Biometric Authentication | Face ID, Touch ID | Fingerprint |
| Push Notifications | APNs | FCM |
| Document Camera | Native camera capture | Native camera capture |
| Offline Mode | Cached data viewing | Cached data viewing |
| Deep Linking | Universal Links | App Links |

### 3.4 Security Implementation

| Control | Implementation |
|---------|----------------|
| Encryption at Rest | AES-256-GCM via Cloud KMS |
| Encryption in Transit | TLS 1.3 |
| Client-Side Encryption | Documents encrypted before upload |
| Key Management | Cloud KMS with 90-day rotation |
| MFA | TOTP (Google Authenticator, Authy) |
| Session Management | JWT with refresh tokens, secure cookies |
| Rate Limiting | 100 req/min per user |
| Audit Logging | All actions logged to Cloud Logging |

### 3.5 Included Integrations

| Integration | Capability | Build Cost | Monthly OpEx* |
|-------------|------------|------------|---------------|
| **Plaid** | Full account discovery (banking, investments, liabilities) | Included | $0.30-$1.50/link |
| **Lob** | Certified mail automation with tracking | Included | $1.50-$3.00/letter |
| **DocuSeal** | E-signature (Self-hosted on Cloud Run) | Included | ~$50/mo (Server costs) |
| **Google Document AI** | OCR for document processing | Included | ~$1.50/1K pages |
| **SendGrid** | Transactional email | Included | Free tier → $20/mo |
| **Vertex AI** | Intelligent process guidance (Gemini 3.0) | Included | ~$0.002/1K chars |

*OpEx costs are usage-based and paid by the client post-launch. Not included in $95K build cost.*

### 3.6 Future Expansion (Post-Launch)

- Additional states (45 remaining)
- Credit bureau integration (requires certification)
- Court e-filing API partnerships
- Multi-language support
- Cryptocurrency wallet integration
- White Glove tier features
- HIPAA certification
- Public API

---

## 4. Deliverables

### 4.1 Software Deliverables

| ID | Deliverable | Technology | Acceptance Criteria |
|----|-------------|------------|---------------------|
| D1 | MyShepherd API | Go on Cloud Run | All endpoints functional, <200ms p95 latency |
|| D2 | MyShepherd Web | React + Vite | Deployed, responsive, WCAG 2.1 AA |
|| D3 | MyShepherd iOS | React Native + Expo | Published on App Store |
|| D4 | MyShepherd Android | React Native + Expo | Published on Google Play |
| D5 | Admin Dashboard | React | User management, estate viewing |

### 4.2 Documentation Deliverables

| ID | Deliverable | Format |
|----|-------------|--------|
| D6 | API Documentation | OpenAPI 3.0 + Swagger UI |
| D7 | User Guide | Markdown + PDF |
| D8 | Admin Guide | Markdown |
| D9 | Deployment Guide | Markdown + IaC |
| D10 | Security Documentation | Markdown |

### 4.3 Infrastructure Deliverables

| ID | Deliverable | Description |
|----|-------------|-------------|
| D11 | Production Environment | Cloud Run + Firestore + Cloud SQL |
| D12 | Staging Environment | Mirrored production (scaled down) |
| D13 | CI/CD Pipeline | GitHub Actions → Cloud Build → Cloud Run |
| D14 | Monitoring | Cloud Monitoring + Sentry |
| D15 | Backup System | Automated daily backups |

---

## 5. Timeline & Milestones

### 5.1 Project Schedule

**Total Duration:** 5 months (20 weeks)

| Month | Weeks | Focus | Deliverables |
|-------|-------|-------|--------------|
| **1** | 1-4 | Foundation | GCP setup, Auth, DB schema, React scaffold, Go API skeleton |
| **2** | 5-8 | Core Features | Estate CRUD, Asset management, Go API endpoints |
| **3** | 9-12 | Vault & Security | Document encryption, Notifications, Security hardening |
| **4** | 13-16 | Mobile Apps | React Native iOS/Android, PWA optimization |
| **5** | 17-20 | Launch Prep | Pen testing, Bug fixes, App Store submission, Launch |

### 5.2 Key Milestones

| Milestone | Week | Deliverable | Exit Criteria |
|-----------|------|-------------|---------------|
| **M1** | 2 | Infrastructure Ready | GCP deployed, CI/CD operational |
| **M2** | 4 | Auth Complete | Firebase Auth + MFA working end-to-end |
| **M3** | 8 | API Alpha | Core Go endpoints functional (80% coverage) |
| **M4** | 12 | Web Beta | React app feature complete |
| **M5** | 16 | Mobile Beta | Apps in TestFlight + Internal Track |
| **M6** | 18 | Security Complete | Penetration test passed |
| **M7** | 20 | Production Launch | Live deployment, apps in stores |

### 5.3 Payment Milestones

| Milestone | Percentage | Amount | Trigger |
|-----------|------------|--------|---------|
| Project Kickoff | 25% | $23,750 | Contract signed, GCP access |
| Alpha Release (M3) | 25% | $23,750 | API Alpha complete |
| Beta Release (M5) | 25% | $23,750 | Mobile Beta in TestFlight |
| Production Launch (M7) | 25% | $23,750 | Apps live in stores |
| **Total** | **100%** | **$95,000** | |

---

## 6. Development Model

### 6.1 AI-Assisted Development

This project uses an **AI-Assisted Development Model** where AI tools perform the majority of development work under human oversight.

| Role | Allocation | Responsibilities |
|------|------------|------------------|
| **Human Oversight** | Part-time | Architecture review, acceptance testing, domain expertise, go/no-go decisions |
| **AI Stack Leader (Claude)** | Full-time | Implementation, testing, documentation, coordination |
| **AI Development Tools** | Full-time | Cursor Pro, Warp, GitHub Copilot |

### 6.2 Quality Assurance

| Test Type | Approach | Coverage Target |
|-----------|----------|-----------------|
| Unit Tests | AI-generated (Jest, Go testing) | 80% |
| Integration Tests | AI-generated (API tests) | 90% of endpoints |
| E2E Tests | AI-generated (Playwright) | Critical paths |
| Security Testing | External vendor | OWASP Top 10 |
| Performance Testing | k6 load testing | 100 concurrent users |

### 6.3 Communication

| Channel | Purpose | Frequency |
|---------|---------|-----------|
| GitHub Issues | Task tracking | Continuous |
| Slack/Discord | Quick questions | As needed |
| Weekly Update | Progress report | Weekly |
| Milestone Review | Demo + approval | Per milestone |

---

## 7. Client Responsibilities

The Client shall provide:

1. **Access & Accounts**
   - GCP/Firebase project with billing enabled
   - Apple Developer account ($99/year)
   - Google Play Console ($25 one-time)
   - Domain for production deployment

2. **Content & Assets**
   - Brand assets (logo, colors, fonts) by Week 1
   - Legal copy review (ToS, Privacy Policy) by Week 12
   - Institution letter templates review by Week 10

3. **Feedback & Approval**
   - Timely feedback on deliverables (within 3 business days)
   - Milestone approval within 5 business days
   - Final go-live approval

4. **Domain Expertise**
   - Estate settlement workflow validation
   - State-specific requirements for 5 launch states
   - Institution notification requirements

---

## 8. Commercial Terms

### 8.1 Pricing

| Item | Amount |
|------|--------|
| **Total Project Cost** | **$95,000 USD** |
| Traditional Agency Equivalent | $400,000 - $500,000 |
| **Savings** | **76-81%** |

### 8.2 Payment Terms

- Invoices due Net 15 from invoice date
- Payments via wire transfer or ACH
- Late payments subject to 1.5% monthly interest
- Work may be paused if payment is >15 days overdue

### 8.3 Expenses

- Cloud infrastructure costs: Pass-through at cost
- Third-party services (Persona, SendGrid): Pass-through at cost
- App Store fees: Client responsibility

---

## 9. Terms & Conditions

### 9.1 Intellectual Property

- All custom code developed under this SOW shall be **owned by the Client** upon final payment
- Contractor retains rights to pre-existing libraries and frameworks
- Open-source components remain under their respective licenses
- AI-generated code is considered work-for-hire

### 9.2 Confidentiality

- Both parties agree to maintain confidentiality of proprietary information
- NDA terms remain in effect for 3 years following project completion
- Source code and documentation are confidential

### 9.3 Warranties

- Deliverables will be free of material defects for **60 days** post-launch
- Bug fixes during warranty period included at no additional cost
- Warranty excludes issues caused by Client modifications
- Warranty excludes third-party service outages

### 9.4 Limitation of Liability

- Total liability limited to fees paid under this SOW
- Neither party liable for indirect, consequential, or incidental damages

### 9.5 Change Management

- Scope changes require written Change Request
- Changes >8 hours require updated cost estimate
- Changes >40 hours require SOW amendment
- All changes must be approved before implementation

### 9.6 Termination

- Either party may terminate with 30 days written notice
- Upon termination, Client pays for work completed to date
- Contractor delivers all work product and documentation within 10 days

---

## 10. Assumptions

1. Human oversight available for review/approval (minimum 5 hrs/week)
2. GCP/Firebase accounts accessible and billable from Day 1
3. Apple Developer and Google Play accounts ready by Week 14
4. Third-party APIs (Firebase, Stripe, SendGrid) remain stable
5. No significant App Store guideline changes during development
6. Requirements finalized after Week 8 (scope freeze)
7. English-only for initial release
8. 3 launch states: Maryland, Illinois, Minnesota

---

## 11. Risk Management

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API cost overruns | Medium | Medium | Usage monitoring, caching, included in contingency |
| App Store rejection | Medium | Low | Pre-submission review, follow guidelines |
| Third-party API changes | Medium | Medium | Abstraction layers, version pinning |
| Security vulnerabilities | High | Low | Pen testing, code review, responsible disclosure |
| Scope creep | High | Medium | Strict change management, scope freeze at Week 8 |

---

## 12. Acceptance

This Statement of Work is accepted and agreed to by the authorized representatives of both parties.

**Client:**

| Field | Value |
|-------|-------|
| Signature | |
| Name | |
| Title | |
| Date | |

**Contractor:**

| Field | Value |
|-------|-------|
| Signature | |
| Name | |
| Title | |
| Date | |

---

## Appendix A: Technology Stack Details

### Frontend (React + Vite)
```
react: ^18.2.0
vite: ^5.0.0
tailwindcss: ^3.4.0
react-query: ^5.0.0
zustand: ^4.4.0
react-router-dom: ^6.20.0
```

### Mobile (React Native + Expo)
```
react-native: 0.73.x
expo: ~50.0.0
react-navigation: ^6.x
expo-secure-store: ~12.x
```

### Backend (Go)
```
go: 1.21+
gin-gonic/gin: ^1.9.0
firebase-admin-go: ^4.x
cloud.google.com/go: latest
```

### Infrastructure
```
Cloud Run: Serverless containers
Cloud SQL: PostgreSQL 15
Firestore: Native mode
Cloud Storage: Standard
Cloud KMS: Software keys
Cloud Build: CI/CD
```

---

## Appendix B: API Endpoint Summary

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Auth | 5 | Partial |
| Users | 4 | Yes |
| Estates | 8 | Yes |
| Assets | 6 | Yes |
| Documents | 7 | Yes |
| Beneficiaries | 5 | Yes |
| Notifications | 4 | Yes |
| Institutions | 3 | Yes |
| Admin | 6 | Yes (Admin role) |
| **Total** | **48** | |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | MyShepherd Team | Initial draft (AWS/Go, $425K) |
| 2.0.0 | 2025-12-03 | Claude | Firebase architecture, $80K, 4 months |
|| 3.0.0 | 2025-12-05 | Claude | React+Go architecture, $95K, 5 months, mobile included |
|| **4.0.0** | **2025-12-05** | **Claude** | **Rebrand to MyShepherd, full integrations, connector strategy** |
