# Continuation Prompt: Implementation of CEO Consulting & Financial Refinement

## **Role & Mission**
You are **Antigravity**, the critical AI partner for 111 Venture Studio. You are completing the implementation of the "CEO Consulting" product for the **FinalWishes** platform, ensuring it adheres to the studio's strict financial and architectural standards.

## **Context: The "Financial Trinity" & Rule 5.3.0**
The project is governed by **GEMINI.md v5.3.0**, specifically:
- **Rule 12 (Dynamic Financial Integrity)**: Zero hardcoded financial values. All totals, discounts, and valuations must be computed in real-time.
- **Rule 13 (Standardized Valuations)**: 
    - **Internal Rate**: $125/hr
    - **Blended Market Rate**: $250/hr (2.0x Valuation Factor)
    - **Efficiency Discount**: 25% of Gross Development Value (Market Value).

## **Current State of the Catalog (`src/data/catalog.ts`)**
- **Strategic Discount**: Most a la carte modules have received a **30% price reduction** to enhance market competitiveness.
- **Exemptions**: 
    - `finalwishes-core`: $95,000
    - `branding`: $30,000
    - `maintenance`: $18,000
    - `probate`: $35,000 (per state)
- **Calculations**: All WBS costs and hours are derived from the `bundledPrice` using the $125/hr internal rate.

## **Pending Task: CEO Consulting Implementation**
The user has requested a new "CEO Consulting" carte and the removal of the old coaching module.

### **1. Definitions**
- **New Module**: `CEO Consulting`
    - **ID**: `ceo-consulting`
    - **Rates**: $300/hr, 20 hrs/week minimum ($6,000/week min).
    - **Target Price**: $6,000/week (Represented as a recurring service or part of the bundle).
- **Remove Module**: `Executor Professional Coaching` (`id: 'coaching'`).

### **2. UI Integration (`ConfigureSolution.tsx`)**
- **Order**: The top row must be updated to show:
    1. Maintenance and Support
    2. **CEO Consulting** (New)
    3. Branding and Identity
- **Visuals**: Use premium aesthetics (Glassmorphism, Gold accents) consistent with the "Royal Neo-Deco" theme.

### **3. Verification Loop**
- Ensure `calculateTotal`, `calculateTimeline`, and `calculateTotalHours` in `catalog.ts` support the new module.
- Verify that `MasterAgreement.tsx` and `printable-msa.html` correctly reflect the dynamic "Exhibit B" breakdown (Gross Value, Efficiency Discount, Strategic Discount).

## **Next Steps for the Agent**
1. **Modify `catalog.ts`**: Add `ceo-consulting`, remove `coaching`.
2. **Modify `ConfigureSolution.tsx`**: Update the card rendering logic and specific ordering.
3. **Verify**: Use the browser to confirm the math adds up and the PDF generator receives the correct query parameters.

---
**Canonical Sources:** 
- `/Users/thekryptodragon/Development/111 Venture Studio/111-Venture-Projects/GEMINI.md`
- `/Users/thekryptodragon/Development/SirsiNexusApp/packages/finalwishes-contracts/src/data/catalog.ts`
