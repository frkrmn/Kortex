# Google Search Console launch checklist

1. Add `https://kortexmarks.vercel.app/` as a URL-prefix property, or verify the final custom domain as a Domain property.
2. Complete verification using the method Google provides. Do not add a fabricated verification tag or DNS record.
3. Submit `https://kortexmarks.vercel.app/sitemap.xml` under **Sitemaps**.
4. Use **URL inspection** for `/`, `/blog`, and each published article. Confirm the user-declared canonical matches the inspected URL.
5. Request indexing for the landing page, blog index, and current articles after the deployed crawl succeeds.
6. Review **Page indexing** for excluded auth, private, demo, and invalid routes. Their `noindex` state is intentional.
7. Monitor **Core Web Vitals**, especially mobile LCP and INP, because the current SPA ships a large shared JavaScript bundle.
8. Review detected Article, Breadcrumb, FAQ, WebSite, and WebApplication structured data. Fix only source-grounded errors.
9. Check **Manual actions** and **Security issues** after property verification.
10. Monitor **Performance** by page and query monthly. Use the intent map to spot cannibalization before changing copy.

No analytics provider or Search Console verification value is installed by GRM-141.
