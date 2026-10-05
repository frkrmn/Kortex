import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { blogArticles } from './content/blog';
import { getRouteSeo, getRouteSocialImage, SITE_URL, SOCIAL_IMAGE_PATH } from './lib/seo';
import { isPublicRoute, parseRoute, type RouteType } from './lib/router';

const sitemap = fs.readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const robots = fs.readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
const vercel = fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
const seoSource = fs.readFileSync(new URL('./lib/seo.ts', import.meta.url), 'utf8');
const landingSource = fs.readFileSync(new URL('./views/LandingPage.tsx', import.meta.url), 'utf8');
const socialImage = fs.readFileSync(new URL('../public/find-again-social.png', import.meta.url));

const acquisitionRoutes: Array<[RouteType, string, string]> = [
  ['landing', '/', ''],
  ['pricing', '/pricing', ''],
  ['faq', '/faq', ''],
  ['how-it-works', '/how-it-works', ''],
  ['blog', '/blog', ''],
  ...blogArticles.map(article => ['blog-article' as const, `/blog/${article.slug}`, article.slug] as [RouteType, string, string]),
];

test('indexable acquisition pages have unique complete metadata', () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const [route, expectedPath, slug] of acquisitionRoutes) {
    const seo = getRouteSeo(route, slug ? { slug } : {});
    assert.equal(seo.robots, 'index,follow');
    assert.equal(seo.canonicalPath, expectedPath);
    assert.ok(seo.title.length >= 20);
    assert.ok(seo.description.length >= 50);
    assert.equal(titles.has(seo.title), false, `duplicate title: ${seo.title}`);
    assert.equal(descriptions.has(seo.description), false, `duplicate description: ${seo.description}`);
    titles.add(seo.title);
    descriptions.add(seo.description);
  }
});

test('public pages share the Find Again social image while account routes do not', () => {
  const publicRoutes: RouteType[] = ['landing', 'pricing', 'faq', 'how-it-works', 'demo', 'blog', 'blog-article', 'terms', 'privacy'];
  for (const route of publicRoutes) {
    const seo = getRouteSeo(route, route === 'blog-article' ? { slug: blogArticles[0].slug } : {});
    assert.equal(getRouteSocialImage(seo), `${SITE_URL}${SOCIAL_IMAGE_PATH}`, `${route} social preview`);
  }
  for (const route of ['login', 'signup', 'auth-callback', 'settings', 'dashboard'] as RouteType[]) {
    assert.equal(getRouteSocialImage(getRouteSeo(route, {})), undefined, `${route} must not expose public social metadata`);
  }
  assert.equal(getRouteSocialImage(getRouteSeo('blog-article', { slug: 'missing' })), `${SITE_URL}${SOCIAL_IMAGE_PATH}`);
});

test('Find Again social image is a standard-size PNG with no legacy brand text payload', () => {
  assert.equal(socialImage.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(socialImage.readUInt32BE(16), 1200);
  assert.equal(socialImage.readUInt32BE(20), 630);
  const payload = socialImage.toString('latin1');
  assert.doesNotMatch(payload, /Recallly|KortexMarks|Kortex/);
});

test('demo, auth, private, and invalid routes cannot become indexable', () => {
  for (const route of ['demo', 'demo-bookmark', 'login', 'signup', 'dashboard', 'bookmarks', 'bookmark-detail', 'settings', 'not-found'] as RouteType[]) {
    const seo = getRouteSeo(route, {});
    assert.match(seo.robots, /^noindex,/);
    assert.equal(seo.canonicalPath, undefined);
  }
  const missingArticle = getRouteSeo('blog-article', { slug: 'missing' });
  assert.equal(missingArticle.robots, 'noindex,follow');
  assert.equal(missingArticle.canonicalPath, undefined);
  assert.equal(parseRoute('/random-garbage').route, 'not-found');
  assert.equal(isPublicRoute('not-found'), true);
  assert.equal(isPublicRoute('settings'), false);
  assert.doesNotMatch(seoSource, /window\.location\.href/);
});

test('structured data is route-specific, valid, and based on visible content', () => {
  const home = getRouteSeo('landing', {});
  assert.ok(JSON.stringify(home.schemas).includes('WebApplication'));
  const faq = getRouteSeo('faq', {});
  assert.ok(JSON.stringify(faq.schemas).includes('FAQPage'));
  for (const article of blogArticles) {
    const seo = getRouteSeo('blog-article', { slug: article.slug });
    const types = (seo.schemas || []).map(schema => schema['@type']);
    assert.ok(types.includes('BlogPosting'));
    assert.ok(types.includes('BreadcrumbList'));
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(seo.schemas)));
  }
});

test('robots and sitemap expose only intended canonical pages', () => {
  assert.match(robots, /Sitemap: https:\/\/kortexmarks\.vercel\.app\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
  for (const [, path] of acquisitionRoutes) {
    const loc = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
    assert.match(sitemap, new RegExp(`<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
  }
  for (const excluded of ['/demo', '/login', '/signup', '/settings', '/bookmarks', '/api/']) {
    assert.doesNotMatch(sitemap, new RegExp(`<loc>${SITE_URL}${excluded.replaceAll('/', '\\/')}`));
  }
  assert.doesNotThrow(() => JSON.parse(vercel));
  assert.match(vercel, /"destination": "\/shell\.html"/);
});

test('landing copy describes shipped discovery features rather than planned AI surfaces', () => {
  assert.match(landingSource, /Search & Filter/);
  assert.match(landingSource, /AI Summaries & Topics/);
  assert.match(landingSource, /Rich Bookmark Reader/);
  assert.doesNotMatch(landingSource, /Semantic Search|Conversational RAG|Weekly Intelligence Digest|Shareable Collections/);
});
