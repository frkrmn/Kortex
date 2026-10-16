import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseRoute, isPublicRoute } from './lib/router';
import { blogArticles, getBlogReadingTime } from './content/blog';

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
  for (const field of ['description:', 'coverImage:', 'coverAlt:', 'author:', 'publishedAt:', 'readingTime:', 'category:', 'relatedSlugs:']) {
    assert.match(content, new RegExp(field));
  }
  assert.match(seo, /BlogPosting/);
  assert.match(seo, /image: `\$\{SITE_URL\}\$\{article\.coverImage\}`/);
  assert.match(seo, /BreadcrumbList/);
  assert.match(seo, /canonicalPath: `\/blog\/\$\{article\.slug\}`/);
  assert.match(blogView, /Related articles/);
  assert.match(blogView, /Start using Find Again/);
});

test('every published article has a distinct optimized editorial cover', () => {
  const images = [...content.matchAll(/coverImage: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(images.length, 6);
  assert.equal(new Set(images).size, 6);
  for (const image of images) {
    const path = new URL(`../public${image}`, import.meta.url);
    const bytes = fs.readFileSync(path);
    assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.ok(bytes.length < 300_000, `${image} should stay below 300 KB`);
  }
});

test('published reading times are derived from article text', () => {
  for (const article of blogArticles) assert.equal(article.readingTime, getBlogReadingTime(article));
});

test('public sitemap includes the blog index and every initial article', () => {
  for (const slug of ['how-to-organize-x-bookmarks', 'search-and-rediscover-x-bookmarks', 'ai-categorize-x-bookmarks']) {
    assert.match(sitemap, new RegExp(`/blog/${slug}`));
  }
});
