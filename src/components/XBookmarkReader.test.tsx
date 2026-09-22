import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { XBookmarkReader } from './XBookmarkReader';
import type { Bookmark } from '../types';

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'item-1', user_id: 'owner-1', source: 'twitter', external_id: 'post-1',
    author_name: 'Ada', author_username: 'ada', author_avatar: 'https://pbs.twimg.com/avatar.jpg',
    content: 'Full post text', url: 'https://x.com/ada/status/post-1',
    bookmark_created_at: '2026-09-20T12:00:00Z', imported_at: '2026-09-20T12:00:00Z',
    published_at: '2026-09-19T12:00:00Z', is_read: false, is_favorite: false,
    ai_summary: '', topics: [], keywords: [], ...overrides,
  };
}

test('Reader renders real text and the canonical source link', () => {
  const html = renderToStaticMarkup(<XBookmarkReader bookmark={bookmark()} />);
  assert.match(html, /Full post text/);
  assert.match(html, /Ada/);
  assert.match(html, /@ada/);
  assert.match(html, /href="https:\/\/x.com\/ada\/status\/post-1"/);
  assert.match(html, /View original on X/);
});

test('Reader renders image galleries and tolerates no media', () => {
  const imageHtml = renderToStaticMarkup(<XBookmarkReader bookmark={bookmark({ media: [
    { type: 'image', url: 'https://pbs.twimg.com/1.jpg', alt: 'First image' },
    { type: 'image', url: 'https://pbs.twimg.com/2.jpg', alt: 'Second image' },
  ] })} />);
  assert.match(imageHtml, /First image/);
  assert.match(imageHtml, /Second image/);
  assert.doesNotThrow(() => renderToStaticMarkup(<XBookmarkReader bookmark={bookmark({ media: undefined })} />));
});

test('Reader only presents locally available thread relationships and marks partial threads', () => {
  const html = renderToStaticMarkup(<XBookmarkReader bookmark={bookmark({
    thread_detected: true, thread_fully_available: false,
    referenced_posts: [{ type: 'replied_to', externalId: 'root', text: 'Root post', authorName: 'Grace',
      authorUsername: 'grace', media: [], available: true }],
  })} />);
  assert.match(html, /Thread · 2 available posts/);
  assert.match(html, /Root post/);
  assert.match(html, /Bookmarked post/);
  assert.match(html, /Partial conversation/);
});

test('Reader suppresses stale body and media for unavailable X content', () => {
  const html = renderToStaticMarkup(<XBookmarkReader bookmark={bookmark({
    content: 'Stale cached content', external_content_status: 'deleted',
    media: [{ type: 'image', url: 'https://pbs.twimg.com/stale.jpg' }],
  })} />);
  assert.match(html, /no longer available from X/);
  assert.doesNotMatch(html, /Stale cached content/);
  assert.doesNotMatch(html, /stale.jpg/);
});
