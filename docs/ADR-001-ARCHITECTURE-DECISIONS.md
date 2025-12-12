# Architecture Decision Record (ADR-001)
## FinalWishes Platform - Technology & Security Decisions

**Document Version:** 2.0.0
**Date:** December 5, 2025
**Status:** Approved
**Decision Makers:** Project Leadership, AI Stack Leader (Claude)

---

## Executive Summary

This document records the architectural decisions made for the FinalWishes platform, including technology stack selection, security architecture, and cloud provider choices. Each decision includes context, options considered, justification, and industry comparisons.

These decisions prioritize **practical security over theoretical perfection**, balancing regulatory requirements with delivery timeline and cost constraints.

---

## ADR-001: Security Compliance Level

### Context
FinalWishes handles sensitive estate data including:
- Personal Identifiable Information (PII)
- Financial account references
- Legal documents (wills, trusts, death certificates)
- Beneficiary information

The question: What level of security compliance is appropriate?

### Options Considered

| Option | Description | Cost Impact | Timeline Impact |
|--------|-------------|-------------|-----------------|
| **FIPS 140-3** | Federal cryptographic standard with HSM requirement | +$50,000-100,000/year | +3-4 months |
| **SOC 2 Type II + AES-256** | Industry standard for fintech/SaaS | +$15,000-30,000 (audit) | +1 month |
| **Basic Encryption** | TLS + at-rest encryption only | Minimal | None |

### Decision: **SOC 2 Type II + AES-256 (Option 2)**

### Justification

#### Who Actually Uses FIPS 140-3?
FIPS 140-3 is a **federal standard** required for:
- U.S. Government agencies and contractors
- Defense industrial base
- Healthcare systems handling federal data
- Banking core ledger systems (not customer-facing apps)

#### Who Does NOT Use FIPS 140-3?
Consumer fintech and estate planning applications do not require FIPS certification:

| Company | What They Handle | Security Standard |
|---------|------------------|-------------------|
| **Betterment** | $40B+ in assets | SOC 2, standard AWS encryption |
| **Wealthfront** | $30B+ in assets | SOC 2, standard encryption |
| **Trust & Will** | Estate documents, wills | Basic cloud encryption |
| **Everplans** | Estate planning, PII | Enterprise security (no FIPS) |
| **1Password** | Passwords, secrets | AES-256, custom key derivation |
| **Robinhood** | Securities trading | SOC 2, standard encryption |
| **Stripe** | Payment card data (PCI-DSS) | SOC 2, HSM for card keys only |
| **Plaid** | Bank credentials | SOC 2, no FIPS requirement |

#### Industry Standard for Estate/Fintech Apps
The accepted standard is:
1. **SOC 2 Type II certification** (annual audit)
2. **AES-256 encryption** at rest
3. **TLS 1.3** in transit
4. **MFA enforcement** for sensitive operations
5. **Annual penetration testing**

This is what investors, partners, and enterprise customers expect. FIPS 140-3 is overkill and would not provide competitive advantage.

### Consequences
- ✅ Achievable within timeline and budget
- ✅ Meets customer and partner expectations
- ✅ Allows use of standard cloud services
- ❌ Cannot market to federal government (not our target market)

---

## ADR-002: Hardware Security Module (HSM) Requirement

### Context
HSMs provide hardware-based key storage with tamper-evident protection. The question: Do we need Cloud HSM for encryption key management?

### Options Considered

| Option | Security Level | Cost | Use Case |
|--------|---------------|------|----------|
| **Cloud HSM** | FIPS 140-2 Level 3 | $1,000-3,000/month | Crypto exchanges, banks |
| **Cloud KMS (Software)** | FIPS 140-2 Level 1 | ~$0.03/10,000 ops | Fintech, SaaS, most apps |
| **Application-managed keys** | Varies | Minimal | Not recommended |

### Decision: **Cloud KMS Software Keys (Option 2)**

### Justification

#### HSM Adoption Reality
Hardware Security Modules are used by a very small percentage of applications:

| Industry | HSM Usage | Why |
|----------|-----------|-----|
| **Cryptocurrency exchanges** | Required | Holding billions in keys |
| **Banking core systems** | Required | Regulatory mandate |
| **Payment processors** | Partial | PCI-DSS for card keys |
| **Certificate authorities** | Required | Root key protection |
| **Consumer fintech** | Not used | Cost prohibitive, unnecessary |
| **SaaS applications** | Not used | Software KMS sufficient |

