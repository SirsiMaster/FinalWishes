# Project Management Plan
## Legacy - The Estate Operating System
**Version:** 1.1.0 (Infrastructure Pivot)
**Date:** January 17, 2026
**Methodology:** Agile (Scrum)

---

## 1. Project Overview

### 1.1 Project Summary
| Attribute | Value |
|-----------|-------|
| Project Name | Legacy Platform MVP |
| Duration | 90 Days (13 Weeks) |
| Start Date | TBD (Upon Contract Signature) |
| Target Launch | Start Date + 90 Days |
| Budget | See COST_PROPOSAL.md |
| Team Size | 8-10 FTEs |

### 1.2 Project Governance
```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT SPONSOR                          │
│                 (Client / Investor)                         │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    STEERING COMMITTEE                       │
│     (Sponsor + Product Owner + Tech Lead + PM)              │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  BACKEND      │   │  FRONTEND     │   │  MOBILE       │
│  TEAM         │   │  TEAM         │   │  TEAM         │
│  (Go API)     │   │  (Next.js)    │   │  (Flutter)    │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 2. Team Structure & Roles

### 2.1 Core Team Roster

| Role | Count | Responsibilities |
|------|-------|------------------|
| **Project Manager** | 1 | Sprint planning, stakeholder communication, risk management, timeline tracking |
| **Product Owner** | 1 | Backlog prioritization, acceptance criteria, stakeholder liaison |
| **Tech Lead / Architect** | 1 | Technical decisions, architecture, code reviews, team mentorship |
| **Senior Backend Engineer** | 2 | Go API development, database design, integrations |
| **Senior Frontend Engineer** | 2 | Next.js development, UI implementation, accessibility |
| **Senior Mobile Engineer** | 1 | Flutter iOS/Android development |
| **DevOps Engineer** | 1 | AWS infrastructure, CI/CD, monitoring |
| **UI/UX Designer** | 1 | Wireframes, visual design, prototypes, design system |
| **QA Engineer** | 1 | Test planning, automation, manual testing (joins Week 9) |

### 2.2 Extended Team (Part-time / Advisory)

| Role | Involvement | Responsibilities |
|------|-------------|------------------|
| Security Consultant | 20 hrs total | Penetration testing, security review |
| Legal Counsel | As needed | Terms review, notification templates |
| Compliance Advisor | 10 hrs total | SOC 2 readiness, data handling |

### 2.3 RACI Matrix

| Activity | PM | PO | Tech Lead | Dev Team | Designer | QA |
|----------|----|----|-----------|----------|----------|-----|
| Sprint Planning | A | R | C | I | I | I |
| Backlog Grooming | I | A/R | C | C | C | I |
| Architecture Decisions | I | C | A/R | C | I | I |
| UI/UX Design | I | A | C | I | R | I |
| Code Development | I | I | A | R | I | I |
| Code Review | I | I | A/R | R | I | I |
| Testing | I | I | C | C | I | A/R |
| Deployment | A | I | C | R | I | C |
| Stakeholder Updates | A/R | C | C | I | I | I |

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 3. Sprint Structure

### 3.1 Sprint Cadence
- **Sprint Length:** 2 weeks
- **Total Sprints:** 6 sprints + 1 week launch buffer

### 3.2 Sprint Ceremonies

| Ceremony | When | Duration | Attendees |
|----------|------|----------|-----------|
| Sprint Planning | Day 1, 10:00 AM | 2 hours | All team |
| Daily Standup | Daily, 9:30 AM | 15 min | All team |
| Backlog Grooming | Day 5, 2:00 PM | 1 hour | PO, Tech Lead, Leads |
| Sprint Review | Day 10, 2:00 PM | 1 hour | All team + Stakeholders |
| Retrospective | Day 10, 3:30 PM | 1 hour | All team |

### 3.3 Sprint Schedule

```
Sprint 1 (Weeks 1-2):   Foundation - Sirsi Infrastructure Layer Onboarding
Sprint 2 (Weeks 3-4):   Foundation - Data Models & Basic CRUD
Sprint 3 (Weeks 5-6):   Core - Estate Profile & Document Vault
Sprint 4 (Weeks 7-8):   Core - Verify & Notify Phases
Sprint 5 (Weeks 9-10):  Mobile - React Native Components & Features
Sprint 6 (Weeks 11-12): Polish - Testing, SOC 2 Evidence, Performance
Week 13:                Launch - Store Submission & Go-Live
```

---

## 4. Detailed Phase Breakdown

### 4.1 Phase 1: Foundation (Sprints 1-2)

#### Sprint 1 Goals
- 1.1 GCP Infrastructure: Provision Cloud Run, Cloud SQL, Firestore, VPC, Cloud Armor.
- 1.2 Sirsi Infrastructure: Onboard to the Sirsi Multi-Tenant Lifecycle Layer (CLM, Sign, Pay).
- 1.3 Auth: Firebase Auth + MFA + Custom Claims.
- [ ] Next.js app scaffold with routing
- [ ] Design system components started

#### Sprint 1 Deliverables
| Deliverable | Owner | Story Points |
|-------------|-------|--------------|
| Terraform IaC for AWS | DevOps | 8 |
| Go API project structure | Backend Lead | 5 |
| Auth endpoints (register, login, MFA) | Backend | 8 |
| Next.js app scaffold | Frontend Lead | 5 |
| Auth UI (login, register, forgot password) | Frontend | 8 |
| Design tokens & component library | Designer | 5 |

#### Sprint 2 Goals
- [ ] Database schema v1 deployed
- [ ] User CRUD complete
- [ ] Estate CRUD complete
- [ ] Basic role-based access control
- [ ] Dashboard wireframes approved

#### Sprint 2 Deliverables
| Deliverable | Owner | Story Points |
|-------------|-------|--------------|
| PostgreSQL schema migrations | Backend | 8 |
| User profile API | Backend | 5 |
| Estate API (create, read, update) | Backend | 8 |
| RBAC middleware | Backend | 5 |
| Profile UI | Frontend | 5 |
| Estate creation UI | Frontend | 5 |
| Dashboard wireframes | Designer | 5 |

### 4.2 Phase 2: Core Features (Sprints 3-4)

#### Sprint 3 Goals
- [ ] Asset CRUD (all 5 categories)
- [ ] Document vault (upload, organize, view)
- [ ] Beneficiary designation (executors, heirs)
- [ ] Principal dashboard functional

#### Sprint 4 Goals
- [ ] Death certificate upload & processing
- [ ] Executor activation workflow
- [ ] Multi-executor confirmation logic
- [ ] Notification letter generation (top 50)
- [ ] Stripe payment integration

### 4.3 Phase 3: Mobile (Sprints 5-6)

#### Sprint 5 Goals
- [ ] Flutter project setup (iOS + Android)
- [ ] Core screens (login, dashboard, assets)
- [ ] Document camera capture
- [ ] Push notification setup

#### Sprint 6 Goals
- [ ] Biometric authentication
- [ ] Full feature parity (core flows)
- [ ] Offline caching (basic)
- [ ] TestFlight / Internal Track builds

### 4.4 Phase 4: Polish & Launch (Sprint 6 + Week 13)

#### Sprint 6 (continued)
- [ ] Accessibility audit fixes
- [ ] Performance optimization
- [ ] Bug fixing sprint
- [ ] Load testing

#### Week 13
- [ ] App Store submission
- [ ] Google Play submission
- [ ] Penetration testing
- [ ] Final documentation
- [ ] Launch monitoring setup
- [ ] Go-live

---

## 5. Milestones & Checkpoints

| Milestone | Target Date | Deliverable | Exit Criteria |
|-----------|-------------|-------------|---------------|
| M1: Infrastructure Ready | End Week 2 | AWS deployed | All services accessible, CI/CD working |
| M2: API Alpha | End Week 4 | Core APIs | 80% of P0 endpoints functional |
| M3: Web Beta | End Week 8 | Web app | All P0 stories complete, internal demo |
| M4: Mobile Beta | End Week 10 | Mobile apps | TestFlight/Internal Track available |
| M5: Launch Ready | End Week 12 | All platforms | Zero P0 bugs, security audit passed |
| M6: Public Launch | End Week 13 | Live apps | Apps approved and live in stores |

---

## 6. Communication Plan

### 6.1 Stakeholder Communication

| Stakeholder | Method | Frequency | Owner |
|-------------|--------|-----------|-------|
| Project Sponsor | Executive Summary | Weekly (Friday) | PM |
| Steering Committee | Status Meeting | Bi-weekly | PM |
| Development Team | Daily Standup | Daily | Tech Lead |
| Client | Sprint Demo | Bi-weekly | PO |
| Legal Counsel | Email Updates | As needed | PM |

### 6.2 Escalation Path

```
Level 1: Team Lead (< 4 hours)
    │
    ▼ (if unresolved)
