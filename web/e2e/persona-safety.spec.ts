import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers/auth'

/**
 * Persona-safety E2E — LIVE prod (https://finalwishes-prod.web.app)
 * =================================================================
 * Exercises the three layers of persona safety end-to-end:
 *   - persona.ts          resolveEffectiveRole (estate-scoped role WINS) / canAccess
 *   - RoleGuard.tsx       blocks a persona from a forbidden section ("not part of your role")
 *   - PersonaDashboard.tsx  DashboardRouter branches owner / heir / fiduciary
 *   - IdentityGate.tsx    MFA + attestation gate IN FRONT of RoleGuard for fiduciaries
 *
 * Fixtures: scripts/e2e-provision-personas.js seeds ONE shared estate
 * (estate_e2e_personas) with three members — principal (owner), heir, executor.
 * Each member's GLOBAL profile.role is 'principal'; the persona lives ONLY on the
 * estate_users junction, so a green heir/executor assertion can ONLY be explained
 * by the estate-scoped role winning (resolveEffectiveRole). See that script's
 * header for the full role-strategy rationale.
 *
 * ── EMPIRICAL MFA FINDING (the E2E blocker) ─────────────────────────────────
 * Confirmed against LIVE prod on 2026-06-08: a fiduciary (heir/executor) seeded
 * with a VERIFIED attestation but NO enrolled TOTP factor is stopped by
 * IdentityGate's MFA step ("Identity Verification Required" / "Enable Two-Factor
 * Authentication") BEFORE RoleGuard ever renders. RoleGuard's blocked state is
 * therefore unreachable for a fiduciary until MFA is enrolled.
 *
 * Why we cannot just seed MFA: getMFAStatus() reads multiFactor(user).enrolledFactors
 * from the Firebase Auth CLIENT SDK. The Admin SDK (firebase-admin v13) can only
 * create/update PHONE second factors — there is NO Admin-SDK API to enroll a TOTP
 * factor. TOTP enrollment requires a live reauthenticated client session plus a
 * valid one-time code. So provision-personas seeds the attestation half of the
 * gate but cannot seed the MFA half.
 *
 * GAP CLOSED (path A below): scripts/e2e-enroll-mfa.js enrolls a REAL TOTP factor
 * for each fiduciary via the Firebase CLIENT SDK (no Admin-SDK TOTP API needed, no
 * production change) and captures the base32 secret as E2E_{HEIR,EXECUTOR}_TOTP_SECRET.
 * The login helper (e2e/helpers/auth.ts) computes a live code with otplib at the
 * IdentityGate/login MFA challenge, so the fiduciary clears the gate exactly like a
 * real user. requireMfaCapableFiduciary(secret) now RUNS these tests when the secret
 * is present and SKIPS (never fake-passes) when it is absent — security is unchanged.
 *
 * Path A is documented in full at the bottom of this file.
 *
 * ── RUN (serial, sparingly — Go API rate-limits 100 req/60s, 10-min ban) ────
 *   1) Provision once (resets principal MFA-grace window):
 *        GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
 *        E2E_PERSONA_PASSWORD='<pw>' node scripts/e2e-provision-personas.js
 *   2) Run THIS spec only (never all specs in one invocation):
 *        cd web
 *        E2E_PERSONA_PASSWORD='<pw>' npx playwright test e2e/persona-safety.spec.ts --workers=1
 */

const ESTATE_ID = process.env.E2E_PERSONA_ESTATE_ID || 'estate_e2e_personas'
const OWNER_EMAIL = process.env.E2E_PERSONA_OWNER_EMAIL || 'e2e-persona-owner@finalwishes.app'
const HEIR_EMAIL = process.env.E2E_PERSONA_HEIR_EMAIL || 'e2e-persona-heir@finalwishes.app'
const EXECUTOR_EMAIL = process.env.E2E_PERSONA_EXECUTOR_EMAIL || 'e2e-persona-executor@finalwishes.app'

// All three personas share one password (the provision script sets it for each).
const PERSONA_PASSWORD = process.env.E2E_PERSONA_PASSWORD ?? process.env.E2E_TEST_PASSWORD ?? ''

/** Skip the whole suite if the shared persona password is not configured. */
function requirePersonaFixtures(): void {
  test.skip(
    !PERSONA_PASSWORD,
    'Set E2E_PERSONA_PASSWORD (or E2E_TEST_PASSWORD) and run scripts/e2e-provision-personas.js first. ' +
      'Skipping keeps the suite honest: green means it executed against the real seeded personas.',
  )
}

