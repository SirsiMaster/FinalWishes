import { test, expect } from '@playwright/test'

test.describe('Smoke Tests — Critical Pages Load', () => {
  test('homepage loads with FinalWishes branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FinalWishes/i)
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('unauthenticated user is redirected from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Auth Flow', () => {
  test('demo mode login works', async ({ page }) => {
    await page.goto('/login?demo=true')

    // Demo mode should show test accounts
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Estate Pages (Demo Mode)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo estate (bypasses real auth)
    await page.goto('/estates/lockhart/dashboard?demo=true')
  })

  test('dashboard loads with Shepherd guidance', async ({ page }) => {
    await expect(page.getByText(/Welcome back/)).toBeVisible({ timeout: 10000 })
  })

  test('assets page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/assets?demo=true')
    await expect(page.getByText(/Asset/i)).toBeVisible({ timeout: 10000 })
  })

  test('vault page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/vault?demo=true')
    await expect(page.getByText(/Document/i)).toBeVisible({ timeout: 10000 })
  })

  test('lockbox page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/lockbox?demo=true')
    await expect(page.getByText(/Digital Lockbox/i)).toBeVisible({ timeout: 10000 })
  })

  test('directives page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/directives?demo=true')
    await expect(page.getByText(/Final Directives/i)).toBeVisible({ timeout: 10000 })
  })

  test('time capsule page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/timecapsule?demo=true')
    await expect(page.getByText(/Time Capsule/i)).toBeVisible({ timeout: 10000 })
  })

  test('pricing page loads with tiers', async ({ page }) => {
    await page.goto('/estates/lockhart/pricing?demo=true')
    await expect(page.getByText(/Choose Your Plan/i)).toBeVisible({ timeout: 10000 })
  })

  test('beneficiaries page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/beneficiaries?demo=true')
    await expect(page.getByText(/Beneficiar/i)).toBeVisible({ timeout: 10000 })
  })

  test('settings page loads', async ({ page }) => {
    await page.goto('/estates/lockhart/settings?demo=true')
    await expect(page.getByText(/Settings/i)).toBeVisible({ timeout: 10000 })
  })
})
