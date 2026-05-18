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
| [ADR-009](ADR-009-GRPC-ARCHITECTURE.md) | Transition to gRPC and Protocol Buffers | **Superseded** | 2026-01-17 | ADR-004 |
| [ADR-010](ADR-010-OFFERINGS-ENGINE-INTEGRATION.md) | Universal Offerings Engine Integration | Accepted | 2026-01-18 | — |
| [ADR-011](ADR-011-INFRASTRUCTURE-LICENSE-MODEL.md) | Infrastructure License & Services Model | Accepted | 2026-01-21 | — |
| [ADR-012](ADR-012-DYNAMIC-FINANCIAL-CALCULATION.md) | Dynamic Financial Calculation & Multipliers | Accepted | 2026-01-22 | — |
| [ADR-013](ADR-013-SIRSI-SIGN-HIERARCHY.md) | Sirsi Sign Unified Vault & Multi-Tenant Architecture | Accepted | 2026-02-02 | — |
| [ADR-014](ADR-014-BIPARTITE-CONTRACT-EXECUTION.md) | Bipartite Contract Execution Protocol | Accepted | 2026-02-07 | — |
| [ADR-015](ADR-015-OPENSIGN-CONVERGENCE.md) | OpenSign Convergence — Dual-Client Architecture | Accepted | 2026-02-07 | — |
| [ADR-016](ADR-016-ASYNC-PAYMENT-SETTLEMENT-AND-TELEMETRY.md) | Async Payment Settlement & Live Telemetry Stream | Accepted | 2026-02-10 | — |
| [ADR-017](ADR-017-STACK-CONVERGENCE.md) | Stack Convergence — One Unified Tech Stack | **Superseded** | 2026-02-10 | ADR-006 |
| [ADR-018](ADR-018-GOVERNANCE-CONSOLE.md) | Sirsi Governance Console & Dynamic Catalog Store | **Superseded** | 2026-02-13 | ADR-008 |
| [ADR-031](ADR-031-SECURE-ENCLAVE-DASHBOARD-STANDARD.md) | Secure Enclave Dashboard Standard | Accepted | 2026-03-18 | — |
| [ADR-032](ADR-032-UNIVERSAL-ENCLAVE-IMPLEMENTATION.md) | Universal Enclave Implementation (Web/Mobile/Desktop) | Accepted | 2026-03-18 | — |
| [ADR-033](ADR-033-DESIGN-SYSTEM-ACCELERATION.md) | Design System Acceleration & Cross-Portfolio Reuse | Accepted | 2026-03-18 | — |
| [ADR-034](ADR-034-FIREBASE-AUTH-IMPLEMENTATION.md) | Firebase Auth Implementation (Username + Email Login) | Accepted | 2026-03-19 | — |
| [ADR-035](ADR-035-TIERED-IDENTITY-VERIFICATION.md) | Tiered Identity Verification | Accepted | 2026-03-19 | — |
| [ADR-036](ADR-036-FIRESTORE-DIRECT-READS.md) | Firestore Direct Reads | Accepted | 2026-03-19 | — |
| [ADR-037](ADR-037-CLOUD-SQL-PII-VAULT.md) | Cloud SQL PII Vault — Estate-Grade Encryption | Accepted | 2026-03-20 | — |
| [ADR-038](ADR-038-LIFE-FIRST-REFRAME.md) | Life-First Reframe — Living Companion Product Pivot | Accepted | 2026-04-14 | — |
| ADR-039 | Gmail API Replaces SendGrid — Zero-Vendor Email | Accepted | 2026-04-16 | — |
| ADR-040 | Claude Opus via sirsi-ai — Primary AI for Shepherd | Accepted | 2026-04-17 | ADR-002 (AI section) |
| ADR-041 | Public Memorials + QR Sharing — Unauthenticated Access | Accepted | 2026-04-17 | — |
| ADR-042 | Events & Broadcasting — Funeral/Memorial/Repast Pages | Accepted | 2026-04-17 | — |
| [ADR-043](ADR-043-ILLINOIS-PROBATE-ENGINE.md) | Illinois Probate Engine — Pluggable State Machine | Accepted | 2026-05-18 | — |

> **Note on scope:** ADRs 004, 005, 008, 010–016, 018 were created in the context of Sirsi Sign (sign.sirsi.ai), not FinalWishes. They remain in the index for portfolio-level traceability but do not apply to FinalWishes deployment.

## Categories

### Consumer Experience & Data Privacy
- ADR-031: Secure Enclave Dashboard Standard (Industrial-Consumer Merge)
- ADR-031 §2: Secure Shroud — Session-Based Estate Siloing
- ADR-031 §3: Shard Status — Visibility for Encryption (AES-256) & Compliance
- ADR-038: Life-First Reframe — Navigation restructure, Soul Log, Legacy Timeline, Heir Welcome Screen

### Security
- ADR-001 §1: SOC 2 + AES-256 (not FIPS 140-3)
- ADR-001 §2: Cloud KMS Software Keys (not HSM)
- ADR-001 §6: Defense-in-Depth Security Architecture
- ADR-002 §6: Data Architecture & Estate Sequestration
- ADR-003: HMAC-Based Vault Security Layer
- ADR-016: Live Infrastructure Telemetry & Audit Stream
- ADR-037: Cloud SQL PII Vault — AES-256-GCM Envelope Encryption via Cloud KMS

### Infrastructure
- ADR-001 §3: Google Cloud Platform (vs AWS/Azure)
- ADR-007: Monorepo Unification (all sirsi-XXX → SirsiNexusApp)
- ADR-008: Infrastructure Control Plane (Nexus Bridge)
- ADR-010: Universal Offerings Engine Integration
- ADR-016: Live Infrastructure Telemetry & Audit Stream

### Technology Stack
- ADR-001 §4: Go Backend (vs Rust)
- ADR-001 §5: React + React Native Frontend
- ADR-006: TanStack Migration — Next.js → Vite + TanStack
- ADR-009: gRPC + Protocol Buffers Architecture
- ADR-017: Stack Convergence — One Unified Tech Stack

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
- ADR-016: Async Payment Settlement Logic

### Platform Architecture
- ADR-013: Sirsi Sign Unified Vault & Multi-Tenant Hierarchy
- ADR-018: Sirsi Governance Console & Dynamic Catalog Store

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

*Last updated: 2026-04-14*
