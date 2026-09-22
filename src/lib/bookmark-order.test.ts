import assert from 'node:assert/strict';
import test from 'node:test';
import { sortBookmarksNewestFirst } from './bookmark-order';

test('bookmarks are ordered from newest published item to oldest', () => {
  const items = [
    { id: 'middle', bookmark_created_at: '2026-02-01T00:00:00Z' },
    { id: 'oldest', bookmark_created_at: '2025-01-01T00:00:00Z' },
    { id: 'newest', bookmark_created_at: '2026-09-22T00:00:00Z' },
  ];
  assert.deepEqual(sortBookmarksNewestFirst(items).map(item => item.id), ['newest', 'middle', 'oldest']);
  assert.deepEqual(items.map(item => item.id), ['middle', 'oldest', 'newest']);
});
