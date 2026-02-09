# ADR-004: Contracts gRPC Service
**Date:** December 31, 2025
**Status:** Accepted
**Canonical Source:** `SirsiNexusApp/docs/sirsi-platform/ADR-004-CONTRACTS-GRPC-SERVICE.md`

---

## Context

The Sirsi platform needed a standardized way to manage contracts, proposals, and payment workflows across multiple projects (FinalWishes, Assiduous, Sirsi). Previously, contract pages were hardcoded HTML with static payment links.

## Decision

Deploy a **gRPC-compatible service on Cloud Run** using the Connect protocol.

| Property | Value |
|:---|:---|
| **Service Name** | `contracts-grpc` |
| **Platform** | Google Cloud Run |
| **Region** | us-east4 |
| **Project** | sirsi-nexus-live |

### API Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `CreateContract` | gRPC | Create contract in Firestore |
| `ListContracts` | gRPC | Query agreements by user/status |
| `UpdateContract` | gRPC | Update status, amounts, signatures |
| `DeleteContract` | gRPC | Remove agreement (admin) |
| `/stripe/create-checkout` | REST | Initialize Stripe session |
| `/webhook` | REST | Stripe webhook receiver |

## Consequences

- **Positive:** Centralized contract management across all Sirsi projects.
- **Positive:** Dynamic theming without code changes.
- **Negative:** Requires Cloud Run deployment (additional service).

---

*Last updated: February 9, 2026*
