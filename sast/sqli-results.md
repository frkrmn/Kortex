# SQLi Analysis Results: Recallly

## Executive Summary

- Vulnerable SQL construction sites: 0
- Vulnerabilities: 0
- Severity: None

## Evidence

The full TypeScript, JavaScript, and PostgreSQL migration scope was searched for raw query execution, dynamic SQL, string-built statements, unsafe ORM methods, and dynamic PostgREST query construction.

- Application database access uses the Supabase query builder and fixed RPC names. User values are supplied as query-builder values rather than SQL text (for example, `server/live-api.ts`, `server/ai/live-gemini-enrichment.ts`, and `server/ai/live-enrichment-view.ts`).
- The only direct `db.query(...)` calls are in PGlite test files. Their SQL statements are static and all variable values use positional parameters such as `$1` and `$2` (`server/economics/migration-validation.test.mjs` and `server/ai/gemini-migration.test.mjs`).
- PostgreSQL functions in `supabase/migrations/` use static statements. No `EXECUTE` of dynamically assembled SQL, `format(...)` query construction, or dynamic identifiers were found.
- The interpolated PostgREST `.or(...)` filters use server-generated ISO timestamps (`server/live-api.ts:89`, `server/sources/x-live.ts:235`, and `server/economics/smart-sync.ts:14`), not request values, and are parsed by PostgREST rather than executed as SQL source.
- The new Gemini claim flow invokes the fixed `claim_gemini_enrichment` RPC with typed values (`server/ai/live-gemini-enrichment.ts:87`); the RPC body compares typed parameters in static SQL (`supabase/migrations/20260926000008_gemini_enrichments.sql:46`).

## Result

No vulnerabilities found.