#### Cost Analysis

| Key Management | Monthly Cost | Annual Cost |
|----------------|--------------|-------------|
| Cloud HSM (1 key ring) | $1,200+ | $14,400+ |
| Cloud KMS (software) | ~$10-50 | ~$120-600 |
| **Difference** | **~$1,150/month** | **~$13,800/year** |

For a startup, $14,000/year for HSM provides **zero additional customer value** over Cloud KMS.

#### What Cloud KMS Provides
Google Cloud KMS (software keys) includes:
- AES-256 and RSA key support
- Automatic key rotation
- IAM-based access control
- Audit logging
- FIPS 140-2 Level 1 validation (sufficient for SOC 2)
- Integration with all GCP services

### Industry Comparison
| Company | Key Management | Notes |
|---------|---------------|-------|
| **Stripe** | HSM for card data only, KMS for rest | PCI-DSS requires HSM for card keys |
| **Plaid** | Software KMS | Handles bank credentials |
| **Coinbase** | HSM | Crypto exchange - required |
| **Square** | Mixed | HSM for card processing only |
| **Most SaaS** | Software KMS | Industry standard |

### Consequences
- ✅ 99% cost reduction vs HSM
- ✅ Sufficient for SOC 2 compliance
- ✅ Faster implementation
- ❌ Cannot claim "HSM-protected" (marketing only, not functional difference)

---

## ADR-003: Cloud Provider Selection

### Context
Evaluate whether to stay on Google Cloud Platform or migrate to AWS or Azure.

### Options Considered

| Provider | Strengths | Weaknesses |
|----------|-----------|------------|
| **GCP** | Firebase native, Cloud Run, Firestore | Smaller ecosystem |
| **AWS** | Largest ecosystem, most services | No Firebase, more complex |
| **Azure** | Microsoft integration, enterprise | Less startup-friendly |

### Decision: **Remain on Google Cloud Platform**

### Justification

#### Security Certifications (All Equivalent)

| Certification | GCP | AWS | Azure |
|---------------|-----|-----|-------|
| SOC 1/2/3 | ✅ | ✅ | ✅ |
| ISO 27001 | ✅ | ✅ | ✅ |
| ISO 27017 | ✅ | ✅ | ✅ |
| ISO 27018 | ✅ | ✅ | ✅ |
| HIPAA BAA | ✅ | ✅ | ✅ |
| PCI DSS | ✅ | ✅ | ✅ |
| FedRAMP | ✅ | ✅ | ✅ |

**There is no security advantage to switching providers.** All three meet bank-grade compliance requirements.

#### Feature Comparison for FinalWishes

| Feature | GCP | AWS Equivalent | Migration Effort |
|---------|-----|----------------|------------------|
| Firebase Auth | Native | Cognito (different API) | 2-3 weeks |
| Firestore | Native | DynamoDB (different model) | 3-4 weeks |
| Firebase Hosting | Native | CloudFront + S3 | 1 week |
| Cloud Run | Native | ECS/Fargate | 1-2 weeks |
| Cloud KMS | Native | AWS KMS | 1 week |
| **Total Migration** | N/A | N/A | **8-11 weeks** |

#### Cost Analysis

| Scenario | GCP | AWS | Azure |
|----------|-----|-----|-------|
| Startup credits | $100K available | $100K available | $150K available |
| Firebase equivalent | Included | Additional services needed | Additional services needed |
| Estimated monthly (MVP) | $500-800 | $600-900 | $550-850 |

#### Decision Rationale
1. **Already deployed** on GCP/Firebase
2. **Zero security benefit** from migration
3. **8-11 weeks migration cost** for no gain
4. **Firebase integration** is seamless and battle-tested
5. **Cloud Run** is best-in-class for containers

### Consequences
- ✅ No migration delay
- ✅ Leverage existing Firebase infrastructure
- ✅ Team familiarity maintained
- ❌ Locked into GCP ecosystem (acceptable trade-off)

---

## ADR-004: Backend Technology Selection

### Context
Select the backend programming language and framework for the API layer.

### Options Considered

| Option | Performance | Security | AI Code Gen Quality | Learning Curve |
|--------|-------------|----------|---------------------|----------------|
| **Rust (Axum)** | Excellent | Excellent (memory-safe) | Good | Steep |
| **Go** | Excellent | Very Good | Excellent | Gentle |
| **Node.js** | Good | Adequate | Excellent | None |
| **Python (FastAPI)** | Good | Adequate | Excellent | None |

