# Phase 0 Findings — IL Statutory Form Generation (de-risking spike)

**Date:** 2026-06-01 · **Scope:** research + throwaway pdfcpu spike + reference tables. No app code touched, nothing committed.

## Headline

- **pdfcpu (Go-native) verdict: GO.** It filled, verified, locked read-only, and validated a real
  official IL statutory AcroForm PDF. The "Single Backend / no pdf-lib" architecture decision holds.
- **But most in-scope IL forms are FLAT (no AcroForm).** Only 1 of the 5 successfully downloaded
  blanks is field-fillable. The dominant Phase-1 strategy will be **coordinate-overlay**, not field-fill.
- **One blocker:** VSD 773 could not be downloaded (ilsos.gov blocks automated fetch). Verdict deferred.

## AcroForm-fillable vs FLAT (verified with pdfcpu)

| Form | File | AcroForm? | Fields | Strategy |
|------|------|-----------|--------|----------|
| HCPOA + Living Will (CaringInfo packet) | `il_caringinfo_advance_directives.pdf` | **YES** | 37 (27 text/date + 10 checkbox) | **field-fill** ✅ |
| HCPOA + Living Will (Governor's 2025 packet) | `il_advance_directives_2025.pdf` | NO | 0 | coordinate-overlay |
| Financial/Property POA (July 2011) | `il_poa_property_2011.pdf` | NO | 0 | coordinate-overlay |
| Small Estate Affidavit (Form 3606) | `il_form3606_small_estate.pdf` | NO | 0 | coordinate-overlay |
| VSD 773 | — (download blocked) | UNVERIFIED (likely yes per ilsos convention) | ? | TBD |
| HIPAA Authorization | — (no IL statutory blank) | n/a | n/a | app-generated form |
| Mental Health Treatment Pref. | — (source is a landing page, no direct PDF) | unknown | ? | locate PDF first |
| Disposition of Remains | — (source is ILGA statute text) | n/a (no gov blank) | n/a | app-generated from statute |

## pdfcpu spike (the single most important output)

Filled the CaringInfo HCPOA with dummy data via `pdfcpu form fill` (JSON → PDF), verified values
landed, made read-only via `pdfcpu form lock`, and `pdfcpu validate` → **validation ok**. Full
command log, SHA256s, and caveats in `pdfcpu-spike-result.md`. Outputs: `spike_hcpoa_filled.pdf`,
`spike_hcpoa_locked.pdf`. In production pdfcpu will be a **Go library import** in the Cloud Run API,
not a shelled binary.

## Forms needing a different strategy (material)

1. **Coordinate-overlay engine is required, not optional.** POA Property, Small Estate Affidavit, and
   the Governor's HCPOA packet are all flat. Phase 1 must build a coordinate-overlay capability
   (stamp text/checks at fixed x/y) alongside the AcroForm field-fill path. This roughly doubles the
   fill-engine surface area — plan for both.
2. **Flatten vs lock.** pdfcpu v0.12.1 has no standalone `flatten`; read-only = `form lock`. For true
   tamper-evident flatten (AcroForm removed, appearances baked in) use the library API. Decide which
   the legal artifact requires.
3. **HIPAA & Disposition of Remains have no government fillable blank** → generate from template.
4. **Mental Health declaration**: catalogued source is a landing page; the direct statutory PDF must
   be located before building.

## Blocker

- **VSD 773 download blocked.** ilsos.gov resets all automated connections (HTTP/2 INTERNAL_ERROR
  across every UA/referer/HTTP-1.1 variant). SHA256 + AcroForm detection deferred → **manual browser
  download required** to close. Not a pdfcpu issue.

## Recommended Phase-1 build order

1. **HCPOA (field-fill, CaringInfo packet)** — proven path, Phase-1 priority #1, already spiked GO.
   Decide source-of-truth (CaringInfo fillable vs Governor's flat) up front.
2. **Living Will** — same packet, same AcroForm, near-zero marginal cost after HCPOA.
3. **Build the coordinate-overlay engine** — gating dependency for everything flat.
4. **Financial/Property POA** (overlay) — Phase-1 priority #3, high user value.
5. **Small Estate Affidavit** (overlay) — settlement-side, $150K threshold current (Aug 2025).
6. **VSD 773** — after manual download + AcroForm verification.
7. **HIPAA / Disposition of Remains / Mental Health** — template-generated or pending source location.

## Cross-cutting requirements surfaced

- Per-form **field-map config** (domain data → pdfcpu field id/name) — field names are auto-generated
  noise (`undefined`, `Check Box96`); ids are stable.
- **All Phase-1 output is print-ready / wet-sign by default** (see `execution-constraints.md`,
  counsel-review-gated). Do not assert e-sign eligibility without counsel.
- A **source-integrity check** (re-hash blank vs `source-manifest.json` SHA256) before each fill, so a
  silently-revised government PDF can't break the coordinate overlays.
