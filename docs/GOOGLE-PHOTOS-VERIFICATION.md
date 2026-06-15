# Google OAuth Verification Runbook — Google Photos Import

**Refs:** ADR-045 (Google Photos Import), CR-12, FR-905
**Owner action:** This is a console-only submission runbook. The engineering work (Picker
flow, privacy disclosure, committed OAuth client id) is already shipped. What remains is the
Google OAuth app verification so the Photos import works for **all** users — not just the
limited set of test users on an unverified consent screen.

---

## Why verification is required

The app requests the OAuth scope
`https://www.googleapis.com/auth/photospicker.mediaitems.readonly`. Google classifies the
Photos Picker scope as **sensitive**, and an app requesting a sensitive scope can only be
published to the general public after the OAuth consent screen passes Google's verification
review. Until then, the consent screen stays in "Testing" mode and only explicitly added
test users can complete the flow.

**Tier note:** The Picker scope (`photospicker.mediaitems.readonly`) is in the lighter
**sensitive** tier — standard OAuth verification, typically **days to a few weeks**. It is
**not** the heavy **restricted** Photos Library scope (`photoslibrary.*`), which would
trigger the **CASA** (Cloud Application Security Assessment) third-party security
assessment and a much longer, costlier review. We deliberately use the Picker API exactly so
we stay in the lighter tier (see ADR-045). **Confirm the exact tier shown for this app in the
Google Cloud console → APIs & Services → OAuth consent screen → Verification Center** before
submitting; the console is authoritative if Google reclassifies.

---

## 1. OAuth consent-screen field values

Project: **finalwishes-prod** (OAuth client id already committed:
`860699311615-…apps.googleusercontent.com`).

Google Cloud console → **APIs & Services → OAuth consent screen** (User type: **External**,
Publishing status target: **In production**). Set:

| Field | Value |
| --- | --- |
| App name | `FinalWishes` |
| User support email | `support@sirsi.ai` |
| App logo | FinalWishes logo (PNG, square, ≤1 MB; must match the brand on finalwishes.app) |
| Application home page | `https://finalwishes.app` |
| Application privacy policy link | `https://finalwishes.app/privacy` |
| Application terms of service link | `https://finalwishes.app/terms` (if published; otherwise omit) |
| Authorized domains | `finalwishes.app` and `finalwishes-prod.web.app` |
| Developer contact email | `support@sirsi.ai` |

Under **Scopes**, ensure exactly one sensitive scope is present and nothing broader:
`.../auth/photospicker.mediaitems.readonly`. Remove any `photoslibrary.*` scope if present —
its presence forces the restricted/CASA tier.

> The privacy policy at `https://finalwishes.app/privacy` already carries the dedicated
> **Google Photos** section with the verbatim **Limited Use** affirmation and a link to the
> Google API Services User Data Policy (added in this change). Google's reviewer will read
> that page — it must be live in prod before you submit.

---

## 2. Scope justification (copy-paste ready)

Paste this into the **"How will the scopes be used?"** / scope-justification field for
`photospicker.mediaitems.readonly`:

> FinalWishes is an estate-planning platform where users assemble meaningful family photos
> ("heirlooms") into their estate. We request
> `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` so a user can import
> photos from Google Photos into their own Heirloom Registry. The flow is entirely
> user-initiated: the user clicks "Import from Google Photos," Google's own Photos Picker
> opens, and the user explicitly selects the specific photos they want. The app then receives
> a short-lived, read-only, session-scoped handle to **only those selected items** — it never
> lists, browses, or reads the user's broader photo library, which is why we use the Picker
> API rather than the broader Photos Library API. This is the least-privileged Photos scope
> that satisfies the need (read-only, picker-mediated, no library enumeration). The selected
> photos are downloaded once and stored as the user's own heirlooms within their estate,
> under the user's control (they can delete them at any time). The Google access token is used
> immediately and is never persisted on our servers, and the data is never sold, used for
> advertising, or shared except as needed to provide this import feature, in adherence with
> the Google API Services User Data Policy including its Limited Use requirements.

