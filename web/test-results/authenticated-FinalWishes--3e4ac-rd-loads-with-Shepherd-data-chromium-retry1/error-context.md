# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated.spec.ts >> FinalWishes Authenticated Flows — Demo Mode >> dashboard loads with Shepherd data
- Location: e2e/authenticated.spec.ts:33:7

# Error details

```
Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://finalwishes-prod.web.app/login?demo=true
Call log:
  - navigating to "https://finalwishes-prod.web.app/login?demo=true", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test'
  2   | 
  3   | /**
  4   |  * Authenticated E2E Tests — Demo Mode
  5   |  *
  6   |  * These tests log in via the demo account (Tameeka116 / ML6824!)
  7   |  * and exercise the authenticated estate dashboard pages.
  8   |  *
  9   |  * Requires the auth provider demo mode support (loginDemo in auth.tsx).
  10  |  * Run against local dev server or production with `E2E_BASE_URL`.
  11  |  */
  12  | 
  13  | async function demoLogin(page: Page) {
> 14  |   await page.goto('/login?demo=true')
      |              ^ Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://finalwishes-prod.web.app/login?demo=true
  15  |   await expect(page.locator('#login-identifier')).toBeVisible({ timeout: 15000 })
  16  |   await page.locator('#login-identifier').fill('Tameeka116')
  17  |   await page.locator('#login-password').fill('ML6824!')
  18  |   await page.locator('#login-submit').click()
  19  |   // Wait for navigation to estate dashboard
  20  |   await page.waitForURL(/estates/, { timeout: 15000 })
  21  | }
  22  | 
  23  | test.describe('FinalWishes Authenticated Flows — Demo Mode', () => {
  24  |   // Increase test timeout for authenticated flows (network + Firebase init)
  25  |   test.setTimeout(60000)
  26  | 
  27  |   test.beforeEach(async ({ page }) => {
  28  |     await demoLogin(page)
  29  |   })
  30  | 
  31  |   // ─── 1. Dashboard loads with Shepherd data ──────────────────────────────
  32  | 
  33  |   test('dashboard loads with Shepherd data', async ({ page }) => {
  34  |     // "Estate Completion" label
  35  |     await expect(page.getByText('Estate Completion')).toBeVisible({ timeout: 10000 })
  36  | 
  37  |     // Stat card labels
  38  |     await expect(page.getByText('Total Assets')).toBeVisible({ timeout: 10000 })
  39  |     await expect(page.getByText('Stored Documents')).toBeVisible()
  40  |     await expect(page.getByText('Beneficiaries').first()).toBeVisible()
  41  | 
  42  |     // Checklist heading
  43  |     await expect(page.getByText('Estate Checklist')).toBeVisible()
  44  |   })
  45  | 
  46  |   // ─── 2. Navigate to all major pages ─────────────────────────────────────
  47  | 
  48  |   test('navigate to all major pages from sidebar', async ({ page }) => {
  49  |     const pages = [
  50  |       { nav: 'Assets', heading: /My Assets/i },
  51  |       { nav: 'Documents', heading: /Vault|Documents/i },
  52  |       { nav: 'Beneficiaries', heading: /Family|Heirs|Beneficiaries/i },
  53  |       { nav: 'Digital Lockbox', heading: /Digital Lockbox/i },
  54  |       { nav: 'Final Directives', heading: /Final Directives/i },
  55  |       { nav: 'Time Capsules', heading: /Time Capsule/i },
  56  |       { nav: 'Heirlooms', heading: /Heirloom/i },
  57  |       { nav: 'Memories', heading: /Memori/i },
  58  |       { nav: 'Upgrade Plan', heading: /Choose Your Plan|Pricing/i },
  59  |       { nav: 'Settings', heading: /Settings/i },
  60  |       { nav: 'Notifications', heading: /Notification/i },
  61  |       { nav: 'Final Record', heading: /Final Record|Obituary/i },
  62  |     ]
  63  | 
  64  |     for (const p of pages) {
  65  |       const navLink = page.locator('nav').getByText(p.nav, { exact: true })
  66  |       await navLink.click()
  67  |       await expect(page.getByText(p.heading).first()).toBeVisible({ timeout: 10000 })
  68  |     }
  69  |   })
  70  | 
  71  |   // ─── 3. Assets page: open Add Asset dialog ─────────────────────────────
  72  | 
  73  |   test('assets page: open Add Asset dialog', async ({ page }) => {
  74  |     await page.locator('nav').getByText('Assets', { exact: true }).click()
  75  |     await expect(page.getByText('My Assets')).toBeVisible({ timeout: 10000 })
  76  | 
  77  |     await page.getByRole('button', { name: /Add Asset/i }).click()
  78  | 
  79  |     // Modal with form fields
  80  |     await expect(page.getByText('Add New Asset')).toBeVisible({ timeout: 5000 })
  81  |     await expect(page.locator('input[name="name"]')).toBeVisible()
  82  |     await expect(page.locator('select[name="type"]')).toBeVisible()
  83  |     await expect(page.locator('input[name="value"]')).toBeVisible()
  84  |   })
  85  | 
  86  |   // ─── 4. Beneficiaries page: open Add Member dialog ──────────────────────
  87  | 
  88  |   test('beneficiaries page: open Add Family Member dialog', async ({ page }) => {
  89  |     await page.locator('nav').getByText('Beneficiaries', { exact: true }).click()
  90  |     await expect(page.getByText(/Family|Heirs/i).first()).toBeVisible({ timeout: 10000 })
  91  | 
  92  |     await page.getByRole('button', { name: /Add Family Member/i }).click()
  93  | 
  94  |     await expect(page.getByText('Add family member')).toBeVisible({ timeout: 5000 })
  95  |     await expect(page.locator('input[name="name"]')).toBeVisible()
  96  |     await expect(page.locator('input[name="relation"]')).toBeVisible()
  97  |     await expect(page.locator('input[name="email"]')).toBeVisible()
  98  |   })
  99  | 
  100 |   // ─── 5. Lockbox page: category filters work ────────────────────────────
  101 | 
  102 |   test('lockbox page: category filters work', async ({ page }) => {
  103 |     await page.locator('nav').getByText('Digital Lockbox', { exact: true }).click()
  104 |     await expect(page.getByText('Digital Lockbox').first()).toBeVisible({ timeout: 10000 })
  105 | 
  106 |     // "All" filter button
  107 |     const allBtn = page.locator('button', { hasText: /^All$/i })
  108 |     await expect(allBtn).toBeVisible({ timeout: 5000 })
  109 | 
  110 |     // Click "Banking" category filter
  111 |     const bankingBtn = page.locator('button', { hasText: /Banking/i })
  112 |     await expect(bankingBtn).toBeVisible()
  113 |     await bankingBtn.click()
  114 | 
```