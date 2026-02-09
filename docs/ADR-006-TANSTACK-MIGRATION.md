# ADR-006: TanStack Migration — Replacing Next.js with Vite + TanStack
**Date:** January 20, 2026
**Status:** Accepted
**Canonical Source:** `SirsiNexusApp/docs/ADR-003-TANSTACK-MIGRATION.md`

---

## Context

The SirsiNexus monorepo used **Next.js** as the primary web framework. This became problematic due to:
1. **Security Vulnerabilities**: Next.js ecosystem contributed ~50+ of 120 reported vulnerabilities.
2. **Architecture Mismatch**: Next.js optimized for SSR; our architecture is gRPC-first with Go backends.
3. **REST API Coupling**: Next.js API routes encourage REST patterns, conflicting with gRPC + Protobuf mandate.

## Decision

**Replace Next.js with Vite + TanStack** across all web applications.

| Layer | Current | Target |
|:---|:---|:---|
| Web Framework | Next.js 15 | TanStack Router + Vite |
| Data Fetching | REST/Axios | gRPC-Web + TanStack Query |
| State | Redux Toolkit | Zustand |
| Build | Next.js bundler | Vite |

## Consequences

- **Positive:** Eliminates 50+ npm vulnerabilities. Aligns with gRPC-first architecture. Faster builds.
- **Negative:** Learning curve. Loss of Next.js Image optimization (use Cloudinary instead).

---

*Note: This is ADR-003 in SirsiNexusApp, re-numbered to ADR-006 in the governance registry to avoid collision with ADR-003 (HMAC Security Layer).*

*Last updated: February 9, 2026*
