import { expect, test, type Page } from '@playwright/test'
import { authenticator } from 'otplib'

/**
 * Shared authentication helpers for E2E specs.
 *
 * Demo mode (and its `?demo=true` / `#login-*` selectors) was removed, so the
 * authenticated flows now run against a REAL Firebase account through the real
 * login modal. Credentials are supplied via env so nothing sensitive is
 * committed:
 *   - E2E_TEST_EMAIL    (defaults to the documented test account)
 *   - E2E_TEST_PASSWORD (no default — required to actually run these flows)
 */

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'cylton@sirsi.ai'
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''

/**
 * TOTP secrets for the MFA-enrolled fiduciary E2E personas, keyed by login email.
 *
 * Populated by scripts/e2e-enroll-mfa.js (which enrolls a real TOTP factor and
 * captures each base32 secret to the gitignored scripts/.e2e-mfa-secrets.env).
 * Only the fiduciaries (heir/executor) are MFA-enrolled; the principal/owner is in
 * the MFA-grace window and has NO secret here, so its login path is untouched.
 *
 * Lookup is keyed by email (lower-cased) so login() can find the right secret
 * regardless of which persona is signing in. Absent => no MFA challenge expected.
 */
const TOTP_SECRETS: Record<string, string | undefined> = {
  [(process.env.E2E_PERSONA_HEIR_EMAIL ?? 'e2e-persona-heir@finalwishes.app').toLowerCase()]:
    process.env.E2E_HEIR_TOTP_SECRET,
  [(process.env.E2E_PERSONA_EXECUTOR_EMAIL ?? 'e2e-persona-executor@finalwishes.app').toLowerCase()]:
    process.env.E2E_EXECUTOR_TOTP_SECRET,
}

/** Resolve the TOTP secret for a login email, or undefined if none configured. */
export function totpSecretFor(email: string): string | undefined {
  return TOTP_SECRETS[email.toLowerCase()]
}

/**
 * Skip the current test when no real test-account password is configured.
 *
 * Call this first in any test/beforeEach that needs a logged-in session.
 * Skipping (rather than failing) keeps CI honest: a green run means "executed
 * against a real account", never "passed because credentials were faked".
 */
export function requireTestAccount(): void {
  test.skip(
    !TEST_PASSWORD,
    'Set E2E_TEST_PASSWORD (and optionally E2E_TEST_EMAIL) to run authenticated E2E flows.',
  )
}

/**
 * Log in through the production login modal.
 *
 * Opens the modal via the landing page (`/?login=true`) and drives the CURRENT
 * `#modal-*` selectors — not the removed demo-mode `#login-*` ids. Waits for the
 * post-login redirect to land on a scoped `/estates/...` route.
 */
