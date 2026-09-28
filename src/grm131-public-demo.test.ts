import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isPublicRoute, parseRoute } from './lib/router';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('interactive demo and its reader deep link are public routes', () => {
  assert.deepEqual(parseRoute('/demo'), { route: 'demo', params: {} });
  assert.deepEqual(parseRoute('/demo/'), { route: 'demo', params: {} });
  assert.deepEqual(parseRoute('/demo/bookmarks/bm_101'), {
    route: 'demo-bookmark',
    params: { id: 'bm_101' },
  });
  assert.equal(isPublicRoute('demo'), true);
  assert.equal(isPublicRoute('demo-bookmark'), true);
});

test('private application routes remain outside the public boundary', () => {
  for (const path of [
    '/dashboard',
    '/onboarding',
    '/bookmarks',
    '/bookmarks/private-id',
    '/collections',
    '/collections/private-slug',
    '/ask',
    '/ask-ai',
    '/insights',
    '/digests',
    '/digests/private-id',
    '/settings',
    '/unknown-route',
  ]) {
    assert.equal(isPublicRoute(parseRoute(path).route), false, `${path} must remain protected`);
  }
});

test('marketing section deep links remain public', () => {
  for (const path of ['/pricing', '/faq', '/how-it-works', '/terms', '/privacy']) {
    assert.equal(isPublicRoute(parseRoute(path).route), true, `${path} must remain public`);
  }
});

test('landing sends the interactive demo CTA to the public demo route', () => {
  const app = read('./App.tsx');
  const landing = read('./views/LandingPage.tsx');
  assert.match(app, /onExploreDemo=\{\(\) => navigate\('\/demo'\)\}/);
  assert.match(landing, /Explore interactive demo/);
  assert.match(landing, /onClick=\{onExploreDemo\}/);
});

test('public demo uses fixtures and has no production or provider API dependency', () => {
  const demo = read('./views/PublicDemoView.tsx');
  assert.match(demo, /demoBookmarks/);
  assert.match(demo, /Interactive Demo · Demo data/);
  assert.match(demo, /Start using Recallly/);
  assert.doesNotMatch(demo, /from ['"]\.\.\/lib\/api['"]/);
  assert.doesNotMatch(demo, /supabase/i);
  assert.doesNotMatch(demo, /syncX|Gemini|checkout/i);
});

test('authenticated desktop and mobile navigation omit Marketing Site', () => {
  const navigation = [
    read('./components/AppSidebar.tsx'),
    read('./components/MobileNavigation.tsx'),
    read('./components/Navigation.tsx'),
  ].join('\n');
  assert.doesNotMatch(navigation, /Marketing Site|View Marketing Site/);
});

test('public pages do not mount the private bookmark store', () => {
  const app = read('./App.tsx');
  const demoBranch = app.indexOf("route === 'demo'");
  const storeMount = app.lastIndexOf('<DemoStoreProvider>');
  assert.ok(demoBranch > storeMount, 'demo routing must live outside the authenticated store subtree');
  assert.match(app, /legal, and demo routes do not hydrate private account or bookmark state/);
});
