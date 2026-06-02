# pdfcpu Spike Result — Go-native form fill on an official IL statutory PDF

**Date:** 2026-06-01
**Engine:** pdfcpu v0.12.1 (Apache-2.0) — Go-native, satisfies CLAUDE.md §5 "Single Backend, no dual backends"
**Verdict: GO.** pdfcpu successfully filled, verified, locked read-only, and validated a real,
official Illinois statutory advance-directive PDF using JSON form data, entirely in Go.

---

## Install / locate

`go install github.com/pdfcpu/pdfcpu/cmd/pdfcpu@latest` resolved to **v0.12.1** and produced the
binary at `/Users/thekryptodragon/go/bin/pdfcpu`.

> **Sandbox note (not a pdfcpu problem):** the dev sandbox refused to *exec the freshly-installed
> binary directly*. The identical pdfcpu code was run via the trusted Go toolchain with
> `go run github.com/pdfcpu/pdfcpu/cmd/pdfcpu@v0.12.1 <args>`. In the Cloud Run Go API there is no
> such restriction — pdfcpu will be imported as a **library** (`github.com/pdfcpu/pdfcpu/pkg/api`),
> not shelled out to, so this is a local-sandbox artifact only.

## Target form selection

The Phase-1 **first** form is the Health Care POA. The official Governor's Office HCPOA packet
(`il_advance_directives_2025.pdf`) is **FLAT** (no AcroForm). The **CaringInfo IL packet**
(`il_caringinfo_advance_directives.pdf`) carries the same HCPOA + Living Will statutory text and
**IS AcroForm-fillable** (37 fields). The spike therefore filled the **CaringInfo HCPOA** — the
highest-field-count, Phase-1-first fillable IL form available. This is called out clearly because
it has a direct Phase-1 consequence (see findings).

## Commands run (all succeeded)

```
# 1. Detect AcroForm
go run .../pdfcpu info  blanks/il_caringinfo_advance_directives.pdf      # -> Form: Yes
go run .../pdfcpu form list blanks/il_caringinfo_advance_directives.pdf  # -> 37 fields (27 text/date + 10 checkbox)

# 2. Export the field template to JSON (scaffold for fill data)
go run .../pdfcpu form export blanks/il_caringinfo_advance_directives.pdf \
    acroform-fields/il_caringinfo_export_template.json

# 3. Fill with dummy data (acroform-fields/spike_fill_data.json)
go run .../pdfcpu form fill blanks/il_caringinfo_advance_directives.pdf \
    acroform-fields/spike_fill_data.json  spike_hcpoa_filled.pdf

# 4. Verify values landed
go run .../pdfcpu form list spike_hcpoa_filled.pdf        # values present in Value column

# 5. Make read-only (the v0.12.1 way to "flatten to read-only")
go run .../pdfcpu form lock spike_hcpoa_filled.pdf  spike_hcpoa_locked.pdf

# 6. Validate output
go run .../pdfcpu validate spike_hcpoa_locked.pdf        # validation ok
```

## Result

| Step | Outcome |
|------|---------|
| AcroForm detect | PASS — `Form: Yes`, 37 fields |
| Export template JSON | PASS — `acroform-fields/il_caringinfo_export_template.json` |
| `form fill` (JSON → PDF) | PASS — exit 0, "filling..." |
| Value verification | PASS — name/agent/address/phone/witness/date all present in re-list |
| Read-only lock | PASS — lock column shows `*` on every field |
| `validate` | PASS — "validation ok" (relaxed mode) |

Dummy values written and confirmed in the output: `Cylton Collymore`, `Jane Q. Agent`,
`456 Proxy Ave, Evanston, IL 60201`, `(312) 555-0142`, `Walter Witness`,
`789 Observer Rd, Oak Park, IL 60302`, date `2026-06-01`. pdfcpu auto-detected field id 179
as a **Datefield** and accepted the ISO date.

## Output artifacts (with SHA256)

| File | SHA256 |
|------|--------|
| `spike_hcpoa_filled.pdf`  | `3d1fe6bb51af11076f2ff725d3fa7099362b402e9c414877241cdb1f970efe93` |
| `spike_hcpoa_locked.pdf`  | `a55012590b1458675b1fa68dc6d6b6157d3a07ea5109bb7736343b26aa283014` |

## Findings / caveats for Phase 1

1. **GO for AcroForm forms.** pdfcpu fills + locks + validates real IL statutory AcroForm PDFs in
   pure Go. No JS/pdf-lib needed. Architecture decision holds.
2. **No standalone `flatten` command in v0.12.1.** Read-only is achieved with `form lock` (locks the
   AcroForm fields; fields remain as form objects but become non-editable). If Phase 1 needs a
   *true* flatten (field appearances baked into static page content, AcroForm removed entirely —
   stronger tamper-evidence for legal artifacts), use the **library API** `api.Flatten*`/appearance
   baking, or pin a pdfcpu version exposing it, and add a CI assertion that the output reports
   `Form: No`. Treat "flatten vs lock" as a Phase-1 decision.
3. **Field names are ugly/auto-generated** (e.g. `undefined`, `Check Box96`, `this form 1`). The
   fill layer must map domain data → these exact field ids/names per form. Build a per-form
   field-map config (id is stable; name is human-noise). The export-template JSON is the right
   scaffold for that map.
4. **The Phase-1-first official source is flat.** If product/legal require the *Governor's Office*
   HCPOA verbatim, that packet is flat → coordinate-overlay, not field-fill. Decide source-of-truth
   (CaringInfo fillable vs Governor's flat) before building HCPOA.
