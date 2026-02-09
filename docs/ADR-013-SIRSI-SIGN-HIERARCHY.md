# ADR-013: Sirsi Sign Unified Vault & Multi-Tenant Architecture
**Date:** February 2, 2026
**Status:** Accepted
**Canonical Source:** `SirsiNexusApp/docs/ADR-013-SIRSI-SIGN-HIERARCHY.md`

---

## Context

The Sirsi Sign platform used a flat routing structure and lacked clear multi-tenant grouping. To support a portfolio of entities (FinalWishes, Assiduous, etc.), the vault needed to become a hierarchical portal handling authentication, MFA, and document grouping by entity.

## Decision

1. **Hierarchical Routing**:
   - `sign.sirsi.ai/` → Landing/Entry Portal
   - `sign.sirsi.ai/vault/:user` → User personal vault root
   - `sign.sirsi.ai/vault/:user/:type/:entity/:docId` → Deep link to specific documents
2. **Integrated Onboarding**: Combine signup/MFA setup into the entry flow for unauthenticated users arriving via deep links.
3. **Multi-Tenant Grouping**: Group documents in the UI by originating entity (Tenant).
4. **Role-Based Visibility**:
   - **User**: Sees own documents grouped by sender.
   - **Entity Admin**: Sees documents/users for their specific entity.
   - **Sirsi Admin**: Global cross-tenant visibility.

## Consequences

- Routing complexity increases, requiring better breadcrumb/navigation handling.
- Auth state must be synchronized with project-specific settings.
- URL parameters must be validated to prevent IDOR or unauthorized access.

---

*Last updated: February 9, 2026*