---

## 3. Domain verification (required before approval)

Google requires the **authorized domains** to be verified to a property you control. Do this
before (or alongside) submission, or verification will be blocked.

1. Go to **[Google Search Console](https://search.google.com/search-console)** with the same
   Google account that owns the `finalwishes-prod` Cloud project (or an account you'll add as
   an owner).
2. Add a property for **`finalwishes.app`** (use the **Domain** property type for DNS
   verification, or **URL prefix** `https://finalwishes.app` for HTML/file verification).
3. Verify ownership via the offered method:
   - **DNS TXT** (preferred for the Domain property): add the `google-site-verification=…`
     TXT record at the `finalwishes.app` DNS provider, then click Verify.
   - or **HTML file / meta tag** for the URL-prefix property.
4. Repeat for **`finalwishes-prod.web.app`** if it is listed as an authorized domain. (Firebase
   Hosting domains are typically already associated with the project; confirm it appears as
   verified in the OAuth consent screen's Authorized domains list — Google will reject domains
   that aren't verified to the project.)
5. Back in **OAuth consent screen → Authorized domains**, confirm both domains show as
   accepted. Only verified domains may appear here.

---

## 4. Demo video script (30–60s)

Google's reviewers require a screen-recording that shows (a) the OAuth consent screen with
the **app name and the exact scope being requested**, (b) the user **granting** consent, and
(c) the app **actually using** the granted data. Record at desktop resolution, narrate or
caption each beat, and upload to an unlisted YouTube link in the submission.

**Scene 1 — Entry point (0:00–0:08).** Signed in to `https://finalwishes.app`, open an estate
and navigate to the **Heirloom Registry**. Click **"Import from Google Photos."**

**Scene 2 — Consent screen (0:08–0:22).** The Google OAuth consent screen appears. Pause so
the recording clearly shows the **app name "FinalWishes"** and the requested permission —
"**See and download only the photos you select with the Google Photos picker**"
(the `photospicker.mediaitems.readonly` scope). Select the Google account, then **click
Continue / Allow** to grant consent. (Show the grant happening on screen.)

**Scene 3 — Using the data (0:22–0:45).** Google's **Photos Picker** opens. Select one or two
photos and confirm. The picker closes; the app shows its import progress
("Saving your photos to the family vault…").

**Scene 4 — Result (0:45–0:60).** The selected photo(s) **appear in the Heirloom Registry** as
new heirlooms in the estate — demonstrating that the granted, user-selected data is used
exactly for the stated purpose (and nothing more — no library browsing is shown because the
app has no such access).

Keep it continuous and unedited where possible; reviewers want to see the real, unfaked flow.

---

## 5. Submission checklist

- [ ] Privacy policy is **live** at `https://finalwishes.app/privacy` and includes the Google
      Photos section + verbatim Limited Use affirmation + link to the User Data Policy.
- [ ] Homepage live at `https://finalwishes.app`.
- [ ] OAuth consent screen (External) filled with the values in §1; app logo uploaded.
- [ ] Scopes list contains **only** `photospicker.mediaitems.readonly` (no `photoslibrary.*`).
- [ ] Scope justification (§2) pasted into the scope-usage field.
- [ ] Authorized domains `finalwishes.app` + `finalwishes-prod.web.app` added **and verified**
      in Google Search Console (§3).
- [ ] Demo video recorded per §4 and uploaded (unlisted link added to the submission).
- [ ] Verification Center tier confirmed as **sensitive** (standard verification), **not**
      restricted/CASA. If the console shows restricted, stop and reassess scopes.
- [ ] Developer contact email monitored — Google emails follow-up questions there and the
      clock pauses until you reply.
- [ ] Click **Submit for verification** / **Publish app** and record the submission date.

**After approval:** the consent screen moves to "In production / Verified," the test-user cap
is removed, and the "Import from Google Photos" button works for all users with no further
changes. No code change or redeploy is needed — the client id and Picker flow are already live.
