import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  workers: 1,
  reporter: 'list',

  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:5175',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'pnpm exec vite preview --host localhost --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});