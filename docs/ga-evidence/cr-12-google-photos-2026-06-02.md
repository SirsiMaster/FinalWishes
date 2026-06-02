# CR-12 — Google Photos Import

**Criterion (v3):** Google Photos heirloom import implemented with documented OAuth scopes, token storage, revocation behavior, EXIF rules, and dedup key strategy; ADR required (introduces Google OAuth scopes + user photo-library data handling).
**Author:** claude-finalwishes
**Captured:** 2026-06-02T22:30Z
**Baseline commit:** `b05e4f3` (+ this commit)
**Governing ADR:** `docs/ADR-045-GOOGLE-PHOTOS-IMPORT.md` (Accepted 2026-06-02)

## v3.1 patch — required disclosures

| Required item | Evidence |
|---|---|
| **OAuth scopes** | `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` only. Uses the **Picker API** (`photospicker.googleapis.com/v1`, see `api/internal/googlephotos/client.go:13`), NOT the broad Library API. User explicitly picks each item; no library enumeration. |
| **Token storage location** | **None.** The access token is passed per-request (`X-Google-Photos-Token` header or `accessToken` body field) and used immediately; never persisted to Firestore, Cloud SQL, or logs (`handler.go` readAccessToken / HandleImport). No refresh token stored. |
| **Revocation behavior** | Inherent — server holds no token. User revokes in their Google account; FinalWishes retains nothing to revoke. |
| **EXIF preservation rules** | Photo bytes (EXIF intact) stored only in the estate **vault** object (`estates/{id}/heirlooms/imported/...`). Raw EXIF is **NOT** written to the client-readable Firestore heirloom doc (GPS/device/timestamp PII, Rule 26). Enforced by removal of the `exif` field + `extractJPEGEXIF` (commit `6a4fd6c`, Codex review P1). |
| **Deduplication key strategy** | Primary: **SHA-256** exact-content hash in `estates/{id}/heirloomHashes/{sha}`. Secondary: **average dHash** perceptual hash. Duplicate-check errors propagate (no silent "not duplicate"; commit `6a4fd6c` P2). |

## Security clauses

- Behind `auth.RequireUserID` + estate-membership check (`estate_users/{uid}_{eid}`).
- Imports recorded in the estate audit subcollection.
- No raw PII in client logs/telemetry (Rule 26): EXIF stripped; only sanitized metadata in Firestore.

## Verification

```
grep -n photospicker api/internal/googlephotos/client.go      # Picker API base
grep -n exif api/internal/googlephotos/handler.go             # (no exif field — removed)
go test ./internal/googlephotos/                              # ok
```

- `go test ./internal/googlephotos/` → **ok**.
- EXIF field absent from Firestore write (verified: `grep exif handler.go` → only the removal note in hash.go).
- ADR-045 merged and indexed.

## Verdict

`MET`

The Google Photos import is implemented via the minimal-scope Picker API, stores
no tokens, leaks no EXIF PII to client-readable state, and dedupes on SHA-256 +
dHash. The ADR-required governance (ADR-045) is merged. All v3.1 disclosure
items are documented above with code references.
