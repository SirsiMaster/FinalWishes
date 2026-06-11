# ADR-047: Shared-Services Consumption with Dissociated Fallback

**Status:** Accepted
**Date:** 2026-06-11
**Scope:** Portfolio-wide (FinalWishes, Assiduous, and all Sirsi tenant apps)
**Owner directive:** "Consume working Sirsi services first; self-consume dissociated infra second, only on failure of the Sirsi operational org."

## Context

Sirsi runs shared platform services (e-signature, payments, AI, identity) so that
portfolio companies **consume Sirsi services** rather than each re-implementing and
re-paying for infrastructure. This reduces cost and proves the shared-services / internal-
marketplace model (a tenant buying Sirsi Sign is revenue to the Sirsi operational org).

But a tenant app must not be **hard-coupled** to the uptime of the Sirsi operational org:
if a shared service is down, the tenant's own product must degrade gracefully, not fail.

The canonical shared services + endpoints live in SirsiNexusApp's `SERVICES_REGISTRY.md`
(e.g. **Sirsi OpenSign API** `https://us-central1-sirsi-opensign.cloudfunctions.net/api`,
HMAC-SHA256 auth per ADR-006).

## Decision

Every tenant integration to a shared service uses a **resilient provider** with two tiers:

1. **PRIMARY — consume the Sirsi service.** Call the registry endpoint with the shared
   credential (Bearer API key and/or ADR-006 HMAC-SHA256 over body+timestamp, tenant-
   attributed via `X-Sirsi-Tenant`). This is always tried first.
2. **FALLBACK — dissociated / self-hosted infra.** Only if the Sirsi service fails an
   **availability** check (transport error, timeout, 5xx) does the tenant fall back to its
   own dissociated path.

**Critical rule:** fallback fires ONLY on a Sirsi-org *availability* failure — **never on a
clean business rejection (4xx)**. A bad request (e.g. invalid template) must surface to the
caller, not be silently re-routed to a second backend that would also reject it (or, worse,
succeed differently and create divergent state).

Each result records **`ServedBy`** (`sirsi-sign` | `dissociated`) for observability so the
portfolio can measure shared-service consumption vs. fallback rates.

### Reference implementation (FinalWishes signing)

`api/internal/opensign/provider.go`:
- `SigningProvider` interface — `CreateEnvelope(ctx, EnvelopeRequest) (*EnvelopeResult, error)`.
- `sirsiSignProvider` (primary) → the Sirsi OpenSign API; returns `errBusinessRejection` on 4xx.
- `dissociatedProvider` (fallback) → the tenant's direct/self-hosted signing endpoint.
- `ResilientProvider` → primary→fallback per the rule above.

Config (env / Secret Manager), all optional — unset tiers are skipped:
- `SIRSI_SIGN_API_URL` (default = registry URL), `SIRSI_SIGN_API_KEY`, `SIRSI_SIGN_HMAC_SECRET`, `SIRSI_SIGN_DISABLED`
- `OPENSIGN_CREATE_ENVELOPE_URL` / `OPENSIGN_API_URL` + `OPENSIGN_API_KEY` (dissociated fallback)

## Consequences

- **Positive:** tenants consume Sirsi services by default (cost + internal-revenue goal);
  resilient to Sirsi-org outages; observable consumption split; one pattern across the
  portfolio (signing today, generalizes to payments/AI/identity).
- **Negative:** two code paths to keep behavior-compatible; the shared HMAC/API credential
  must be distributed to each tenant's Secret Manager by the service org (the secret is NOT
  readable from a tenant project — correct isolation).
- **Security:** the signing webhook remains fail-closed (ADR-003/006); the server-side
  envelope→directive binding (ADR-046 follow-up) is provider-agnostic and unchanged.

## Alternatives considered

- **Sirsi-only (no fallback):** rejected — hard-couples tenant uptime to the Sirsi org.
- **Self-host-only (no Sirsi):** rejected — defeats the shared-services cost/revenue model.
- **Fall back on any error (incl. 4xx):** rejected — masks bad requests + risks divergent
  state across two backends.
