#!/usr/bin/env bash
# =============================================================================
#  uptime-evidence.sh — capture CR-06 (7-day uptime >=99.9%) evidence
# =============================================================================
#
# Queries the Cloud Monitoring uptime-check results for a UTC date range and
# emits the docs/sla-evidence/<startUTC>-to-<endUTC>.md skeleton required by
# docs/sla-evidence/README.md, with the computed 7-day availability % and a
# MET / NOT-MET verdict against the 99.9% bar.
#
# RUN THIS AFTER the 7-day window (from scripts/uptime-check-setup.sh) has
# fully elapsed.
#
# AUTH: same model as uptime-check-setup.sh — activates the agent SA from a key
#       file (ADC in this environment is often expired). Override with SA_KEY=.
#       Required SA role on finalwishes-prod: roles/monitoring.viewer.
#       Required API: monitoring.googleapis.com.
#
# USAGE:
#   bash scripts/uptime-evidence.sh <startUTC> <endUTC> [host]
#   bash scripts/uptime-evidence.sh 2026-06-15T00:00:00Z 2026-06-22T00:00:00Z
#   HOST=finalwishes.app bash scripts/uptime-evidence.sh 2026-06-15T00:00:00Z 2026-06-22T00:00:00Z
#
# OUTPUT:
#   Writes docs/sla-evidence/<start>-to-<end>.md (dates compacted, see below).
#   Times in start/end MUST be RFC3339 UTC (…Z). The verdict line is computed if
#   the time-series query succeeds; otherwise a TODO placeholder is left so a
#   human can paste Console numbers per docs/sla-evidence/README.md.
#
# VALIDATE (no GCP needed): bash -n scripts/uptime-evidence.sh
# =============================================================================
set -euo pipefail

PROJECT="${PROJECT:-finalwishes-prod}"
HOST="${HOST:-finalwishes.app}"
SA_KEY="${SA_KEY:-$HOME/.config/gcloud/finalwishes-claude-agent.json}"
THRESHOLD="${THRESHOLD:-99.9}"   # GA bar, percent.

START_UTC="${1:-}"
END_UTC="${2:-}"
HOST="${3:-$HOST}"

if [[ -z "$START_UTC" || -z "$END_UTC" ]]; then
  echo "Usage: bash scripts/uptime-evidence.sh <startUTC> <endUTC> [host]" >&2
  echo "  e.g. bash scripts/uptime-evidence.sh 2026-06-15T00:00:00Z 2026-06-22T00:00:00Z" >&2
  exit 1
fi

# Resolve output path relative to the repo root (this script lives in scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"
OUT_DIR="$REPO_ROOT/docs/sla-evidence"
mkdir -p "$OUT_DIR"

# File-name-safe slugs: 2026-06-15T00:00:00Z -> 2026-06-15T000000Z
slug() { printf '%s' "$1" | tr -d ':'; }
OUT_FILE="$OUT_DIR/$(slug "$START_UTC")-to-$(slug "$END_UTC").md"

CAPTURED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
AUTHOR="${AUTHOR:-claude-finalwishes}"

echo "==> Activating service account from $SA_KEY"
if [[ -f "$SA_KEY" ]]; then
  gcloud auth activate-service-account --key-file="$SA_KEY" --quiet || true
  export GOOGLE_APPLICATION_CREDENTIALS="$SA_KEY"
  gcloud config set project "$PROJECT" --quiet || true
else
  echo "WARN: SA key not found at $SA_KEY — will still emit a skeleton with TODOs." >&2
fi

# Resolve the uptime check id + display name for this host (best-effort).
UPTIME_NAME="$(
  gcloud monitoring uptime list-configs \
    --project="$PROJECT" \
    --filter="displayName~finalwishes-cr06 AND resource.label.host='${HOST}'" \
    --format="value(displayName)" 2>/dev/null | head -n1 || true
)"
UPTIME_ID="$(
  gcloud monitoring uptime list-configs \
    --project="$PROJECT" \
    --filter="displayName~finalwishes-cr06 AND resource.label.host='${HOST}'" \
    --format="value(name)" 2>/dev/null | head -n1 || true
)"
[[ -z "$UPTIME_NAME" ]] && UPTIME_NAME="TODO (run: gcloud monitoring uptime list-configs)"
[[ -z "$UPTIME_ID" ]] && UPTIME_ID="TODO"

