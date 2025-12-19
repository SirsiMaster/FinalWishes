# ADR-003: OpenSign Integration & Mobile Responsiveness Strategy

## Status
Accepted

## Date
2025-12-19

## Context
Integration with OpenSign for the "FinalWishes" platform requires handling external UI elements (modals, popups, iframes) that are injected dynamically into the application.
On mobile devices (specifically viewport width < 480px), the default OpenSign modal positioning caused significant usability issues:
1. Modals appeared offset to the top-left, partially off-screen.
2. Inline styles from the OpenSign SDK prevented standard CSS overrides.
3. High z-index values on generated elements created layering conflicts.

## Decision
To ensure a "SwiftUI-level" premium experience on mobile, we implemented an **Aggressive MutationObserver Strategy** to control external DOM elements.

### 1. The "Enforcer" Script
We inject a specialized script that monitors the DOM for third-party elements:
- **Detection**: Identifies elements by heuristics:
  - `position: fixed` or `absolute`
  - High `z-index` (>100)
  - Identifiers like "opensign", "iframe", "dialog", or content "Continue to Sign"
- **Action**: Forcibly applies `!important` inline styles to center the element:
  - `top: 50%`, `left: 50%`
  - `transform: translate(-50%, -50%)`
  - `max-width: 95vw`
- **Persistence**: Watches for window resize and scroll events to re-apply positioning.

### 2. Global CSS Fallback
We added global CSS rules targeting generic fixed-position containers as a first line of defense before the JS executes.

### 3. Canonization Strategy (Future)
When "FinalWishes" is canonized (moved to production/mainline architecture):
- **MUST** include the `MutationObserver` modal controller in the core layout or a dedicated utility hook (`useExternalModalController`).
- **MUST** duplicate the global CSS overrides for third-party iframes/dialogs in the main theme.
- **SHOULD** consider wrapping external SDKs in a Shadow DOM or isolated container if possible, though the current `position: fixed` nature makes this difficult.

## Consequences
- **Positive**: Guarantees mobile usability for uncontrollable third-party UIs.
- **Negative**: Adds a small performance cost due to the `MutationObserver`, but scoped to the specific page/component.
- **Maintenance**: If OpenSign changes their DOM structure significantly (e.g., stops using fixed positioning), the heuristics may need updating.

## Related Code
- `public/admin/contracts.html`: Lines 5558+ (Script injection)
- `fix_modal.js` (Artifact reference)
