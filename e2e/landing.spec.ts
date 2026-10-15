import { expect, test, type Locator, type Page } from '@playwright/test';

async function contrastRatio(locator: Locator) {
  return locator.evaluate(node => {
    const parse = (value: string) => {
      const values = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return { r: values[0] ?? 0, g: values[1] ?? 0, b: values[2] ?? 0, a: values[3] ?? 1 };
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const channels = [r, g, b].map(channel => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foreground = parse(getComputedStyle(node).color);
    let backgroundNode: Element | null = node;
    let background = parse('rgb(255, 255, 255)');
    while (backgroundNode) {
      const candidate = parse(getComputedStyle(backgroundNode).backgroundColor);
      if (candidate.a >= 0.95) {
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

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
}

test('landing presents truthful product content and working public CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Save, understand and find anything/i })).toBeVisible();
  await expect(page.getByText('Sample data').first()).toBeVisible();
  await expect(page.getByText('See checkout')).toBeVisible();
  await expect(page.getByText('Live Index')).toHaveCount(0);
  await expect(page.getByText(/Semantic Search/i)).toHaveCount(0);
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByRole('button', { name: 'Watch Demo' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.locator('#public-interactive-demo')).toBeVisible();
});

test('landing remains composed without horizontal overflow at required viewports', async ({ page }, testInfo) => {
  const viewports = [
    { width: 1440, height: 1000 },
    { width: 1280, height: 900 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 1440 || viewport.width === 390) {
      await page.screenshot({ path: testInfo.outputPath(`landing-${viewport.width}-light.png`), fullPage: true });
    }
  }
});

test('mobile navigation and FAQ expose accessible interaction state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.mi-menu-button');
  await expect(menu).toHaveAccessibleName('Open navigation menu');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAccessibleName('Close navigation menu');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();

  const faq = page.getByRole('button', { name: 'How does Find Again work?' });
  await faq.scrollIntoViewIfNeeded();
  await expect(faq).toHaveAttribute('aria-expanded', 'true');
  await faq.click();
  await expect(faq).toHaveAttribute('aria-expanded', 'false');
});

test('light and dark landing text meets WCAG AA contrast', async ({ page }, testInfo) => {
  await page.goto('/');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => localStorage.setItem('find-again-theme', value), theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const samples = [
      page.locator('.mi-hero-lede'),
      page.locator('.mi-feature-card p').first(),
      page.locator('.mi-price-card li').first(),
      page.locator('.mi-faq-answer p').first(),
      page.locator('.mi-footer-grid > div > p'),
    ];
    for (const sample of samples) {
      await expect(sample).toBeVisible();
      expect(await contrastRatio(sample), `${theme} contrast for ${await sample.evaluate(node => node.className)}`).toBeGreaterThanOrEqual(4.5);
    }
    if (theme === 'dark') await page.screenshot({ path: testInfo.outputPath('landing-1440-dark.png'), fullPage: true });
  }
});

test('landing respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page.locator('.mi-reveal').first().evaluate(node => getComputedStyle(node).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.01);
});
