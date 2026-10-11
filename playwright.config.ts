import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the production build served by `vite preview`,
// which proxies /api to API_PROXY_TARGET (default http://localhost:8080). The
// sign-in tests need a real backend with an account: see docs/architecture.md.
//
// PW_CHANNEL=msedge (or chrome) uses a browser already on the machine instead
// of the one `npx playwright install` downloads.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // The default language, so the tests read the Indonesian texts.
    locale: 'id-ID',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