### Decision: **Go (Golang) on Cloud Run**

### Justification

#### Why Not Rust?
While Rust offers superior memory safety, several factors make Go the better choice:

| Factor | Rust | Go | Impact |
|--------|------|-----|--------|
| AI code generation | Good | Excellent | Go has more training data |
| Firebase Admin SDK | Community | **Official** | Critical for integration |
| Build times | 2-5 minutes | 10-30 seconds | Developer velocity |
| Deployment size | 5-20 MB | 10-30 MB | Equivalent |
| Crypto libraries | Good | **Excellent (stdlib)** | stdlib is audited |
| Cloud Run cold start | ~100ms | ~50ms | Go is faster |
| Hiring (future) | Difficult | Easy | Long-term maintainability |

#### Why Not Node.js?
Current Firebase Functions use Node.js. Issues:
- Type safety requires TypeScript discipline
- Single-threaded (performance ceiling)
- Larger attack surface (npm dependencies)
- Memory usage higher than Go

#### Go Advantages for FinalWishes

1. **Official Firebase Admin SDK** - First-class support
2. **Excellent crypto stdlib** - `crypto/aes`, `crypto/cipher` are well-audited
3. **Fast AI code generation** - Claude/Gemini produce high-quality Go
4. **Goroutines** - Excellent concurrency for document processing
5. **Single binary deployment** - Simple, secure, no runtime dependencies
6. **Cloud Run optimized** - Google's own language, best integration

#### Industry Usage

| Company | Backend Language | Notes |
|---------|------------------|-------|
| **Stripe** | Ruby, Go | Moving to Go for new services |
| **Uber** | Go | Primary backend language |
| **Twitch** | Go | High-performance requirements |
| **Cloudflare** | Go, Rust | Go for most services |
| **Docker** | Go | Container orchestration |
| **Kubernetes** | Go | Industry standard |

