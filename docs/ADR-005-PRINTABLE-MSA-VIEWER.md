# ADR-005: Printable MSA Viewer Component
**Date:** January 21, 2026
**Status:** Accepted
**Canonical Source:** `SirsiNexusApp/docs/sirsi-platform/ADR-005-PRINTABLE-MSA-VIEWER.md`

---

## Context

The Sirsi contract signing workflow requires a professional, printable Master Services Agreement (MSA) and Statement of Work (SOW) document that renders as a clean, legal-quality document, dynamically populates all financial values, and supports browser print-to-PDF.

## Decision

Implement `printable-msa.html` as a **self-contained, static HTML document** that:
- Lives in the `public/` directory of `finalwishes-contracts`
- Receives all dynamic data via **URL query parameters** (Rule 16: Deep URL Sync)
- Contains all styling inline (no external CSS dependencies)
- Calculates derived financial values client-side via JavaScript

### URL Parameters

| Parameter | Type | Description |
|:---|:---|:---|
| `client` | string | Client name |
| `date` | string | Effective date |
| `plan` | number | Payment plan months (2, 3, or 4) |
| `total` | number | Total contract value in USD |
| `entity` | string | Provider legal name |
| `cpName` | string | Counterparty (Provider representative) name |
| `cpTitle` | string | Counterparty title |
| `signed` | boolean | Whether to display signatures |

## Consequences

- **Positive:** Self-contained, fast, no framework overhead, browser-native print-to-PDF.
- **Negative:** URL parameters can be manipulated (mitigated by server-signed PDFs for executed contracts).

---

*Last updated: February 9, 2026*
