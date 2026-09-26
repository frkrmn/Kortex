import test from 'node:test';
import assert from 'node:assert/strict';
import type { Bookmark } from '../types';
import { categoryCounts, filterEnrichedBookmarks, topicCounts } from './enrichment-filters';

const item = (id: string, category?: Bookmark['ai_category'], topics: string[] = [], content = '') => ({
  id, ai_category: category, topics, content, author_name: 'Author', author_username: 'author',
  ai_summary: '', key_concepts: [], enrichment_status: category ? 'completed' : 'pending',
}) as Bookmark;

test('category counts include only completed results and topic filters stay within category', () => {
  const bookmarks = [item('1', 'AI', ['MCP'], 'Useful protocol'), item('2', 'Crypto', ['MCP'], 'Different topic'),
    item('3', undefined, ['MCP'], 'Pending')];
  assert.equal(categoryCounts(bookmarks).AI, 1);
  assert.equal(categoryCounts(bookmarks).Books, 0);
  assert.deepEqual(topicCounts(bookmarks, 'AI'), [['MCP', 1]]);
  assert.deepEqual(filterEnrichedBookmarks(bookmarks, 'AI', 'MCP', 'protocol').map(row => row.id), ['1']);
  assert.deepEqual(filterEnrichedBookmarks(bookmarks, 'AI', 'MCP', 'Different'), []);
});
