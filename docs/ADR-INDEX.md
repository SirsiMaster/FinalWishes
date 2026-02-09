# Architecture Decision Records (ADR) Index

This document indexes all Architecture Decision Records for the FinalWishes platform.

## What is an ADR?

An Architecture Decision Record captures a significant architectural decision along with its context, alternatives considered, and consequences. ADRs are **immutable** once accepted—to change a decision, create a new ADR that supersedes the previous one.

## ADR Format

Each ADR follows this structure:
- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Context:** The problem or situation requiring a decision
- **Decision:** The chosen approach
- **Alternatives Considered:** Other options evaluated
- **Justification:** Why this choice (with data, comparisons, cost analysis)
- **Consequences:** Implications of the decision

## ADR Registry

| ADR # | Title | Status | Date | Supersedes |
|-------|-------|--------|------|------------|
| [ADR-001](ADR-001-ARCHITECTURE-DECISIONS.md) | Platform Architecture Decisions | Accepted | 2025-12-05 | — |
| [ADR-002](ADR-002-IMPLEMENTATION-PLAN.md) | Implementation Plan: OpenSign, Gemini & Scope | Accepted | 2025-12-11 | — |
| [ADR-003](../../../../sirsi-opensign/docs/ADR-003-HMAC-SECURITY-LAYER.md) | HMAC-Based Security Layer (See Sirsi Repository) | Accepted | 2025-12-31 | — |
| [ADR-010](ADR-010-OFFERINGS-ENGINE-INTEGRATION.md) | Universal Offerings Engine Integration | Accepted | 2026-01-18 | — |
| [ADR-011](ADR-011-INFRASTRUCTURE-LICENSE-MODEL.md) | Infrastructure License & Services Model | Accepted | 2026-01-21 | — |
| [ADR-012](ADR-012-DYNAMIC-FINANCIAL-CALCULATION.md) | Dynamic Financial Calculation & Multipliers | Accepted | 2026-01-22 | — |
| [ADR-014](ADR-014-BIPARTITE-CONTRACT-EXECUTION.md) | Bipartite Contract Execution Protocol | Accepted | 2026-02-07 | — |
| [ADR-015](ADR-015-OPENSIGN-CONVERGENCE.md) | OpenSign Convergence — Dual-Client Architecture | Accepted | 2026-02-07 | — |

## Categories

### Security
- ADR-001 §1: SOC 2 + AES-256 (not FIPS 140-3)
- ADR-001 §2: Cloud KMS Software Keys (not HSM)
- ADR-001 §6: Defense-in-Depth Security Architecture
- ADR-002 §6: Data Architecture & Estate Sequestration

### Infrastructure
- ADR-001 §3: Google Cloud Platform (vs AWS/Azure)

### Technology Stack
- ADR-001 §4: Go Backend (vs Rust)
- ADR-001 §5: React + React Native Frontend

### External Integrations
- ADR-002 §1-2: Document Types & Government Agencies (NO useful APIs)
- ADR-002 §3: Financial Institution Integration (Plaid for read-only)
- ADR-002 §4: Document Generation (DocuSign, Lob, OCR)
- ADR-002 §5: State-Specific Requirements (MD, DC, VA, IL, MN)
- ADR-015: OpenSign Dual-Client Architecture (gRPC + REST SDK)

### Contract Execution
- ADR-014: Bipartite Dual-Signature Ceremony
- ADR-014: Role-Aware Provider/Client Workflows
- ADR-014: Cryptographic Evidence Chain (SHA-256)
- ADR-014: Contract Status Lifecycle (DRAFT → FULLY_EXECUTED)

### Scope & Feasibility
- ADR-002 §7: Scope Assessment ($95K/5mo achievable with boundaries)
- ADR-002 §8: MVP Decision (guidance platform, NOT integration platform)

## Creating a New ADR

1. Copy `docs/ADR-TEMPLATE.md` to `docs/ADR-XXX-TITLE.md`
2. Fill in all sections with research and justifications
3. Add entry to this index
4. Get stakeholder approval
5. Update status to "Accepted"

---

*Last updated: 2026-02-09*
