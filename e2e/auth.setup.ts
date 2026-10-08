import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { E2E_AUTH_STATE } from '../playwright.config';
import { BrowserHealth } from './health';

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

  await mkdir(path.dirname(E2E_AUTH_STATE), { recursive: true });
  await page.context().storageState({ path: E2E_AUTH_STATE });
  await health.assertClean(testInfo);
});
