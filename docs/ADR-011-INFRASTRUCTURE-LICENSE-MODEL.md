# ADR-011: Infrastructure License & Services Model

**Status:** Accepted
**Date:** 2026-01-21
**Decision Makers:** Antigravity (Agent), Tameeka Lockhart (Client CEO), Cylton Collymore (Lead Architect)

## Context

Initially, the engagement between Sirsi Technologies and FinalWishes Inc. was described in varying terms, ranging from a custom software development partnership to a co-founder model. To maintain clear boundaries between the proprietary **Sirsi Nexus V4 Framework** and the tenant-specific business logic of FinalWishes, a more rigorous legal and architectural model was required.

Furthermore, the initial proposal for two years of "free" maintenance and priority SLA response was found to be commercially unsustainable and misaligned with a professional services model.

## Decision

We are pivoting to a formal **Infrastructure License & Services Model**:

1.  **Retention of Foundation IP**: Sirsi Technologies retains 100% ownership of the **Background Technology** (Sirsi Nexus V4 Framework, gRPC service patterns, The Vault encryption protocols).
2.  **Vertical-Specific License**: Sirsi grants FinalWishes a perpetual, exclusive license to utilize the Nexus Framework within the **Estate Settlement and Probate Automation** market vertical.
3.  **Foreground IP ownership**: FinalWishes owns the specific business logic, branding, and probate scripts developed strictly for their platform (Work Made for Hire).
4.  **Review and Close Period**: The base engagement includes a **sixty (60) day** post-launch period for bug fixes and specification alignment.
5.  **Maintenance Add-on**: All maintenance, support, and priority SLA responses beyond the 60-day period require the purchase of a dedicated "Maintenance and Support" module.
6.  **Market Non-Compete**: Sirsi agrees to a 3-year non-competition covenant within the Probate/Estate vertical to protect the client's investment.

## Alternatives Considered

### Alternative 1: Full IP Transfer (White Label)
- **Pros:** Client owns everything; no ongoing tie to Sirsi.
- **Cons:** Significantly higher cost ($500K+); Sirsi loses the ability to reuse the foundation for other portfolio projects.
- **Cost:** ~$650,000

### Alternative 2: Standard SaaS (No Ownership)
- **Pros:** Low upfront cost.
- **Cons:** Client has zero ownership; vendor lock-in; cannot customize core logic easily.
- **Cost:** $0 Upfront, High Monthly SaaS fees.

## Justification

The License model provides the best balance of speed, cost, and security. By leveraging the existing Nexus V4 foundation, FinalWishes can launch in 5 months at a fraction of the cost of a full ground-up build, while still owning the "secret sauce" (the Foreground IP) that makes their business unique.

The 60-day Review and Close period ensures initial stability while maintaining a healthy commercial boundary for ongoing engineering effort.

## Consequences

### Positive
- Accelerated time-to-market using pre-built Sirsi components.
- Bank-grade security (The Vault) inherited from the framework.
- Clear legal title for the client's business-specific assets.
- Protected market via the 3-year vertical non-compete.

### Negative
- Client does not own the foundational framework (Background IP).
- Ongoing maintenance after 60 days requires additional investment.

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Client requires core framework changes | Medium | Medium | Sirsi handles framework updates as part of the core engine roadmap. |
| Maintenance needs exceed 60 days | High | Medium | Maintenance add-on is available for immediate purchase at launch. |

## References

- [MASTER SERVICES AGREEMENT (MSA)](../proposals/CONTRACT.md)
- [Architecture Design Document](./ARCHITECTURE_DESIGN.md)

---

*Template version: 1.0*
