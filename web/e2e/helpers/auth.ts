import { expect, test, type Page } from '@playwright/test'

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

  await page.goto('/?login=true')
  await expect(page.locator('#modal-identifier')).toBeVisible({ timeout: 15000 })
  await page.locator('#modal-identifier').fill(email)
  await page.locator('#modal-password').fill(password)
  await page.locator('#modal-submit').click()

  // A returning user is routed to their own estate; a brand-new user to
  // /estates/create. Either way the URL leaves the landing page for /estates/*.
  await page.waitForURL(/\/estates\//, { timeout: 20000 })
}
