import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  workers: 2,
  testDir: './e2e',
  testMatch: '*.spec.ts',
  use: { baseURL: 'http://127.0.0.1:45184', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'vite --host 127.0.0.1 --port 45184',
    url: 'http://127.0.0.1:45184/e2e/fixture.html',
    reuseExistingServer: false,
  },
});
