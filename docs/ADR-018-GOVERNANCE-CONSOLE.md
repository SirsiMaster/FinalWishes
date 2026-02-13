# ADR-018: Sirsi Governance Console & Dynamic Catalog Store

## Status
Proposed

## Context
The Sirsi Studio needs a way to manage the product catalog, pricing, and contract templates dynamically without requiring code changes or deployments for every update. Previously, these were defined as static constants in `catalog.ts` and `projectTemplates.ts`.

## Decision
We have implemented a **Sirsi Governance Console** within the Admin Portal and a persistent Zustand store (`useGovernanceStore`) to manage these resources at runtime.

### Key Components:
1. **Catalog Manager**: CRUD interface for products (addons) and bundles.
2. **Template Architect**: Live editor for contract base templates and legalese.
3. **useGovernanceStore**: Persistent store that serves as the runtime source of truth, falls back to static defaults.
4. **Dynamic Calculation Engine**: Refactored `catalog.ts` and `projectTemplates.ts` to support data overrides.

### Architectural Impact:
- **ConfigureSolution**, **StatementOfWork**, **MasterAgreement**, and **ExecutiveSummary** tabs are now fully reactive to Governance changes.
- **ConfigStore** now synchronizes with the Governance store to ensure consistent pricing metadata is sent to the backend.

## Consequences
- **Positive**: Studio admins can iterate on pricing and legal terms in real-time.
- **Positive**: Parity is maintained across all contract generation artifacts (React UI, WBS, MSA text).
- **Complexity**: Components must now handle potential `undefined` states if a product/template is missing from the store (though defaults mitigate this).
- **Persistence**: Changes are stored in `localStorage` via Zustand `persist`. Future work should bridge this to a gRPC-backed persistence layer.

## References
- Rule 12 (Dynamic Financial Integrity)
- Rule 13 (Standardized Valuations)
- ADR-015 (OpenSign Convergence)
