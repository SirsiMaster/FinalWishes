# Flat PDFs (NO AcroForm fields) — material finding

These downloaded blanks have **no fillable AcroForm fields** (`pdfcpu info` → `Form: No`,
`pdfcpu form list` → `no form available`). They **cannot be field-filled**. Phase 1 must use a
**coordinate-overlay** strategy (stamp text/checks at fixed x/y page coordinates) or generate the
document from scratch, not `form fill`.

| File | Form | Pages | Why it matters |
|------|------|-------|----------------|
| `blanks/il_advance_directives_2025.pdf` | IL Governor's Office HCPOA + Living Will packet (2025) | 18 | Official Governor's text is FLAT. The fillable equivalent is the CaringInfo packet. |
| `blanks/il_poa_property_2011.pdf` | IL Statutory Short Form POA for Property (July 2011) | 11 | Phase-1 priority #3 form is FLAT — needs overlay. |
| `blanks/il_form3606_small_estate.pdf` | IL Small Estate Affidavit (Form 3606, 2026-01-26) | 4 | FLAT — needs overlay. |

Only `blanks/il_caringinfo_advance_directives.pdf` is AcroForm-fillable — see
`il_caringinfo_advance_directives.fields.txt` for the full field dump.
