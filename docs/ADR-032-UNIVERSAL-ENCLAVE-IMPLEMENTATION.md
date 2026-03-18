# ADR-032: Universal Enclave Implementation (Web/Mobile/Desktop)

## Status
Proposed (March 18, 2026)

## Context
Following the implementation of **ADR-031: Secure Enclave Dashboard Standard**, we must extend these security and aesthetic protocols to our native application ecosystem (Android, SwiftUI/iOS, and Mac Desktop). This ADR provides the definitive blueprint for cross-platform parity, ensuring that the "Secure Shroud" and "Royal Neo-Deco" aesthetic are maintained across all user touchpoints.

## Decision
We will enforce the following standards for all mobile and desktop development within the Sirsi Nexus / FinalWishes ecosystem:

### 1. Cross-Platform Identification (The Secure Shroud)
*   **No URL/Path Slugs**: Deep linking must never expose sensitive IDs (e.g., `estateId`).
*   **Session-Bound Context**: All data requests must derive the active `estateId` from a secured session state (LocalStorage for Web, Encrypted Preferences/Keystore for Android, Keychain for iOS).
*   **Derivation-First Navigation**: Navigation logic must use internal shard aliases rather than raw database keys.

### 2. Aesthetic Fidelity (Royal Neo-Deco)
*   **Typography**: `Cinzel` is the mandatory header font for all platforms. `Inter` is the mandatory body font.
*   **Geometry**: Cards and UI panels must use a minimum radius of `24px` (Small) to `32px` (Large/Dashboard).
*   **Color Palette**: Primary text must be `#0F172A` (Charcoal) or `#133378` (Royal Blue). Secondary accents must be `#C8A951` (Metallic Gold). Prohibited: Slate, Grey, and Emerald (Emerald is for the parent Sirsi brand only).
*   **Gradients**: Use Deep Royal Blue gradients for core dashboard backgrounds to provide depth and a "permanent" feel.

### 3. Data Siloing (PII/HIPAA/PCI DSS)
*   **Shard Isolation**: Raw PII and sensitive data must be siloed in the Cloud SQL "Vault Shard." No sensitive data should be leaked into public-facing state or client-side telemetry.
*   **Log Anonymization**: All logging on mobile/desktop must use shard aliases (e.g., `Enclave-XXXX`) instead of real names or emails.

### 4. Implementation Specifications
*   **React (Web)**: Continue using session-based routes (`/dashboard/*`).
*   **Android (Compose)**: Use `SharedPreferences` (Encrypted) to store the active `estateId`. ViewModel state must handle the "Secure Shroud" logic.
*   **SwiftUI (iOS/macOS)**: Use `SwiftUI Layout` with `@AppStorage` or `Keychain` for estate context. Apply shadow/glassmorphism via custom ZStack modifiers.

## Consequences
*   **Cons**: Requires slightly more complex state management in native apps compared to simple path-based routing.
*   **Pros**: Absolute privacy for families; zero risk of URL-based data leakage; unified brand experience across the entire Sirsi portfolio.

## Governance
This ADR is a "Guardian Rule" (Level 3). Any deviation requires immediate review by the Sirsi Master Guardian.
