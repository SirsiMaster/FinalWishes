# Security & Compliance
## Legacy - The Estate Operating System
**Version:** 1.0.0
**Date:** November 26, 2025

---

## 1. Security Overview

### 1.1 Security Principles
1. **Defense in Depth** - Multiple layers of security controls
2. **Least Privilege** - Minimal access rights for all components
3. **Zero Trust** - Verify all access requests
4. **Security by Design** - Security built into every component

### 1.2 Data Classification

| Classification | Examples | Handling |
|---------------|----------|----------|
| **Highly Sensitive** | Death certificates, SSN, bank accounts | Encrypted, audit logged, MFA required |
| **Sensitive** | Contact info, estate details | Encrypted at rest, access controlled |
| **Internal** | System logs, metrics | Access restricted to operations |
| **Public** | Marketing content | No restrictions |

---

## 2. Encryption Standards

### 2.1 Data at Rest
- **Database:** AES-256 via **Google Cloud SQL** (PostgreSQL) encryption.
- **Documents:** AES-256 via **Google Cloud Storage** with **Cloud KMS** customer-managed keys (CMEK).
- **NoSQL:** Firestore at-rest encryption (Google-managed).
- **Backups:** Encrypted using same keys as source.

### 2.2 Data in Transit
- **Protocol:** TLS 1.3 (minimum TLS 1.2).
- **Certificates:** **Google Managed Certificates**.
- **Internal traffic:** VPC Service Controls and internal encryption.
- **API calls:** HTTPS only, HSTS enabled.

### 2.3 Key Management
- **Provider:** **Google Cloud KMS**.
- **Key rotation:** Automatic annual rotation.
- **Per-estate keys:** Document encryption uses unique data keys per estate (ADR-031).
- **Access:** Restricted to application service accounts authenticated via IAM.

---

## 3. Authentication & Authorization

### 3.1 Authentication Methods
| Method | Use Case | Implementation |
|--------|----------|----------------|
| Email/Password | Primary login | **Firebase Auth** with bcrypt hashing |
| OAuth 2.0 | Google, Apple SSO | **Firebase Auth** social connections |
| MFA (TOTP) | **Mandatory Hardening** | **Bipartite MFA** (Firebase + SMS/Auth) |
| Biometric | Mobile apps | Face ID, Touch ID, Fingerprint |

### 3.2 Session Management
- **Token type:** JWT (RS256)
- **Access token expiry:** 1 hour
- **Refresh token expiry:** 30 days
- **Session timeout:** 30 minutes of inactivity
- **Storage:** HTTP-only secure cookies (web), secure storage (mobile)

### 3.3 Role-Based Access Control (RBAC)

**Roles:**
| Role | Description | Capabilities |
|------|-------------|--------------|
| Principal | Estate owner | Full access to own estate |
| Executor | Estate administrator (post-death) | Manage estate, generate notifications |
| Heir | Beneficiary | View-only access to assigned assets |
| Admin | System administrator | User management, support access |

**Permission Model:**
```
user → role → estate → permissions
```

---

## 4. Infrastructure Security

### 4.1 Network Architecture
- **VPC:** Isolated virtual private cloud
- **Subnets:** Public (load balancers), Private (applications), Data (databases)
- **Security Groups:** Whitelist-based firewall rules
- **NAT Gateway:** Outbound-only internet access for private subnets

### 4.2 Application-Level Rate Limiting
- **Provider:** Custom Go middleware (`internal/ratelimit`)
- **Configuration:** 100 requests per 60 seconds per IP address
- **Scope:** All authenticated API endpoints on Cloud Run
- **Note:** Cloud Armor WAF is planned for production hardening but not yet deployed. Cloud Run direct invocation does not use Global External Load Balancer required for Cloud Armor.

### 4.3 DDoS Protection
- **Cloud Run:** Built-in auto-scaling absorbs traffic spikes
- **Rate limiting:** Application-level per-IP limiting (see 4.2)
- **Firebase Hosting:** CDN edge caching reduces origin load
- **Planned:** Cloud Armor integration via Global External Load Balancer

---

## 5. Application Security

### 5.1 Secure Development Practices
- **Code reviews:** Required for all PRs
- **Static analysis:** SonarQube in CI pipeline
- **Dependency scanning:** Dependabot, Snyk
- **Secret scanning:** GitHub secret scanning enabled
- **Security testing:** OWASP ZAP scans

### 5.2 OWASP Top 10 Mitigations

