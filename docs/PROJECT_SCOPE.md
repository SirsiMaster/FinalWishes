# Project Scope Document
## FinalWishes - The Estate Operating System
**Version:** 4.0.0
**Date:** December 12, 2025
**Project Duration:** 5 Months (20 Weeks)

---

## 1. Executive Summary

FinalWishes is an AI-powered estate management platform that automates end-of-life administration. This document defines the scope, deliverables, and boundaries for the 5-month development sprint.

**Core Mission:** Shepherd users through the ENTIRE estate journey—from "Living Legacy" planning to post-death administration. We serve two distinct but linked personas: the **Principal** (Who plans and preserves) and the **Executor** (Who administers and settles).

**Goal:** Transform estate settlement from a bureaucratic nightmare into a streamlined, technology-assisted process, while preserving the human legacy of the departed.

### Geographic Scope: 5 Launch States

| Category | States | E-Filing Status |
|----------|--------|----------------|
| **E-Filing Available** | Maryland (MDEC), Illinois, Minnesota (MNCIS) | Integrate with existing APIs |
| **Deferred to v1.1** | DC, Virginia | Scope reduced for v1.0 launch |

---

## 2. Project Objectives

### 2.1 Primary Objectives
1. **Universal App Strategy:** Build "Mobile First" via React Native (Web + iOS + Android).
2. **Dual-Path Workflow:** Support "Living Legacy" (Pre-Death) and "Transitional Executor" (Post-Death) flows.
3. **Secure Infrastructure:** Establish SOC 2-ready GCP infrastructure (Cloud Run, Firestore, KMS).
4. **Legacy Preservation:** Implement multimedia memory walls and memoir storage.
5. **Estate Administration:** Automate probate guidance for launch states.
6. **Design Excellence:** "Light Royal Neo-Deco" design system for premium user experience.

### 2.2 Success Metrics
(unchanged)

---

## 3. Scope Definition

### 3.1 In-Scope Features

#### Phase 0: Design & Identity (Weeks 1-4)
**Graphic Design & UX**
- Brand Identity (Logo, Typography, Palette)
- High-fidelity UI Kit (Mobile & Web)
- "Light Royal Neo-Deco" Design System implementation
- Iconography and Asset production

#### Phase 1: Foundation & Vault (Weeks 1-5)
**Backend Infrastructure**
- Go API on Cloud Run
- Firestore database with security rules
- Cloud SQL for PII storage
- Cloud Storage (client-side encrypted documents)
- Cloud KMS for key management
- CI/CD pipeline (GitHub Actions → Cloud Run + Firebase)

**Authentication & User Management**
- Dual Persona Support (Principal / Executor)
- Email/password registration
- OAuth (Google, Apple Sign-In)
- Multi-factor authentication (TOTP)
- Role-based access control (Principal, Executor, Heir)

#### Phase 2: Core Logic & "The Shepherd" (Weeks 6-10)
**Verification & Logic**
- Death certificate upload & verification
- Executor notification flow
- State-specific probate guidance (MD, IL, MN)
- Letter generation (PDF)

**Legacy Features (The "Living" Pivot)**
- **Memoirs:** Rich text editor for personal stories.
- **Memory Wall:** Multimedia gallery (Photos, Videos, Music lists).
- **Heir Naming:** Designation of beneficiaries (Data only, no Will Gen).
- **Asset Distribution:** Wishlist style assignment of assets to heirs.

#### Phase 3: Universal App & Integrations (Weeks 11-16)
**React Native Development**
- **Universal Codebase:** 70% shared code between Web/iOS/Android.
- **Native Features:** Biometrics, Camera, Offline Sync.
- **Integrations:** Plaid (Assets), Lob (Mail), OpenSign (E-Sign).

#### Phase 4: Launch Prep (Weeks 17-20)
**Testing & Security**
- **Mini-Penetration Test** (External security audit).
- Load testing.
- State-specific content validation.
- App Store + Play Store submission.

**Launch**
- App Store + Play Store submission
- Web deployment
- Launch monitoring setup
- User onboarding flows

### 3.2 Future Expansion (Post-Launch)

| Feature | Rationale | Target Release |
|---------|-----------|----------------|
| **Additional states (45 remaining)** | Requires state-specific legal research per state | v1.1+ |
| Spanish localization | Translation and legal review | v1.2 |
| Cryptocurrency support | Regulatory complexity | v2.0 |
| White Glove tier (human agents) | Operational setup required | v2.0 |
| HIPAA compliance | Requires dedicated audit | v2.0 |
| API for third-party developers | Business development needed | v2.0 |

### 3.3 Assumptions
1. GCP project is available and properly configured
2. Domain and SSL certificates are procured
3. Legal disclaimers and terms of service are provided
4. Brand assets (logo, colors, fonts) are finalized
5. State-specific probate rules researched for 5 launch states
6. Third-party API keys are obtained (Plaid, Lob, DocuSign, Stripe, SendGrid, etc.)
7. Apple Developer + Google Play accounts ready by Week 14
8. State attorney engagement for legal form review ($5-10K from contingency)

### 3.4 Dependencies
| Dependency | Owner | Due Date |
|------------|-------|----------|
| Legal review of notification templates (5 states) | Legal Counsel | Week 6 |
| State-specific probate research (MD, IL, MN, DC, VA) | Legal/Research | Week 4 |
| Terms of Service draft | Legal Counsel | Week 4 |
| Privacy Policy draft | Legal Counsel | Week 4 |
| Brand guidelines finalization | Design | Week 1 |
| Firebase project setup | Stack Leader | Day 1 |
| Plaid API credentials | External | Week 6 |
| Lob API credentials | External | Week 6 |
| DocuSign API credentials | External | Week 8 |

---

