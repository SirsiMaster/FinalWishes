# FinalWishes Documentation Index
**Last Updated:** February 9, 2026

This document clarifies the purpose and authority of each document in the FinalWishes project to avoid duplication and inconsistency.

---

## Document Hierarchy

### Tier 1: Canonical Sources of Truth (The 35 Benchmark Files)
These files are the absolute authority. All project progress is measured against them.

| ID | Document | Purpose & Authority |
|----|----------|---------------------|
| **1** | `proposals/CONTRACT.md` | **The Master Agreement.** Legally binding terms. |
| **2** | `proposals/SOW.md` | **Statement of Work.** Scope, timeline, and deliverables. |
| **3** | `proposals/COST_PROPOSAL.md` | **Financial Truth.** Budget, value, and breakdowns. |
| **4** | `GEMINI.md` | **Agent Directive.** Operational rules for AI agents. |
| **5** | `docs/PROJECT_SCOPE.md` | **Scope Definition.** In/Out boundaries for MVP. |
| **6** | `docs/PROJECT_MANAGEMENT.md` | **Execution Plan.** Roles, sprints, and governance. |
| **7** | `docs/ARCHITECTURE_DESIGN.md` | **System Core.** High-level architectural blueprint. |
| **8** | `docs/TECHNICAL_DESIGN.md` | **Implementation.** Detailed technical specs. |
| **9** | `docs/DATA_MODEL.md` | **Data Truth.** Database schemas and relationships. |
| **10** | `docs/API_SPECIFICATION.md` | **Interface Contracts.** API endpoints and behavior. |
| **11** | `docs/SECURITY_COMPLIANCE.md` | **Security Posture.** SOC 2, HIPAA, and encryption rules. |
| **12** | `docs/RISK_MANAGEMENT.md` | **Risk Logic.** Identified risks and mitigations. |
| **13** | `docs/QA_PLAN.md` | **Quality Gate.** Testing strategies and acceptance criteria. |
| **14** | `docs/REQUIREMENTS_SPECIFICATION.md` | **Functional Spec.** Detailed feature requirements. |
| **15** | `docs/USER_STORIES.md` | **User Truth.** Personas and user journeys. |
| **16** | `docs/MARKET_JUSTIFICATION.md` | **Business Case.** Market size and competitive analysis. |
| **17** | `docs/DEPLOYMENT_GUIDE.md` | **Release Manual.** Deployment and rollback procedures. |
| **18** | `docs/MAINTENANCE_SUPPORT.md` | **Ops Manual.** Ongoing support and SLAs. |
| **19** | `docs/CHANGE_MANAGEMENT.md` | **Change Control.** Process for scope/timeline changes. |
| **20** | `docs/COMMUNICATION_PLAN.md` | **Comms Strategy.** Stakeholder updates and matrix. |
| **21** | `docs/TEST_PLAN.md` | **Test Strategy.** Unit, integration, and E2E plans. |
| **22** | `docs/TRAINING_DOCUMENTATION.md` | **Enablement.** Training materials for end-users. |
| **23** | `docs/ADR-001-ARCHITECTURE-DECISIONS.md` | **Tech Decisions.** Immutable record of architecture choices. |
| **24** | `docs/ADR-002-IMPLEMENTATION-PLAN.md` | **Implementation Logic.** Specific plan for execution. |
| **25** | `docs/POST_IMPLEMENTATION_REVIEW.md` | **Review Logic.** Success criteria and retrospective format. |
| **26** | `docs/ADR-INDEX.md` | **Index.** Master list of all ADRs. |
| **27** | `docs/DOCUMENTATION_INDEX.md` | **Index.** This file. Master map of documentation. |
| **28** | `docs/ADR-TEMPLATE.md` | **Template.** Standard format for new decisions. |
| **29** | `docs/SIRSI_RECIPE_LEGAL_FINANCIAL_FLOW.md` | **Component Recipe.** Reusable Three-Step Legal/Financial Flow. |
| **30** | `docs/ADR-003-OPENSIGN-INTEGRATION.md` | **Security Component.** HMAC-based vault security. |
| **31** | `docs/ADR-004-CONTRACTS-GRPC-SERVICE.md` | **Backend Service.** gRPC contract CRUD on Cloud Run. |
| **32** | `docs/ADR-005-PRINTABLE-MSA-VIEWER.md` | **Legal Artifact.** Self-contained MSA/SOW print viewer. |
| **33** | `docs/ADR-006-TANSTACK-MIGRATION.md` | **Stack Evolution.** Next.js → Vite + TanStack. |
| **34** | `docs/ADR-007-REPOSITORY-UNIFICATION.md` | **Repo Strategy.** Monorepo unification. |
| **35** | `docs/ADR-013-SIRSI-SIGN-HIERARCHY.md` | **Platform Architecture.** Multi-tenant vault hierarchy. |

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
