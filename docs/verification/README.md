# FinalWishes — Per-Role × Per-Surface Live Verification

Reproducible proof that every persona renders every surface they should, and is gated
(not crashed/leaked) from every surface they shouldn't — against **live prod**, real
sessions, not localhost and not mocked. This is the harness that answers "will a user
find dead routing, blank pages, white-cards, or a permission leak?"

See [`PERSONA_MATRIX.md`](./PERSONA_MATRIX.md) for the latest result.

## What it checks (claude-home binding criteria, 2026-06-19)

1. **Renders real content** — computed-style verified, not just HTTP 200. Scans for the
   white-card / invisible-text / blank / infinite-spinner failure mode.
2. **Intentional gates** — a blocked route must show a deliberate gate (RoleGuard
   "This isn't part of your role" / IdentityGate "Identity Verification Required"),
   never a crash, blank, redirect-loop, or raw permission-denied.
3. **Zero app console errors** per cell.
4. **No dead-end navigation.**
5. **Prod, real logged-in sessions** (incl. TOTP MFA for fiduciaries) — not localhost/mocked.

## How to run

```bash
# 1. Seed the QA estate + 6 persona accounts (prod, isTestEstate-namespaced).
#    Needs Firebase admin creds (e.g. a short-lived SA key for claude-agent@finalwishes-prod;
#    create with `gcloud iam service-accounts keys create`, DELETE it after).
GOOGLE_APPLICATION_CREDENTIALS=/path/key.json node scripts/seed-persona-qa.js

# 2. Enroll TOTP MFA for the 5 fiduciary personas (client-SDK; admin SDK can't seed factors).
#    Writes base32 secrets to scripts/.persona-mfa-secrets.json (GITIGNORED).
node scripts/enroll-persona-mfa.mjs

# 3. Walk the full matrix (6 personas × 21 sections) against prod.
node scripts/verify-persona-matrix.mjs
#    Subset:  PERSONAS=heir SECTIONS=vault,soul-log node scripts/verify-persona-matrix.mjs
#    Output:  scripts/persona-matrix-results.json + per-cell screenshots in
#             scripts/persona-matrix-evidence/ (both gitignored — regenerable).
```

## Interpreting results

- **PASS** — allowed cell renders real content, or blocked cell shows the intentional gate.
- **FAIL** — blank/white-card/crash, or a blocked route leaking section content.
- **WARN** — a real app console error on the cell.
- Residual `net::ERR_ABORTED` (Firestore-listen / GA / Firebase-logging) is a **harness
  artifact** — the crawl closes each page between cells, aborting long-poll connections a
  real user keeps open. Not an app defect.

## Regression guard (deterministic, in CI)

`web/src/lib/persona.test.ts` asserts the canon invariant the live matrix surfaced:
every section RoleGuard does **not** guard (`estates`/`index` — universal, self-scoped
nav) must be granted to **every** persona in `PERSONA_ACCESS`. This catches the
`heir/estates` omission class at CI time without needing prod or MFA.

## Prereqs

- Node + Playwright (`web/` workspace), `otplib` (already deps).
- A Firebase admin credential for the seed step only.
- The test accounts are `persona-<role>@finalwishes.app` / `PersonaQA2026!<role>` on
  estate `estate_persona_qa` (all `isTestEstate`/`isTestAccount` — isolated from real data).
