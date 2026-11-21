import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['iPhone 15'],
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:4180',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && python3 -m http.server 4180 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: !process.env.CI,
  },
});
