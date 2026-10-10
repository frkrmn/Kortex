import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export const E2E_AUTH_STATE = path.join(process.cwd(), '.e2e', 'auth', 'user.json');

const isProduction = process.env.E2E_MODE === 'production';
const baseURL = process.env.E2E_BASE_URL || (isProduction
  ? 'https://kortexmarks.vercel.app'
  : 'http://127.0.0.1:3000');
const startsLocalServer = !isProduction && /^http:\/\/(127\.0\.0\.1|localhost):3000\/?$/.test(baseURL);

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/grm136',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: isProduction ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  webServer: startsLocalServer ? {
    command: `VITE_DEMO_MODE=${process.env.VITE_DEMO_MODE || 'false'} npm run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  } : undefined,
  projects: [
    ...(!isProduction ? [{
      name: 'theme',
      testMatch: /(^|\/)theme\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    }, {
      name: 'theme-mobile',
      testMatch: /(^|\/)theme\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    }] : []),
    {
      name: 'setup',
      testMatch: /(^|\/)auth\.setup\.ts$/,
      use: { screenshot: 'off', trace: 'off', video: 'off' },
    },
    {
      name: 'unauthenticated',
      testMatch: /(^|\/)unauthenticated\.spec\.ts$/,
    },
    {
      name: 'authenticated',
      testMatch: /(^|\/)authenticated\.spec\.ts$/,
      dependencies: ['setup'],
      use: { storageState: E2E_AUTH_STATE },
    },
    {
      name: 'logout',
      testMatch: /(^|\/)logout\.spec\.ts$/,
      dependencies: ['authenticated'],
      use: { storageState: E2E_AUTH_STATE, screenshot: 'off', trace: 'off', video: 'off' },
    },
  ],
});
