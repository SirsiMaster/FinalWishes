/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Root vitest config — mirrors web/vitest.config.ts settings
// so tests can be run from either the repo root or web/ directory.
// Excludes functions/ (Jest tests, not vitest).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./web/src', import.meta.url).pathname,
      '@shared': new URL('./shared', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./web/src/test/setup.ts'],
    include: ['web/src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'functions/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['web/src/lib/**', 'web/src/components/**'],
      exclude: ['web/src/test/**', 'web/src/gen/**', 'web/src/routeTree.gen.ts'],
    },
  },
})
