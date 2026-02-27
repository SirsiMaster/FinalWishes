# PORTFOLIO_CANONICAL_STANDARD.md
**Sirsi Technologies — Universal Documentation Standard**
**Version:** 1.0.0
**Date:** February 27, 2026

---

## Purpose
This document defines the mandatory canonical document set that **every Sirsi portfolio repo** must contain. It ensures every AI agent (Antigravity/Gemini, Claude, Warp) and every developer can navigate any repo with the same mental model.

---

## 1. Universal Rules (GEMINI.md §1)

The following rules MUST appear identically in §1 of every repo's `GEMINI.md`. They are the portfolio standard:

```
0.  Minimal Code (Rule 0)
1.  Challenge, Don't Just Please
2.  Critical Analysis First
3.  Solve the "How"
4.  Agentic Ownership
5.  Sirsi First (Rule 1) — check UCS before building
6.  Implement, Don't Instruct (Rule 2)
7.  Test in Browser (Rule 3)
8.  Follow the Pipeline (Rule 4) — Local → GitHub → Production
9.  Always Push & Verify (Rule 5)
10. ADRs are Mandatory (Rule 8)
11. Do No Harm (Rule 14)
12. Additive-Only Changes (Rule 15)
13. Mandatory Canon Review (Rule 16)
14. Sprint Planning is Mandatory (Rule 17)
15. Living Canon (Rule 18)
16. Identity Integrity (Rule 19) — SirsiMaster account exclusively
```

**When a universal rule changes, it MUST be updated in ALL repos simultaneously.**

---

## 2. Mandatory Canonical Documents

Every Sirsi portfolio repo MUST contain the following documents. If a document doesn't apply (e.g., no proposals for an internal tool), it should contain a brief note explaining why it's excluded.

### Tier 1: Governance (Required — Every Repo)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 1 | `GEMINI.md` | AI agent directives — Universal §1 + Repo-specific §2+ | Repo root |
| 2 | `README.md` | Repo overview, setup, how to contribute | Repo root |
| 3 | `CHANGELOG.md` | Version history and notable changes | Repo root |

### Tier 2: Architecture & Design (Required — Every Repo)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 4 | `PROJECT_SCOPE.md` | What this app does, boundaries, out-of-scope | `docs/` |
| 5 | `ARCHITECTURE_DESIGN.md` | System architecture, component diagram | `docs/` |
| 6 | `TECHNICAL_DESIGN.md` | Implementation details, patterns used | `docs/` |
| 7 | `DATA_MODEL.md` | Database schema, collections, relationships | `docs/` |
| 8 | `API_SPECIFICATION.md` | API contracts, endpoints, request/response | `docs/` |

### Tier 3: Security & Compliance (Required — Every Repo)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 9 | `SECURITY_COMPLIANCE.md` | Security requirements, encryption, access control | `docs/` |
| 10 | `RISK_MANAGEMENT.md` | Risk assessment, mitigation strategies | `docs/` |
| 11 | `QA_PLAN.md` | Quality assurance strategy | `docs/` |

### Tier 4: Operations (Required — Every Repo)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 12 | `DEPLOYMENT_GUIDE.md` | How to deploy, environments, configs | `docs/` |
| 13 | `MAINTENANCE_SUPPORT.md` | Ongoing support procedures | `docs/` |
| 14 | `CHANGE_MANAGEMENT.md` | Change control process | `docs/` |
| 15 | `TEST_PLAN.md` | Testing strategy, coverage requirements | `docs/` |

### Tier 5: Knowledge & Decisions (Required — Every Repo)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 16 | `ADR-INDEX.md` | Index of all Architecture Decision Records | `docs/` |
| 17 | `ADR-TEMPLATE.md` | Template for creating new ADRs | `docs/` |

### Tier 6: Business Documents (Required — If App Has Client Contracts)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 18 | `CONTRACT.md` | Master service agreement | `proposals/` |
| 19 | `SOW.md` | Statement of work | `proposals/` |
| 20 | `COST_PROPOSAL.md` | Cost breakdown | `proposals/` |

### Tier 7: Product Documents (Required — If App Is a Product)

| # | Document | Purpose | Location |
|---|----------|---------|----------|
| 21 | `REQUIREMENTS_SPECIFICATION.md` | Functional/non-functional requirements | `docs/` |
| 22 | `USER_STORIES.md` | User stories and acceptance criteria | `docs/` |
| 23 | `MARKET_JUSTIFICATION.md` | Market analysis, competitive landscape | `docs/` |

---

## 3. Repo-Specific Sections (GEMINI.md §2+)

After the universal rules (§1), each repo's GEMINI.md MUST contain repo-specific sections:

| Section | Content | Example |
|---------|---------|---------|
| **§2 Repo-Specific Rules** | Business rules unique to this app | "Full Fidelity for Legal Documents" |
| **§3 Technology Stack** | What THIS app uses | Stack table with current versions |
| **§4 Design Language** | Visual identity for THIS app | "Royal Neo-Deco" or "Swiss Financial" |
| **§5 Architecture Rules** | Architecture decisions unique to this app | "Vault Concept", "Defense in Depth" |
| **§6 Canonical Documents** | List of THIS repo's canonical files | Tier 1-7 from above, as applicable |
| **§7 Shared Services Map** | Which Sirsi services this app consumes | Sirsi Sign, UCS, Auth |
| **§8 Test Credentials** | Test accounts for this app | Name, email |

---

## 4. Design Language Firewall

Each repo has ONE design language. Cross-pollination is prohibited.

