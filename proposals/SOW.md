# Statement of Work (SOW)
## FinalWish Platform - MVP Development
**Document Version:** 2.0.0
**Date:** December 3, 2025
**Proposal Valid Until:** February 28, 2026

---

## 1. Executive Summary

This Statement of Work (SOW) defines the scope, deliverables, timeline, and terms for the development of the **FinalWish Platform MVP** — a cross-platform estate management application serving web, iOS, and Android users.

**Project Overview:**
- **Product:** FinalWish - The Estate Operating System
- **Duration:** 4 months (16 weeks)
- **Platforms:** Web (Static HTML/Tailwind), PWA, iOS (Flutter optional), Android (Flutter optional)
- **Backend:** Firebase (Firestore, Cloud Functions, Authentication)
- **Infrastructure:** Google Cloud Platform (Firebase Hosting)

---

## 2. Parties

**Client:**
[Client Name / Company]
[Address]
[Contact Information]

**Contractor:**
[Development Team / Agency]
[Address]
[Contact Information]

---

## 3. Project Objectives

### 3.1 Business Objectives
1. Launch a minimum viable product (MVP) within 90 days
2. Enable users to organize estate information across web and mobile
3. Automate the estate settlement notification process
4. Achieve initial market validation with early adopters
5. Establish foundation for future feature expansion

### 3.2 Technical Objectives
1. Build secure, scalable backend infrastructure on Firebase/GCP
2. Deliver responsive web application with modern UX
3. Deploy Progressive Web App (PWA) with optional native apps
4. Implement end-to-end encryption for sensitive data
5. Achieve SOC 2 readiness

---

## 4. Scope of Work

### 4.1 Included in Scope (MVP Features)

#### Backend Development
- Firebase Cloud Functions for serverless API
- Firestore (NoSQL) database design and implementation
- Firebase Authentication with MFA support
- Firebase Hosting with CDN
- Cloud Storage for Firebase (encrypted documents)
- Stripe integration for payments
- SendGrid integration for email notifications
- Google Cloud Vision API for OCR
- CI/CD pipeline (GitHub Actions → Firebase)

#### Web Application (Static HTML/Tailwind + Firebase)
- User registration and authentication (Firebase Auth)
- Multi-factor authentication (MFA)
- User profile management
- Estate creation and management
- Asset inventory (5 categories)
- Document vault with upload/download (Cloud Storage)
- Beneficiary designation (executors, heirs)
- Principal dashboard with progress tracking
- Executor dashboard with task management
- Notification letter generation (50 institutions)
- Payment processing (Stripe checkout)
- Responsive design (desktop, tablet, mobile)
- WCAG 2.1 AA accessibility
- Progressive Web App (PWA) support

#### Mobile Applications (Flutter)
- iOS application (iPhone, iPad)
- Android application (phone, tablet)
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- Push notifications
- Document camera capture
- Offline capability (view cached data)
- Native performance and animations

#### Security & Compliance
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- Role-based access control (RBAC)
- Comprehensive audit logging
- SOC 2 Type I readiness documentation
- GDPR/CCPA compliance features

#### Infrastructure
- Production environment (Firebase Hosting with global CDN)
- Staging environment (Firebase preview channels)
- Automated deployments (GitHub Actions → Firebase)
- Monitoring and alerting (Firebase Performance Monitoring, Cloud Logging)
- Disaster recovery configuration (Firestore automatic backups)

### 4.2 Excluded from Scope (Post-MVP)

The following features are explicitly excluded from this SOW and may be addressed in future engagements:

- Plaid integration for automated asset discovery
- Lob integration for certified mail delivery
- Full AI Assistant ("Shepherd") with ML capabilities
- Spanish language localization
- Complete Distribution Phase features
- Cryptocurrency wallet integration
- White Glove tier human agent workflows
- HIPAA compliance certification
- Public API for third-party developers
- Admin panel advanced analytics

---

## 5. Deliverables

### 5.1 Software Deliverables

