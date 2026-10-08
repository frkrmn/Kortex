import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function openLibrary(page: Page) {
  await page.goto('/bookmarks');
  await expect(page.locator('#bookmark-library-view')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Bookmarks could not be loaded')).toHaveCount(0);
  await expect(page.getByTestId('bookmark-card').first()).toBeVisible();
}

function labelWithoutCount(value: string) {
  return value.replace(/\s+\(\d+\)\s*$/, '').trim();
}

function positiveOption(values: string[], excluded: RegExp) {
  return values.find(value => !excluded.test(value) && /\(([1-9]\d*)\)\s*$/.test(value));
}

test('Home renders real library state without removed fake surfaces', async ({ page, browserHealth: _health }) => {
  await page.goto('/dashboard');
  await expect(page.locator('#dashboard-view')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Bookmarks', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Recently saved')).toBeVisible();
  await expect(page.getByText(/Worth Revisiting/i)).toHaveCount(0);
  await expect(page.getByText(/Digest/i)).toHaveCount(0);
  await expect(page.getByText(/↑\s*12%/)).toHaveCount(0);
});

test('Library renders at least one real bookmark', async ({ page, browserHealth: _health }) => {
  await openLibrary(page);
  expect(await page.getByTestId('bookmark-card').count()).toBeGreaterThan(0);
});

