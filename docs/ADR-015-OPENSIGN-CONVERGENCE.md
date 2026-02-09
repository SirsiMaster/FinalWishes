# ADR-015: OpenSign Convergence — Dual-Client Architecture
**Date:** February 7, 2026
**Status:** Accepted
**Prepared by:** Antigravity
**Canonical Source:** `SirsiNexusApp/docs/ADR-015-OPENSIGN-CONVERGENCE.md`

---

## Context

Two parallel signing/payment systems exist in the Sirsi Nexus monorepo:

1. **OpenSign API** (`functions/index.js`) — Express-based Cloud Functions with envelope management, multi-signer routing, PDF generation, Stripe Checkout (card+ACH+wire), MFA, HMAC security, audit logging.
2. **contracts-grpc** (`server.js`) — Node.js HTTP server on Cloud Run with contract CRUD, Stripe Checkout, webhook handling, email notifications.

Both systems handle Stripe Checkout and webhook processing, creating duplication and potential for state divergence.

## Decision

Adopt a **Dual-Client Architecture** where the frontend calls both systems, each handling what it's best at:

| System | Responsibility |
|:---|:---|
| `contractsClient` (gRPC) | Contract CRUD, config sync, catalog pricing, listing |
| `openSignClient` (REST) | Signing ceremonies, payment sessions, PDF generation, MFA, wire instructions |

## Consequences

1. **Positive:** Eliminates duplicated Stripe Checkout and webhook logic.
2. **Positive:** Adds PDF generation via OpenSign's Puppeteer pipeline.
3. **Positive:** Adds real MFA via OpenSign's TOTP/SMS/Email flow.
4. **Positive:** Enables multi-signer support via OpenSign envelopes.
5. **Positive:** Portfolio-portable — any tenant can use the same OpenSign endpoints.
6. **Risk:** Two client SDKs must be maintained (`grpc.ts` + `opensign.ts`).
7. **Mitigation:** Both use the same Firebase Auth token injection pattern.

## Implementation Status

All 5 implementation steps completed. See canonical source for file-level change manifest.

---

*Last updated: February 9, 2026*
