# ADR-010: Universal Offerings Engine Integration

**Status:** Accepted  
**Date:** 2026-01-18  
**Author:** Antigravity (Agent)  
**Supersedes:** N/A

---

## Context

The FinalWishes contract generation workflow previously required users to navigate between a separate `offerings.html` page for product selection and the main `index.html` contract document. This dual-page approach introduced friction, potential data desynchronization, and redundant code. Clients needed a unified, single-page experience where their selections instantly propagated across all contract sections (SOW, Cost & Valuation, MSA, Exhibits).

Additionally, the Statement of Work tab contained hardcoded static content for the "Detailed Scope of Services" and Work Breakdown Structure (WBS), making updates labor-intensive and error-prone.

## Decision

Integrate the **Universal Offerings Engine** directly into the main contract page (`index.html`), consolidating product selection, pricing, and contract generation into a single, reactive interface.

### Key Implementation Details:

1.  **Executive Summary as Landing Tab**: Restored as the first tab, providing "Primary Objective" and "Strategic Positioning" context.
2.  **Dynamic SOW Tab**: Product selection (core bundle + add-ons) now renders directly in the SOW tab via `renderPlatformHero()` and `renderAddonCards()`.
3.  **`updateDetailedScope()` Function**: Implemented to dynamically generate and inject structured "Detailed Scope of Services" sections based on `engine.cart` items. Content is sourced from the `detailedScope` property in `catalog-data.js`.
4.  **Reactive Contract Propagation**: All sections (WBS, Value Realization, Payment Schedules, MSA Appendix, Exhibit B) are updated in real-time via `updateAllDynamicContent()` whenever the cart state changes.
5.  **Codebase Streamlining**: Removed 200+ lines of redundant static HTML, simplifying maintenance and ensuring data consistency through the Offerings Engine as the single source of truth.

## Alternatives Considered

| Alternative | Reason for Rejection |
|-------------|----------------------|
| Keep `offerings.html` as a separate page | Introduces session data loss risk, extra navigation, and code duplication. |
| Use iframe to embed offerings | Poor UX, styling conflicts, and increased complexity. |
| Static SOW content with manual updates | Not scalable, high maintenance burden, prone to inconsistencies. |

## Justification

*   **Single Source of Truth:** The `OfferingsEngine` now governs all pricing, scope, and contract data, eliminating discrepancies.
*   **Improved UX:** Clients experience a seamless, guided journey from proposal context to product selection to contract execution without page reloads.
*   **Reduced Technical Debt:** Removing static content and consolidating logic into reusable JavaScript functions simplifies future modifications.
*   **Alignment with GEMINI.md Rule 0 (Minimal Code):** The new implementation is leaner, with cleaner separation of concerns between the Offerings Engine library and the contract UI.

## Consequences

### Positive
*   Faster contract generation workflow for clients.
*   Easier to add new products or modify pricing; changes in `catalog-data.js` propagate automatically.
*   Reduced risk of SOW/MSA/Cost tab inconsistencies.

### Negative/Trade-offs
*   Increased JavaScript execution on `index.html` load—mitigated by lazy rendering and efficient DOM updates.
*   `catalog-data.js` becomes a critical file; requires careful version control.

## Related ADRs

*   **ADR-002:** Implementation Plan (defines core scope and MVP boundaries).
*   **ADR-003:** OpenSign Integration (e-signature workflow that follows contract selection).

---

*Created: 2026-01-18*
