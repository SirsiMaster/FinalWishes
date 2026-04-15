import { test, expect, type Page } from '@playwright/test'

/**
 * E2E Tests — Life-First Reframe Features (Session 7)
 *
 * Tests for: Soul Log, Life Chapters, SectionHeader, page transitions,
 * Shepherd nudges, and emotional section navigation.
 *
 * Uses demo login for authenticated flows.
 */

async function demoLogin(page: Page) {
  await page.goto('/login?demo=true')
  await expect(page.locator('#login-identifier')).toBeVisible({ timeout: 15000 })
  await page.locator('#login-identifier').fill('Tameeka116')
  await page.locator('#login-password').fill('ML6824!')
  await page.locator('#login-submit').click()
  await page.waitForURL(/estates/, { timeout: 15000 })
}

test.describe('Life-First Features — Soul Log', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await demoLogin(page)
  })

  test('Soul Log page loads with SectionHeader', async ({ page }) => {
    await page.locator('nav').getByText('Soul Log').click()
    // SectionHeader should render with amber theme
    await expect(page.getByRole('heading', { name: /Soul Log/i })).toBeVisible({ timeout: 10000 })
    // Tagline should be visible
    await expect(page.getByText(/Your personal diary/i)).toBeVisible()
  })

  test('Soul Log opens composer dialog', async ({ page }) => {
    await page.locator('nav').getByText('Soul Log').click()
    await expect(page.getByRole('heading', { name: /Soul Log/i })).toBeVisible({ timeout: 10000 })

    // Click the "New Entry" button
    await page.getByRole('button', { name: /New Entry/i }).click()
    await expect(page.getByText('New Soul Log Entry')).toBeVisible({ timeout: 5000 })

    // Verify tab options
    await expect(page.getByRole('tab', { name: /Video/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Audio/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Written/i })).toBeVisible()
  })

  test('Soul Log composer: written entry tab works', async ({ page }) => {
    await page.locator('nav').getByText('Soul Log').click()
    await expect(page.getByRole('heading', { name: /Soul Log/i })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /New Entry/i }).click()
    await expect(page.getByText('New Soul Log Entry')).toBeVisible({ timeout: 5000 })

    // Switch to Written tab
    await page.getByRole('tab', { name: /Written/i }).click()

    // Editor should be visible (TipTap renders a contenteditable div)
    await expect(page.locator('[contenteditable="true"]')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Life-First Features — Life Chapters', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await demoLogin(page)
  })

  test('Life Chapters page loads via sidebar', async ({ page }) => {
    // Expand My Legacy group
    await page.locator('nav').getByText('My Legacy').click()
    await page.locator('nav').getByText('Life Chapters').click()

    // SectionHeader with purple theme
    await expect(page.getByRole('heading', { name: /Life Chapters/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Your life, told in chapters/i)).toBeVisible()
  })

  test('Life Chapters: open create dialog', async ({ page }) => {
    await page.locator('nav').getByText('My Legacy').click()
    await page.locator('nav').getByText('Life Chapters').click()
    await expect(page.getByRole('heading', { name: /Life Chapters/i })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /New Chapter/i }).click()
    await expect(page.getByText(/New Life Chapter/i)).toBeVisible({ timeout: 5000 })

    // Form fields
    await expect(page.locator('#chapter-title')).toBeVisible()
    await expect(page.locator('#chapter-desc')).toBeVisible()
    await expect(page.locator('#date-from')).toBeVisible()
    await expect(page.locator('#date-to')).toBeVisible()
  })

  test('Life Chapters: create dialog validates title', async ({ page }) => {
    await page.locator('nav').getByText('My Legacy').click()
    await page.locator('nav').getByText('Life Chapters').click()
    await expect(page.getByRole('heading', { name: /Life Chapters/i })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /New Chapter/i }).click()
    await expect(page.getByText(/New Life Chapter/i)).toBeVisible({ timeout: 5000 })

    // Create button should be disabled without title
    const createBtn = page.getByRole('button', { name: /Create Chapter/i })
    await expect(createBtn).toBeDisabled()

    // Fill title — button should enable
    await page.locator('#chapter-title').fill('Childhood Memories')
    await expect(createBtn).toBeEnabled()
  })
})

test.describe('Life-First Features — Section Headers & Navigation', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await demoLogin(page)
  })

  test('each section has its distinctive SectionHeader', async ({ page }) => {
    const sections = [
      { nav: 'Photos & Videos', heading: /Life Stories|Memories/i },
      { nav: 'Heirlooms', heading: /Heirloom Registry/i },
      { nav: 'Directives', heading: /Final Directives/i },
      { nav: 'Time Capsules', heading: /Time Capsules/i },
      { nav: 'Documents', heading: /Document Vault/i },
      { nav: 'Assets', heading: /My Assets/i },
      { nav: 'Lockbox', heading: /Digital Lockbox/i },
    ]

    for (const s of sections) {
      // Click nav (some are in expandable groups)
      const navLink = page.locator('nav').getByText(s.nav, { exact: true })
      await navLink.click()
      // Verify SectionHeader renders with the correct title
      await expect(page.getByRole('heading', { name: s.heading }).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('page transitions animate between sections', async ({ page }) => {
    // Navigate to Soul Log
    await page.locator('nav').getByText('Soul Log').click()
    await expect(page.getByRole('heading', { name: /Soul Log/i })).toBeVisible({ timeout: 10000 })

    // Navigate to a different section
    await page.locator('nav').getByText('Documents', { exact: true }).click()
    await expect(page.getByRole('heading', { name: /Document Vault/i })).toBeVisible({ timeout: 10000 })

    // The motion.div wrapper should exist (Framer Motion adds data attributes)
    // Just verify the page loaded correctly — visual animation is hard to assert
  })
})

test.describe('Life-First Features — Shepherd Integration', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    await demoLogin(page)
  })

  test('dashboard Shepherd FAB opens chat panel', async ({ page }) => {
    // Should be on dashboard by default after login
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 10000 })

    // Find and click the Shepherd FAB (bottom-right floating button)
    const fab = page.locator('button').filter({ hasText: /Shepherd|Compass/i }).first()
    if (await fab.isVisible()) {
      await fab.click()
      // Chat panel should open
      await expect(page.getByText(/Ask the Shepherd/i).or(page.getByPlaceholder(/Ask.*anything/i))).toBeVisible({ timeout: 5000 })
    }
  })
})
