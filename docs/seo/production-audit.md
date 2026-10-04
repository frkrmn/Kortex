# Production SEO audit

Audited on 2026-10-04 against `https://kortexmarks.vercel.app` and the production build generated from GRM-141.

## Indexing inventory

| Surface | Decision | Production behavior |
| --- | --- | --- |
| `/`, `/pricing`, `/faq`, `/how-it-works`, `/blog` | `INDEX` | Unique metadata, self-canonical, crawlable internal links, and route-specific structured data |
| Published `/blog/:slug` pages | `INDEX` | Unique article metadata, self-canonical, `BlogPosting`, and `BreadcrumbList` |
| `/terms`, `/privacy` | `INDEX` | Self-canonical legal pages; not treated as acquisition pages |
| `/demo`, valid `/demo/bookmarks/:id` | `NOINDEX` | Public fixture experience with no canonical; excluded from the sitemap |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | `NOINDEX` | Authentication surfaces use `noindex,nofollow` and no canonical |
| Private application routes | `AUTH-PROTECTED` | Authentication remains the security boundary; unauthenticated navigation resolves to login, and metadata remains `noindex,nofollow` |
| Unknown paths, missing articles, invalid demo IDs | `NOT FOUND / INVALID` | Fixed not-found UI and `noindex`; the Vercel SPA fallback currently returns HTTP 200 |
| `/api/*` and internal utilities | `AUTH-PROTECTED` or unavailable | Excluded from the sitemap and discouraged in `robots.txt`; server authorization remains authoritative |

The demo is intentionally not indexable. Its static fixture data is useful for conversion but does not provide a distinct, durable search document and could compete with the product and how-it-works pages.

## Before and after

Before GRM-141, public routes shared an SPA document head, invalid URLs could fall through to application routing, crawler policy was incomplete, and metadata correctness after client-side navigation was not covered by a dedicated regression gate.

After GRM-141, build output contains route-specific document heads, client navigation replaces managed metadata and JSON-LD, private/demo/invalid routes are explicitly non-indexable, the sitemap contains only canonical indexable URLs, and `npm run test:seo` checks the public routing and metadata contract.

## Known platform limitation

Vercel rewrites unknown non-API paths to `shell.html`, so invalid URLs return HTTP 200 before the client renders the not-found state. The shell and hydrated state both use `noindex`, which is the safest option without a routing/SSR architecture change. A true edge/server 404 should be evaluated separately rather than risking SPA deep links in this audit.

## Performance baseline

The production build emits a shared browser JavaScript chunk of approximately 849.5 kB minified and 218.9 kB gzip, plus approximately 58.0 kB of CSS (11.0 kB gzip). Vite's 500 kB warning remains visible. Route-level code splitting or public-page prerendering is substantial follow-up work and was not folded into the SEO hardening pass.
