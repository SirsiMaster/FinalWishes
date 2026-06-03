import { test, expect } from '@playwright/test'
import { login, requireTestAccount } from './helpers/auth'

/**
 * Returning-user routing regression.
 *
 * THE SHIPPED BUG: an existing user with a `primaryEstateId` logged in and was
 * dumped on /estates/create (forced to "redo" their estate) because the
 * new-vs-returning routing fired before the Firestore profile resolved —
 * `profile` was still null, so they looked like a brand-new user.
 *
 * THE FIX: routing is gated on `auth.profileResolved`, which is true only once
 * the profile read has a definitive answer (found OR confirmed-absent). These
 * tests lock the regression out from both entry paths:
 *   1. Fresh login (signIn path sets profileResolved).
 *   2. Hard reload (onAuthStateChanged listener path sets profileResolved).
 *
 * Requires a real test account with an estate — see e2e/helpers/auth.ts.
 */
test.describe('Returning user routing', () => {
  test.setTimeout(60000)

  test('existing user with an estate lands on their dashboard, not /estates/create', async ({ page }) => {
    requireTestAccount()
    await login(page)

    // Must land on a scoped estate dashboard: /estates/{id}/dashboard ...
    await expect(page).toHaveURL(/\/estates\/[^/]+\/dashboard/, { timeout: 20000 })
    // ... and must NOT be sitting on the intake wizard.
    expect(page.url()).not.toContain('/estates/create')

    // Sanity: the returning-user dashboard chrome actually rendered.
    await expect(page.getByText(/Welcome back/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('a hard reload keeps the returning user on their dashboard', async ({ page }) => {
    requireTestAccount()
    await login(page)
    await expect(page).toHaveURL(/\/estates\/[^/]+\/dashboard/, { timeout: 20000 })

    const dashboardUrl = page.url()
    await page.reload()

    // Reload re-runs onAuthStateChanged → the listener must resolve the profile
    // BEFORE routing decisions run, so the user stays put rather than bouncing
    // to /estates/create.
    await expect(page).toHaveURL(dashboardUrl, { timeout: 20000 })
    expect(page.url()).not.toContain('/estates/create')
  })
})
