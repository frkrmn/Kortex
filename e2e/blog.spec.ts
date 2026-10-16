import { expect, test, type Locator, type Page } from '@playwright/test';

const viewports = [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }, { width: 1024, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }];

async function contrastRatio(locator: Locator) {
  return locator.evaluate(node => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const luminance = (values: number[]) => [values[0], values[1], values[2]].map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const foreground = luminance(rgb(getComputedStyle(node).color));
    let parent: Element | null = node;
    let background = [255, 255, 255];
    while (parent) {
      const candidate = rgb(getComputedStyle(parent).backgroundColor);
      if ((candidate[3] ?? 1) >= .95) { background = candidate; break; }
      parent = parent.parentElement;
    }
    const bg = luminance(background);
    return (Math.max(foreground, bg) + .05) / (Math.min(foreground, bg) + .05);
  });
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.goto('/');
  await page.evaluate((value) => localStorage.setItem('find-again-theme', value), theme);
}

test('listing uses real published articles and accessible editorial images', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ideas worth saving');
  await expect(page.locator('.blog-card')).toHaveCount(6);
  for (const image of await page.locator('.blog-card img').all()) {
    await expect(image).toHaveAttribute('alt', /\S+/);
    await expect(image).toHaveJSProperty('complete', true);
  }
});

test('article keeps SEO content, cover, related articles, and CTA', async ({ page }) => {
  await page.goto('/blog/how-to-organize-x-bookmarks');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('organize your X bookmarks');
  await expect(page.locator('.article-cover img')).toHaveAttribute('alt', /organized blue library/);
  await expect(page.getByRole('heading', { name: 'Related articles' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Start using Find Again/ })).toHaveAttribute('href', '/signup');
});

test('blog and article text meet AA contrast and retain keyboard focus', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme);
    await page.goto('/blog');
    for (const sample of [page.locator('.blog-hero>.blog-container>p:last-child'), page.locator('.blog-card-copy>p').first(), page.locator('.blog-meta').first()]) {
      await expect(sample).toBeVisible();
      expect(await contrastRatio(sample)).toBeGreaterThanOrEqual(4.5);
    }
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog/how-to-organize-x-bookmarks');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await contrastRatio(page.locator('.article-body>p').first())).toBeGreaterThanOrEqual(4.5);
  }
});

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of viewports) {
    test(`${theme} blog has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      await page.goto('/blog');
      await expect(page.locator('.blog-mi')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
}

test('captures representative blog and article visual states', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      await page.goto('/blog');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Ideas worth saving');
      await page.locator('.blog-card img').first().evaluate((image: HTMLImageElement) => image.decode());
      await page.screenshot({ path: `artifacts/blog-${theme}-${viewport.width}.png`, fullPage: true });
      await page.goto('/blog/how-to-organize-x-bookmarks');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('organize your X bookmarks');
      await page.locator('.article-cover img').evaluate((image: HTMLImageElement) => image.decode());
      await page.screenshot({ path: `artifacts/article-${theme}-${viewport.width}.png`, fullPage: true });
    }
  }
});