| Vulnerability | Mitigation |
|---------------|------------|
| A01: Broken Access Control | RBAC, resource-level authorization |
| A02: Cryptographic Failures | TLS 1.3, AES-256, KMS |
| A03: Injection | Parameterized queries, input validation |
| A04: Insecure Design | Threat modeling, security reviews |
| A05: Security Misconfiguration | IaC, automated hardening |
| A06: Vulnerable Components | Dependency scanning, updates |
| A07: Auth Failures | Auth0, MFA, secure sessions |
| A08: Software/Data Integrity | Signed builds, code signing |
| A09: Security Logging | Comprehensive audit logging |
| A10: SSRF | Input validation, egress filtering |

### 5.3 Input Validation
- All user inputs validated server-side
- Strict type checking (Go's type system)
- Content-Type validation for uploads
- File type verification (magic bytes)

---

## 6. Audit & Logging

### 6.1 Audit Events
All security-relevant events are logged:
- Authentication (login, logout, failed attempts)
- Authorization (access granted/denied)
- Data access (reads, writes, deletes)
- Administrative actions
- System events (errors, config changes)

### 6.2 Log Format
```json
{
  "timestamp": "2025-01-01T00:00:00Z",
  "level": "INFO",
  "event": "user.login",
  "user_id": "uuid",
  "estate_id": "uuid",
  "ip_address": "1.2.3.4",
  "user_agent": "...",
  "request_id": "uuid",
  "details": { ... }
}
```

### 6.3 Log Retention
- **Hot storage:** 30 days (CloudWatch Logs)
- **Cold storage:** 7 years (S3 Glacier)
- **Immutability:** S3 Object Lock enabled

---

## 7. Compliance Frameworks

### 7.1 SOC 2 Architecture (Not Yet Certified)

> **Important:** FinalWishes implements SOC 2-aligned architecture but has NOT completed a formal SOC 2 audit. All marketing materials must use "SOC 2 Architecture" — never "SOC 2 Compliant" or "SOC 2 Certified."

**Trust Service Criteria addressed:**

| Criteria | Architecture Status | Audit Status |
|----------|-------------------|--------------|
| **Security** | Implemented | Not audited |
| **Availability** | Cloud Run auto-scaling, Firebase CDN | Not audited |
| **Processing Integrity** | Data validation, Firestore rules | Not audited |
| **Confidentiality** | Cloud KMS AES-256-GCM, PII vault | Not audited |
| **Privacy** | GDPR/CCPA data model support | Not audited |

**Timeline:** SOC 2 Type I audit planned post-launch when revenue supports audit costs (~$30K–$50K).

### 7.2 GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| Lawful basis | Consent at registration |
| Data minimization | Only necessary data collected |
| Right to access | Export functionality |
| Right to erasure | Account deletion process |
| Data portability | JSON export available |
| Breach notification | Incident response plan |
| DPO | Designated for EU users |

### 7.3 CCPA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Right to know | Privacy policy, data access |
| Right to delete | Account deletion process |
| Right to opt-out | No data selling |
| Non-discrimination | Equal service regardless |

### 7.4 State Probate Laws

**Disclaimer on all generated documents:**
> "This document is provided for informational purposes only and does not constitute legal advice. Consult a licensed attorney in your jurisdiction for legal guidance."

---

## 8. Incident Response

### 8.1 Incident Classification

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **P0 - Critical** | Data breach, system compromise | Immediate (< 15 min) |
| **P1 - High** | Security vulnerability, partial outage | < 1 hour |
| **P2 - Medium** | Suspicious activity, minor issue | < 4 hours |
| **P3 - Low** | Policy violation, minor anomaly | < 24 hours |

### 8.2 Response Process

1. **Detection:** Automated alerts, user reports
2. **Triage:** Classify severity, assign responder
3. **Containment:** Isolate affected systems
4. **Investigation:** Root cause analysis
5. **Eradication:** Remove threat
6. **Recovery:** Restore normal operations
7. **Lessons Learned:** Post-incident review

### 8.3 Data Breach Notification

If a breach occurs involving user PII:
- **Internal:** Notify security team immediately
- **Users:** Within 72 hours per GDPR
- **Authorities:** As required by jurisdiction
- **Documentation:** Full incident report

---

## 9. Vendor Security

### 9.1 Third-Party Assessment

| Vendor | Purpose | SOC 2 | Data Access |
|--------|---------|-------|-------------|
| AWS | Infrastructure | Yes | Full (encrypted) |
| Auth0 | Authentication | Yes | Credentials only |
| Stripe | Payments | Yes | Payment info |
| Gmail API (Cloud Function) | Email | Yes | Email addresses (domain-wide delegation via admin@sirsi.ai) |
| Persona | ID Verification | Yes | ID documents |

### 9.2 Data Processing Agreements
- DPAs signed with all vendors processing PII
- Annual vendor security reviews
- Contractual security requirements

---

## 10. Security Testing

### 10.1 Testing Schedule

| Test Type | Frequency | Provider |
|-----------|-----------|----------|
| Vulnerability scanning | Weekly | Automated (Qualys) |
| Penetration testing | Quarterly | External firm |
| Code review (security) | Per PR | Internal + SonarQube |
| Dependency audit | Daily | Dependabot |

### 10.2 Bug Bounty Program

Post-launch bug bounty program:
- **Platform:** HackerOne
- **Scope:** All production systems
- **Rewards:** $100 - $10,000 based on severity
- **Safe harbor:** Responsible disclosure protected

---

## 11. Secure Enclave & PII Siloing (ADR-031)

To protect the "Hierarchical Canon of Secure Enclaves," all dashboard data is protected by the **Secure Enclave Protocol**:

### 11.1 Estate Sequestration
- **Session-Bound Enclaves**: Users never interact with sensitive data through URL-exposed slugs. Data is fetched solely based on the user's authenticated session, which maps to a single, authorized `estate_id` in the **Secure Shroud**.
- **Cross-Enclave Prevention**: The backend middleware validates that every request to the `estates`, `documents`, or `assets` collections matches the session's current authorized Shard ID. Any attempt to cross-shards without a new authentication ceremony results in a `403 FORBIDDEN` and an immediate audit event.

### 11.2 PII, HIPAA, & PCI DSS Governance
- **PII/HIPAA Separation**: Sensitive health data (HIPAA) and identity documents (PCI DSS) are stored in the **Cloud SQL (PII)** enclave, keeping them physically and logically separate from transient operational data in Firestore.
- **Visible Security Visibility**: The "Shard Status" UI component (ADR-031) provides users with a direct window into the encryption state (AES-256) and hardening (MFA-Hardened) of their current estate shard.

---

## 12. Cloud KMS & PII Vault — Live Infrastructure (ADR-037)

The PII Vault is the physically isolated encryption enclave for all sensitive data. Provisioned March 20, 2026.

### 12.1 Cloud KMS Key Hierarchy

| Resource | Value |
|----------|-------|
| **Key Ring** | `projects/finalwishes-prod/locations/us-central1/keyRings/finalwishes-keyring` |
| **PII Vault Key** | `pii-vault-key` — AES-256, 365d auto-rotation, ENABLED |
| **Document Vault Key** | `document-vault-key` — AES-256, 365d auto-rotation, ENABLED |

### 12.2 Envelope Encryption Flow

```
1. Generate random 256-bit DEK (Data Encryption Key)
2. Encrypt PII with DEK using AES-256-GCM
3. Encrypt DEK with KEK via Cloud KMS (with estate-scoped AAD)
4. Store: encrypted_data + encrypted_dek + nonce
5. Zero plaintext DEK from memory
```

**Additional Authenticated Data (AAD):** Each encryption operation is bound to a specific estate ID via KMS AAD context. A DEK encrypted for Estate A **cannot** decrypt data for Estate B — this is cryptographically enforced.

### 12.3 Cloud SQL PII Vault

| Resource | Value |
|----------|-------|
| **Instance** | `finalwishes-pii-vault` (PostgreSQL 15, us-central1-c) |
| **Tier** | `db-f1-micro` (dev) → `db-n1-standard-1` (production) |
| **Database** | `pii_vault` |
| **User** | `vault_admin` (password in Secret Manager) |
| **Tables** | `user_pii`, `asset_pii`, `heir_pii`, `vault_audit_log` |
| **Access** | Go API only — no client-side access, ever |

### 12.4 Cipher Suite

All connections use:
- **TLS 1.3** (Cloud Run → Cloud SQL, mandatory)
- **TLS_AES_256_GCM_SHA384** with **ECDHE** key exchange
- **Perfect Forward Secrecy** (PFS) — past communications remain secure even if keys are compromised

### 12.5 API Endpoints

All require Firebase Auth (`Authorization: Bearer <token>`):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/vault/user-pii` | Store user SSN, DOB |
| `GET` | `/api/v1/vault/user-pii` | Retrieve user PII (masked by default) |
| `POST` | `/api/v1/vault/asset-pii` | Store account/routing/VIN |
| `GET` | `/api/v1/vault/asset-pii` | Retrieve asset PII (masked by default) |
| `POST` | `/api/v1/vault/heir-pii` | Store heir SSN, DOB |
| `GET` | `/api/v1/vault/heir-pii` | Retrieve heir PII (masked by default) |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
| 2.0.0 | 2026-03-18 | Antigravity | Nexus Refresh: Replaced AWS refs with GCP. Added Section 11: Secure Enclave Protocol (ADR-031). |
| **3.0.0** | **2026-03-20** | **Antigravity** | **Added Section 12: Cloud KMS & PII Vault live infrastructure (ADR-037). Documented cipher suite, envelope encryption flow, and API endpoints.** |

