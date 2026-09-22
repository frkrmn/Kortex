import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeXBookmarkPage,
  X_BOOKMARK_EXPANSIONS,
  X_BOOKMARK_MEDIA_FIELDS,
  X_BOOKMARK_POST_FIELDS,
} from './x-content';

test('normalizes a text-only X bookmark and expanded author', () => {
  const [item] = normalizeXBookmarkPage({
    data: [{ id: '1', text: 'Short text', note_tweet: { text: 'Full note text' }, author_id: 'u1', created_at: '2026-09-01T10:00:00Z' }],
    includes: { users: [{ id: 'u1', name: 'Ada', username: 'ada', profile_image_url: 'https://pbs.twimg.com/a.jpg' }] },
  });
  assert.equal(item.externalId, '1');
  assert.equal(item.row.content, 'Full note text');
  assert.equal(item.row.author_username, 'ada');
  assert.equal(item.row.url, 'https://x.com/ada/status/1');
  assert.deepEqual(item.row.media, []);
});

test('normalizes one image, multiple media, and missing optional media safely', () => {
  const [item] = normalizeXBookmarkPage({
    data: [{ id: '2', text: 'Gallery', attachments: { media_keys: ['m1', 'missing', 'm2'] } }],
    includes: { media: [
      { media_key: 'm1', type: 'photo', url: 'https://pbs.twimg.com/one.jpg', width: 1200, height: 800, alt_text: 'Diagram' },
      { media_key: 'm2', type: 'video', preview_image_url: 'https://pbs.twimg.com/video.jpg', width: 1280, height: 720 },
    ] },
  });
  assert.equal(item.row.media.length, 2);
  assert.deepEqual(item.row.media[0], { type: 'image', mediaKey: 'm1', url: 'https://pbs.twimg.com/one.jpg', width: 1200, height: 800, alt: 'Diagram' });
  assert.equal(item.row.media[1].type, 'video');
  assert.equal(item.row.media[1].previewUrl, 'https://pbs.twimg.com/video.jpg');
});

test('normalizes conversation and referenced post data without claiming completeness', () => {
  const [item] = normalizeXBookmarkPage({
    data: [{ id: '3', text: 'Reply', author_id: 'u1', conversation_id: 'root', referenced_tweets: [{ type: 'replied_to', id: 'root' }] }],
    includes: {
      users: [{ id: 'u1', name: 'Ada', username: 'ada' }, { id: 'u2', name: 'Grace', username: 'grace' }],
      tweets: [{ id: 'root', text: 'Root post', author_id: 'u2', conversation_id: 'root', attachments: { media_keys: ['m1'] } }],
      media: [{ media_key: 'm1', type: 'photo', url: 'https://pbs.twimg.com/root.jpg' }],
    },
  });
  assert.equal(item.row.metadata.x_conversation_id, 'root');
  assert.equal(item.row.metadata.x_thread_detected, true);
  assert.equal(item.row.metadata.x_thread_fully_available, false);
  assert.equal(item.row.metadata.x_referenced_posts[0].text, 'Root post');
  assert.equal(item.row.metadata.x_referenced_posts[0].authorUsername, 'grace');
  assert.equal(item.row.metadata.x_referenced_posts[0].media.length, 1);
});

test('keeps missing referenced posts as unavailable relationship metadata', () => {
  const [item] = normalizeXBookmarkPage({
    data: [{ id: '4', text: 'Reply without expansion', conversation_id: 'root',
      referenced_tweets: [{ type: 'replied_to', id: 'missing-root' }] }],
  });
  assert.equal(item.row.metadata.x_thread_detected, true);
  assert.equal(item.row.metadata.x_referenced_posts[0].externalId, 'missing-root');
  assert.equal(item.row.metadata.x_referenced_posts[0].available, false);
  assert.deepEqual(item.row.metadata.x_referenced_posts[0].media, []);
});

test('uses only one bookmark request with official rich fields and expansions', () => {
  assert.ok(X_BOOKMARK_POST_FIELDS.includes('conversation_id'));
  assert.ok(X_BOOKMARK_POST_FIELDS.includes('referenced_tweets'));
  assert.ok(X_BOOKMARK_EXPANSIONS.includes('attachments.media_keys'));
  assert.ok(X_BOOKMARK_EXPANSIONS.includes('referenced_tweets.id'));
  assert.ok(X_BOOKMARK_MEDIA_FIELDS.includes('preview_image_url'));
});
