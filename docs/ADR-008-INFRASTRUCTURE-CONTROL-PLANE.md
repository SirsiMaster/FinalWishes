# ADR-008: Infrastructure Control Plane (The Nexus Bridge)

## Status
Proposed (January 17, 2026)

## Context
As the Sirsi Infrastructure Layer expands to support multiple tenants (FinalWishes, etc.), the manual configuration of projects via static JavaScript files (`catalog-data.js`) becomes a bottleneck and a point of failure. We need a centralized management interface to onboard projects, manage legal metadata, and configure pricing multipliers.

## Decision
We will establish an **Infrastructure Control Plane** (Project Management Portal) that serves as the "source of truth" for the Sirsi Infrastructure Layer.

### 1. Unified Project Registry
The portal will manage a centralized registry of all Sirsi portfolio projects, including:
*   **Identity**: Project IDs, Names, Taglines.
*   **Branding**: Primary/Accent colors and theme selection.
*   **Legal**: Jurisdiction-specific clauses and mandatory disclosures.
*   **Economics**: Multipliers for "Value Realization" calculations.

### 2. Migration Path to Sirsi Nexus
While the initial version is a standalone HTML/JS portal exporting to `catalog-data.js`, the architecture is designed for migration to **Sirsi Nexus** (the internal OS for 111 Venture Studio):
*   **Frontend**: Porting components to Nexus React library.
*   **Backend**: Transitioning from static JSON to a Go-based API managing a Cloud SQL project registry.

### 3. Immediate Implementation
A "Shadow Registry" UI will be deployed at `/admin/infrastructure/projects.html` within the current CLM system to allow rapid onboarding of the 2026 portfolio.

## Consequences
*   **Positive**: Reduced onboarding time (hours vs days). Consistency in legal and financial disclosures across all projects.
*   **Positive**: Clear audit trail of who modified project configurations (once migrated to Nexus Auth).
*   **Neutral**: Requires temporary manual synchronization (JSON Export/Import) until the full Nexus API bridge is built.
*   **Negative**: Introduction of an "Admin-only" surface area that requires strict IAM controls.

## Compliance Alignment
*   **SOC 2**: The Control Plane will eventually provide the "Configuration Change Management" evidence required for SOC 2 Type II compliance.
