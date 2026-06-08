import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // SERIAL by default. These specs run against LIVE prod, whose Go API rate-limits
  // 100 req/60s with a 10-min ban — parallel workers trip it instantly. Always 1
  // worker, no intra-file parallelism. For the full suite use scripts/e2e-run.sh
  // (paces specs with cooldowns); a single all-specs invocation can still trip the
  // ban from sheer volume.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'line',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://finalwishes-prod.web.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
