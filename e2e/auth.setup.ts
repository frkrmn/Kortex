import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { E2E_AUTH_STATE } from '../playwright.config';
import { BrowserHealth } from './health';
import { summarizeAccountReadiness, type ReadinessBookmark } from './readiness';

function required(name: 'E2E_USER_EMAIL' | 'E2E_USER_PASSWORD') {
  const value = process.env[name];
  if (!value || (name === 'E2E_USER_EMAIL' && !value.trim())) {
    throw new Error(`${name} is required for authenticated browser smoke. Use a dedicated controlled account.`);
  }
  return name === 'E2E_USER_EMAIL' ? value.trim() : value;
}

setup('authenticate controlled account and save ephemeral state', async ({ page, baseURL }, testInfo) => {
  if (!baseURL) throw new Error('E2E_BASE_URL is required.');
  const health = new BrowserHealth(page, baseURL);
  const email = required('E2E_USER_EMAIL');
  const password = required('E2E_USER_PASSWORD');

  await page.goto('/login?next=%2Fdashboard');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/, { timeout: 20_000 });
  await expect(page.locator('#app-sidebar')).toBeVisible();
  await expect(page.locator('#dashboard-view')).toBeVisible({ timeout: 20_000 });

  const bookmarksResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/bookmarks' && response.request().method() === 'GET');
  await page.goto('/bookmarks');
  const response = await bookmarksResponse;
  if (response.status() !== 200) {
    throw new Error(`Controlled E2E account library request failed: GET /api/bookmarks returned ${response.status()}.`);
  }
  const bookmarks = await response.json() as ReadinessBookmark[];
  if (!Array.isArray(bookmarks)) throw new Error('Controlled E2E account library returned an unexpected response shape.');
  const readiness = summarizeAccountReadiness(bookmarks);
  if (Object.values(readiness).some(count => count === 0)) {
    throw new Error(`Controlled E2E account data prerequisite failed: ${JSON.stringify(readiness)}. Supply an account with an owned bookmark and completed enrichment; the smoke suite will not import or enrich data.`);
  }
  console.log(`Controlled E2E account readiness: ${JSON.stringify(readiness)}`);
  await expect(page.locator('#bookmark-library-view')).toBeVisible();
  await expect(page.getByTestId('bookmark-card').first()).toBeVisible();

  await mkdir(path.dirname(E2E_AUTH_STATE), { recursive: true });
  await page.context().storageState({ path: E2E_AUTH_STATE });
  await health.assertClean(testInfo);
});
