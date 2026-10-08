import { test, expect } from './fixtures';

test('private routes recover to login without loading private data', async ({ page, browserHealth: _health }) => {
  await page.goto('/bookmarks?from=grm136');
  await expect(page).toHaveURL(/\/login\?next=%2Fbookmarks%3Ffrom%3Dgrm136$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('#bookmark-library-view')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
});
