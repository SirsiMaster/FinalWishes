# ADR-045 — Google Photos Import (Heirloom Photos, CR-12)

**Status:** Accepted
**Date:** 2026-06-02
**Deciders:** claude-finalwishes
**Refs:** CLAUDE.md Rule 26 (PII Siloing), Rule 28 (browser profile), `api/internal/googlephotos/`, `docs/ga-evidence/cr-12-google-photos-2026-06-02.md`

## Context

Estate owners want to bring meaningful photos ("heirlooms") into an estate from
their Google Photos library. Google offers two integration paths:

1. **Library API** (`photoslibrary.googleapis.com`) — broad scopes that grant the
   app standing access to the user's entire photo library.
2. **Picker API** (`photospicker.googleapis.com`) — the user opens Google's own
   picker UI, selects specific items, and the app receives a short-lived,
   session-scoped, read-only handle to **only the picked items**.

FinalWishes handles legacy/estate data under a strict PII-siloing rule (Rule 26).
Granting an estate-planning app standing access to a user's whole photo library
is disproportionate and a privacy liability.

## Decision

Use the **Google Photos Picker API** exclusively. The user explicitly selects
each photo; the app never has list/read access to the broader library.

### OAuth scope
- `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` — the
  narrowest Photos scope. Read-only, picker-mediated, no library enumeration.
- No `photoslibrary.*` scopes are requested.

### Token handling & revocation
- The Google OAuth access token is obtained client-side and passed to the Go API
  **per request** (header `X-Google-Photos-Token` or `accessToken` in the JSON
  body). It is used immediately to create/read the picker session and download
  the picked bytes.
- The token is **never persisted** server-side — not in Firestore, Cloud SQL, or
  logs. There is no refresh token stored. Revocation is therefore inherent: the
  user revokes access in their Google account; FinalWishes holds nothing.

### Storage split (Rule 26)
- **Photo bytes** (EXIF intact) → the estate **vault** storage object
  (`estates/{estateId}/heirlooms/imported/{sha12}-{filename}`), server-side,
  signed-URL access only.
- **Firestore heirloom doc** (client-readable) stores **only sanitized fields**:
  name, category, description, `photoUrls` (gs:// vault path), `sha256`, `dHash`,
  `importSource`, `originalGooglePhotosId`, and Google's structured
  `mediaMetadata`. **Raw EXIF is NOT written to Firestore** — EXIF APP1 carries
  GPS, device IDs, and capture timestamps (Rule 26). (Removed 2026-06-02; see
  CR-04/Codex review.)

### Deduplication key
- Primary: **SHA-256** of the exact bytes, stored in
  `estates/{id}/heirloomHashes/{sha256}`; an import is skipped if the hash
  already exists for the estate.
- Secondary signal: **average dHash** (perceptual) recorded for future
  near-duplicate detection. Duplicate-check failures are propagated (not
  silently treated as "not a duplicate").

### Access control
- Every endpoint requires `auth.RequireUserID` + estate-membership verification
  (`estate_users/{userId}_{estateId}`). Imports are written to the estate audit
  trail.

## Consequences

- **Positive:** Minimal scope; no standing library access; no server-side token
  storage to leak or rotate; PII-clean Firestore; deterministic dedup.
- **Negative:** The user must re-pick on each session (no background sync) — an
  acceptable, privacy-preserving tradeoff for estate use.
- **Follow-up:** `functions/` google-cloud transitive `npm audit` advisories
  (teeny-request) tracked separately from this ADR.
