import { test, expect } from '@playwright/test';

const storageKey = 'find-again-theme';

test('defaults to Light without an initial theme mismatch', async ({ page }, testInfo) => {
  await page.addInitScript(key => localStorage.removeItem(key), storageKey);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'light');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await page.screenshot({ path: testInfo.outputPath('landing-light.png'), fullPage: true });
});

test('Dark persists across reloads and public routes', async ({ page }, testInfo) => {
  await page.addInitScript(key => localStorage.setItem(key, 'dark'), storageKey);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/demo');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('demo-dark.png'), fullPage: true });
});

test('System reacts to OS changes without replacing the stored preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(key => localStorage.setItem(key, 'system'), storageKey);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'system');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('system');
});

test('an explicit Light preference ignores an OS dark-mode change', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(key => localStorage.setItem(key, 'light'), storageKey);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('Appearance controls switch immediately and persist after navigation', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), storageKey);
  await page.goto('/settings?tab=appearance');
  const dark = page.getByRole('radio', { name: /Dark/ });
  const light = page.getByRole('radio', { name: /Light/ });
  const system = page.getByRole('radio', { name: /System/ });
  await expect(light).toBeChecked();
  await page.getByText('Dark', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/bookmarks');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/settings?tab=appearance');
  await expect(dark).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('settings-dark.png'), fullPage: true });
  await page.getByText('System', { exact: true }).click();
  await expect(system).toBeChecked();
  await page.getByText('Light', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
