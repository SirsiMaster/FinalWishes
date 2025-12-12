# FinalWishes Documentation Index
**Last Updated:** December 5, 2025

This document clarifies the purpose and authority of each document in the FinalWishes project to avoid duplication and inconsistency.

---

## Document Hierarchy

### Tier 1: Canonical Sources of Truth
These documents are authoritative. When conflicts exist, these win.

| Document | Purpose | Authority Over |
|----------|---------|----------------|
| `WARP.md` | Development governance rules | All development decisions |
| `docs/ADR-*.md` | Architecture decisions (immutable) | Technology choices |
| `firestore.rules` | Security rules (deployed) | Data access |
| `firestore.indexes.json` | Database indexes (deployed) | Query optimization |

### Tier 2: Requirements & Specifications
These define WHAT we build. Changes require explicit approval.

| Document | Purpose | Do NOT Duplicate In |
|----------|---------|---------------------|
| `docs/REQUIREMENTS_SPECIFICATION.md` | Functional requirements (FR-XXX) | SOW, ARCHITECTURE_DESIGN |
| `docs/USER_STORIES.md` | User stories and personas | Anywhere else |
| `docs/DATA_MODEL.md` | Firestore/SQL schemas | TECHNICAL_DESIGN |
| `docs/API_SPECIFICATION.md` | API contracts (OpenAPI) | TECHNICAL_DESIGN |

### Tier 3: Architecture & Design
These describe HOW we build. Reference Tier 2 instead of copying.

| Document | Purpose | References |
|----------|---------|------------|
| `docs/ARCHITECTURE_DESIGN.md` | High-level system design | ADRs, DATA_MODEL |
| `docs/TECHNICAL_DESIGN.md` | Implementation details | DATA_MODEL, API_SPEC |
| `docs/ADR-002-EXTERNAL-INTEGRATION-STRATEGY.md` | Integration ecosystem | None (self-contained) |

### Tier 4: Business & Proposals
These are client-facing. Should reference Tier 1-3 for technical details.

| Document | Purpose | Keep Unique |
|----------|---------|-------------|
| `proposals/SOW.md` | Statement of Work | Timeline, milestones, payment terms |
| `proposals/COST_PROPOSAL.md` | Pricing and justifications | Budget breakdown, technology justifications |
| `docs/PROJECT_SCOPE.md` | Scope summary | Phase definitions |
| `docs/MARKET_JUSTIFICATION.md` | Business case | Market analysis only |

---

## What Goes Where

### Technology Decisions
- **Make decision:** Create/update ADR
- **Reference decision:** Link to ADR from other docs

### Database Changes
- **Schema changes:** `docs/DATA_MODEL.md`
- **Index changes:** `firestore.indexes.json`
- **Security rules:** `firestore.rules`

### API Changes
- **Contract changes:** `docs/API_SPECIFICATION.md`
- **Implementation notes:** `docs/TECHNICAL_DESIGN.md`

### Requirements Changes
- **Functional requirements:** `docs/REQUIREMENTS_SPECIFICATION.md`
- **User stories:** `docs/USER_STORIES.md`

### Budget/Timeline Changes
- **Budget:** `proposals/COST_PROPOSAL.md`
- **Timeline:** `proposals/SOW.md`

---

## Anti-Patterns to Avoid

❌ **DO NOT** copy requirements into SOW (reference instead)
❌ **DO NOT** copy data models into TECHNICAL_DESIGN (reference instead)
❌ **DO NOT** copy ADR decisions into ARCHITECTURE_DESIGN (reference instead)
❌ **DO NOT** maintain state count in multiple places (single source in PROJECT_SCOPE)
❌ **DO NOT** specify integrations in multiple places (single source in ADR-002)

---

## Version Alignment

When updating documents, ensure these values are consistent:

| Value | Canonical Source |
|-------|------------------|
| State count (5) | `docs/PROJECT_SCOPE.md` |
| Budget ($95K) | `proposals/COST_PROPOSAL.md` |
| Timeline (5 months) | `proposals/SOW.md` |
| Launch states (MD, IL, MN, DC, VA) | `WARP.md` |
| Technology stack | `docs/ADR-001-ARCHITECTURE-DECISIONS.md` |
| Integration scope (Plaid/Lob/DocuSign) | `docs/ADR-002-EXTERNAL-INTEGRATION-STRATEGY.md` |
