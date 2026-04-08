import { test, expect } from '@playwright/test'

test.describe('FinalWishes Smoke Tests — Public Pages', () => {
  test('landing page loads with Royal Neo-Deco branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FinalWishes/i)
    // Verify key landing page content is visible
    await expect(page.getByRole('link', { name: /Get Started/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.locator('#login-identifier')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
  })

  test('login page switches to sign-up form', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
    await expect(page.locator('#signup-firstname')).toBeVisible()
  })

  test('login page switches to forgot password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible()
  })

  test('login page shows demo mode when ?demo=true', async ({ page }) => {
    await page.goto('/login?demo=true')
    await expect(page.getByText('Demo Mode')).toBeVisible()
  })

  test('unauthenticated user is redirected from dashboard', async ({ page }) => {
    await page.goto('/estates/lockhart/dashboard')
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
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
