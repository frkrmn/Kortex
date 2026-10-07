import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { blogArticles } from './content/blog';
import { parseRoute } from './lib/router';

const blogView = fs.readFileSync(new URL('./views/BlogViews.tsx', import.meta.url), 'utf8');
const seoSource = fs.readFileSync(new URL('./lib/seo.ts', import.meta.url), 'utf8');
const sitemap = fs.readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');

test('GRM-149 blog routes and six-article cluster resolve', () => {
  assert.deepEqual(parseRoute('/blog'), { route: 'blog', params: {} });
  assert.deepEqual(parseRoute('/blog/twitter-x-bookmark-folders'), { route: 'blog-article', params: { slug: 'twitter-x-bookmark-folders' } });
  assert.equal(blogArticles.length, 6);
  for (const article of blogArticles) {
    assert.ok(article.seoTitle);
    assert.ok(article.description);
    assert.ok(article.relatedSlugs.length > 0);
    assert.match(sitemap, new RegExp(`/blog/${article.slug}`));
  }
});

test('new article metadata and customer-facing content use Find Again', () => {
  assert.match(seoSource, /canonicalPath/);
  assert.match(seoSource, /og:image/);
  assert.match(seoSource, /twitter:image/);
  assert.match(seoSource, /BlogPosting/);
  assert.doesNotMatch(blogView, /Recallly|Kortex|KortexMarks/);
  assert.doesNotMatch(fs.readFileSync(new URL('./content/blog.ts', import.meta.url), 'utf8'), /Recallly|Kortex|KortexMarks/);
});