| Repo | Design Language | Key Tokens | NEVER Apply |
|------|----------------|-----------|-------------|
| **SirsiNexusApp** (Portal) | Swiss Financial | Clean, institutional, data-focused | Royal Neo-Deco, Assiduous Modern |
| **SirsiNexusApp** (Sirsi Sign) | Sirsi Sign Brand | Professional signing, neutral | Tenant-specific styling |
| **FinalWishes** | Royal Neo-Deco | Cinzel, Gold (#C8A951), Glassmorphism | Swiss Financial, Assiduous Modern |
| **Assiduous** | Assiduous Modern | Sky Blue, Inter, FinTech minimalism | Royal Neo-Deco, Swiss Financial |

---

## 5. Gap Analysis (Current State)

### SirsiNexusApp
| Document | Status |
|----------|--------|
| GEMINI.md v6.0.0 | ✅ |
| PROJECT_SCOPE.md | ✅ |
| ARCHITECTURE_DESIGN.md | ✅ |
| TECHNICAL_DESIGN.md | ✅ |
| DATA_MODEL.md | ❌ **MISSING** |
| API_SPECIFICATION.md | ❌ **MISSING** |
| SECURITY_COMPLIANCE.md | ❌ **MISSING** (has policies/ but no top-level) |
| RISK_MANAGEMENT.md | ❌ **MISSING** |
| QA_PLAN.md | ❌ **MISSING** |
| DEPLOYMENT_GUIDE.md | ❌ **MISSING** (has CANONICAL_DEPLOYMENT_ARCHITECTURE.md) |
| MAINTENANCE_SUPPORT.md | ❌ **MISSING** |
| CHANGE_MANAGEMENT.md | ❌ **MISSING** |
| TEST_PLAN.md | ❌ **MISSING** |
| ADR-INDEX.md | ✅ |
| ADR-TEMPLATE.md | ❌ **MISSING** |

### FinalWishes
| Document | Status |
|----------|--------|
| GEMINI.md v1.0.0 | ✅ |
| PROJECT_SCOPE.md | ✅ |
| ARCHITECTURE_DESIGN.md | ✅ |
| TECHNICAL_DESIGN.md | ✅ |
| DATA_MODEL.md | ✅ |
| API_SPECIFICATION.md | ✅ |
| SECURITY_COMPLIANCE.md | ✅ |
| RISK_MANAGEMENT.md | ✅ |
| QA_PLAN.md | ✅ |
| DEPLOYMENT_GUIDE.md | ✅ |
| MAINTENANCE_SUPPORT.md | ✅ |
| CHANGE_MANAGEMENT.md | ✅ |
| TEST_PLAN.md | ✅ |
| ADR-INDEX.md | ✅ |
| ADR-TEMPLATE.md | ✅ |
| CONTRACT.md | ✅ |
| SOW.md | ✅ |
| COST_PROPOSAL.md | ✅ |
| REQUIREMENTS_SPECIFICATION.md | ✅ |
| USER_STORIES.md | ✅ |
| MARKET_JUSTIFICATION.md | ✅ |

### Assiduous
| Document | Status |
|----------|--------|
| .claude.md / GEMINI_ASSIDUOUS.md | ✅ |
| PROJECT_SCOPE.md | ✅ (in canonical/requirements/) |
| ARCHITECTURE_DESIGN.md | ✅ (in canonical/architecture/) |
| TECHNICAL_DESIGN.md | ✅ (in canonical/architecture/) |
| DATA_MODEL.md | ✅ (in canonical/architecture/) |
| API_SPECIFICATION.md | ✅ (in canonical/architecture/) |
| SECURITY_COMPLIANCE.md | ✅ (in canonical/compliance/) |
| RISK_MANAGEMENT.md | ✅ (in canonical/compliance/) |
| QA_PLAN.md | ✅ (in canonical/compliance/) |
| DEPLOYMENT_GUIDE.md | ✅ (in canonical/operations/) |
| MAINTENANCE_SUPPORT.md | ✅ (in canonical/operations/) |
| CHANGE_MANAGEMENT.md | ❌ **MISSING** (archived only) |
| TEST_PLAN.md | ✅ (in canonical/operations/) |
| ADR-INDEX.md | ✅ (in canonical/knowledge/) |
| ADR-TEMPLATE.md | ❌ **MISSING** |
| CONTRACT.md | ✅ (in canonical/proposals/) |
| SOW.md | ✅ (in canonical/proposals/) |
| COST_PROPOSAL.md | ✅ (in canonical/proposals/) |
| REQUIREMENTS_SPECIFICATION.md | ✅ (in canonical/requirements/) |
| USER_STORIES.md | ✅ (in canonical/requirements/) |

---

## 6. Portfolio Identity Map

```
SirsiMaster (GitHub Organization)
│
├── SirsiNexusApp          ← Platform Monorepo
│   ├── packages/sirsi-sign/      (E-Signing + Payment + Catalog)
│   ├── packages/sirsi-ui/        (Universal Component System)
│   ├── packages/sirsi-portal/    (Admin Portal)
│   ├── packages/sirsi-auth/      (Auth Module)
│   ├── packages/sngp/            (gRPC Services)
│   └── packages/sirsi-opensign/  (OpenSign Hosting)
│
├── FinalWishes            ← Tenant Application (Estate Planning)
│   ├── Design: Royal Neo-Deco
│   ├── Consumes: Sirsi Sign, UCS, Auth
│   └── Firebase: legacy-estate-os (to be migrated)
│
└── Assiduous              ← Tenant Application (Real Estate)
    ├── Design: Assiduous Modern
    ├── Consumes: UCS (Phase 2: + Sirsi Sign)
    └── Firebase: assiduous-prod
```

---

**Signed,**
**Antigravity (The Agent)**
