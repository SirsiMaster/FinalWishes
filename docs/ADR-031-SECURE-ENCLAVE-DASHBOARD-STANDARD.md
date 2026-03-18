# ADR-031: Secure Enclave Dashboard Standard

**Status:** Accepted  
**Date:** 2026-03-18  
**Author:** Antigravity (Agent)  
**Supersedes:** N/A  

## Context

The FinalWishes platform requires a specialized dashboard that balances **Industrial-Grade Operations Intelligence** (for legal/financial professionals) with a **Premium Consumer Aesthetic** (for grieving families). Furthermore, as the platform handles highly sensitive Personal Identifiable Information (PII), HIPAA-regulated health data, and PCI DSS-regulated financial data, the previous URL-based routing (e.g., `/estates/lockhart/dashboard`) presented a potential metadata leakage and security risk.

## Decision

We are implementing the **Secure Enclave Dashboard Standard**, which codifies the following three pillars:

### 1. The "Operations Command" UI Merge
The dashboard must merge the feature density of the legacy Lockhart "Industrial" view with the "Royal Neo-Deco" aesthetic of the primary dashboard.
- **Guidance Engine Shard**: Every dashboard must feature a top-level AI insight panel titled "Guidance Engine Shard" or "Protocol Detected."
- **Horizontal Progress Vectors**: Implementation progress must be tracked via horizontal "vectors" (bars) rather than simple lists, providing a "Command & Control" feel.
- **Typography & Color**: Headlines use `Cinzel` (Royal Blue `#133378`), body uses `Inter` (Navy `#0F172A`), and primary accents use Metallic Gold (`#C8A951`). Slate and Grey are strictly prohibited for text.

### 2. Secure Enclave Siloing (The "Secure Shroud")
- **Session-Based Identification**: All estate data fetching must occur via an internal `estateId` derived from a secure session/authentication context. 
- **URL Obscurity**: URLs should not leak the plain-text name or slug of an estate (e.g., `/dashboard` vs `/estates/lockhart/dashboard`).
- **Cryptographic Tenancy**: Data must be stored and fetched within a "Hierarchical Enclave" canon where every request is validated against the user's "Shard Access" permissions.

### 3. Professional Governance Display
- **Shard Status Panel**: Every dashboard must include a dedicated "Shard Status" or "Secure Enclave Status" panel showing Encryption Level (AES-256), MFA Hardening, and Compliance Status (SOC 2, HIPAA, PCI DSS).
- **Audit Trace**: Recent activity must be presented as a "Verified Audit Trail" with "Verified" badges for all state changes.

## Alternatives Considered

- **Separate Admin vs. Consumer Dashboards**: Rejected to maintain a unified "Estate Operating System" experience where families feel the same security and precision as the professionals supporting them.
- **URL Slugs with UUIDs**: Considered, but session-based context is superior for preventing accidental sharing of sensitive URLs.

## Justification

This standard fulfills the dual requirement of **Apple-tier design quality** and **Military-grade data privacy**. By masking the estate hierarchy behind a session-based enclave, we reduce the attack surface for social engineering and data scraping while providing the user with a feeling of "Guardian-Like" permanence.

## Consequences

- **Routing Complexity**: All dashboard sub-routes must now be session-aware and handle "Estate Switching" through a secure internal selector rather than URL navigation.
- **Higher Fidelity Burden**: New features must adhere to the Royal Neo-Deco component library (24px radii, glass panels, metallic borders).
- **Compliance Alignment**: Developers must ensure that all new data points are mapped to the "Secure Shard" hierarchy in the backend (Cloud SQL + Firestore).