# -----------------------------------------------------------------------------
# Pull the check_passed time-series and compute availability = passed / total.
#
# We read the boolean uptime_check/check_passed metric across the window. Each
# point per (region) series is true/false; availability is the fraction of true
# points over all points. This is a faithful approximation of GCM's own
# "current uptime" number and is what the README expects to be reproduced.
#
# `gcloud monitoring time-series list` availability varies by SDK version; if it
# is not present, AVAILABILITY stays empty and we leave a TODO + the Console
# recipe so a human can fill it in (see docs/sla-evidence/README.md).
# -----------------------------------------------------------------------------
AVAILABILITY=""
VERDICT="TODO — paste availability from Console or a working time-series query"

TS_FILTER="metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.label.host=\"${HOST}\""

if gcloud monitoring time-series list --help >/dev/null 2>&1; then
  echo "==> Querying check_passed time-series for ${HOST} (${START_UTC}..${END_UTC})"
  # Emit each boolean point's value; count true vs total.
  TS_JSON="$(
    gcloud monitoring time-series list \
      --project="$PROJECT" \
      --filter="$TS_FILTER" \
      --interval-start-time="$START_UTC" \
      --interval-end-time="$END_UTC" \
      --format="json" 2>/dev/null || true
  )"
  if [[ -n "$TS_JSON" && "$TS_JSON" != "[]" ]]; then
    # Use python3 to compute the true-fraction; avoids brittle jq math.
    AVAILABILITY="$(
      python3 - "$TS_JSON" <<'PY' 2>/dev/null || true
import json,sys
data=json.loads(sys.argv[1])
total=0; passed=0
for series in data:
    for pt in series.get("points",[]):
        v=pt.get("value",{})
        b=v.get("boolValue")
        if b is None:
            # some encodings put it under doubleValue/int64Value after alignment
            d=v.get("doubleValue")
            if d is None: continue
            total+=1; passed+=d
        else:
            total+=1; passed+=1 if b else 0
if total:
    print(f"{100.0*passed/total:.4f}")
PY
    )"
  fi
fi

if [[ -n "$AVAILABILITY" ]]; then
  # Compare against threshold using awk (portable float compare).
  if awk -v a="$AVAILABILITY" -v t="$THRESHOLD" 'BEGIN{exit !(a+0 >= t+0)}'; then
    VERDICT="MET — ${AVAILABILITY}% >= ${THRESHOLD}%"
  else
    VERDICT="NOT MET — ${AVAILABILITY}% < ${THRESHOLD}%"
  fi
fi

AVAIL_DISPLAY="${AVAILABILITY:-TODO}"

# -----------------------------------------------------------------------------
# Emit the evidence markdown skeleton.
# -----------------------------------------------------------------------------
cat > "$OUT_FILE" <<MD
# CR-06 SLA Evidence — 7-day uptime

Companion to the CR-06 GA-evidence artifact (\`docs/ga-evidence/cr-06-uptime-<date>.md\`).
Convention: see \`docs/sla-evidence/README.md\`.

## Window

| Field | Value |
|---|---|
| Host | https://${HOST}/ |
| Uptime check (display name) | ${UPTIME_NAME} |
| Uptime check (resource id) | ${UPTIME_ID} |
| Start (UTC) | ${START_UTC} |
| End (UTC) | ${END_UTC} |
| GA threshold | ${THRESHOLD}% |

## Availability

- Computed 7-day availability: **${AVAIL_DISPLAY}%**
- Method: fraction of \`monitoring.googleapis.com/uptime_check/check_passed\`
  points that passed, across all checker regions, over the window.

### Hourly availability

> If the time-series query above succeeded, summarize per-hour or per-day below.
> Otherwise fill from Cloud Console (Monitoring > Uptime checks > this check >
> the uptime % over the 7-day range), or from the time-series recipe in
> docs/sla-evidence/README.md.

| UTC hour (or day) | Availability % | Notes |
|---|---|---|
| TODO | TODO | |

## Verdict

**${VERDICT}**

(vs GA bar: 7-day uptime >= ${THRESHOLD}%)

## Provenance

| Field | Value |
|---|---|
| Author | ${AUTHOR} |
| Captured at (UTC) | ${CAPTURED_AT} |
| GCP project | ${PROJECT} |
| Source | Cloud Monitoring uptime_check/check_passed |
MD

echo
echo "==> Wrote evidence skeleton:"
echo "      $OUT_FILE"
echo
echo "Verdict: $VERDICT"
if [[ -z "$AVAILABILITY" ]]; then
  echo
  echo "NOTE: availability not auto-computed (no time-series data / SDK lacks the"
  echo "      command / auth expired). Fill the TODOs from the Console per"
  echo "      docs/sla-evidence/README.md, then cite this file from the CR-06"
  echo "      ga-evidence artifact."
fi
