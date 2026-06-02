# Statutory Form Generation — Phase 1 Status

_Engine: `api/internal/forms/` — generic Go-native coordinate-overlay over official FLAT government PDFs (pdfcpu library). Each form is one `CoordinateMap`; the engine is form-agnostic. Guarantees (all unit-tested): SHA256 source fail-closed · execution fields (signature/witness/notary) **never** stamped (wet-sign default) · TRUE-FLATTEN output (zero AcroForm) · PDF-validates._

## Shipped (in production)

| Form | Citation | Source | Status |
|------|----------|--------|--------|
| **Property POA** (`il_poa_property_2011`) | 755 ILCS 45/3-3 | official flat blank, SHA-pinned | ✅ Phase 1a — proven, deployed (`9a3ca0a`) |
| **Small Estate Affidavit** (`il_small_estate_3606`) | 755 ILCS 5/25-1 | official flat blank, SHA-pinned | ✅ Phase 1b — core fields, deployed (`c32a0ed`) |
| **Health Care POA** (`il_hcpoa_caringinfo`) | 755 ILCS 45/4-10 | CaringInfo AcroForm → flattened + SHA-pinned | ✅ **priority 1** — core fields via flatten route, proof-verified |

Proof rasters for both under `docs/forms-phase0/proof/` (body page = values land on the rules; execution page = blank).

## Engine capability proven this phase

- **AcroForm → flat route** (`forms.FlattenAcroForm`, tested on the real CaringInfo packet, 36 fields → 0): removes empty AcroForm widgets, keeps printed labels, yields a true-flat PDF. This unblocks forms distributed as fillable AcroForms — flatten once offline, pin the SHA, then overlay-stamp. Kept **out of** the `Fill` hot path so fills stay deterministic over pinned blanks.

## Buildable next (in-house, no blockers) — straightforward map authoring

| Form | Source in-house | Notes |
|------|-----------------|-------|
| **Living Will** (priority 4) | flattened CaringInfo blank (`il_hcpoa_caringinfo_flat.pdf`, p.17) | Same pinned flat blank already committed for HCPOA; author the Living Will declaration fields (initials + signature/witness execution) as one more `CoordinateMap`. |

## Blocked — need owner action (manual download / fetch)

The official blanks are not in-house and could not be fetched programmatically:

| Form | Blocker |
|------|---------|
| **HIPAA Authorization** (priority 2) | No single official IL statutory PDF; federal 45 CFR 164.508. Decide whether to author a FinalWishes HIPAA form (React-PDF) or bundle into HCPOA agent authority. |
| **Mental Health Treatment Preference Declaration** (priority 5) | Official blank not downloaded. |
| **Disposition of Remains** (priority 6) | Official blank not downloaded (755 ILCS 65). |
| **VSD 773** (vehicle beneficiary affidavit) | ilsos.gov resets bot downloads — needs manual pull + SHA pin (also noted in Phase-0 findings). |

## Known limitation — repeating rows

The Small Estate Affidavit's variable-length schedules (creditor Classes 1–7, heir/legatee tables, spousal/child award computations) are **not** mapped: fixed coordinates cannot express repeating rows. Single-claimant common cases can be added as discrete fields; full multi-row support needs a row-renderer extension to the engine (tracked as a future enhancement, not a blocker for the single-value core).

## Not used (decision)

- **AcroForm field-fill + lock** (Phase-0 spike path): pdfcpu v0.12.1 (latest stable) has no true-flatten — `LockFormFields` leaves `Form: Yes`, failing the TRUE-FLATTEN gate. The flatten-then-overlay route above is the gate-compliant substitute. Do **not** pin pdfcpu `v1.0.0-test` (unstable).
