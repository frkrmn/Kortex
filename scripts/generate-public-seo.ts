import fs from 'node:fs';
import path from 'node:path';
import { blogArticles } from '../src/content/blog';
import { getRouteSeo, SITE_URL, type SeoConfig } from '../src/lib/seo';
import type { RouteType } from '../src/lib/router';

const DIST = path.resolve('dist');

type StaticPage = { path: string; route: RouteType; params?: Record<string, string> };

const pages: StaticPage[] = [
  { path: '/', route: 'landing' },
  { path: '/pricing', route: 'pricing' },
  { path: '/faq', route: 'faq' },
  { path: '/how-it-works', route: 'how-it-works' },
  { path: '/blog', route: 'blog' },
  { path: '/terms', route: 'terms' },
  { path: '/privacy', route: 'privacy' },
  { path: '/demo', route: 'demo' },
  { path: '/login', route: 'login' },
  { path: '/signup', route: 'signup' },
  ...blogArticles.map(article => ({ path: `/blog/${article.slug}`, route: 'blog-article' as const, params: { slug: article.slug } })),
];

const base = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function render(pagePath: string, config: SeoConfig) {
  const canonical = config.canonicalPath ? `${SITE_URL}${config.canonicalPath}` : null;
  const ogUrl = canonical || `${SITE_URL}${pagePath}`;
  const cleaned = base
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name="description"|property="og:(?:title|description|type|url)"|name="twitter:(?:card|title|description)")[^>]*>/gi, '')
    .replace(/\s*<meta\s+name="robots"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<script[^>]*data-recallly-seo-schema="true"[^>]*>[\s\S]*?<\/script>/gi, '');
  const head = [
    `<title>${escapeAttribute(config.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(config.description)}" />`,
    `<meta name="robots" content="${config.robots}" />`,
    canonical ? `<link rel="canonical" href="${canonical}" />` : '',
    `<meta property="og:title" content="${escapeAttribute(config.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(config.description)}" />`,
    `<meta property="og:type" content="${config.ogType || 'website'}" />`,
    `<meta property="og:url" content="${ogUrl}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeAttribute(config.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(config.description)}" />`,
    ...(config.schemas || []).map(schema => `<script type="application/ld+json" data-recallly-seo-schema="true">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`),
  ].filter(Boolean).join('\n    ');
  return cleaned.replace('</head>', `    ${head}\n  </head>`);
}

for (const page of pages) {
  const output = page.path === '/' ? path.join(DIST, 'index.html') : path.join(DIST, page.path.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, render(page.path, getRouteSeo(page.route, page.params || {})));
}

fs.writeFileSync(path.join(DIST, 'shell.html'), render('/not-found', getRouteSeo('not-found', {})));
