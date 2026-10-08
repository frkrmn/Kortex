import { test, expect } from './fixtures';

test('logout clears the isolated browser session and protects private routes', async ({ page, browserHealth: _health }) => {
  await page.goto('/settings?tab=account');
  await expect(page.locator('#settings-panel-account')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login(?:[?#]|$)/, { timeout: 20_000 });
  await page.goto('/bookmarks');
  await expect(page).toHaveURL(/\/login\?next=%2Fbookmarks$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
