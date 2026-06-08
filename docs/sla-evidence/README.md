# SLA Evidence — FinalWishes CR-06 (7-day uptime ≥99.9%)

Companion evidence for **CR-06** of `/goal: finalwishes-tier1-ga`.
Governed by the GA-evidence convention in `docs/ga-evidence/README.md`, which
states:

> The 7-day uptime window (CR-06) artifact links to a
> `docs/sla-evidence/<start>-to-<end>.md` companion file capturing hourly
> availability.

CR-06 is **passive but real**: the 7-day window simply has to elapse, but the
elapsing must be *measured* by a live Cloud Monitoring uptime check against the
production custom domain, and the result captured here as reproducible evidence.

---

## Lifecycle

1. **CR-05 (owner):** cut DNS over so `https://finalwishes.app` is live.
2. **Stage the check:** `bash scripts/uptime-check-setup.sh`
   - Creates the HTTPS uptime check + a failing-check alert policy in
     `finalwishes-prod`. The 7-day clock starts at the first probe.
3. **Wait ≥ 7 full days.** If the alert fires on a real outage during the
   window, the window resets — start a fresh 7-day window after recovery.
4. **Capture evidence:**
   `bash scripts/uptime-evidence.sh <startUTC> <endUTC>`
   - Emits the markdown file described below, with availability % + verdict.
5. **Link it:** reference the produced file from the CR-06 GA-evidence artifact
   `docs/ga-evidence/cr-06-uptime-<YYYY-MM-DD>.md`.

---

## Naming

```
docs/sla-evidence/<startUTC>-to-<endUTC>.md
```

- `<startUTC>` / `<endUTC>` — RFC3339 UTC timestamps with `:` stripped so the
  name is filesystem-safe. The window MUST be ≥ 7×24h.
- Example (window 2026-06-15 00:00:00Z → 2026-06-22 00:00:00Z):
  ```
  docs/sla-evidence/2026-06-15T000000Z-to-2026-06-22T000000Z.md
  ```

`scripts/uptime-evidence.sh` generates this exact name automatically from its
`<startUTC> <endUTC>` arguments.

---

## Required contents per evidence file

Every `<start>-to-<end>.md` MUST contain:

1. **Host** — the exact probed URL (GA must be `https://finalwishes.app/`).
2. **Uptime-check id** — both the display name (`finalwishes-cr06-…`) and the
   full resource name
   (`projects/finalwishes-prod/uptimeCheckConfigs/<id>`).
3. **Window** — `start` and `end` in RFC3339 UTC, spanning ≥ 7 days.
4. **GA threshold** — `99.9%`.
5. **Hourly availability** — a per-hour (or, acceptably, per-day) table or a
   defensible summary of availability across the window.
6. **Computed 7-day availability %** — the single roll-up number.
7. **Verdict** — `MET` (≥ 99.9%) or `NOT MET` (< 99.9%), stated explicitly
   against the threshold.
8. **Provenance** — author (`claude-finalwishes` / `codex-finalwishes`), the
   captured-at UTC timestamp, the GCP project, and the metric source.

A `NOT MET` capture is a valid dated artifact (it records a real failed window);
the later passing run is a **new** dated file. Do not edit a file after it has
been cited by a codex `GOAL_MET` verdict — file a fresh window instead. (Same
no-backfill rule as `docs/ga-evidence/README.md`.)

---

## How to obtain the data

### Option A — the script (preferred)

```bash
bash scripts/uptime-evidence.sh 2026-06-15T00:00:00Z 2026-06-22T00:00:00Z
```

It activates the agent SA, queries the
`monitoring.googleapis.com/uptime_check/check_passed` boolean metric over the
window, computes availability = (passing points / total points), writes the
verdict, and emits the markdown skeleton with any gaps left as `TODO`.

### Option B — raw gcloud time-series

```bash
gcloud monitoring time-series list \
  --project=finalwishes-prod \
  --filter='metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND resource.label.host="finalwishes.app"' \
  --interval-start-time=2026-06-15T00:00:00Z \
  --interval-end-time=2026-06-22T00:00:00Z \
  --format=json
```

Availability = fraction of `boolValue: true` points across all region series.

### Option C — Cloud Console (no CLI)

1. Console → **Monitoring → Uptime checks**.
2. Open `finalwishes-cr06-finalwishes-app`.
3. Set the time range to the 7-day window.
4. Read the **uptime %** (current/availability) figure and the per-region pass
   rates; transcribe into the hourly/daily table and the roll-up number.

---

## GCP requirements

- **API:** `monitoring.googleapis.com` (Cloud Monitoring) enabled on
  `finalwishes-prod`.
- **Roles** on `finalwishes-prod` for the SA
  (`claude-agent@finalwishes-prod.iam.gserviceaccount.com`):
  - `roles/monitoring.editor` — to *create* the check + alert policy
    (`scripts/uptime-check-setup.sh`).
  - `roles/monitoring.viewer` — to *read* time-series for evidence
    (`scripts/uptime-evidence.sh`).
