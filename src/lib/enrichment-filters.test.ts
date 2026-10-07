import test from 'node:test';
import assert from 'node:assert/strict';
import type { Bookmark } from '../types';
import { categoryCounts, filterEnrichedBookmarks, topicCounts, visibleTopicOptions } from './enrichment-filters';

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

test('canonical topic counts merge aliases and filters return their union', () => {
  const bookmarks = [
    item('1', 'AI', ['AI']),
    item('2', 'AI', ['Artificial Intelligence']),
    item('3', 'AI', ['Machine Learning']),
    item('4', 'Books', ['Book Recommendations']),
  ];
  assert.deepEqual(topicCounts(bookmarks, 'AI'), [['AI', 2], ['Machine Learning', 1]]);
  assert.deepEqual(filterEnrichedBookmarks(bookmarks, 'all', 'AI', '').map(row => row.id), ['1', '2']);
  assert.deepEqual(filterEnrichedBookmarks(bookmarks, 'AI', 'AI', '').map(row => row.id), ['1', '2']);
  assert.deepEqual(filterEnrichedBookmarks(bookmarks, 'Books', 'AI', ''), []);
  assert.deepEqual(filterEnrichedBookmarks(bookmarks, 'AI', 'all', 'machine').map(row => row.id), ['3']);
});

test('topic discovery caps defaults, supports search, and preserves a selected topic', () => {
  const topics = Array.from({ length: 15 }, (_, index) => [`Topic ${index + 1}`, 15 - index] as [string, number]);
  assert.equal(visibleTopicOptions(topics, '', 'all', false).length, 12);
  assert.equal(visibleTopicOptions(topics, '15', 'all', false)[0][0], 'Topic 15');
  assert.ok(visibleTopicOptions(topics, '', 'Topic 15', false).some(([topic]) => topic === 'Topic 15'));
  assert.equal(visibleTopicOptions(topics, '', 'all', true).length, 15);
});