| ID | Deliverable | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| D1 | FinalWish API | Firebase Cloud Functions backend | All API endpoints functional per specification |
| D2 | FinalWish Web | Static HTML/Tailwind web application | Deployed on Firebase Hosting, responsive, accessible (WCAG 2.1 AA) |
| D3 | FinalWish PWA | Progressive Web App | Installable, offline-capable, push notifications |
| D4 | FinalWish iOS (Optional) | Flutter iOS application | Published on App Store |
| D5 | FinalWish Android (Optional) | Flutter Android application | Published on Google Play Store |
| D6 | Admin Dashboard | Internal administration interface | User management, estate viewing capabilities |

### 5.2 Documentation Deliverables

| ID | Deliverable | Description |
|----|-------------|-------------|
| D6 | API Documentation | OpenAPI 3.0 specification with examples |
| D7 | User Guide | End-user documentation for all features |
| D8 | Admin Guide | Internal operations and support guide |
| D9 | Deployment Guide | Infrastructure setup and deployment procedures |
| D10 | Architecture Decision Records | Documentation of technical decisions |

### 5.3 Infrastructure Deliverables

| ID | Deliverable | Description |
|----|-------------|-------------|
| D12 | Production Environment | Firebase Hosting with global CDN |
| D13 | Staging Environment | Firebase preview channels |
| D14 | CI/CD Pipeline | GitHub Actions → Firebase automated deployment |
| D15 | Monitoring Setup | Firebase Performance Monitoring + Cloud Logging |

---

## 6. Timeline & Milestones

**Project Duration:** 4 months (16 weeks)
**Start Date:** Upon contract execution
**Target Completion:** Start Date + 16 weeks

### 6.1 Phase Schedule

| Phase | Duration | Focus Areas |
|-------|----------|-------------|
| **Phase 1: Foundation** | Weeks 1-4 | Firebase setup, authentication, core Firestore models |
| **Phase 2: Core Features** | Weeks 5-8 | Estate management, document vault, settlement workflow |
| **Phase 3: PWA & Mobile** | Weeks 9-12 | PWA optimization, optional Flutter apps |
| **Phase 4: Polish & Launch** | Weeks 13-16 | Testing, accessibility, performance, go-live |

### 6.2 Key Milestones

| Milestone | Target Date | Deliverable | Exit Criteria |
|-----------|-------------|-------------|---------------|
| **M1** | End Week 2 | Infrastructure Ready | Firebase deployed, CI/CD operational |
| **M2** | End Week 4 | API Alpha | Core Cloud Functions functional (80% P0) |
| **M3** | End Week 8 | Web Beta | Web app feature complete |
| **M4** | End Week 12 | PWA Ready | PWA installable, offline-capable |
| **M5** | End Week 14 | Launch Ready | All testing complete, zero P0 bugs |
| **M6** | End Week 16 | Public Launch | Live on Firebase Hosting |

### 6.3 Payment Milestones

See Section 8 (Commercial Terms) for payment schedule tied to milestones.

---

## 7. Team & Resources

### 7.1 Development Model: AI-Agentic

This project uses an **AI-Agentic Development Model** where AI tools (Claude, Warp, Cursor) perform the majority of development work under human oversight. This dramatically reduces cost while maintaining quality.

| Role | Model | Responsibilities |
|------|-------|------------------|
| Human Oversight | Part-time | Architecture review, acceptance testing, domain expertise, go/no-go decisions |
| AI Stack Leader (Claude) | Full-time | All implementation, testing, documentation, cross-agent coordination |
| AI Development Tools | Full-time | Cursor Pro, Warp, GitHub Copilot for code generation |

**See COST_PROPOSAL.md Section 3 for detailed AI-Agentic architecture.**

### 7.2 Client Responsibilities

The Client shall provide:
- Access to required third-party accounts (Firebase/GCP, Apple Developer, Google Play Console)
- Legal review and approval of Terms of Service, Privacy Policy, and notification templates
- Brand assets (logo, colors, fonts) by Week 1
- Timely feedback on deliverables (within 3 business days)
- Subject matter expertise for estate settlement workflows
- Final approval authority for go-live decision

