# Project Scope Document
## FinalWishes - The Estate Operating System
**Version:** 2.0.0
**Date:** December 5, 2025
**Project Duration:** 5 Months (20 Weeks)

---

## 1. Executive Summary

FinalWishes is an AI-powered estate management platform that automates end-of-life administration. This document defines the scope, deliverables, and boundaries for the 5-month MVP development sprint.

**Goal:** Transform estate settlement from an 18-month bureaucratic nightmare into a streamlined, technology-assisted process.

### MVP Geographic Scope
Initial launch supports **6 states** with state-specific probate rules and institution templates:

| Region | States |
|--------|--------|
| **Midwest** | Illinois, Michigan, Minnesota |
| **Mid-Atlantic/DC Metro** | District of Columbia, Virginia, Maryland |

*Expansion to additional states in v1.1+*

---

## 2. Project Objectives

### 2.1 Primary Objectives
1. Deliver functional web application (React) and native mobile apps (React Native)
2. Establish secure, scalable GCP infrastructure (Cloud Run, Firestore, Cloud SQL)
3. Implement state-specific probate guidance for 6 launch states (IL, MI, MN, DC, VA, MD)
4. Achieve SOC 2 readiness (Type I certification process initiated)
5. Build LLM-powered process intelligence for estate workflows (Vertex AI)

### 2.2 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| On-time delivery | 100% of MVP features | Sprint completion |
| Native apps | iOS + Android in stores | App Store approval |
| Uptime | 99.9% | Post-launch week 1 |
| State coverage | 6 states with full templates | Content audit |
| User registration flow | <3 minutes | UX testing |
| Document upload speed | <30 seconds (50MB) | Performance testing |
| Security audit | Zero critical findings | Penetration test |

---

## 3. Scope Definition

### 3.1 In-Scope (MVP Features)

#### Phase 1: Foundation (Weeks 1-4)
**Backend Infrastructure**
- Go API on Cloud Run
- Firestore database with security rules
- Cloud SQL for PII storage
- Cloud Storage (client-side encrypted documents)
- Cloud KMS for key management
- CI/CD pipeline (GitHub Actions → Cloud Run + Firebase)

**Authentication & User Management**
- Email/password registration
- OAuth (Google, Apple Sign-In)
- Multi-factor authentication (TOTP)
- Role-based access control (Principal, Executor, Heir)
- Password reset flow

**Core Data Models**
- Users and profiles
- Estates and ownership
- Assets (5 categories)
- Documents and vault
- Beneficiary designations

#### Phase 2: Core Features (Weeks 5-8)
**Estate Profile**
- Asset inventory management (CRUD)
- Document vault with folder organization
- Beneficiary designation interface
- Estate dashboard with progress indicators

**Intake Phase**
- Document upload and storage
- Basic OCR extraction (AWS Textract)
- Manual asset entry forms
- Contact management

**Verify Phase**
- Death certificate upload
- Executor notification flow
- Multi-executor confirmation (2-of-3)
- 72-hour cooling-off implementation

**Notify Phase (Partial)**
- Institution templates for 6 launch states (IL, MI, MN, DC, VA, MD)
- State-specific probate guidance and requirements
- Letter generation (PDF)
- Basic tracking (sent/pending)

#### Phase 3: Vault & Security (Weeks 9-12)
**Document Vault**
- Client-side AES-256-GCM encryption
- Cloud KMS key management integration
- Document upload/download with encryption
- Folder organization

**Notifications**
- Institution letter generation
- 6-state templates
- Tracking system

#### Phase 4: Mobile Apps (Weeks 13-16)
**React Native Development**
- Expo project setup
- Shared logic from web (60-70%)
- Native biometrics (Face ID, Touch ID)
- Push notifications (FCM)
- Document camera capture
- TestFlight + Play Console beta

#### Phase 5: Launch Prep (Weeks 17-20)
**Testing & Security**
- Security penetration testing
- Load testing
- State-specific content validation (6 states)
- Documentation finalization

**Launch**
- App Store + Play Store submission
- Web deployment
- Launch monitoring setup
- User onboarding flows

### 3.2 Out of Scope (Post-MVP / Future Releases)

| Feature | Reason for Exclusion | Target Release |
|---------|---------------------|----------------|
| **Additional states (44 remaining)** | Requires state-specific legal research | v1.1+ |
| Plaid integration (auto-discovery) | Complex compliance, extends timeline | v1.1 |
| Certified mail (Lob integration) | Requires legal review, contract setup | v1.1 |
| Spanish localization | Translation and legal review | v1.2 |
| Distribute Phase (full) | Requires banking partnerships | v1.3 |
| Cryptocurrency support | Regulatory complexity | v2.0 |
| White Glove tier (human agents) | Operational setup required | v2.0 |
| HIPAA compliance | Requires dedicated audit | v2.0 |
| API for third-party developers | Business development needed | v2.0 |

### 3.3 Assumptions
1. GCP project is available and properly configured
2. Domain and SSL certificates are procured
3. Legal disclaimers and terms of service are provided
4. Brand assets (logo, colors, fonts) are finalized
5. State-specific probate rules researched for 6 launch states
6. Third-party API keys are obtained (Stripe, SendGrid, etc.)
7. Apple Developer + Google Play accounts ready by Week 14

### 3.4 Dependencies
| Dependency | Owner | Due Date |
|------------|-------|----------|
| Legal review of notification templates (6 states) | Legal Counsel | Week 6 |
| State-specific probate research (IL, MI, MN, DC, VA, MD) | Legal/Research | Week 4 |
| Terms of Service draft | Legal Counsel | Week 4 |
| Privacy Policy draft | Legal Counsel | Week 4 |
| Brand guidelines finalization | Design | Week 1 |
| Firebase project setup | Stack Leader | Day 1 |

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
| State Templates | Probate guides for 6 states | IL, MI, MN, DC, VA, MD complete |

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
Week 5-8:   [████████] Core - Estate CRUD, Asset management, 6-state templates
Week 9-12:  [████████] Vault - Document encryption, Notifications
Week 13-16: [████████] Mobile - React Native iOS + Android
Week 17-20: [████████] Launch - Pen test, App Store submission
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
- State expansion deferred to v1.1

### 6.2 Budget Constraints
- See COST_PROPOSAL.md for detailed breakdown
- Infrastructure budget: Approximately $3,000/month (production)
- Third-party services: Approximately $1,500/month

### 6.3 Resource Constraints
- Development model: AI-agentic (Claude + AI tools)
- Human oversight and review only
- No traditional dev team

### 6.4 Technical Constraints
- Must use GCP infrastructure (Cloud Run, Firestore, Cloud SQL, Cloud KMS)
- React Native + Expo for mobile apps
- Must support 6 launch states: IL, MI, MN, DC, VA, MD

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
   - [ ] All MVP features implemented per this document
   - [ ] Web application deployed and accessible
   - [ ] iOS app live in App Store
   - [ ] Android app live in Play Store
   - [ ] 6-state probate templates complete (IL, MI, MN, DC, VA, MD)

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