export async function login(
  page: Page,
  opts: { email?: string; password?: string } = {},
): Promise<void> {
  const email = opts.email ?? TEST_EMAIL
  const password = opts.password ?? TEST_PASSWORD

  // Use the canonical `/login` route (which the app redirects to `?login="true"`,
  // the JSON-serialized form TanStack Router actually emits). A bare
  // `/?login=true` is parsed as a boolean and does NOT open the modal — that is
  // not a path any real user flow generates, so the smoke + auth specs both
  // drive `/login`, matching real "Sign in" button behaviour.
  await page.goto('/login')
  await expect(page.locator('#modal-identifier')).toBeVisible({ timeout: 15000 })
  await page.locator('#modal-identifier').fill(email)
  await page.locator('#modal-password').fill(password)
  await page.locator('#modal-submit').click()

  // ── MFA challenge (fiduciaries only) ──────────────────────────────────────────
  // For an MFA-enrolled account the modal switches to its TOTP step after the
  // password submit (handleSignIn → auth/multi-factor-auth-required → setMode('mfa')),
  // surfacing the `#modal-mfa` code input. The principal/owner is NOT enrolled, so
  // that step NEVER appears for it and this whole block is skipped — the non-MFA
  // path is byte-for-byte unchanged. We engage TOTP ONLY when the challenge UI is
  // actually shown, so a misconfigured secret can never silently alter a working
  // principal login.
  const mfaInput = page.locator('#modal-mfa')
  const challengeShown = await mfaInput
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (challengeShown) {
    const secret = totpSecretFor(email)
    if (!secret) {
      throw new Error(
        `MFA challenge appeared for ${email} but no TOTP secret is configured. ` +
          'Run scripts/e2e-enroll-mfa.js and load scripts/.e2e-mfa-secrets.env ' +
          '(E2E_HEIR_TOTP_SECRET / E2E_EXECUTOR_TOTP_SECRET).',
      )
    }
    // Submit the current TOTP and report whether the challenge cleared.
    //
    // TWO failure modes to defend against:
    //  1. Window-boundary skew — a code computed just before a 30s rollover is stale
    //     by the time the server checks it.
    //  2. ANTI-REPLAY — Firebase rejects a TOTP code that was ALREADY consumed in this
    //     window. Two fiduciary logins in the same describe run back-to-back land in
    //     the same 30s window and would compute (and reuse) the identical code, so the
    //     second login fails "Invalid code" until a NEW window produces a NEW code.
    //
    // Both are solved the same way: never reuse a code, and on failure wait for the
    // window to ROLL OVER before recomputing. We track the last code we sent and, on
    // retry, block until otplib yields a different one (i.e. a fresh interval).
    const submitCode = async (code: string): Promise<boolean> => {
      await mfaInput.fill('')
      await mfaInput.fill(code)
      await page.getByRole('button', { name: /^Verify$/ }).click()
      // Cleared (mode left 'mfa') => success. Still showing => rejected/in-flight.
      return mfaInput
        .waitFor({ state: 'hidden', timeout: 8000 })
        .then(() => true)
        .catch(() => false)
    }

    let lastCode = ''
    let cleared = false
    // Up to 3 attempts; each retry waits for a brand-new TOTP interval so we never
    // resubmit a consumed/stale code. 3 windows ≈ <90s, comfortably inside the test
    // timeout while guaranteeing a fresh code after a same-window collision.
    for (let attempt = 0; attempt < 3 && !cleared; attempt++) {
      if (attempt > 0) {
        // Wait out the current 30s window so the next code is guaranteed different.
        const waitMs = (authenticator.timeRemaining() + 1) * 1000
        await page.waitForTimeout(waitMs)
      } else if (authenticator.timeRemaining() < 4) {
        // First attempt but we're at the tail of a window — the code would likely go
        // stale before the server checks it. Roll to the next window proactively.
        await page.waitForTimeout((authenticator.timeRemaining() + 1) * 1000)
      }
      let code = authenticator.generate(secret)
      // Belt-and-suspenders: if we somehow still hold the same code (clock not yet
      // past the boundary), spin briefly until a fresh one appears.
      while (code === lastCode) {
        await page.waitForTimeout((authenticator.timeRemaining() + 1) * 1000)
        code = authenticator.generate(secret)
      }
      lastCode = code
      cleared = await submitCode(code)
    }
    if (!cleared) {
      throw new Error(
        `MFA challenge for ${email} did not clear after retries (anti-replay/skew). ` +
          'The TOTP secret may be stale — re-run scripts/e2e-enroll-mfa.js.',
      )
    }
  }

  // A returning user is routed to their own estate; a brand-new user to
  // /estates/create. Either way the URL leaves the landing page for /estates/*.
  // The MFA path adds extra round-trips (challenge → resolveSignIn → profile
  // resolve) before the redirect fires, so on a cold prod load the fiduciary
  // redirect can lag past 20s. Give it a wider window — this only RAISES the
  // ceiling, so the fast principal (no-MFA) path is unaffected; it still resolves
  // in a couple of seconds and returns immediately.
  await page.waitForURL(/\/estates\//, { timeout: 35000 })

  // First-run gate: a principal/admin sees the OwnerWelcome takeover ("Welcome,
  // <name>." → "Start Building Your Legacy") once per (estate,user), persisted in
  // localStorage. A real owner clicks through it to reach the dashboard; a fresh
  // browser context (every E2E run) has empty localStorage, so dismiss it here —
  // otherwise the welcome screen masks the dashboard chrome the specs assert on.
  // The welcome screen renders only after the auth profile resolves, which on a
  // cold production load can lag the /estates/* URL change by several seconds.
  // Give it a generous window to appear, then click through and confirm it is
  // gone before returning — otherwise the takeover masks the dashboard chrome
  // the specs assert on.
  // NOTE: locator.isVisible() is an immediate, non-retrying check, so it loses
  // the race when the welcome screen renders only after the auth profile
  // resolves (a few seconds after the /estates/* URL change). Use waitFor(),
  // which polls, to actually catch the screen, then click through and confirm
  // it is gone before returning.
  const welcomeCta = page.getByRole('button', { name: /Start Building Your Legacy/i })
  const appeared = await welcomeCta
    .waitFor({ state: 'visible', timeout: 12000 })
    .then(() => true)
    .catch(() => false)
  if (appeared) {
    await welcomeCta.click()
    await welcomeCta.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
  }

  // Fiduciary first-run gate: a heir/executor sees the parallel HeirWelcome takeover
  // ("<owner>'s estate is organized and ready for you" → "View Estate Details"), also
  // once per (estate,user) in localStorage (HeirWelcome.shouldShowHeirWelcome /
  // markWelcomeSeen). On a fresh E2E context the flag is empty, so this takeover masks
  // RoleGuard's blocked state and the heir/Settlement dashboards the fiduciary specs
  // assert on — exactly as the OwnerWelcome masks the principal dashboard. Clicking
  // "View Estate Details" calls markWelcomeSeen(), persisting the flag so it does not
  // re-show on the subsequent page.goto()s within the same context. Principal vs
  // fiduciary welcomes are mutually exclusive, so handling both is additive and safe:
  // the principal path never hits this (its CTA already cleared above, and a principal
  // never renders HeirWelcome). Only the shorter of the two waits ever matches.
  const heirWelcomeCta = page.getByRole('button', { name: /View Estate Details/i })
  const heirWelcomeShown = await heirWelcomeCta
    .waitFor({ state: 'visible', timeout: appeared ? 3000 : 12000 })
    .then(() => true)
    .catch(() => false)
  if (heirWelcomeShown) {
    await heirWelcomeCta.click()
    await heirWelcomeCta.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
  }
}
