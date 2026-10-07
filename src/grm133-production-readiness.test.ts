import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('unfinished authenticated surfaces are hidden and deep links recover safely', () => {
  const app = read('./App.tsx');
  const navigation = `${read('./components/AppSidebar.tsx')}\n${read('./components/MobileNavigation.tsx')}`;
  for (const label of ['Ask AI', 'Insights', 'Digests']) assert.doesNotMatch(navigation, new RegExp(label));
  for (const view of ['<AskAIView', '<InsightsView', '<DigestsView', '<DigestDetailView']) assert.doesNotMatch(app, new RegExp(view));
  assert.match(app, /\['ask', 'insights', 'digests', 'digest-detail'\]/);
  assert.match(app, /navigate\('\/dashboard', \{ replace: true \}\)/);
});

test('home uses authoritative counts and real sync without fabricated intelligence', () => {
  const home = read('./views/HomeDashboard.tsx');
  assert.match(home, /bookmark\.imported_at/);
  assert.match(home, /await syncXBookmarks\(\)/);
  assert.match(home, /bookmarksLoadState === 'error'/);
  for (const fake of ['↑ 12%', 'Math.min(bookmarks.length, 14)', 'Worth revisiting', 'featuredDigest', "navigate('/ask')"]) {
    assert.doesNotMatch(home, new RegExp(fake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('library and global search are deterministic keyword search over real loaded data', () => {
  const library = read('./views/BookmarkLibraryView.tsx');
  const globalSearch = read('./components/GlobalSearchModal.tsx');
  const store = read('./lib/store/demo-store.tsx');
  assert.doesNotMatch(library, /searchHybrid|Semantic Vector|Hybrid Search|Refreshing vectors/);
  assert.doesNotMatch(globalSearch, /globalSearch\(|Vector|Hybrid|\/ask/);
  assert.match(globalSearch, /Find Again keyword search/);
  for (const field of ['ai_summary', 'ai_category', 'topics', 'key_concepts']) assert.match(store, new RegExp(field));
  assert.match(library, /bookmarksLoadState === 'error'/);
});

test('reader uses stored bookmark enrichment and deterministic shared-topic related items', () => {
  const reader = read('./views/BookmarkDetailView.tsx');
  assert.doesNotMatch(reader, /getRelatedBookmarks\(bookmark\.id, 3\).*\.then|\/ask\?bookmarkId|conceptual overlap|% match/);
  assert.match(reader, /getRelatedBookmarks\(bookmark\.id, 3\)/);
  assert.match(reader, /shared saved topics/);
  assert.match(reader, /bookmarksLoadState === 'error'/);
});

test('collections load and mutate through authenticated APIs before success state', () => {
  const store = read('./lib/store/demo-store.tsx');
  const collections = read('./views/CollectionsView.tsx');
  const detail = read('./views/CollectionDetailView.tsx');
  const modal = read('./components/CollectionModal.tsx');
  assert.match(store, /await api\.getCollections\(\)/);
  assert.match(store, /await api\.createCollection/);
  assert.match(store, /await api\.updateCollection/);
  assert.match(store, /await api\.deleteCollection/);
  assert.match(store, /await api\.toggleBookmarkInCollection/);
  assert.match(collections, /No collections yet/);
  assert.match(collections, /collectionsLoadState === 'error'/);
  assert.doesNotMatch(detail, /Collection link copied|<span>Share<\/span>/);
  assert.doesNotMatch(modal, /Shareable URL/);
});

test('onboarding has no developer/test source or fake demo-library success path', () => {
  const onboarding = read('./views/OnboardingView.tsx');
  for (const removed of ['testConnectX', 'Developer Setup Assistant', 'X_CLIENT_ID', 'Explore demo library']) assert.doesNotMatch(onboarding, new RegExp(removed));
  assert.match(onboarding, /Continue without connecting/);
  assert.match(onboarding, /profile could not be saved/);
  assert.match(onboarding, /Welcome to Find Again/);
});

test('customer-facing retained production surfaces use Find Again branding', () => {
  const retained = [
    './components/AppSidebar.tsx', './components/MobileNavigation.tsx', './components/GlobalSearchModal.tsx',
    './views/HomeDashboard.tsx', './views/BookmarkLibraryView.tsx', './views/BookmarkDetailView.tsx',
    './views/CollectionsView.tsx', './views/CollectionDetailView.tsx', './views/SettingsView.tsx',
    './views/OnboardingView.tsx', './views/LoginView.tsx', './views/SignupView.tsx',
  ].map(read).join('\n');
  assert.doesNotMatch(retained, /Recallly|KortexMarks|\bKortex\b/);
  assert.match(retained, /Find Again/);
});
