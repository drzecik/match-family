import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './apps/web/e2e', fullyParallel: true, workers: 2,
  use: { baseURL: 'http://127.0.0.1:45321', trace: 'retain-on-failure' },
  webServer: [
    { command: 'corepack pnpm --filter @filtermatch/web dev --host 127.0.0.1 --port 45321', url: 'http://127.0.0.1:45321', reuseExistingServer: false },
    { command: 'corepack pnpm --filter @filtermatch/widget-demo build && corepack pnpm --filter @filtermatch/widget-demo exec vite preview --host 127.0.0.1 --port 45322', url: 'http://127.0.0.1:45322', reuseExistingServer: false }
  ], projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
