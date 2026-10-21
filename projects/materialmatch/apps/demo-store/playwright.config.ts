import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  workers: 2,
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:45183',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'vite --host 127.0.0.1 --port 45183',
    url: 'http://127.0.0.1:45183',
    reuseExistingServer: false,
  },
});
