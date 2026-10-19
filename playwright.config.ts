import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'off',
    launchOptions: { args: ['--disable-gpu'] },
    video: 'off',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node scripts/serve-test.mjs',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
