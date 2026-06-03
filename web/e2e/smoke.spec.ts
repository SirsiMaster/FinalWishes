import { test, expect } from '@playwright/test'

test.describe('FinalWishes Smoke Tests — Public Pages', () => {
  test('landing page loads with Royal Neo-Deco branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FinalWishes/i)
    // The hero CTAs are buttons (open the login modal), not links.
    await expect(page.getByRole('button', { name: /Start Free/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('login modal renders sign-in form', async ({ page }) => {
    await page.goto('/login')
    // /login redirects to the landing page with the modal open (?login=true).
    await expect(page.locator('#modal-identifier')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#modal-password')).toBeVisible()
    await expect(page.locator('#modal-submit')).toBeVisible()
  })

  test('login modal switches to sign-up form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#modal-identifier')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'Create account' }).click()
    // The visible heading is aria-hidden; assert on the form + visible subtitle.
    await expect(page.locator('#modal-firstname')).toBeVisible()
    await expect(page.getByText('Start preserving your legacy today')).toBeVisible()
  })

  test('login modal switches to forgot password', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#modal-identifier')).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page.locator('#modal-reset-email')).toBeVisible()
  })

  test('unauthenticated user is redirected from dashboard', async ({ page }) => {
    await page.goto('/estates/lockhart/dashboard')
    // AuthGuard redirects unauthenticated users to the login modal.
    await page.waitForURL(/login/, { timeout: 10000 })
    await expect(page.locator('#modal-identifier')).toBeVisible({ timeout: 10000 })
  })

  test('create estate redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/estates/create')
    // AuthGuard should redirect
    await page.waitForURL(/login/, { timeout: 10000 })
  })
})

test.describe('FinalWishes Smoke Tests — API', () => {
  const apiBase = process.env.E2E_API_URL || 'https://finalwishes-api-860699311615.us-central1.run.app'

  test('guidance endpoint requires authentication', async ({ request }) => {
    const response = await request.get(`${apiBase}/api/v1/guidance/score`)
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  test('ConnectRPC estate endpoint requires authentication', async ({ request }) => {
    const response = await request.post(`${apiBase}/estate.v1.EstateService/GetEstate`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({}),
    })
    expect(response.status()).toBe(401)
  })
})
