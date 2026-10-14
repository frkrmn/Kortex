import { expect, test } from '@playwright/test';

async function loadedModulePaths(page: import('@playwright/test').Page) {
  return page.evaluate(() => performance.getEntriesByType('resource')
    .filter((entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming && entry.initiatorType === 'script')
    .map(entry => new URL(entry.name).pathname));
}

test('public routes defer authenticated application modules', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Your saved ideas/i })).toBeVisible();
  const landingModules = await loadedModulePaths(page);
  expect(landingModules.some(path => path.includes('LandingPage'))).toBe(true);
  expect(landingModules.some(path => path.includes('AuthenticatedRoutes') || path.includes('BookmarkLibraryView'))).toBe(false);

  await page.goto('/blog');
  await expect(page.getByRole('heading', { name: /Make saved ideas easier to return to/i })).toBeVisible();
  const blogModules = await loadedModulePaths(page);
  expect(blogModules.some(path => path.includes('BlogViews'))).toBe(true);
  expect(blogModules.some(path => path.includes('AuthenticatedRoutes') || path.includes('BookmarkLibraryView'))).toBe(false);
});

test('the Library loads its route module after authentication boundary', async ({ page }) => {
  await page.goto('/bookmarks');
  await expect(page.locator('#bookmark-library-view')).toBeVisible();
  const modules = await loadedModulePaths(page);
  expect(modules.some(path => path.includes('AuthenticatedRoutes'))).toBe(true);
  expect(modules.some(path => path.includes('BookmarkLibraryView'))).toBe(true);
});
