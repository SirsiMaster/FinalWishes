# Continuation Prompt: Probate Engine State Selector & Dynamic Pricing

## **Session Date:** January 22, 2026

---

## **Role & Mission**
You are **Antigravity**, the critical AI partner for 111 Venture Studio. This session completed the implementation of **dynamic pricing** for "CEO Consulting" (week-based) and "Probate Engine" (state-based) modules, with a focus on an intuitive state selection modal for the FinalWishes Partnership Agreement platform.

---

## **Context: Governance & Rules**
The project is governed by **GEMINI.md v5.3.0**, specifically:
- **Rule 12 (Dynamic Financial Integrity)**: Zero hardcoded financial values. All totals, discounts, and valuations must be computed in real-time.
- **Rule 13 (Standardized Valuations)**: 
    - **Internal Rate**: $125/hr
    - **Blended Market Rate**: $250/hr (2.0x Valuation Factor)
    - **Efficiency Discount**: 25% of Gross Development Value.

---

## **Completed Features This Session**

### **1. CEO Consulting - Week-Based Pricing**
- **Default Weeks**: Changed from 4 to **1 week** (clients select their own duration).
- **Rate**: $6,000/week (20 hrs @ $300/hr).
- **UI**: Week selector only appears when the CEO Consulting card is selected.
- **Caption**: "☑ Check box to select weeks" moved to bottom of card near checkbox.

**Files Modified:**
- `src/store/useConfigStore.ts` - Added `ceoConsultingWeeks` state (default: 1)
- `src/data/catalog.ts` - Updated `calculateTotal` to accept `ceoConsultingWeeks` parameter

---

### **2. Probate Engine - State-Based Pricing**
The major feature of this session. Complete implementation of per-state pricing with a full modal selector.

#### **Pricing Model:**
| Type | Price Per State |
|------|-----------------|
| Bundled | $24,500/state |
| Standalone | $35,000/state |

#### **State Selector Modal Features:**
1. **"🗺️ Select States" Button** - Appears on Probate Engine card when selected
2. **Full-Screen Modal** with:
   - Search bar to filter by state name or code
   - Scrollable single-column list of all 50 US states + Washington D.C.
   - Visual checkmarks on selected states
   - Real-time count and price display
   - **Clear All** button to reset selections
   - **Cancel** button to discard changes
   - **✓ Confirm Selection** button to save (deselects addon if 0 states confirmed)
3. **Card Display** - Shows "$73,500 (3 states)" format with dynamic pricing

#### **All 51 Jurisdictions Included:**
```
AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, 
MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, 
SD, TN, TX, UT, VT, VA, WA, WV, WI, WY, DC
```

**Files Modified:**
- `src/store/useConfigStore.ts` - Added `probateStates: string[]` and `toggleProbateState` action
- `src/data/catalog.ts` - Updated `calculateTotal` to accept `probateStateCount` parameter
- `src/components/tabs/ConfigureSolution.tsx` - Complete state selector modal implementation

---

### **3. Cross-Component Integration**
All components that call `calculateTotal` have been updated to pass both `ceoConsultingWeeks` and `probateStates.length`:

| Component | Update Status |
|-----------|---------------|
| `ConfigureSolution.tsx` | ✅ Complete |
| `SirsiVault.tsx` | ✅ Complete |
| `CostValuation.tsx` | ✅ Complete |
| `StatementOfWork.tsx` | ✅ Complete |
| `MasterAgreement.tsx` | ✅ Complete |

---

## **Function Signatures Updated**

### `calculateTotal()` in `catalog.ts`:
```typescript
export function calculateTotal(
  bundleId: string,
  addons: string[],
  ceoConsultingWeeks = 1,
  probateStateCount = 1,
): CalculateTotalResult
```

---

## **Git Commit History (This Session)**
```
3edaaa8 fix: redesign state selector as clean scroll wheel list
0d1f207 feat: implement full state selector modal with all 50 US states
812efa6 fix: state buttons now properly stop propagation and show selected summary
```

---

## **Outstanding Items / Next Steps**

### **1. Timeline & WBS Integration (Optional)**
- Review `calculateTimeline()` and `getAggregatedWBS()` in `catalog.ts` to determine if they should scale with `probateStateCount`.
- Current behavior: Timeline is fixed; consider if multi-state deployments require extended timelines.

### **2. Printable MSA Sync**
- Verify `printable-msa.html` correctly reflects state-based pricing in "Exhibit B" for PDF generation.
- Ensure query parameters pass the correct state count.

### **3. Testing Checklist**
- [ ] Select 0 states → Probate Engine should be deselected
- [ ] Select 1 state → Price = $24,500 (bundled) or $35,000 (standalone)
- [ ] Select all 51 jurisdictions → Price = $1,249,500 (bundled) or $1,785,000 (standalone)
- [ ] Search functionality (filter by "Mary" → Maryland appears)
- [ ] Clear All resets temporary selections
- [ ] Cancel discards changes, Confirm saves them
- [ ] Cross-tab pricing consistency (CostValuation, SOW, MSA)

---

## **Canonical Sources of Truth**

| Category | Path |
|----------|------|
| Governance | `/Users/thekryptodragon/Development/111 Venture Studio/111-Venture-Projects/GEMINI.md` |
| Product Catalog | `/Users/thekryptodragon/Development/SirsiNexusApp/packages/finalwishes-contracts/src/data/catalog.ts` |
| Config Store | `/Users/thekryptodragon/Development/SirsiNexusApp/packages/finalwishes-contracts/src/store/useConfigStore.ts` |
| Main UI | `/Users/thekryptodragon/Development/SirsiNexusApp/packages/finalwishes-contracts/src/components/tabs/ConfigureSolution.tsx` |

---

## **Design System Reference: "Royal Neo-Deco"**
- **Modal Styling**: Glass panels, gold borders (`#C8A951`), film grain overlay
- **Typography**: Headings in `Cinzel`, Body in `Inter`
- **Background**: Deep Royal Blue Gradient (never pure black)
- **Success States**: Emerald Green (`#10B981`)

---

**Signed,**
**Antigravity (The Agent)**
**Session: January 22, 2026**