### 7.3 Communication

| Meeting | Frequency | Participants | Duration |
|---------|-----------|--------------|----------|
| Sprint Planning | Bi-weekly | All team + Client stakeholder | 2 hours |
| Daily Standup | Daily | Dev team | 15 minutes |
| Sprint Review | Bi-weekly | All team + Client | 1 hour |
| Status Report | Weekly (Friday) | PM → Client | Written report |

---

## 8. Commercial Terms

### 8.1 Pricing

**See attached COST_PROPOSAL.md for detailed pricing breakdown.**

**Total Project Cost:** $80,000 - $100,000 USD (AI-Agentic model)

*Traditional agency comparison: $350,000 - $450,000 (77-82% savings)*

### 8.2 Payment Schedule

| Milestone | Percentage | Amount | Due Date |
|-----------|------------|--------|----------|
| Contract Execution | 25% | $20,000 | Upon signing |
| M2: API Alpha (Week 4) | 25% | $20,000 | End of Week 4 |
| M4: PWA Ready (Week 12) | 25% | $20,000 | End of Week 12 |
| M6: Launch (Week 16) | 25% | $20,000 | Upon launch |

### 8.3 Payment Terms
- Invoices due Net 15 from invoice date
- Payments via wire transfer or ACH
- Late payments subject to 1.5% monthly interest
- Work may be paused if payment is >15 days overdue

### 8.4 Expenses
- All cloud infrastructure costs (Firebase/GCP) are pass-through at cost
- Third-party service fees (Stripe, SendGrid, Persona) are pass-through at cost
- Travel expenses (if required) billed at cost with prior approval

---

## 9. Terms & Conditions

### 9.1 Intellectual Property
- All custom code developed under this SOW shall be owned by the Client upon final payment
- Contractor retains rights to pre-existing libraries and frameworks
- Open-source components remain under their respective licenses

### 9.2 Confidentiality
- Both parties agree to maintain confidentiality of proprietary information
- NDA terms remain in effect for 3 years following project completion

### 9.3 Warranties
- Contractor warrants deliverables will be free of material defects for 30 days post-launch
- Bug fixes during warranty period included at no additional cost
- Warranty excludes issues caused by Client modifications

### 9.4 Limitation of Liability
- Total liability limited to fees paid under this SOW
- Neither party liable for indirect, consequential, or incidental damages

### 9.5 Change Management
- Scope changes require written Change Request
- Changes >8 hours require updated cost estimate
- Changes >40 hours require SOW amendment

### 9.6 Termination
- Either party may terminate with 30 days written notice
- Upon termination, Client pays for work completed to date
- Contractor delivers all work product and documentation

---

## 10. Assumptions

1. Client has or will obtain required Firebase/GCP, Apple Developer and Google Play Console accounts
2. Client will provide timely legal review (within 5 business days)
3. Third-party APIs (Firebase, Stripe, SendGrid) remain available and stable
4. No significant changes to App Store or Play Store guidelines during development
5. Human oversight available for review/approval decisions
6. Requirements are final after Week 8 (scope freeze)
7. PWA acceptable for mobile MVP (native apps as optional add-on)

---

## 11. Acceptance

This Statement of Work is accepted and agreed to by the authorized representatives of both parties:

**Client:**

| Signature | Date |
|-----------|------|
| | |
| Name: | |
| Title: | |

**Contractor:**

| Signature | Date |
|-----------|------|
| | |
| Name: | |
| Title: | |

---

## Appendix A: Referenced Documents

1. REQUIREMENTS_SPECIFICATION.md
2. PROJECT_SCOPE.md
3. ARCHITECTURE_DESIGN.md
4. DATA_MODEL.md
5. API_SPECIFICATION.md
6. COST_PROPOSAL.md
7. RISK_MANAGEMENT.md

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | FinalWish Team | Initial draft (AWS/Go architecture) |
| 2.0.0 | 2025-12-03 | Claude | Rebranded to FinalWish, updated to Firebase/AI-Agentic architecture, revised pricing |