/** Per-account TOTP secrets, populated by scripts/e2e-enroll-mfa.js. */
const HEIR_TOTP_SECRET = process.env.E2E_HEIR_TOTP_SECRET ?? ''
const EXECUTOR_TOTP_SECRET = process.env.E2E_EXECUTOR_TOTP_SECRET ?? ''

/**
 * Gate the tests that live BEHIND the fiduciary MFA wall on a REAL enrolled factor.
 *
 * IdentityGate stops a fiduciary at the TOTP step before RoleGuard/persona dashboard
 * render. Closed via path (A) of "Closing the MFA gap" below: scripts/e2e-enroll-mfa.js
 * enrolls a genuine TOTP factor (client SDK, no production change, no security
 * loosening) and captures the base32 secret as E2E_{HEIR,EXECUTOR}_TOTP_SECRET; the
 * login helper computes a live code at the challenge via otplib.
 *
 * When the relevant secret is PRESENT these tests RUN (the harness presents a real
 * MFA-enrolled fiduciary, exactly like a real user). When ABSENT they SKIP with a
 * clear reason — never fake-pass. Pass the per-account secret so heir/executor gate
 * independently.
 */
function requireMfaCapableFiduciary(totpSecret: string): void {
  test.skip(
    !totpSecret,
    'MFA-gated: set the per-account TOTP secret (E2E_HEIR_TOTP_SECRET / ' +
      'E2E_EXECUTOR_TOTP_SECRET) by running scripts/e2e-enroll-mfa.js and sourcing ' +
      'scripts/.e2e-mfa-secrets.env. Absent => skip (not fake-pass): a fiduciary cannot ' +
      'clear IdentityGate without a real enrolled TOTP factor + a live code at login.',
  )
}

/** Assert the current content area is NOT the RoleGuard blocked state. */
async function expectNotBlocked(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: /isn't part of your role/i }),
  ).toHaveCount(0)
}

/** Assert the current content area is NOT the IdentityGate MFA wizard. */
async function expectNotMfaWalled(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: /Identity Verification Required|Two-Factor Authentication Required/i }),
  ).toHaveCount(0)
}

test.describe('Persona safety — principal (runs today, no MFA gate)', () => {
  test.setTimeout(60000)

  test.beforeEach(() => {
    requirePersonaFixtures()
  })

  // The principal/owner is allow-listed for every section (PERSONA_ACCESS.principal
  // = all but 'attestation'), and is inside the MFA grace window (provision sets
  // createdAt=NOW), so RoleGuard must never block and IdentityGate must never wall
  // — on ANY route, including the two most sensitive (vault, lockbox).
  test('owner is NOT blocked from any route (sees vault + lockbox + dashboard)', async ({ page }) => {
    await login(page, { email: OWNER_EMAIL, password: PERSONA_PASSWORD })

    for (const section of ['dashboard', 'vault', 'lockbox', 'assets', 'beneficiaries']) {
      await page.goto(`/estates/${ESTATE_ID}/${section}`)
      // Let the role resolve (estateUser + profile) before asserting.
      await page.waitForTimeout(2500)
      await expectNotMfaWalled(page)
      await expectNotBlocked(page)
    }
  })

  // The owner dashboard is the principal-shaped "owner timeline" (NOT HeirDashboard's
  // "For You" hero). DashboardRouter branches principal/admin → ownerDashboard.
  test('owner /dashboard renders the owner experience, not the heir "For You"', async ({ page }) => {
    await login(page, { email: OWNER_EMAIL, password: PERSONA_PASSWORD })
    await page.goto(`/estates/${ESTATE_ID}/dashboard`)
    await expectNotMfaWalled(page)
    await expectNotBlocked(page)
    // Owner timeline greets "Welcome back, <name>." — the heir hero is "For You".
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /^For You$/i })).toHaveCount(0)
  })
})

