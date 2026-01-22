# ADR-012: Dynamic Financial Calculation & Standardized Multipliers

**Status:** Accepted
**Date:** 2026-01-22
**Decision Makers:** Antigravity (Agent), 111 Venture Studio Governance

## Context

Previous iterations of the FinalWishes partnership agreement (MSA) contained hardcoded financial values (e.g., $200,000 base investment) in various locations within the UI and legal templates. This led to math inconsistencies across different views (Configure tab vs. MSA tab vs. PDF variant) and risked legal ambiguity. Financial calculations were not unified, and the multipliers for market valuation were inconsistently applied.

## Decision

We have enforced a strict **Dynamic Financial Integrity** policy. All financial figures, including base pricing, efficiency discounts, and market valuations, MUST be computed in real-time based on the user's active configuration.

1.  **Single Source of Truth**: `calculateTotal` and `calculateTotalHours` in `data/catalog.ts` are the authoritative sources for all financial math.
2.  **Standardized Multipliers**: 
    - Internal Rate: **$125/hr**
    - Blended Market Rate: **$250/hr** (2.0x Valuation Multiplier)
    - Efficiency Discount: Fixed at **25%** of Gross Market Value for SirsiNexus core leverage.
3.  **State Synchronization**: React state (Zustand) must flow through to all components, and the printable HTML version must only receive these figures via dynamic parameters (URL query strings), never via hardcoded defaults.

## Alternatives Considered

### Alternative 1: Static Tiers
- **Pros:** Simpler UI, predictable pricing.
- **Cons:** Inflexible for custom module additions. Significant manual work to update all templates whenever a tier changes.
- **Cost:** High maintenance debt.

### Alternative 2: Backend-Only Calculation
- **Pros:** Most secure.
- **Cons:** Slower UI feedback (latency). Complex to implement for pre-signature preview tabs without excessive API calls.

## Justification

Dynamic calculation ensures that the "Realization" of the discount is always mathematically sound. By standardizing the rates ($125 vs $250), we create a clear, defensible value proposition in the "Discount Realization" section of the contract.

### Technical Factors
- **Maintainability:** Changing a price in the catalog automatically propagates to the MSA, SOW, and PDF.
- **Accuracy:** Eliminates "fat-finger" errors where the SOW total doesn't match the signature block.

## Consequences

### Positive
- Absolute parity between "Configure Solution" and "Proceed to Signature."
- Transparent math for the client in the new Exhibit B.
- Automated generation of the Work Breakdown Structure (WBS) based on the same hourly logic.

### Negative
- Higher complexity in the frontend components (`MasterAgreement.tsx`, `printable-msa.html`).
- Requires careful handling of floating-point rounding (math.round used throughout).

## References

- GEMINI.md Rule 12 & Rule 13
- MasterAgreement.tsx Exhibit B
- [Architecture Index](ADR-INDEX.md)

---

*Template version: 1.0*
