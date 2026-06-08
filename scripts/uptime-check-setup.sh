#!/usr/bin/env bash
# =============================================================================
#  uptime-check-setup.sh — CR-06 (7-day uptime ≥99.9%) pre-stage
# =============================================================================
#
#   ┌───────────────────────────────────────────────────────────────────────┐
#   │  RUN THIS ONCE finalwishes.app DNS IS LIVE                             │
#   │                                                                        │
#   │  CR-06 is the longest pole to non-mobile GA: a passive 7-day uptime   │
#   │  window that must elapse against the *production custom domain*.       │
#   │  The window's clock starts the moment a real Cloud Monitoring uptime   │
#   │  check begins probing https://finalwishes.app. So: cut DNS over        │
#   │  (CR-05), then run this script, then let 7 days pass and capture       │
#   │  evidence with scripts/uptime-evidence.sh.                             │
#   └───────────────────────────────────────────────────────────────────────┘
#
# WHAT THIS SCRIPT CREATES (idempotently) in project finalwishes-prod:
#   (a) A Cloud Monitoring HTTPS uptime check:
#         - host:        finalwishes.app          (override: $1 or HOST=)
#         - method/path: GET /
#         - expect:      HTTP 2xx
#         - period:      1 minute (the finest granularity GCM offers)
#         - regions:     multiple global checker regions (>=3 required by GCM)
#   (b) An alert policy that FIRES when the uptime check fails (availability
#       drops), so a real outage during the 7-day window is not missed.
#
# IDEMPOTENCY:
#   Re-running is safe. The script first lists existing uptime checks and alert
#   policies by display name and SKIPS creation if a matching one already
#   exists. To force a clean rebuild, delete the existing config in the Cloud
#   Console (Monitoring > Uptime checks) and re-run.
#
# AUTH (the agent environment may have EXPIRED ADC — this script self-authes):
#   It activates the FinalWishes agent service account from a key file. The
#   default key path is the standard agent key; override with SA_KEY=.
#     Required SA roles on finalwishes-prod:
#       - roles/monitoring.editor   (create uptime checks + alert policies)
#     Required enabled API:
#       - monitoring.googleapis.com (Cloud Monitoring API)
#
# USAGE:
#   bash scripts/uptime-check-setup.sh                       # host=finalwishes.app
#   bash scripts/uptime-check-setup.sh finalwishes-prod.web.app   # pre-cutover smoke
#   HOST=finalwishes.app NOTIFICATION_CHANNELS=projects/finalwishes-prod/notificationChannels/123 \
#     bash scripts/uptime-check-setup.sh
#
# VALIDATE (no GCP needed): bash -n scripts/uptime-check-setup.sh
# =============================================================================
set -euo pipefail

# ---- Configuration (all overridable via env) --------------------------------
PROJECT="${PROJECT:-finalwishes-prod}"

# Host to probe. CR-06 evidence MUST be against the custom domain finalwishes.app.
# Positional $1 wins, then HOST=, else the GA custom domain.
HOST="${1:-${HOST:-finalwishes.app}}"

# Path to the agent service-account key. ADC in this environment is often
# expired, so we authenticate explicitly from the key file.
SA_KEY="${SA_KEY:-$HOME/.config/gcloud/finalwishes-claude-agent.json}"

# Stable display names — used both to create and to detect-for-idempotency.
# Slug the host so a pre-cutover smoke check (web.app) gets its own config and
# never collides with the GA custom-domain check.
HOST_SLUG="$(printf '%s' "$HOST" | tr '.' '-')"
UPTIME_NAME="${UPTIME_NAME:-finalwishes-cr06-${HOST_SLUG}}"
ALERT_NAME="${ALERT_NAME:-finalwishes-cr06-uptime-failing-${HOST_SLUG}}"

# Checker regions. GCM requires at least 3. These span US, EU, and APAC so a
# single-region network blip does not flap the check.
REGIONS="${REGIONS:-usa-iowa,usa-oregon,usa-virginia,europe,asia-pacific}"

# Period in minutes (GCM allows 1/5/10/15). 1 = finest availability resolution.
PERIOD="${PERIOD:-1}"

# Optional: comma-separated Notification Channel resource names to attach to the
# alert policy (e.g. an email/PagerDuty channel). If empty, the policy is still
# created and visible in the Console; you can attach channels later.
NOTIFICATION_CHANNELS="${NOTIFICATION_CHANNELS:-}"

# ---- Banner -----------------------------------------------------------------
cat <<BANNER

================================================================================
  CR-06 UPTIME CHECK SETUP
  RUN THIS ONCE ${HOST} DNS IS LIVE.
