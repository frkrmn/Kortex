import { test as base, expect } from '@playwright/test';
import { BrowserHealth } from './health';

export const test = base.extend<{ browserHealth: BrowserHealth }>({
  browserHealth: async ({ page, baseURL }, use, testInfo) => {
    if (!baseURL) throw new Error('Playwright baseURL is required. Set E2E_BASE_URL.');
    const health = new BrowserHealth(page, baseURL);
    await use(health);
    await health.assertClean(testInfo);
  },
});

export { expect };