Level 2: Tech Lead / PM (< 8 hours)
    │
    ▼ (if unresolved)
Level 3: Steering Committee (< 24 hours)
    │
    ▼ (if unresolved)
Level 4: Project Sponsor (immediate)
```

### 6.3 Reporting Cadence

**Daily:**
- Standup notes in Slack #legacy-dev
- Blocker escalation if needed

**Weekly:**
- Friday status report (PM → Sponsor)
- Velocity tracking update
- Risk register review

**Bi-weekly:**
- Sprint review demo
- Retrospective actions
- Steering committee update

---

## 7. Tools & Platforms

| Purpose | Tool | Access |
|---------|------|--------|
| Project Management | Linear / Jira | All team |
| Documentation | Notion / Confluence | All team |
| Communication | Slack | All team |
| Video Meetings | Zoom / Google Meet | All team |
| Source Control | GitHub | Dev team |
| CI/CD | GitHub Actions | Dev team |
| Design | Figma | Designer + Dev |
| Infrastructure | AWS Console | DevOps + Leads |
| Monitoring | Datadog / CloudWatch | DevOps + Leads |
| Error Tracking | Sentry | Dev team |

---

## 8. Quality Gates

### 8.1 Code Quality
- All PRs require at least 1 approval
- All PRs must pass CI (tests, lint, build)
- Code coverage must not decrease
- No critical SonarQube issues

### 8.2 Definition of Done (DoD)
A story is "Done" when:
- [ ] Code is complete and merged to main
- [ ] Unit tests written (coverage maintained)
- [ ] Integration tests pass
- [ ] Code reviewed and approved
- [ ] API documentation updated
- [ ] Feature deployed to staging
- [ ] QA verified on staging
- [ ] Product Owner accepted

### 8.3 Release Criteria
A release is ready when:
- [ ] All committed stories are Done
- [ ] Zero P0/P1 bugs open
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Release notes prepared

---

## 9. Risk Management

See **RISK_MANAGEMENT.md** for detailed risk register.

### 9.1 Top Risks Summary
1. App Store rejection (Medium probability, High impact)
2. Timeline slippage (Medium probability, High impact)
3. Third-party API delays (Low probability, Medium impact)
4. Security vulnerability (Low probability, Critical impact)

---

## 10. Change Management

### 10.1 Change Request Process
1. Requestor submits Change Request (CR) via Linear/Jira
2. PM assesses impact (time, cost, scope, quality)
3. Tech Lead provides technical assessment
4. PO prioritizes against backlog
5. Steering Committee approves (if > 40 hours)
6. Scope document updated
7. Backlog adjusted

### 10.2 Scope Freeze
- **Week 8:** No new features added to MVP
- **Week 11:** Code freeze (bug fixes only)
- **Week 13:** Release freeze

---

## 11. Budget Tracking

### 11.1 Budget Summary
See **COST_PROPOSAL.md** for detailed breakdown.

| Category | Budget | Tracking |
|----------|--------|----------|
| Development (Labor) | $XXX,XXX | Weekly burn rate |
| Infrastructure | $X,XXX/mo | AWS Cost Explorer |
| Third-party Services | $X,XXX/mo | Vendor dashboards |
| Contingency (15%) | $XX,XXX | Reserve |

### 11.2 Burn Rate Monitoring
- Weekly burn rate reported in Friday status
- Variance > 10% triggers review
- Contingency usage requires Sponsor approval

---

## 12. Post-Launch Support

### 12.1 Hypercare Period
- **Duration:** 2 weeks post-launch
- **Team:** Reduced team (50%)
- **Focus:** Bug fixes, monitoring, user feedback

### 12.2 Transition to Maintenance
- Week 14: Hypercare
- Week 15: Knowledge transfer to maintenance team
- Week 16: Project closure

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
