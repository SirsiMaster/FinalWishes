# Architecture Decision Records (ADR) Index

This document indexes all Architecture Decision Records for the Sirsi Nexus platform.

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
| [ADR-003](ADR-003-OPENSIGN-INTEGRATION.md) | HMAC-Based Security Layer | Accepted | 2025-12-31 | — |
| [ADR-004](ADR-004-CONTRACTS-GRPC-SERVICE.md) | Contracts gRPC Service (Cloud Run) | Accepted | 2025-12-31 | — |
| [ADR-005](ADR-005-PRINTABLE-MSA-VIEWER.md) | Printable MSA Viewer Component | Accepted | 2026-01-21 | — |
| [ADR-006](ADR-006-TANSTACK-MIGRATION.md) | TanStack Migration — Replacing Next.js | Accepted | 2026-01-20 | — |
| [ADR-007](ADR-007-REPOSITORY-UNIFICATION.md) | Sirsi Repository Unification (Monorepo) | Accepted | 2026-01-20 | — |
| [ADR-008](ADR-008-INFRASTRUCTURE-CONTROL-PLANE.md) | Infrastructure Control Plane (The Nexus Bridge) | Proposed | 2026-01-17 | — |
| [ADR-009](ADR-009-GRPC-ARCHITECTURE.md) | Transition to gRPC and Protocol Buffers | Proposed | 2026-01-17 | — |
| [ADR-010](ADR-010-OFFERINGS-ENGINE-INTEGRATION.md) | Universal Offerings Engine Integration | Accepted | 2026-01-18 | — |
| [ADR-011](ADR-011-INFRASTRUCTURE-LICENSE-MODEL.md) | Infrastructure License & Services Model | Accepted | 2026-01-21 | — |
| [ADR-012](ADR-012-DYNAMIC-FINANCIAL-CALCULATION.md) | Dynamic Financial Calculation & Multipliers | Accepted | 2026-01-22 | — |
| [ADR-013](ADR-013-SIRSI-SIGN-HIERARCHY.md) | Sirsi Sign Unified Vault & Multi-Tenant Architecture | Accepted | 2026-02-02 | — |
| [ADR-014](ADR-014-BIPARTITE-CONTRACT-EXECUTION.md) | Bipartite Contract Execution Protocol | Accepted | 2026-02-07 | — |
| [ADR-015](ADR-015-OPENSIGN-CONVERGENCE.md) | OpenSign Convergence — Dual-Client Architecture | Accepted | 2026-02-07 | — |

## Categories

### Security
- ADR-001 §1: SOC 2 + AES-256 (not FIPS 140-3)
- ADR-001 §2: Cloud KMS Software Keys (not HSM)
- ADR-001 §6: Defense-in-Depth Security Architecture
- ADR-002 §6: Data Architecture & Estate Sequestration
- ADR-003: HMAC-Based Vault Security Layer

### Infrastructure
- ADR-001 §3: Google Cloud Platform (vs AWS/Azure)
- ADR-007: Monorepo Unification (all sirsi-XXX → SirsiNexusApp)
- ADR-008: Infrastructure Control Plane (Nexus Bridge)
- ADR-010: Universal Offerings Engine Integration

### Technology Stack
- ADR-001 §4: Go Backend (vs Rust)
- ADR-001 §5: React + React Native Frontend
- ADR-006: TanStack Migration — Next.js → Vite + TanStack
- ADR-009: gRPC + Protocol Buffers Architecture

### External Integrations
- ADR-002 §1-2: Document Types & Government Agencies (NO useful APIs)
- ADR-002 §3: Financial Institution Integration (Plaid for read-only)
- ADR-002 §4: Document Generation (DocuSign, Lob, OCR)
- ADR-002 §5: State-Specific Requirements (MD, DC, VA, IL, MN)
- ADR-015: OpenSign Dual-Client Architecture (gRPC + REST SDK)

### Contract Execution
- ADR-004: Contracts gRPC Service (Cloud Run)
- ADR-005: Printable MSA Viewer (Deep URL Sync)
- ADR-011: Infrastructure License & Services Model
- ADR-012: Dynamic Financial Calculation & Multipliers
- ADR-014: Bipartite Dual-Signature Ceremony
- ADR-014: Cryptographic Evidence Chain (SHA-256)

### Platform Architecture
- ADR-013: Sirsi Sign Unified Vault & Multi-Tenant Hierarchy

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