--------------------------------------------------------------------------------
  project       : ${PROJECT}
  host          : ${HOST}   (GET https://${HOST}/  -> expect 2xx)
  uptime check  : ${UPTIME_NAME}
  alert policy  : ${ALERT_NAME}
  regions       : ${REGIONS}
  period        : every ${PERIOD} min
================================================================================

BANNER

if [[ "$HOST" != "finalwishes.app" ]]; then
  echo "NOTE: host is '${HOST}', not the GA custom domain 'finalwishes.app'."
  echo "      CR-06 GA evidence MUST be captured against finalwishes.app."
  echo "      (A non-custom-domain check is fine for a pre-cutover smoke test.)"
  echo
fi

# ---- Authenticate -----------------------------------------------------------
if [[ ! -f "$SA_KEY" ]]; then
  echo "ERROR: service-account key not found at: $SA_KEY" >&2
  echo "       Set SA_KEY=/path/to/key.json and re-run." >&2
  exit 1
fi

echo "==> Activating service account from $SA_KEY"
gcloud auth activate-service-account --key-file="$SA_KEY" --quiet
# Also export for any client libs that honor Application Default Credentials.
export GOOGLE_APPLICATION_CREDENTIALS="$SA_KEY"
gcloud config set project "$PROJECT" --quiet

# ---- Ensure the Monitoring API is enabled -----------------------------------
echo "==> Ensuring monitoring.googleapis.com is enabled"
gcloud services enable monitoring.googleapis.com --project="$PROJECT" --quiet || {
  echo "WARN: could not enable monitoring.googleapis.com (may already be on, or" >&2
  echo "      the SA lacks serviceusage.services.enable). Continuing." >&2
}

# ---- (a) Uptime check — idempotent ------------------------------------------
echo
echo "==> Checking for an existing uptime check named '${UPTIME_NAME}'"
EXISTING_UPTIME="$(
  gcloud monitoring uptime list-configs \
    --project="$PROJECT" \
    --filter="displayName='${UPTIME_NAME}'" \
    --format="value(name)" 2>/dev/null || true
)"

if [[ -n "$EXISTING_UPTIME" ]]; then
  echo "    SKIP: uptime check already exists:"
  echo "      $EXISTING_UPTIME"
else
  echo "    CREATE: HTTPS uptime check against https://${HOST}/"
  gcloud monitoring uptime create "$UPTIME_NAME" \
    --project="$PROJECT" \
    --resource-type=uptime-url \
    --resource-labels="host=${HOST},project_id=${PROJECT}" \
    --protocol=https \
    --request-method=get \
    --path="/" \
    --port=443 \
    --status-classes=2xx \
    --period="$PERIOD" \
    --timeout=10 \
    --regions="$REGIONS" \
    --validate-ssl=true \
    --user-labels="criterion=cr-06,workstream=finalwishes-uptime-window"
  echo "    OK: uptime check created."
fi

# ---- (b) Alert policy that fires when the check FAILS — idempotent -----------
echo
echo "==> Checking for an existing alert policy named '${ALERT_NAME}'"
EXISTING_ALERT="$(
  gcloud alpha monitoring policies list \
    --project="$PROJECT" \
    --filter="displayName='${ALERT_NAME}'" \
    --format="value(name)" 2>/dev/null || true
)"

if [[ -n "$EXISTING_ALERT" ]]; then
  echo "    SKIP: alert policy already exists:"
  echo "      $EXISTING_ALERT"
else
  echo "    CREATE: alert policy 'uptime check failing'"

  # The condition fires when the uptime_check 'check_passed' boolean metric goes
  # false (i.e. availability fraction drops below 1) for the configured duration.
  # check_id label is the uptime check's short id; we match by the uptime config
  # display name via the metric's check_id is opaque, so we filter on the metric
  # type and the host resource label instead — this catches this host's checks.
  COND_FILTER="metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND resource.label.host=\"${HOST}\""

  # Build the notification-channels flag only if provided.
  NC_FLAG=()
  if [[ -n "$NOTIFICATION_CHANNELS" ]]; then
    NC_FLAG=(--notification-channels="$NOTIFICATION_CHANNELS")
  fi

  # --aggregation aligns the boolean check_passed into a fraction-true per
  # series; if the fraction drops below 1 (any checker region failing) the
  # condition trips after --duration.
  gcloud alpha monitoring policies create \
    --project="$PROJECT" \
    --display-name="$ALERT_NAME" \
    --combiner=OR \
    --condition-display-name="${HOST} uptime check failing" \
    --condition-filter="$COND_FILTER" \
    --if="< 1.0" \
    --duration=300s \
    --trigger-count=1 \
    --aggregation='{
        "alignmentPeriod": "300s",
        "perSeriesAligner": "ALIGN_FRACTION_TRUE",
        "crossSeriesReducer": "REDUCE_MIN",
        "groupByFields": ["resource.label.host"]
      }' \
    --documentation="FinalWishes CR-06: the HTTPS uptime check against ${HOST} is failing. This threatens the 7-day uptime >=99.9% GA window. Investigate Cloud Run / Firebase Hosting / DNS immediately; an unresolved failure resets the 7-day clock." \
    "${NC_FLAG[@]}"
  echo "    OK: alert policy created."
  if [[ -z "$NOTIFICATION_CHANNELS" ]]; then
    echo "    NOTE: no NOTIFICATION_CHANNELS supplied — the policy exists but will"
    echo "          only surface in the Console. Attach an email/PagerDuty channel"
    echo "          (Monitoring > Alerting) or re-run with NOTIFICATION_CHANNELS=."
  fi
fi

# ---- Done -------------------------------------------------------------------
cat <<DONE

================================================================================
  DONE.
  - Uptime check '${UPTIME_NAME}' is probing https://${HOST}/ every ${PERIOD}m.
  - The 7-day CR-06 window starts NOW (first probe). Let it run >= 7 full days.
  - Verify in Console: Monitoring > Uptime checks.
  - When the window has elapsed, capture evidence:
        bash scripts/uptime-evidence.sh <startUTC> <endUTC>
    e.g. bash scripts/uptime-evidence.sh 2026-06-15T00:00:00Z 2026-06-22T00:00:00Z
    See docs/sla-evidence/README.md for the evidence convention.
================================================================================
DONE
