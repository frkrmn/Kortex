# Missing Authentication & Function-Level Authorization Results: Recallly (Phase 2B candidate)

## Executive Summary

- **Scope:** All Express dispatch paths, internal jobs, X OAuth, Stripe webhook, live tenant API, SQL RPC exposure, Phase 2B Gemini controls, and local demo/file-backed routing.
- **Endpoint groups analyzed:** 8
- **Vulnerable:** 0
- **Likely Vulnerable:** 0
- **Needs Manual Review:** 0
- **Not Vulnerable:** 8
- **Overall severity:** No source-grounded missing-authentication or broken function-level authorization finding.

Recallly has no application administrator role exposed through the regular user API. Privileged operations use either a verified Supabase identity, a server-held cron bearer secret, a Stripe signature, a one-use OAuth state plus browser binding, or a service-role-only SQL grant.

## Findings

### [NOT VULNERABLE] Ordinary production API routes

- **Severity:** None
- **File:** `server/live-api.ts:17-43`; `server/vercel-api.ts:82-85`
- **Endpoint:** Other `/api/*` routes not explicitly dispatched as public/provider/internal routes.
- **Protection:** `liveApi` rejects missing bearer tokens and `demo_token`, calls `db.auth.getUser(bearer)`, and dispatches only after a valid user is returned. The Vercel adapter funnels unmatched API traffic into this gate.

### [NOT VULNERABLE] Controlled Gemini enrichment job

- **Severity:** None
- **File:** `server/vercel-api.ts:56-63`; `server.ts:59-67`
- **Endpoint:** `GET /api/internal/gemini-enrichment`
- **Protection:** Both deployments require an exact `Authorization: Bearer <CRON_SECRET>` value and fail closed if the secret is unset. Worker execution additionally requires rollout flags, an allowlisted owner UUID, a Gemini key, and a positive cap (`server/ai/live-gemini-enrichment.ts:16-30,148-160`).

### [NOT VULNERABLE] Smart Sync and provider metrics jobs

- **Severity:** None
- **File:** `server/vercel-api.ts:46-73`; `server.ts:49-77`
- **Endpoint:** `GET /api/internal/smart-sync`, `GET /api/internal/provider-metrics`
- **Protection:** Each route uses the same fail-closed cron-secret comparison before privileged service-role work.

### [NOT VULNERABLE] Stripe webhook

- **Severity:** None for authentication
- **File:** `server/vercel-api.ts:37-44`; `server/economics/live-stripe.ts:54-59`
- **Endpoint:** `POST /api/billing/webhook`
- **Protection:** The handler requires the raw request body and `stripe-signature`; `stripe.webhooks.constructEvent` verifies the signature with `STRIPE_WEBHOOK_SECRET` before any billing mutation. Business ordering concerns are reported separately.

### [NOT VULNERABLE] X OAuth callback

- **Severity:** None
- **File:** `server/vercel-api.ts:75-80`; `server/sources/x-live.ts:81-154`
- **Endpoint:** `GET /api/integrations/x/callback`
- **Protection:** The callback is public by protocol but sensitive processing requires a random state and random HttpOnly browser-binding cookie. A matching unexpired row is atomically deleted before token exchange, making state one-use, and PKCE binds the authorization code. The resulting account owner comes from stored state rather than request input.

### [NOT VULNERABLE] X auth URL, sync, and disconnect

- **Severity:** None
- **File:** `server/live-api.ts:45-84`
- **Endpoint:** `GET /api/integrations/x/auth-url`, `POST /api/integrations/x/sync`, `POST /api/integrations/x/disconnect`
- **Protection:** These branches are behind the global Supabase JWT validation and receive the verified user ID. No low-privilege-to-admin boundary exists in these user-owned operations.

### [NOT VULNERABLE] Privileged SQL functions

- **Severity:** None
- **File:** `supabase/migrations/20260921000007_service_role_rpc_claims.sql:3-51`; `supabase/migrations/20260926000008_gemini_enrichments.sql:46-79`; `supabase/migrations/20260919000004_import_economics.sql:133-253`
- **Endpoint:** PostgREST RPC surface.
- **Protection:** Import, credit grant, provider-budget, and Gemini claim RPCs are `REVOKE`d from `PUBLIC`, `anon`, and `authenticated`, granted to `service_role`, and contain role checks. User-callable `clear_my_library` is granted only to `authenticated` and derives `auth.uid()` internally (`supabase/migrations/20260919000002_clear_user_library.sql:1-31`).

### [NOT VULNERABLE] Demo and legacy file-backed API isolation

- **Severity:** None in the reviewed deployment model
- **File:** `server.ts:44-104`; `server/live-api.ts:21-29`
- **Endpoint:** Legacy handlers registered later in `server.ts`.
- **Protection:** In production or whenever `VITE_DEMO_MODE=false`, middleware dispatches to `liveApi` and returns before legacy handlers. In demo mode, non-loopback clients receive 403. The production API rejects `demo_token`. Thus demo identity and local fixture mutations do not confer production access.

### [NOT VULNERABLE] Health endpoint

- **Severity:** None
- **File:** `server/vercel-api.ts:33-35`; `server.ts:106-109`
- **Endpoint:** `GET /api/health`
- **Protection:** This intentionally public liveness response contains only status and server time and performs no sensitive action.

## Validation Notes

- Static source review only; no production calls or secrets were used.
- The cron secret is a shared bearer capability rather than a role system. No source-level bypass was found; operational rotation and storage are outside this repository-only assessment.
- Public X OAuth and Stripe routes are intentionally unauthenticated HTTP entry points, but provider-specific cryptographic/binding checks authorize their sensitive actions.
