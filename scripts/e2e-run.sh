#!/usr/bin/env bash
#
# Paced E2E runner — runs the full Playwright suite against LIVE prod GREEN in one
# command, by running each spec serially with a cooldown between them so the Go API
# rate limiter (100 req/60s, 10-min ban) never trips. A single `playwright test`
# invocation of all specs back-to-back exceeds 100/60s and gets banned; per-spec +
# cooldown stays under the window.
#
# Prereqs:
#   1. Provision the test account once (resets the MFA-grace window):
#        GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
#        E2E_PROV_PASSWORD='<pw>' node scripts/e2e-provision.js
#   2. Export the same creds for the run:
#        export E2E_TEST_EMAIL='e2e-principal@finalwishes.app'
#        export E2E_TEST_PASSWORD='<pw>'
#
# Usage:  bash scripts/e2e-run.sh
#
set -euo pipefail

COOLDOWN="${E2E_COOLDOWN:-30}"
SPECS=(smoke authenticated returning-user life-first-features)

cd "$(dirname "$0")/../web"

if [[ -z "${E2E_TEST_PASSWORD:-}" ]]; then
  echo "✗ E2E_TEST_PASSWORD not set — authenticated specs would skip. Provision + export creds first (see header)." >&2
  exit 1
fi

fail=0
for i in "${!SPECS[@]}"; do
  spec="${SPECS[$i]}"
  echo ""
  echo "━━━ [$((i+1))/${#SPECS[@]}] e2e/${spec}.spec.ts ━━━"
  if ! npx playwright test "e2e/${spec}.spec.ts" --workers=1 --reporter=line; then
    fail=1
    echo "✗ ${spec} had failures"
  fi
  # Cooldown between specs to let the rate-limit window clear (skip after the last).
  if [[ $((i+1)) -lt ${#SPECS[@]} ]]; then
    echo "… cooldown ${COOLDOWN}s (rate limiter)"
    sleep "${COOLDOWN}"
  fi
done

echo ""
if [[ $fail -eq 0 ]]; then
  echo "✅ E2E suite GREEN (all specs passed)"
else
  echo "✗ E2E suite had failures (see above)"
fi
exit $fail
