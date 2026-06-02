# Statutory Form Generation — Phase 1 Status

_Engine: `api/internal/forms/` — generic Go-native coordinate-overlay over official FLAT government PDFs (pdfcpu library). Each form is one `CoordinateMap`; the engine is form-agnostic. Guarantees (all unit-tested): SHA256 source fail-closed · execution fields (signature/witness/notary) **never** stamped (wet-sign default) · TRUE-FLATTEN output (zero AcroForm) · PDF-validates._

## Shipped (in production)

| Form | Citation | Source | Status |
|------|----------|--------|--------|
| **Property POA** (`il_poa_property_2011`) | 755 ILCS 45/3-3 | official flat blank, SHA-pinned | ✅ Phase 1a — proven, deployed (`9a3ca0a`) |
| **Small Estate Affidavit** (`il_small_estate_3606`) | 755 ILCS 5/25-1 | official flat blank, SHA-pinned | ✅ Phase 1b — core fields, deployed (`c32a0ed`) |
| **Health Care POA** (`il_hcpoa_caringinfo`) | 755 ILCS 45/4-10 | CaringInfo AcroForm → flattened + SHA-pinned | ✅ **priority 1** — core fields via flatten route, proof-verified (`894d3d6`) |
| **Living Will** (`il_living_will_caringinfo`) | 755 ILCS 35 | flattened CaringInfo blank, page 17 | ✅ priority 4 — declarant identity, proof-verified |
| **Mental Health Treatment Pref. Declaration** (`il_mhtpd_2016`) | 755 ILCS 43 | official IDPH flat blank (dph.illinois.gov), SHA-pinned | ✅ priority 5 — declarant + attorney-in-fact, proof-verified |

Proof rasters for both under `docs/forms-phase0/proof/` (body page = values land on the rules; execution page = blank).

## Engine capability proven this phase

- **AcroForm → flat route** (`forms.FlattenAcroForm`, tested on the real CaringInfo packet, 36 fields → 0): removes empty AcroForm widgets, keeps printed labels, yields a true-flat PDF. This unblocks forms distributed as fillable AcroForms — flatten once offline, pin the SHA, then overlay-stamp. Kept **out of** the `Fill` hot path so fills stay deterministic over pinned blanks.

## Buildable next (in-house, no blockers)

**None remaining** — every in-house official blank now has a proof-verified map
(Property POA, Small Estate, Health Care POA, Living Will). Further forms require
owner-gated downloads (below). The remaining work on shipped forms is coordinate
fine-tuning (all `ConfidenceLow` fields → `High` after a tuning pass) and the
repeating-row schedules for the Small Estate Affidavit.

## Blocked — need owner action (manual download / fetch)

The official blanks are not in-house and could not be fetched programmatically:

| Form | Blocker | What to do |
|------|---------|-----------|
| **HIPAA Authorization** (priority 2) | No single official IL statutory PDF — HIPAA is federal (45 CFR 164.508). | Author a FinalWishes HIPAA form (React-PDF, our own template) OR rely on the HCPOA agent's medical-records authority. Product/legal decision, not a download. |
| **Disposition of Remains** (priority 6) | No official fillable PDF exists; the form is **statutory text** in 755 ILCS 65/10. | Author a FinalWishes template from the statutory form text (React-PDF or a generated flat blank), then overlay-map it. Not an external download. |
| **VSD 773** (vehicle beneficiary affidavit) | ilsos.gov bot-resets automated downloads. | Manually download from ilsos.gov in a browser, drop into `docs/forms-phase0/blanks/`, then it's a normal overlay map (flat form). |

_Resolved this phase:_ the **Mental Health Treatment Preference Declaration** was previously listed here as "not downloaded" — the official IDPH blank was found at `dph.illinois.gov` (not the bot-blocking gac.illinois.gov), downloaded, SHA-pinned, and shipped (above).

## Known limitation — repeating rows

The Small Estate Affidavit's variable-length schedules (creditor Classes 1–7, heir/legatee tables, spousal/child award computations) are **not** mapped: fixed coordinates cannot express repeating rows. Single-claimant common cases can be added as discrete fields; full multi-row support needs a row-renderer extension to the engine (tracked as a future enhancement, not a blocker for the single-value core).

## Not used (decision)

- **AcroForm field-fill + lock** (Phase-0 spike path): pdfcpu v0.12.1 (latest stable) has no true-flatten — `LockFormFields` leaves `Form: Yes`, failing the TRUE-FLATTEN gate. The flatten-then-overlay route above is the gate-compliant substitute. Do **not** pin pdfcpu `v1.0.0-test` (unstable).
