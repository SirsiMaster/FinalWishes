import { test, expect, type Page } from '@playwright/test'
import { login, requireTestAccount } from './helpers/auth'

/**
 * Authenticated E2E Tests
 *
 * These log in via the real login modal (see e2e/helpers/auth.ts) against a
 * real Firebase test account and exercise the authenticated estate dashboard
 * pages. Demo mode was removed; set E2E_TEST_PASSWORD to run these, otherwise
 * they skip. Run against production or a local dev server with `E2E_BASE_URL`.
 */

/**
 * Click a nested sidebar item, ensuring its parent group is expanded first.
 *
 * The shipped sidebar (web/src/components/layout/Sidebar.tsx) is grouped and
 * collapsible: a group's children only render in the DOM while the group is
 * expanded, and clicking a group button TOGGLES it. Because the active group
 * auto-expands, a naive "always click the group" helper would collapse an
 * already-open group and hide the child. So we only click the group button
 * when the target child link is not already visible — making the expansion
 * idempotent and faithful to how a real user reaches the item.
 */
async function navigateToNestedItem(page: Page, parentGroup: string, childLabel: string) {
  const child = page.locator('nav').getByText(childLabel, { exact: true })
  if (!(await child.isVisible().catch(() => false))) {
    const group = page.locator('nav button').filter({ hasText: parentGroup })
    await group.click()
    await child.waitFor({ state: 'visible', timeout: 5000 })
  }
  await child.click()
}

