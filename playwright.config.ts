import { defineConfig, devices } from '@playwright/test';

const basePath = process.env.VITE_BASE_PATH ?? '/';
const baseUrl = new URL(basePath, 'http://127.0.0.1:4173').toString();
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;

if (browserChannel && !['chrome', 'msedge'].includes(browserChannel)) {
  throw new Error('PLAYWRIGHT_BROWSER_CHANNEL must be chrome or msedge when set.');
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    // The demo-data actions (change 0026) are compiled in for this build only.
    env: { VITE_DEMO_DATA: 'true' },
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      // The functional suite. Screenshot capture is excluded so the
      // pull-request gate stays fast and deterministic.
      name: 'chromium',
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(browserChannel ? { channel: browserChannel } : {}) },
    },
    {
      // Documentation screenshots: `npm run screenshots:capture`.
      // A separate project rather than an environment variable, because
      // setting one inside an npm script is not portable across shells.
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], ...(browserChannel ? { channel: browserChannel } : {}) },
    },
  ],
});
