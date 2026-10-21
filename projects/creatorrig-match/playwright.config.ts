import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  workers: 2,
  testDir: './apps/web/e2e',
  webServer: {
    command:
      'pnpm --filter @creatorrig/web dev --host 127.0.0.1 --port 45387',
    port: 45387,
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:45387' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
});