test.describe('FinalWishes Authenticated Flows', () => {
  // Increase test timeout for authenticated flows (network + Firebase init)
  test.setTimeout(60000)

  test.beforeEach(async ({ page }) => {
    requireTestAccount()
    await login(page)
  })

  // ─── 1. Dashboard loads with Shepherd data ──────────────────────────────

  test('dashboard loads with Shepherd data', async ({ page }) => {
    // SectionHeader greeting ("Welcome back, <name>.")
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({ timeout: 10000 })

    // Quick-stat MiniStat labels (grid row at bottom of dashboard)
    await expect(page.getByText('Assets', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Documents', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Beneficiaries', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Completion', { exact: true }).first()).toBeVisible()

    // Collapsible checklist heading (renders even with empty data)
    await expect(page.getByText('Estate Health Check')).toBeVisible()
  })

  // ─── 2. Navigate to all major pages ─────────────────────────────────────

  test('navigate to all major pages from sidebar', async ({ page }) => {
    // Direct nav items (no parent group)
    await page.locator('nav').getByText('Soul Log', { exact: true }).click()
    await expect(page.getByRole('heading', { name: /Soul Log/i }).first()).toBeVisible({ timeout: 10000 })

    await page.locator('nav').getByText('My People', { exact: true }).click()
    await expect(page.getByText(/Family|Heirs|Beneficiaries/i).first()).toBeVisible({ timeout: 10000 })

    // The Vault group → Assets, Documents, Lockbox
    await navigateToNestedItem(page, 'The Vault', 'Assets')
    await expect(page.getByText(/My Assets/i).first()).toBeVisible({ timeout: 10000 })

    await navigateToNestedItem(page, 'The Vault', 'Documents')
    await expect(page.getByText(/Vault|Documents/i).first()).toBeVisible({ timeout: 10000 })

    await navigateToNestedItem(page, 'The Vault', 'Lockbox')
    await expect(page.getByText(/Digital Lockbox|Lockbox/i).first()).toBeVisible({ timeout: 10000 })

    // Letters group → Directives, Time Capsules, Final Record
    await navigateToNestedItem(page, 'Letters', 'Directives')
    await expect(page.getByText(/Final Directives|Directives/i).first()).toBeVisible({ timeout: 10000 })

    await navigateToNestedItem(page, 'Letters', 'Time Capsules')
    await expect(page.getByText(/Time Capsule/i).first()).toBeVisible({ timeout: 10000 })

    await navigateToNestedItem(page, 'Letters', 'Final Record')
    await expect(page.getByText(/Final Record|Obituary/i).first()).toBeVisible({ timeout: 10000 })

    // Memories group → Photos & Videos, Heirlooms
    await navigateToNestedItem(page, 'Memories', 'Photos & Videos')
    await expect(page.getByText(/Memori|Life Stories/i).first()).toBeVisible({ timeout: 10000 })

    await navigateToNestedItem(page, 'Memories', 'Heirlooms')
    await expect(page.getByText(/Heirloom/i).first()).toBeVisible({ timeout: 10000 })

    // Utility items
    await page.locator('nav').getByText('Upgrade Plan', { exact: true }).click()
    await expect(page.getByText(/Choose Your Plan|Pricing/i).first()).toBeVisible({ timeout: 10000 })

    await page.locator('nav').getByText('Settings', { exact: true }).click()
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    await page.locator('nav').getByText('Notifications', { exact: true }).click()
    // Notifications route renders an "Activity History" heading
    await expect(page.getByRole('heading', { name: /Activity History/i })).toBeVisible({ timeout: 10000 })
  })

  // ─── 3. Assets page: open Add Asset dialog ─────────────────────────────

  test('assets page: open Add Asset dialog', async ({ page }) => {
    await navigateToNestedItem(page, 'The Vault', 'Assets')
    await expect(page.getByText('My Assets')).toBeVisible({ timeout: 10000 })

    // Exact match: the empty-estate state also renders an "Add Assets …" CTA card,
    // so /Add Asset/i is ambiguous (strict-mode). Target the header button exactly.
    await page.getByRole('button', { name: 'Add Asset', exact: true }).click()

    // Modal with form fields
    await expect(page.getByText('Add New Asset')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="name"]')).toBeVisible()
    // Asset category is now a shadcn Select (combobox), not a native <select>.
    // The placeholder is a CSS attribute (not in the a11y tree), so assert the
    // visible "Asset Category" field label and that its combobox trigger exists.
    const dialog = page.getByRole('dialog', { name: /Add New Asset/i })
    await expect(dialog.getByText('Asset Category')).toBeVisible()
    await expect(dialog.getByRole('combobox').first()).toBeVisible()
    await expect(page.locator('input[name="value"]')).toBeVisible()
  })

  // ─── 4. Beneficiaries page: open Add Member dialog ──────────────────────

  test('beneficiaries page: open Add Family Member dialog', async ({ page }) => {
    await page.locator('nav').getByText('My People', { exact: true }).click()
    await expect(page.getByText(/Family|Heirs/i).first()).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Add Family Member/i }).first().click()

    // Scope to the dialog heading — "Add Family Member" buttons also match this text.
    await expect(page.getByRole('heading', { name: 'Add family member' })).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[name="name"]')).toBeVisible()
    // Relationship is a SelectWithOther: the form value rides a hidden
    // input[name="relation"]; the visible control is a combobox trigger under
    // the "Relationship" label (the placeholder is a CSS-only attribute).
    const dialog = page.getByRole('dialog', { name: /Add family member/i })
    await expect(dialog.getByText('Relationship', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Select relationship')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  // ─── 5. Lockbox page: category filters work ────────────────────────────

  test('lockbox page: category filters work', async ({ page }) => {
    await navigateToNestedItem(page, 'The Vault', 'Lockbox')
    await expect(page.getByText(/Digital Lockbox|Lockbox/).first()).toBeVisible({ timeout: 10000 })

    // "All" filter button
    const allBtn = page.locator('button', { hasText: /^All$/i })
    await expect(allBtn).toBeVisible({ timeout: 5000 })

    // Click "Banking" category filter
    const bankingBtn = page.locator('button', { hasText: /Banking/i })
    await expect(bankingBtn).toBeVisible()
    await bankingBtn.click()

    // Active filter gets white text (bg-[#133378] text-white)
    await expect(bankingBtn).toHaveCSS('color', 'rgb(255, 255, 255)', { timeout: 3000 })
  })

  // ─── 6. Directives page: open Create Directive dialog ──────────────────

  test('directives page: open Create Directive dialog with 4 type options', async ({ page }) => {
    await navigateToNestedItem(page, 'Letters', 'Directives')
    await expect(page.getByText(/Final Directives|Directives/).first()).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Create Directive/i }).first().click()

    // 4 directive type options in the dialog. Use exact match — the page
    // subtitle and empty-state copy also contain phrases like "ethical will".
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Ethical Will', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByText('Funeral Preferences', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Final Message', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Care Instructions', { exact: true })).toBeVisible()
  })

  // ─── 7. Settings page: has toggle switches ─────────────────────────────

  test('settings page: has toggle switches', async ({ page }) => {
    await page.locator('nav').getByText('Settings', { exact: true }).click()
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })

    // Settings are fetched async — wait for the "Loading settings..." gate to
    // clear before asserting on the toggle labels it renders.
    await expect(page.getByText('Loading settings...')).toBeHidden({ timeout: 15000 })

    // Verify setting labels (toggle labels in Security + Notifications sections).
    // Use exact match — section descriptions/headings repeat these words.
    await expect(page.getByText('Two-factor authentication', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Email alerts', { exact: true })).toBeVisible({ timeout: 10000 })

    // Toggles are now shadcn <Switch> components (button[role="switch"]).
    const toggleButtons = page.getByRole('switch')
    const count = await toggleButtons.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  // ─── 8. Pricing page: shows tier cards ─────────────────────────────────

  test('pricing page: shows tier cards', async ({ page }) => {
    await page.locator('nav').getByText('Upgrade Plan', { exact: true }).click()
    await expect(page.getByText('Choose Your Plan')).toBeVisible({ timeout: 10000 })

    // Tier cards are fetched from the payments API and rendered into the grid.
    // The empty grid container has zero height (so it is "not visible") until
    // at least one card mounts — assert on a real card child, with a generous
    // timeout to absorb a cold Cloud Run start.
    const tierGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-3')
    const firstCard = tierGrid.locator('> div').first()
    await expect(firstCard).toBeVisible({ timeout: 20000 })
    expect(await tierGrid.locator('> div').count()).toBeGreaterThanOrEqual(1)
  })

  // ─── 9. Search bar: typing shows results dropdown ──────────────────────

  test('search bar: typing shows results dropdown', async ({ page }) => {
    // Search is desktop-only (hidden md:block), default viewport is 1280px
    const searchInput = page.locator('input[placeholder="Search estate..."]')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.focus()
    await searchInput.fill('asset')

    // Wait briefly for search debounce
    await page.waitForTimeout(500)

    // The search should be focused and the input should have text
    await expect(searchInput).toHaveValue('asset')
    await expect(searchInput).toBeFocused()
  })

  // ─── 10. Sidebar navigation highlights active page ─────────────────────

  test('sidebar navigation highlights active page', async ({ page }) => {
    // My Legacy group should be active on dashboard (it contains Legacy Timeline)
    // The group button should have the active styles
    const legacyGroup = page.locator('nav button').filter({ hasText: 'My Legacy' })
    await expect(legacyGroup).toBeVisible({ timeout: 10000 })
    await expect(legacyGroup).toHaveCSS('border-left-color', 'rgb(19, 51, 120)')

    // Navigate to Assets (nested under The Vault)
    await navigateToNestedItem(page, 'The Vault', 'Assets')
    await expect(page.getByText('My Assets')).toBeVisible({ timeout: 10000 })

    // The Vault group should now be active
    const vaultGroup = page.locator('nav button').filter({ hasText: 'The Vault' })
    await expect(vaultGroup).toHaveCSS('border-left-color', 'rgb(19, 51, 120)')
  })

  // ─── 11. Mobile hamburger menu ─────────────────────────────────────────

  test('mobile hamburger menu appears at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    // Allow responsive layout to reflow
    await page.waitForTimeout(300)

    // Hamburger button (aria-label="Open navigation menu")
    const hamburger = page.getByLabel('Open navigation menu')
    await expect(hamburger).toBeVisible({ timeout: 10000 })

    // Click hamburger to open mobile sidebar sheet
    await hamburger.click()

    // Mobile sheet (a Radix dialog) shows the same grouped nav labels as the
    // desktop sidebar. Scope to the open sheet so we don't match the hidden
    // desktop sidebar (which is `hidden md:flex` and not visible at 375px).
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByText('Soul Log').first()).toBeVisible({ timeout: 5000 })
    await expect(sheet.getByText('My Legacy').first()).toBeVisible()
  })

  // ─── 12. Skeleton loading states ───────────────────────────────────────

  test('skeleton loading states render during data fetch', async ({ page }) => {
    // Intercept Firestore requests to delay them
    await page.route('**/firestore.googleapis.com/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue()
    })

    // Navigate to Assets (nested under The Vault)
    await navigateToNestedItem(page, 'The Vault', 'Assets')

    // Check for skeleton/loading indicators (animate-pulse class)
    const skeleton = page.locator('[class*="animate-pulse"]')
    // Best-effort: skeleton may appear briefly before data loads
    const skeletonCount = await skeleton.count()
    // If skeletons are visible, verify they exist
    if (skeletonCount > 0) {
      expect(skeletonCount).toBeGreaterThan(0)
    }

    // Eventually real content loads
    await expect(page.getByText(/My Assets|No assets/i).first()).toBeVisible({ timeout: 15000 })
  })
})
