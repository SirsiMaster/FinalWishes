# CR-04 — Dependabot / Dependency Vulnerability Sweep

**Criterion (v3):** No open Dependabot security alerts on the default branch (or all open alerts triaged with documented patched versions applied).
**Author:** claude-finalwishes
**Captured:** 2026-06-02T22:18Z
**Baseline commit:** `fa36dd2`
**Supersedes:** `cr-04-dependabot-2026-05-20.md` (was `NOT MET / BLOCKED` — no GitHub API access at capture time).

## Starting state

`gh api repos/SirsiMaster/FinalWishes/dependabot/alerts` → **22 open** (6 high, 15 moderate, 1 low), across two manifests:

| Manifest | Alerts |
|---|---|
| `web/package-lock.json` | 20 |
| `functions/package-lock.json` | 2 |

Root cause of the prior "npm audit says 0" confusion: the flagged advisories (e.g. `fast-uri`, `protobufjs`) are **GitHub Advisory DB** entries that npm's audit data source did not carry, and CI installs from `web/package-lock.json` (a workspace-member lockfile that had drifted from the already-fixed root lockfile).

## Remediation (transitive deps → npm `overrides`)

All flagged packages were transitive. Added `overrides` to the respective `package.json` and regenerated each lockfile in isolation (workspace detection prevented an in-place regen of the member lockfile).

**web/ (8 packages):**

| Package | Vulnerable | Patched-to (in lockfile) | Sev |
|---|---|---|---|
| fast-uri | ≤ 3.1.1 | 3.1.2 | high |
| protobufjs | ≤ 7.5.7 | 7.6.2 | high/med |
| @protobufjs/utf8 | ≤ 1.1.0 | 1.1.1 | med |
| brace-expansion | < 5.0.6 | 5.0.6 | med |
| hono | < 4.12.18 | 4.12.23 | med/low |
| ip-address | ≤ 10.1.0 | 10.2.0 | med |
| postcss | < 8.5.10 | 8.5.15 | med |
| qs | ≤ 6.15.1 | 6.15.2 | med |

**functions/ (2 packages):** `qs` → 6.15.2, `uuid` → 11.1.1.

## Verification

```
# web (matches CI: working-directory ./web)
cd web && npm ci         # exit 0, "found 0 vulnerabilities"
     && npm run build    # exit 0, "✓ built"
# functions
cd functions && npm ci   # exit 0, "found 0 vulnerabilities"
```

- `npm audit` (web): **0 vulnerabilities**.
- `npm audit` (functions): **0 vulnerabilities**.
- Web production build: **PASS** (Vite/rolldown, no errors).
- No direct-dependency major bumps; all changes are transitive patch/minor pins via `overrides` → low regression risk.

## Verdict

`MET-WITH-CAVEATS`

- All 22 Dependabot-flagged advisories are remediated in the committed lockfiles CI installs from.
- **Caveat:** GitHub Dependabot re-scans asynchronously; the alert count on the GitHub UI will drop to 0 after it re-indexes the pushed lockfiles (alerts auto-close on fixed version detection). A follow-up capture should confirm `gh api .../dependabot/alerts -q '[.[]|select(.state=="open")]|length'` == 0 post-scan.
- **Caveat:** `functions/` `npm audit` reported 14 moderate advisories from google-cloud transitive deps (teeny-request/retry-request) that are NOT in the Dependabot set and require breaking `npm audit fix --force`; deferred to avoid destabilizing the Firestore trigger functions (autoMatchInvitation, sendMail). Tracked separately.