test('category filtering is data-driven and internally consistent', async ({ page, browserHealth: _health }) => {
  await openLibrary(page);
  const categories = page.getByLabel('Categories');
  const option = positiveOption(await categories.getByRole('button').allTextContents(), /^All\s*\(/i);
  expect(option, 'at least one category must contain bookmarks').toBeTruthy();
  const category = labelWithoutCount(option!);
  await categories.getByRole('button', { name: option!, exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe(category);
  const cards = page.getByTestId('bookmark-card');
  expect(await cards.count()).toBeGreaterThan(0);
  for (let index = 0; index < Math.min(await cards.count(), 12); index += 1) {
    await expect(cards.nth(index)).toHaveAttribute('data-bookmark-category', category);
  }
  await page.getByRole('button', { name: 'Clear all filters' }).click();
});

test('topic-only filtering uses a topic from the current library', async ({ page, browserHealth: _health }) => {
  await openLibrary(page);
  const topics = ((await page.getByTestId('bookmark-card').first().getAttribute('data-bookmark-topics')) || '').split('|').filter(Boolean);
  expect(topics.length, 'the controlled account needs at least one enriched bookmark topic').toBeGreaterThan(0);
  const topic = topics[0];
  await page.goto(`/bookmarks?topic=${encodeURIComponent(topic.toLowerCase())}`);
  await expect(page.locator('#bookmark-library-view')).toBeVisible();
  const cards = page.getByTestId('bookmark-card');
  expect(await cards.count()).toBeGreaterThan(0);
  for (let index = 0; index < Math.min(await cards.count(), 12); index += 1) {
    const card = cards.nth(index);
    const cardTopics = ((await card.getAttribute('data-bookmark-topics')) || '').split('|').map(value => value.toLowerCase());
    expect(cardTopics).toContain(topic.toLowerCase());
  }
  await page.getByRole('button', { name: 'Clear all filters' }).click();
});

test('category and scoped topic filters compose correctly', async ({ page, browserHealth: _health }) => {
  await openLibrary(page);
  const firstCard = page.getByTestId('bookmark-card').first();
  const category = await firstCard.getAttribute('data-bookmark-category');
  const topics = ((await firstCard.getAttribute('data-bookmark-topics')) || '').split('|').filter(Boolean);
  expect(category, 'the controlled account needs an enriched bookmark category').toBeTruthy();
  expect(topics.length, 'the controlled account needs an enriched bookmark topic').toBeGreaterThan(0);
  const categories = page.getByLabel('Categories');
  await categories.getByRole('button', { name: new RegExp(`^${category!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(`) }).click();
  await expect(page.getByLabel('Topics')).toBeVisible();
  const topicOptions = await page.getByLabel('Topics').getByRole('button').allTextContents();
  const topicOption = positiveOption(topicOptions, /^All topics\s*\(/i);
  expect(topicOption, 'selected category must have a non-empty topic').toBeTruthy();
  const topic = labelWithoutCount(topicOption!);
  await page.getByLabel('Topics').getByRole('button', { name: topicOption!, exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('topic')?.toLowerCase()).toBe(topic.toLowerCase());
  const cards = page.getByTestId('bookmark-card');
  expect(await cards.count()).toBeGreaterThan(0);
  for (let index = 0; index < Math.min(await cards.count(), 12); index += 1) {
    const card = cards.nth(index);
    await expect(card).toHaveAttribute('data-bookmark-category', category!);
    const cardTopics = ((await card.getAttribute('data-bookmark-topics')) || '').split('|').map(value => value.toLowerCase());
    expect(cardTopics).toContain(topic.toLowerCase());
  }
  await page.getByRole('button', { name: 'Clear all filters' }).click();
});

test('keyword search finds an existing visible bookmark and clears cleanly', async ({ page, browserHealth: _health }) => {
  await openLibrary(page);
  const firstCard = page.getByTestId('bookmark-card').first();
  const cardId = await firstCard.getAttribute('id');
  const content = (await firstCard.getByTestId('bookmark-content').innerText()).trim();
  const term = content.match(/[\p{L}\p{N}]{6,}/u)?.[0];
  expect(cardId).toBeTruthy();
  expect(term, 'a stable keyword should be derivable from a visible bookmark').toBeTruthy();
  await page.getByPlaceholder(/Search text, authors/).fill(term!);
  await expect(page.getByText('Keyword search')).toBeVisible();
  await expect(page.locator(`[id="${cardId}"]`)).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByTestId('bookmark-card').first()).toBeVisible();
});

test('Reader shows stored content, author, enrichment, and source without opening X', async ({ page, browserHealth: _health }) => {
  await openLibrary(page);
  await page.getByTestId('bookmark-card').first().getByTestId('bookmark-content').click();
  await expect(page).toHaveURL(/\/bookmarks\/[^/?#]+$/);
  await expect(page.locator('#bookmark-detail-view')).toBeVisible();
  await expect(page.locator('#bookmark-detail-view article')).toBeVisible();
  await expect(page.getByText('AI Key Summary')).toBeVisible();
  await expect(page.getByText('Topics', { exact: true })).toBeVisible();
  const source = page.getByRole('link', { name: /View original on X/i });
  await expect(source).toHaveAttribute('href', /^https:\/\/(x\.com|twitter\.com)\//);
  await page.getByRole('button', { name: 'Back to bookmarks' }).click();
  await expect(page.locator('#bookmark-library-view')).toBeVisible();
});

test('Collections is read-only and shows real data or a truthful empty state', async ({ page, browserHealth: _health }) => {
  await page.goto('/collections');
  await expect(page.locator('#collections-view')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Collections could not be loaded')).toHaveCount(0);
  const empty = page.getByRole('heading', { name: 'No collections yet' });
  const collectionLinks = page.getByText('Explore', { exact: true });
  expect((await empty.count()) + (await collectionLinks.count())).toBeGreaterThan(0);
  if (await collectionLinks.count()) {
    await collectionLinks.first().click();
    await expect(page).toHaveURL(/\/collections\/[^/?#]+$/);
    await expect(page.locator('#collection-detail-view')).toBeVisible();
  }
});

test('Settings tabs render without taking provider or mutation actions', async ({ page, browserHealth: _health }) => {
  await page.goto('/settings?tab=account');
  await expect(page.locator('#settings-view')).toBeVisible({ timeout: 20_000 });
  const expectations: Array<[string, string]> = [
    ['Account', '#settings-panel-account'],
    ['Billing & Plans', '#settings-panel-billing'],
    ['Connected Sources', '#settings-panel-sources'],
    ['Appearance', '#settings-panel-appearance'],
    ['Export & Data', '#settings-panel-data'],
  ];
  for (const [tab, panel] of expectations) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.locator(panel)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(panel).getByRole('alert')).toHaveCount(0);
  }
});

test('Connected Sources reports status without syncing or reconnecting', async ({ page, browserHealth: _health }) => {
  await page.goto('/settings?tab=sources');
  await expect(page.locator('#settings-panel-sources')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Connected sources' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'X / Twitter' })).toBeVisible();
  await expect(page.getByText(/Connected|Disconnected/, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sync now|Connect X/ })).toBeVisible();
});

test('Billing shows authoritative plan state without fake usage or checkout', async ({ page, browserHealth: _health }) => {
  await page.goto('/settings?tab=billing');
  await expect(page.locator('#settings-panel-billing')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Find Again (Free|Pro)/)).toBeVisible();
  await expect(page.getByText(/customer credits/i)).toBeVisible();
  await expect(page.getByText(/credits remaining|usage meter/i)).toHaveCount(0);
});

test('authenticated navigation and direct routes keep unfinished surfaces hidden', async ({ page, browserHealth: _health }) => {
  await page.goto('/dashboard');
  for (const label of ['Ask AI', 'Insights', 'Digests', 'Rediscovery']) {
    await expect(page.locator('#app-sidebar').getByText(label, { exact: true })).toHaveCount(0);
  }
  for (const route of ['/ask', '/ask-ai', '/insights', '/digests']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('#dashboard-view')).toBeVisible();
  }
});
