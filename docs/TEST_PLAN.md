# Test Plan
## FinalWishes — The Estate Operating System
**Version:** 2.0.0
**Date:** April 7, 2026

---

## 1. Overview

Testing strategy for FinalWishes across web (React 19/Vite) and backend (Go/Cloud Run).

### 1.1 Testing Objectives
- Ensure all functional requirements are met
- Validate security and data protection (PII vault, encryption, auth)
- Verify performance under expected load
- Confirm accessibility compliance (WCAG 2.1 AA)

### 1.2 Testing Scope

| In Scope | Out of Scope |
|----------|--------------|
| Unit testing (Go + React) | Load testing beyond 10K users |
| Integration testing (API + Firestore) | Stress testing |
| End-to-end testing (Playwright) | Mobile testing (deferred) |
| Security testing (OWASP Top 10) | Desktop testing (deferred) |
| Accessibility testing | Third-party system testing |

---

## 2. Quality Gates (from QA Plan)

### 2.1 Code Quality
- All PRs require CI to pass (tests, lint, build)
- Code coverage cannot decrease
- Go: `go vet` + `gofmt` + race detector must pass
- Web: ESLint must pass (zero errors)

### 2.2 Definition of Done
- Code complete and merged
- Unit tests written for new logic
- Integration tests pass
- Code reviewed
- Documentation updated (per Rule 30)
- Verified on staging (when available)

### 2.3 Release Criteria
- Zero P0/P1 bugs
- All E2E tests passing
- Security scan clear
- Accessibility audit passed

### 2.4 Testing Responsibilities
| Activity | Dev | QA |
|----------|-----|-----|
| Unit tests | Owner | Review |
| Integration tests | Owner | Support |
| E2E tests | Support | Owner |
| Security testing | Support | Owner |

---

## 3. Testing Pyramid

```
              ┌───────────────┐
             /  E2E Tests     \
            /   (10%)          \
           /───────────────────\
          /  Integration Tests  \
         /     (20%)             \
        /─────────────────────────\
       /      Unit Tests           \
      /        (70%)                \
     /───────────────────────────────\
```

---

## 4. Unit Testing

### 4.1 Backend (Go)
- **Framework:** Go's built-in `testing` package
- **Coverage Tool:** `go test -cover -race`
- **Target:** 80%+ code coverage
- **Current:** 32 tests across 5 packages (auth, vault, opensign, estate, main)
- **Key Areas:**
  - Auth middleware (token verification, context injection)
  - PII Vault handlers (store/retrieve, validation, masking)
  - Envelope encryption (KMS integration)
  - OpenSign proxy (upstream error handling)
  - ConnectRPC service methods

### 4.2 Web Frontend (React 19 + Vite)
- **Framework:** Vitest + React Testing Library
- **Coverage Tool:** Vitest coverage (v8 provider)
- **Target:** 80%+ code coverage
- **Current:** 0 tests (gap — highest priority)
- **Key Areas:**
  - Auth flow (login, MFA enrollment, attestation)
  - Firestore hooks (useDocument, useCollection)
  - Vault operations (upload, download, preview)
  - Form validation (estate creation, beneficiary invite)
  - Route guards (AuthGuard, IdentityGate)

---

## 5. Integration Testing

### 5.1 API Integration Tests
- **Tool:** Go `httptest` + real Firestore emulator
- **Database:** Firestore emulator + test PostgreSQL

### 5.2 Key Integration Scenarios

| Scenario | Components | Priority |
|----------|------------|----------|
| User registration flow | Web → Firebase Auth → Firestore | P0 |
| Document upload | Web → Go API (signed URL) → Cloud Storage → Firestore | P0 |
| Estate creation | Web → Firestore → Security Rules | P0 |
| PII vault store/retrieve | Web → Go API → Cloud SQL (encrypted) → Cloud KMS | P0 |
| Invitation auto-match | Firestore trigger → estate_users creation | P1 |
| OpenSign envelope | Go API → sign.sirsi.ai → Firestore | P1 |

---

## 6. End-to-End Testing

### 6.1 Framework
- **Tool:** Playwright
- **Browsers:** Chrome, Firefox, Safari
- **Viewports:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x812)

### 6.2 Critical User Journeys

| Journey | Steps | Priority |
|---------|-------|----------|
| New user onboarding | Register → Verify email → Create estate → Add assets | P0 |
| Document vault | Upload → Categorize → Preview → Download → Archive | P0 |
| Beneficiary management | Invite heir → Accept → Verify identity → View estate | P0 |
| Memoir creation | Add YouTube video → Upload photos → Cinema viewer | P1 |
| PII vault | Enter SSN → Encrypted storage → Masked retrieval | P0 |
| Estate settlement | Report death → Executor confirmation → Settlement mode | P1 |

---

## 7. Security Testing

### 7.1 Automated Scans
- **SAST:** `go vet`, ESLint security rules
- **Dependency:** `npm audit`, Dependabot
- **Firestore Rules:** Unit tests via Firebase emulator

### 7.2 Security Test Cases
- Firebase Auth token forgery/bypass
- Firestore security rules enforcement (cross-estate access)
- PII vault authorization (user A cannot read user B's PII)
- Signed URL expiry and scope validation
- Cloud KMS AAD binding (estate A DEK cannot decrypt estate B data)
- XSS in rich text (TipTap obituary editor)
- CORS policy enforcement

---

## 8. Performance Criteria

| Metric | Target | Tool |
|--------|--------|------|
| API P95 latency | < 200ms | k6 |
| Page load (LCP) | < 2.5s | Lighthouse |
| First Input Delay | < 100ms | Web Vitals |
| Vault build size | < 1.2MB gzipped | Vite build output |

---

## 9. Test Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Unit/integration tests | Mock data, Firestore emulator |
| Staging | E2E, QA testing | Seeded test data (TBD — no staging yet) |
| Production | Smoke tests only | Live data (read-only) |

---

## 10. Defect Severity

| Severity | Description | Response |
|----------|-------------|----------|
| P0 - Critical | System down, data loss, PII exposure | Immediate fix |
| P1 - High | Major feature broken | Fix same sprint |
| P2 - Medium | Feature partially broken | Fix next sprint |
| P3 - Low | Minor issue, workaround exists | Backlog |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
| 2.0.0 | 2026-04-07 | Claude | Merged QA_PLAN.md, updated stack (React 19/Vite, Go/Chi, no Flutter/Next.js), added current test counts |
