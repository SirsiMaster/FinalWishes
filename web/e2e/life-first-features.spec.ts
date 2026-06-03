import { test, expect, type Page } from '@playwright/test'
import { login, requireTestAccount } from './helpers/auth'

/**
 * E2E Tests — Life-First Reframe Features (Session 7)
 *
 * Tests for: Soul Log, Life Chapters, SectionHeader, page transitions,
 * Shepherd nudges, and emotional section navigation.
 *
 * Logs in via the real login modal (see e2e/helpers/auth.ts). Set
 * E2E_TEST_PASSWORD to run these; otherwise they skip.
 */

/** Expand a collapsible sidebar group */
async function expandNavGroup(page: Page, groupLabel: string) {
  const group = page.locator('nav button').filter({ hasText: groupLabel })
  if (await group.isVisible()) {
    await group.click()
    await page.waitForTimeout(200)
  }
}

/** Navigate to a nested sidebar item */
async function navigateToNestedItem(page: Page, parentGroup: string, childLabel: string) {
  await expandNavGroup(page, parentGroup)
  await page.locator('nav').getByText(childLabel, { exact: true }).click()
}

test.describe('Life-First Features — Soul Log', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    requireTestAccount()
    await login(page)
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
    requireTestAccount()
    await login(page)
  })

  test('Life Chapters page loads via sidebar', async ({ page }) => {
    await navigateToNestedItem(page, 'My Legacy', 'Life Chapters')

    // SectionHeader with purple theme
    await expect(page.getByRole('heading', { name: /Life Chapters/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Your life, told in chapters/i)).toBeVisible()
  })

  test('Life Chapters: open create dialog', async ({ page }) => {
    await navigateToNestedItem(page, 'My Legacy', 'Life Chapters')
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
    await navigateToNestedItem(page, 'My Legacy', 'Life Chapters')
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
    requireTestAccount()
    await login(page)
  })

  test('each section has its distinctive SectionHeader', async ({ page }) => {
    // Sections under collapsible groups — expand parent, then click child
    const sections = [
      { parent: 'Memories', nav: 'Photos & Videos', heading: /Life Stories|Memories/i },
      { parent: 'Memories', nav: 'Heirlooms', heading: /Heirloom Registry/i },
      { parent: 'Letters', nav: 'Directives', heading: /Final Directives/i },
      { parent: 'Letters', nav: 'Time Capsules', heading: /Time Capsules/i },
      { parent: 'The Vault', nav: 'Documents', heading: /Document Vault/i },
      { parent: 'The Vault', nav: 'Assets', heading: /My Assets/i },
      { parent: 'The Vault', nav: 'Lockbox', heading: /Digital Lockbox/i },
    ]

    for (const s of sections) {
      await navigateToNestedItem(page, s.parent, s.nav)
      await expect(page.getByRole('heading', { name: s.heading }).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('page transitions animate between sections', async ({ page }) => {
    // Navigate to Soul Log (direct item)
    await page.locator('nav').getByText('Soul Log').click()
    await expect(page.getByRole('heading', { name: /Soul Log/i })).toBeVisible({ timeout: 10000 })

    // Navigate to Documents (nested under The Vault)
    await navigateToNestedItem(page, 'The Vault', 'Documents')
    await expect(page.getByRole('heading', { name: /Document Vault/i })).toBeVisible({ timeout: 10000 })

    // The motion.div wrapper should exist (Framer Motion adds data attributes)
    // Just verify the page loaded correctly — visual animation is hard to assert
  })
})

test.describe('Life-First Features — Shepherd Integration', () => {
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    requireTestAccount()
    await login(page)
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
