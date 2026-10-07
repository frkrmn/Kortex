import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseRoute, isPublicRoute } from './lib/router';

const blogView = fs.readFileSync(new URL('./views/BlogViews.tsx', import.meta.url), 'utf8');
const content = fs.readFileSync(new URL('./content/blog.ts', import.meta.url), 'utf8');
const sitemap = fs.readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const seo = fs.readFileSync(new URL('./lib/seo.ts', import.meta.url), 'utf8');

test('blog routes are public and article slugs resolve', () => {
  assert.deepEqual(parseRoute('/blog'), { route: 'blog', params: {} });
  assert.deepEqual(parseRoute('/blog/how-to-organize-x-bookmarks'), { route: 'blog-article', params: { slug: 'how-to-organize-x-bookmarks' } });
  assert.equal(isPublicRoute('blog'), true);
  assert.equal(isPublicRoute('blog-article'), true);
});

test('blog content has a small, maintainable initial set with complete metadata', () => {
  const articleCount = (content.match(/slug: '/g) || []).length;
  assert.equal(articleCount, 6);
  for (const field of ['description:', 'author:', 'publishedAt:', 'readingTime:', 'category:', 'relatedSlugs:']) {
    assert.match(content, new RegExp(field));
  }
  assert.match(seo, /BlogPosting/);
  assert.match(seo, /BreadcrumbList/);
  assert.match(seo, /canonicalPath: `\/blog\/\$\{article\.slug\}`/);
  assert.match(blogView, /Related articles/);
  assert.match(blogView, /Start using Find Again/);
});

test('public sitemap includes the blog index and every initial article', () => {
  for (const slug of ['how-to-organize-x-bookmarks', 'search-and-rediscover-x-bookmarks', 'ai-categorize-x-bookmarks']) {
    assert.match(sitemap, new RegExp(`/blog/${slug}`));
  }
});
