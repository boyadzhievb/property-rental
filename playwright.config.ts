import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8443',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    // CI runs against the production build (`E2E_SERVER=preview`, after `npm run build`): pages
    // load faster than from the dev server and it is what ships.
    command: process.env.E2E_SERVER === 'preview' ? 'npm run preview -- --strictPort' : 'npm run dev',
    url: 'http://localhost:8443',
    reuseExistingServer: !process.env.CI,
  },
});