test.describe('Persona safety — heir (MFA-gated, skipped honestly)', () => {
  test.setTimeout(120000)

  test.beforeEach(() => {
    requirePersonaFixtures()
    requireMfaCapableFiduciary(HEIR_TOTP_SECRET)
  })

  // ONE login per persona — TOTP MFA codes are single-use within a 30s window, so
  // re-logging-in per assertion hits Firebase's anti-replay. We log in once and
  // walk every persona-safety assertion in a single session (Firebase Auth persists
  // via indexedDB, which Playwright storageState can't capture — hence one test).
  test('heir: blocked from owner-only routes, lands on the sacred dashboard, soul-log scoped', async ({ page }) => {
    await login(page, { email: HEIR_EMAIL, password: PERSONA_PASSWORD })

    // NOT granted 'vault' → RoleGuard warm block + a way back.
    await page.goto(`/estates/${ESTATE_ID}/vault`)
    await expect(page.getByRole('heading', { name: /isn't part of your role/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: /Return to your space/i })).toBeVisible()

    // NOT granted 'lockbox' (principal+admin only) → blocked.
    await page.goto(`/estates/${ESTATE_ID}/lockbox`)
    await expect(page.getByRole('heading', { name: /isn't part of your role/i })).toBeVisible({ timeout: 15000 })

    // /dashboard = sacred HeirDashboard ("For You"), never the owner timeline.
    await page.goto(`/estates/${ESTATE_ID}/dashboard`)
    await expect(page.getByRole('heading', { name: /^For You$/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toHaveCount(0)

    // Soul Log reachable (heir is allow-listed) and not RoleGuard-blocked; the
    // shared estate is seeded empty so the heir sees the empty/shared-only state,
    // never another member's private diary. (Strengthen with a seeded private-vs-
    // shared pair when feasible.)
    await page.goto(`/estates/${ESTATE_ID}/soul-log`)
    await expect(page.getByRole('heading', { name: /isn't part of your role/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Soul Log/i }).first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Persona safety — executor (MFA-gated, skipped honestly)', () => {
  test.setTimeout(120000)

  test.beforeEach(() => {
    requirePersonaFixtures()
    requireMfaCapableFiduciary(EXECUTOR_TOTP_SECRET)
  })

  // ONE login (see heir note on TOTP anti-replay).
  test('executor: blocked from lockbox, lands on the Settlement dashboard', async ({ page }) => {
    await login(page, { email: EXECUTOR_EMAIL, password: PERSONA_PASSWORD })

    // NOT granted 'lockbox' (principal+admin only by canon) → RoleGuard block.
    await page.goto(`/estates/${ESTATE_ID}/lockbox`)
    await expect(page.getByRole('heading', { name: /isn't part of your role/i })).toBeVisible({ timeout: 15000 })

    // /dashboard = fiduciary "Settlement" PersonaDashboard, not owner timeline nor heir "For You".
    await page.goto(`/estates/${ESTATE_ID}/dashboard`)
    await expect(page.getByRole('heading', { name: /Settlement/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /^For You$/i })).toHaveCount(0)
  })
})

/* ───────────────────────────────────────────────────────────────────────────
 * CLOSING THE MFA GAP (recommendation)
 * ───────────────────────────────────────────────────────────────────────────
 * Two viable paths; the FIRST is recommended.
 *
 * (A) RECOMMENDED — real TOTP enrollment + otplib-computed code at login.
 *     IdentityGate is a real security control; the most faithful E2E presents a
 *     genuinely MFA-enrolled fiduciary, exactly like a real user.
 *       1. In a one-time client-side enrollment step (Node script using the
 *          Firebase JS SDK, NOT the Admin SDK), sign in as the heir/executor,
 *          call multiFactor(user).getSession() → TotpMultiFactorGenerator
 *          .generateSecret() → store the base32 secret as a CI/local secret,
 *          then finalize with a code computed from that secret via `otplib`.
 *          (Mirror web/src/lib/mfa.ts startTotpEnrollment/finalizeTotpEnrollment.)
 *       2. In the spec's login helper, when prod throws
 *          auth/multi-factor-auth-required, compute the current TOTP from the
 *          stored secret with otplib and resolve via resolveTotpChallenge()
 *          (already in mfa.ts). The seeded attestation then satisfies step 2 and
 *          the fiduciary reaches RoleGuard.
 *     Pros: zero security change; tests the gate as shipped. Cons: store one
 *     base32 secret per fiduciary; re-enroll if the factor is ever reset.
 *
 * (B) ALTERNATIVE — dedicated MFA-exempt TEST-MODE claim.
 *     Add a custom claim (e.g. e2eMfaExempt: true) set ONLY on these seeded test
 *     uids via the Admin SDK, and have IdentityGate treat that claim as
 *     MFA-satisfied. Simpler to seed, but it ADDS a security bypass branch to a
 *     real gate (must be provably unreachable in prod for real users) — i.e. it
 *     loosens the control, which the task forbids. Use only if (A) proves
 *     impractical, and gate it behind a build-time prod kill-switch.
 *
 * Net: go with (A). It needs only an `otplib` dev-dependency, a one-time
 * enrollment script, and a few lines in the login helper — no production code
 * change and no weakening of IdentityGate.
 * ─────────────────────────────────────────────────────────────────────────── */
