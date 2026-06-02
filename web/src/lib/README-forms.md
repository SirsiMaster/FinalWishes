# Statutory Forms (frontend)

Frontend for the Go API's coordinate-overlay fill engine (`api/internal/forms`,
`api/internal/formsapi`). Lets an estate owner generate print-ready official
statutory PDFs pre-filled with their data.

## Files

| File | Role |
|------|------|
| `src/lib/forms.ts` | API client: `listForms()`, `fillableFields()`, `fillForm()`, `downloadPdf()` + `FormSchema`/`FormField` types. |
| `src/routes/estates.$estateId.forms.tsx` | The "Statutory Forms" route — schema-driven form picker → field form → PDF download. |
| Link in `src/routes/estates.$estateId.directives.tsx` | Discoverability card under the IL Advance Directives section. |

## How it works

1. `GET /api/v1/forms` returns each form's **schema** (fields with `kind`,
   `required`, `execution`, `page`). The UI renders the fill form dynamically
   from that schema — there is **no per-form UI code**.
2. `fillableFields()` filters out `execution: true` fields (signature / witness /
   notary / date). The UI never offers them, mirroring the engine's wet-sign
   guarantee at the presentation layer.
3. `POST /api/v1/forms/{id}/fill` returns `application/pdf`. The response headers
   `X-Forms-Missing-Required` and `X-Forms-Skipped-Execution` (comma-joined) are
   surfaced as toasts; `downloadPdf()` triggers the browser download.

## Auth & config

- All calls send the Firebase ID token as `Authorization: Bearer …` (same pattern
  as `doc-intelligence.ts`). Endpoints are behind `authMiddleware` server-side.
- Base URL: `http://localhost:8080` locally, else `import.meta.env.VITE_API_URL`.

## Known limitations / follow-ups

- Coordinate maps are first-pass (`ConfidenceLow` server-side) pending a tuning
  pass; the generated PDF is correct but exact placement may need nudging.
- **HIPAA Authorization** is not yet a form (no official IL flat PDF; a
  FinalWishes template is pending legal review).
- Small Estate Affidavit / Mental Health Declaration expose only single-value
  core fields; their variable-length schedules are a future engine extension.
- No client-side field validation beyond `required` marking — the server engine
  is the source of truth.

User guide: `docs/user-guides/legal-forms.md`.
