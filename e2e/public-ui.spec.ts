import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectNoOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
}

async function contrastRatio(locator: Locator) {
  return locator.evaluate(node => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const lum = (values: number[]) => values.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const foreground = lum(rgb(getComputedStyle(node).color));
    let parent: Element | null = node;
    let background = [255, 255, 255];
    while (parent) {
      const value = rgb(getComputedStyle(parent).backgroundColor);
      if ((value[3] ?? 1) > .95) { background = value; break; }
      parent = parent.parentElement;
    }
    const bg = lum(background);
    return (Math.max(foreground, bg) + .05) / (Math.min(foreground, bg) + .05);
  });
}

test('pricing anchor works on click, direct load, reload, and another public route', async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    if (viewport.width < 700) await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('link', { name: 'Pricing', exact: true }).first().click();
    await expect(page).toHaveURL(/\/#pricing$/);
    const heading = page.getByRole('heading', { name: 'Start for free. Upgrade when you need more.' });
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())!.y).toBeLessThan(220);
    await page.screenshot({ path: testInfo.outputPath(`pricing-${viewport.width}.png`), fullPage: false });

    await page.goto('/#pricing');
    await expect(heading).toBeInViewport();
    await page.reload();
    await expect(heading).toBeInViewport();

    await page.goto('/how-it-works');
    await page.getByRole('link', { name: 'Pricing', exact: true }).click();
    await expect(heading).toBeInViewport();
  }
});

test('shared brand mark is present and visible across public identity routes', async ({ page }, testInfo) => {
  for (const route of ['/', '/signup', '/login', '/terms', '/privacy', '/demo', '/blog', '/missing-route']) {
    await page.goto(route);
    const mark = page.locator('[data-brand-mark="arctic-blue"]').first();
    await expect(mark).toBeVisible();
    const color = await mark.evaluate(node => getComputedStyle(node).backgroundImage);
    expect(color).toContain('gradient');
    if (['/signup', '/terms', '/privacy', '/demo'].includes(route)) await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-brand.png`), fullPage: false });
  }
});

test('interactive demo exercises local library, insights, collections, reader, and export without protected calls', async ({ page }, testInfo) => {
  const forbidden: string[] = [];
  page.on('request', request => {
    if (/\/api\/|api\.x\.com|generativelanguage|stripe\.com/i.test(request.url())) forbidden.push(request.url());
  });
  await page.goto('/demo');
  await expect(page.getByText('Explore Find Again with sample bookmarks. No account or X connection required.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search demo bookmarks' }).fill('design tokens');
  await expect(page.locator('.demo-bookmark-card')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('demo-search.png'), fullPage: true });
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.getByRole('button', { name: 'AI Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample AI-generated insights.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('demo-ai.png'), fullPage: true });
  await page.getByRole('button', { name: 'Collections', exact: true }).click();
  await expect(page.locator('.demo-collection-grid article')).toHaveCount(5);
  await page.getByRole('button', { name: 'Open collection' }).first().click();
  await expect(page.getByRole('heading', { name: 'AI Research' })).toBeVisible();
  await page.getByRole('button', { name: /Open in Reader/ }).first().click();
  await expect(page.getByTestId('reader-bookmark-content')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('demo-reader.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back to demo library' }).click();
  await page.getByRole('button', { name: 'Export preview' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download sample JSON' }).click();
  expect((await download).suggestedFilename()).toBe('find-again-demo-export.json');
  expect(forbidden).toEqual([]);
});

test('demo is responsive, themed, readable, and social proof is not publicly fabricated', async ({ page }, testInfo) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('/demo');
    await page.evaluate(value => localStorage.setItem('find-again-theme', value), theme);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.reload();
      await expectNoOverflow(page);
      for (const sample of [page.locator('.demo-intro>div>p:last-child'), page.locator('.demo-bookmark-card>p').first(), page.locator('.demo-card-summary>span').first()]) expect(await contrastRatio(sample)).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ path: testInfo.outputPath(`demo-${viewport.width}-${theme}.png`), fullPage: true });
    }
  }
  await page.goto('/');
  await expect(page.getByText('BUILT FOR CURIOUS MINDS')).toHaveCount(0);
  if (process.env.E2E_MODE !== 'production') {
    await page.goto('/?preview-social-proof=1');
    await expect(page.getByText('Local layout preview — no testimonial content is published.')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('social-proof-local-preview.png'), fullPage: true });
  }
});