## 4. Deliverables

### 4.1 Software Deliverables
| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| FinalWishes API | Go backend on Cloud Run | All endpoints functional, documented |
| FinalWishes Web | React web application | Deployed, responsive, accessible |
| FinalWishes iOS | React Native iOS app | Live in App Store |
| FinalWishes Android | React Native Android app | Live in Play Store |
| Admin Dashboard | Internal admin interface | User management, estate viewing |
| State Templates | Probate guides for 5 states | MD, IL, MN, DC, VA complete |
| Court Connectors | Automated form completion | MD, IL, MN (e-filing), DC, VA (paper) |

### 4.2 Documentation Deliverables
| Document | Description |
|----------|-------------|
| API Documentation | OpenAPI 3.0 specification |
| User Guide | End-user documentation |
| Admin Guide | Internal operations guide |
| Deployment Guide | Infrastructure setup and deployment |
| Architecture Decision Records | Technical decision documentation |

### 4.3 Infrastructure Deliverables
| Component | Specification |
|-----------|---------------|
| Production Environment | Cloud Run + Firebase Hosting |
| Staging Environment | Cloud Run (staging) |
| CI/CD Pipeline | GitHub Actions → Cloud Run + Firebase |
| Monitoring | Cloud Monitoring + Cloud Logging |
| Database | Firestore + Cloud SQL (PII) |
| Key Management | Cloud KMS (software keys) |

---

## 5. Timeline Overview

```
Week 1-4:   [████████] Foundation - GCP setup, Auth, Go API, React scaffold
Week 5-8:   [████████] Core - Estate CRUD, Asset management, 5-state templates
Week 9-12:  [████████] Vault - Document encryption, Integrations (Plaid/Lob/DocuSign), Court connectors
Week 13-16: [████████] Mobile - React Native iOS + Android
Week 17-20: [████████] Launch - Pen test, Legal form review, App Store submission
```

### 5.1 Key Milestones
| Milestone | Date | Deliverable |
|-----------|------|-------------|
| M1: Infrastructure Ready | End of Week 4 | GCP deployed, Auth working, Go API scaffold |
| M2: Core Features | End of Week 8 | Estate CRUD, Asset management, React app |
| M3: Vault Complete | End of Week 12 | Document encryption, Notifications |
| M4: Mobile Beta | End of Week 16 | iOS + Android in TestFlight/Play Console |
| M5: Launch Ready | End of Week 20 | Pen test passed, Apps in stores |

---

## 6. Constraints

### 6.1 Time Constraints
- Hard deadline: 5 months (20 weeks) from project start
- No feature creep permitted after Week 12
- State expansion (beyond 5 launch states) deferred to v1.1

### 6.2 Budget Constraints
- See COST_PROPOSAL.md for detailed breakdown
- Infrastructure budget: Approximately $3,000/month (production)
- Third-party services: Approximately $1,500/month

### 6.3 Resource Constraints
- Development model: AI-assisted (Claude + Warp + Cursor)
- Human oversight and review
- No traditional dev team

### 6.4 Technical Constraints
- Must use GCP infrastructure (Cloud Run, Firestore, Cloud SQL, Cloud KMS)
- React Native + Expo for mobile apps
- Must support 5 launch states: MD, IL, MN, DC, VA

---

## 7. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| App Store rejection | Medium | High | Early TestFlight, follow guidelines strictly |
| Third-party API delays | Low | Medium | Mock services, fallback options |
| Team velocity overestimate | Medium | High | Weekly scope reviews, buffer in Week 12 |
| Security vulnerability found | Low | Critical | Penetration testing in Week 11, bug bounty |
| Legal review delays | Medium | High | Start legal engagement Week 1 |

---

## 8. Change Control

### 8.1 Change Request Process
1. Requestor submits change request with justification
2. Technical lead assesses impact (time, cost, scope)
3. Product owner approves/rejects
4. If approved, scope document is updated
5. Timeline adjusted if necessary

### 8.2 Scope Change Authority
| Change Size | Approver |
|-------------|----------|
| < 8 hours | Tech Lead |
| 8-40 hours | Product Owner |
| > 40 hours | Project Sponsor |

---

## 9. Acceptance Criteria

The project is considered complete when:

1. **Functional Completeness**
   - [ ] All features implemented per this document
   - [ ] Web application deployed and accessible
   - [ ] iOS app live in App Store
   - [ ] Android app live in Play Store
   - [ ] 5-state probate templates complete (MD, IL, MN, DC, VA)
   - [ ] Court connectors operational (3 e-filing, 2 paper automation)
   - [ ] External integrations live (Plaid, Lob, DocuSign)

2. **Quality Gates**
   - [ ] Zero P0/P1 bugs open
   - [ ] 80%+ code coverage
   - [ ] Accessibility audit passed (WCAG 2.1 AA)
   - [ ] Performance benchmarks met

3. **Security**
   - [ ] Penetration test completed with no critical findings
   - [ ] SOC 2 readiness checklist completed

4. **Documentation**
   - [ ] API documentation published
   - [ ] User guide available
   - [ ] Runbooks for operations

---

## 10. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | | | |
| Product Owner | | | |
| Technical Lead | | | |
| Client Representative | | | |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
| 1.1.0 | 2025-11-26 | Claude | 6-state MVP scope (IL, MI, MN, DC, VA, MD), 4-month timeline, Firebase/GCP stack |
| 2.0.0 | 2025-12-05 | Claude | FinalWishes rebrand, 5-month timeline, React+Go+React Native stack |
| **4.0.0** | **2025-12-11** | **FinalWishes Team** | **Launch Scope reduced to 3 states (MD, IL, MN); AI upgraded to Gemini 3.0; E-Signature switched to OpenSign (self-hosted)** |
