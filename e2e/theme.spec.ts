import { test, expect } from '@playwright/test';

const storageKey = 'find-again-theme';

async function contrastRatio(locator: import('@playwright/test').Locator) {
  return locator.evaluate((node) => {
    const parse = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) || [];
      return { r: channels[0] || 0, g: channels[1] || 0, b: channels[2] || 0, a: channels[3] ?? 1 };
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const linear = [r, g, b].map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const foreground = parse(getComputedStyle(node).color);
    let backgroundNode: Element | null = node;
    let background = parse('rgb(255, 255, 255)');
    while (backgroundNode) {
      const candidate = parse(getComputedStyle(backgroundNode).backgroundColor);
      if (candidate.a > 0) {
        background = candidate;
        break;
      }
      backgroundNode = backgroundNode.parentElement;
    }
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    return (lighter + 0.05) / (darker + 0.05);
  });
}

async function expectReadable(locator: import('@playwright/test').Locator, minimum = 4.5) {
  await expect(locator).toBeVisible();
  expect(await contrastRatio(locator)).toBeGreaterThanOrEqual(minimum);
}

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
  await expect(page.locator('#public-interactive-demo')).toBeVisible();
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

test('Dark bookmark content, enrichment states, and account surfaces meet AA contrast', async ({ page }, testInfo) => {
  await page.addInitScript(key => localStorage.setItem(key, 'dark'), storageKey);
  await page.route('**/api/ai/enrichment-status', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      isProcessing: true,
      activeCount: 1,
      pendingCount: 2,
      completedCount: 9,
      failedCount: 0,
      provider: 'test',
      model: 'test',
      version: 'test',
      recentJobs: [],
    }),
  }));
  await page.route('**/api/bookmarks', route => route.fulfill({ contentType: 'application/json', body: '[]' }));

  await page.goto('/bookmarks');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('recallly_demo_bookmarks_v1'))).not.toBeNull();
  await page.evaluate(() => {
    const key = 'recallly_demo_bookmarks_v1';
    const bookmarks = JSON.parse(localStorage.getItem(key) || '[]');
    bookmarks[0] = { ...bookmarks[0], enrichment_status: 'pending' };
    localStorage.setItem(key, JSON.stringify(bookmarks));
  });
  await page.reload();

  const firstCard = page.getByTestId('bookmark-card').first();
  const content = firstCard.getByTestId('bookmark-content');
  const queued = firstCard.getByTestId('bookmark-enrichment-status');
  const globalStatus = page.getByTestId('global-enrichment-status');
  await expectReadable(content);
  await expectReadable(queued.locator('span').first());
  await expectReadable(globalStatus.locator('span').nth(0));
  await expectReadable(globalStatus.locator('span').nth(1));
  await expectReadable(globalStatus.locator('span').nth(2));
  await expect(content).toHaveCSS('white-space', 'pre-line');

  await firstCard.screenshot({ path: testInfo.outputPath('bookmark-card-dark.png') });
  await queued.screenshot({ path: testInfo.outputPath('queued-enrichment-dark.png') });
  await globalStatus.screenshot({ path: testInfo.outputPath('global-enrichment-dark.png') });

  const sidebarAccount = page.getByTestId('sidebar-account-card');
  if (await sidebarAccount.isVisible()) {
    await expectReadable(page.getByTestId('sidebar-account-name'));
    await sidebarAccount.screenshot({ path: testInfo.outputPath('sidebar-account-dark.png') });
  } else {
    const mobileAccount = page.getByTestId('mobile-account-control');
    await expect(mobileAccount).toBeVisible();
    await mobileAccount.screenshot({ path: testInfo.outputPath('mobile-account-dark.png') });
  }

  await page.getByTitle('Compact view').click();
  await expectReadable(page.getByTestId('bookmark-card').first().getByTestId('bookmark-content'));
  await page.getByTestId('bookmark-card').first().screenshot({ path: testInfo.outputPath('bookmark-compact-dark.png') });

  await page.goto('/bookmarks/bm_101');
  const readerContent = page.getByTestId('reader-bookmark-content');
  await expectReadable(readerContent);
  await expect(readerContent).toHaveCSS('white-space', 'pre-line');
  await readerContent.screenshot({ path: testInfo.outputPath('reader-content-dark.png') });
});
