# ADR-016: Async Payment Settlement & Live Telemetry Stream

**Status:** Accepted
**Date:** 2026-02-10
**Decision Makers:** Antigravity (Agent), 111 Venture Studio

## Context

The Sirsi platform's payment architecture initially assumed instant settlement (primarily card transactions via Stripe). However, supporting **ACH** and **Wire** transfers (essential for professional estate settlement) introduced the challenge of asynchronous finality—payments can remain "pending" or "processing" for several business days. Provisioning access or marking contracts as "paid" during this window creates financial risk and potential service misuse.

Furthermore, the **Admin Portal** used mock intervals for system logs and file listings, which provided a low-fidelity "simulated" experience that did not reflect the actual health or contents of the infrastructure (gRPC nodes and Cloud Storage buckets).

## Decision

We have implemented a two-pronged refinement to ensure architectural integrity and transparency:

1.  **Differentiated Payment Rails (Webhook 2.0)**:
    - Updated the Stripe webhook handler in `opensign.ts` to distinguish between `checkout.session.completed` (instant) and `checkout.session.async_payment_succeeded` (delayed).
    - Introduced a `waiting_for_payment` contract state for ACH/Wire transfers.
    - Provisioning emails are now deferred until receipt of the `async_payment_succeeded` event for non-instant methods.
    - Explicit handling of `async_payment_failed` to revert contract states.

2.  **Live Infrastructure Telemetry & Vault Transparency**:
    - **Audit Trail**: Replaced frontend loops in `SystemLogs.tsx` with a real-time gRPC stream (`AdminService.ListAuditTrail`). Logs are now pulled directly from the backend audit log, reflecting authenticated developer and system actions.
    - **Live Vault**: Replaced mock file lists in `DataRoom.tsx` with a live Cloud Storage index via a new `/api/vault/list` endpoint. The Admin Portal now shows real files (executed PDFs, hashes) stored in the secure bucket.

## Alternatives Considered

### Alternative 1: Custom Polling for Settlement
- **Pros:** Does not require complex webhook logic for multiple events.
- **Cons:** Inefficient; creates unnecessary load on Stripe API; high latency in provisioning.
- **Cost:** Low development, high operational overhead.

### Alternative 2: Frontend-Only Log Aggregation
- **Pros:** Simpler to implement.
- **Cons:** Logs are lost on page refresh; no central audit trail for security forensics.
- **Cost:** Minimal.

## Justification

We chose the **Event-Driven Webhook** approach and **gRPC-Backed Telemetry** because they align with Rule 0 (Minimal/Clean Code) and Rule 12 (Dynamic Financial Integrity). 

### Industry Comparisons
| Company | Approach | Notes |
|---------|----------|-------|
| Stripe | Async Webhooks | Standard requirement for ACH/SEPA/Wire compliance. |
| Datadog | Real-time Streams | Telemetry must be sourced from the host/service, not inferred. |

### Technical Factors
- **Performance:** Reduced frontend noise by moving log logic to a pull-based gRPC model.
- **Security:** Audit trail now provides a permanent record of who accessed the Vault.
- **Maintainability:** Standardized on `AdminService` for all telemetry.

## Consequences

### Positive
- **Risk Mitigation**: Prevents service provisioning before funds are actually settled.
- **Truthful Infrastructure**: Admin dashboards now provide a "single source of truth" for system health.
- **Audit Preparedness**: Real logs enable SOC 2 compliance tracking for vault access.

### Negative
- **Increased Complexity**: Webhook handler requires careful testing of failure states (bank account NSF, etc.).
- **Dependency**: Admin UI is strictly dependent on the availability of the `AdminService` gRPC node.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Webhook Drops | Low | Med | Stripe webhook retry logic and manual "Sync Status" button in Admin Portal. |
| Telemetry Lag | Med | Low | Implement optimistic caching on the frontend via TanStack Query. |

## References

- [Stripe ACH Guide](https://stripe.com/docs/payments/ach-direct-debit)
- [ADR-015: OpenSign Convergence](ADR-015-OPENSIGN-CONVERGENCE.md)
- [Rule 12: Dynamic Financial Integrity](../GEMINI.md)

---

*Template version: 1.0*