### Consequences
- ✅ Faster development with AI assistance
- ✅ Official Firebase support
- ✅ Excellent performance
- ✅ Strong type safety
- ❌ Not memory-safe like Rust (mitigated by Go's garbage collector and lack of pointer arithmetic)

---

## ADR-005: Frontend Technology Selection

### Context
Select the frontend framework for web and mobile applications.

### Options Considered

| Option | Web | Mobile | Code Sharing | Maturity |
|--------|-----|--------|--------------|----------|
| **React + React Native** | Excellent | Excellent | 60-70% | Excellent |
| **Next.js + React Native** | Excellent | Excellent | 60-70% | Excellent |
| **Flutter (Web + Mobile)** | Good | Excellent | 90%+ | Good |
| **Static HTML/Tailwind** | Good | None | 0% | N/A |

### Decision: **React + Vite (Web) + React Native (Mobile)**

### Justification

#### Why Not Static HTML (Current Approach)?
The current vanilla HTML/Tailwind approach has limitations:
- No component reuse
- No state management
- No code sharing with mobile
- Manual DOM manipulation
- Difficult to maintain at scale

#### Why React Over Flutter?

| Factor | React/RN | Flutter | Winner |
|--------|----------|---------|--------|
| Web performance | Native | Compiled to Canvas | **React** |
| Mobile performance | Near-native | Native | Flutter (slight) |
| Developer ecosystem | Massive | Growing | **React** |
| AI code generation | Excellent | Good | **React** |
| Component libraries | Thousands | Hundreds | **React** |
| Hiring pool | Large | Medium | **React** |
| Code sharing | 60-70% | 90%+ | Flutter |

Flutter's web rendering (Canvas-based) has accessibility and SEO limitations. React's web output is native DOM.

#### Recommended Stack

```
Web Application:
├── React 18+
├── Vite (build tool - faster than CRA/Next)
├── TailwindCSS (styling)
├── React Query (server state)
├── Zustand (client state)
└── React Router (navigation)

Mobile Application:
├── React Native 0.73+
├── Expo (managed workflow)
├── React Navigation
├── React Native Paper (UI components)
└── Shared: API clients, utilities, types
```

### Consequences
- ✅ Industry-standard technology
- ✅ Excellent AI code generation support
- ✅ Large component ecosystem
- ✅ 60-70% code sharing between web and mobile
- ❌ Two frameworks to maintain (web vs mobile)

---

## ADR-006: Security Architecture

### Context
Define the comprehensive security architecture for FinalWishes.

### Decision: **Defense-in-Depth with Practical Controls**

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FinalWishes Security Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: NETWORK SECURITY                                       │
│  ├── Cloud Armor (DDoS protection)                              │
│  ├── Cloud Load Balancer (TLS termination)                      │
│  ├── VPC Service Controls (API boundaries)                      │
│  └── Private Google Access (no public IPs for backend)          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 2: APPLICATION SECURITY                                   │
│  ├── Firebase Auth (identity provider)                          │
│  │   ├── Email/Password with verification                       │
│  │   ├── Google OAuth                                           │
│  │   └── MFA: TOTP (Google Authenticator, Authy)               │
│  ├── JWT validation on every request                            │
│  ├── Role-Based Access Control (RBAC)                          │
│  │   ├── Principal: Full estate access                         │
│  │   ├── Executor: Triggered access (death verification)       │
│  │   ├── Heir: View-only, distribution phase                   │
│  │   └── Admin: Platform management                            │
│  └── Rate limiting (100 req/min per user)                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 3: DATA SECURITY                                          │
│  ├── Encryption at Rest                                         │
│  │   ├── Firestore: AES-256 (automatic)                        │
│  │   ├── Cloud SQL: AES-256 (automatic)                        │
│  │   └── Cloud Storage: AES-256-GCM (Cloud KMS keys)           │
│  ├── Encryption in Transit                                      │
│  │   ├── TLS 1.3 (all connections)                             │
│  │   └── Certificate pinning (mobile apps)                     │
│  ├── Client-Side Encryption (documents)                        │
│  │   ├── Encrypt before upload                                 │
│  │   ├── User-derived keys (PBKDF2)                           │
│  │   └── Zero-knowledge architecture                           │
│  └── Key Management (Cloud KMS)                                │
│      ├── Automatic rotation (90 days)                          │
│      ├── Separate keys per data class                          │
│      └── IAM-restricted access                                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 4: AUDIT & MONITORING                                     │
│  ├── Cloud Audit Logs (all API calls)                          │
│  ├── Cloud Logging (application logs)                          │
│  ├── Cloud Monitoring (metrics, alerts)                        │
│  ├── Sentry (error tracking)                                   │
│  └── Immutable audit trail (append-only log)                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 5: COMPLIANCE                                             │
│  ├── SOC 2 Type II (target: Month 12)                          │
│  ├── Annual penetration testing                                 │
│  ├── GDPR/CCPA data handling                                   │
│  ├── Data retention policies                                   │
│  └── Incident response plan                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Signature Access Control

For estate access after death verification:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Sig Estate Access                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NORMAL OPERATION (Principal Alive):                             │
│  └── Principal has full access via password + MFA               │
│                                                                  │
│  DEATH VERIFICATION TRIGGER:                                     │
│  ├── Death certificate uploaded                                 │
│  ├── Identity verification (Persona/Jumio)                     │
│  └── Waiting period (configurable, default 7 days)             │
│                                                                  │
│  EXECUTOR ACCESS (Software Multi-Sig):                          │
│  ├── Requires: Death verification complete                      │
│  ├── Requires: Executor identity verified                       │
│  ├── Optional: Secondary executor approval (2-of-2)            │
│  └── Access logged and time-limited                            │
│                                                                  │
│  HEIR ACCESS:                                                    │
│  ├── View-only until distribution phase                        │
│  ├── Executor approval required for each release               │
│  └── Audit trail of all access                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Consequences
- ✅ Comprehensive defense-in-depth
- ✅ Achievable within timeline
- ✅ SOC 2 compliant architecture
- ✅ Zero-knowledge for sensitive documents
- ❌ More complex than basic auth (necessary complexity)

---

## Summary of Decisions

| Decision | Choice | Primary Justification |
|----------|--------|----------------------|
| Security Standard | SOC 2 + AES-256 | Industry standard for fintech |
| Key Management | Cloud KMS (Software) | HSM unnecessary, 99% cost savings |
| Cloud Provider | GCP (remain) | No security benefit to migrate |
| Backend | Go on Cloud Run | Official Firebase SDK, AI-friendly |
| Frontend | React + React Native | Code sharing, ecosystem, AI-friendly |
| Security Architecture | Defense-in-Depth | Layered, auditable, compliant |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-05 | Claude (AI Stack Leader) | Initial architecture decisions |

---

## Approval

This Architecture Decision Record has been reviewed and approved for implementation.

**Approved By:** Project Leadership
**Date:** December 5, 2025
