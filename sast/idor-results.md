# IDOR Analysis Results: Recallly (Phase 2B candidate)

## Executive Summary

- **Scope:** Full server/API, browser Supabase repositories, SQL RPC/RLS, Phase 2B Gemini enrichment, X integration, Stripe, and demo isolation paths.
- **Candidates analyzed:** 10 endpoint/object-access groups.
- **Vulnerable:** 0
- **Likely Vulnerable:** 0
- **Needs Manual Review:** 0
- **Not Vulnerable:** 10
- **Overall severity:** No source-grounded IDOR finding.

The production dispatcher authenticates every ordinary `/api/*` request with `db.auth.getUser(bearer)` and derives the tenant identity from the verified user (`server/live-api.ts:26-40`). Object handlers then scope reads and writes to that identity. PostgreSQL RLS independently scopes tenant tables, and the new enrichment relation adds a composite `(saved_item_id, user_id)` foreign key. No route accepts a destination user ID from the caller.

## Findings

### [NOT VULNERABLE] Digest lookup by ID

- **Severity:** None
- **File:** `server/live-api.ts:172-178`
- **Endpoint:** `GET /api/digests/:id`
- **Identifier source:** Path parameter.
- **Protection:** The query requires both the requested digest ID and `user_id = user.id`; `user.id` comes from verified Supabase Auth. The `digests_select_owner` RLS policy also requires `auth.uid() = user_id` (`supabase/migrations/20260915000002_rls_policies.sql:215-216`).

### [NOT VULNERABLE] Chat thread read and delete by ID

- **Severity:** None
- **File:** `server/live-api.ts:283-299`
- **Endpoint:** `GET|DELETE /api/chat/threads/:id`
- **Identifier source:** Path parameter.
- **Protection:** Initial fetch, deletion, and child message query all include `user_id = user.id`. Thread and message RLS repeat the owner constraint (`supabase/migrations/20260915000002_rls_policies.sql:247-301`).

### [NOT VULNERABLE] Bookmark read and update by ID

- **Severity:** None
- **File:** `server/live-api.ts:330-362`
- **Endpoint:** `GET|PATCH /api/bookmarks/:id`
- **Identifier source:** Path parameter.
- **Protection:** Both operations filter on the requested ID and verified owner ID. The update allowlists only `is_read` and `is_favorite`. The saved-item RLS policy permits owner writes only (`supabase/migrations/20260915000002_rls_policies.sql:72-80`). Public-collection visibility applies only to SELECT and therefore does not enable cross-owner mutation.

### [NOT VULNERABLE] Related bookmarks by source ID

- **Severity:** None
- **File:** `server/live-api.ts:331-345`
- **Endpoint:** `GET /api/bookmarks/:id/related`
- **Identifier source:** Path parameter.
- **Protection:** The source bookmark must match `user_id = user.id`, and related candidates are also restricted to the same user before similarity scoring.

### [NOT VULNERABLE] Collection update and delete by ID

- **Severity:** None
- **File:** `server/live-api.ts:386-407`
- **Endpoint:** `PATCH|DELETE /api/collections/:id`
- **Identifier source:** Path parameter.
- **Protection:** The handler first fetches the collection with both its ID and verified owner ID, returns 404 if it is not owned, and scopes the subsequent mutation to the same owner. Collection UPDATE/DELETE RLS also requires ownership (`supabase/migrations/20260915000002_rls_policies.sql:159-164`).

### [NOT VULNERABLE] Toggle bookmark membership in a collection

- **Severity:** None
- **File:** `server/live-api.ts:409-429`
- **Endpoint:** `POST /api/collections/:id/toggle-bookmark`
- **Identifier source:** Collection path parameter and `bookmarkId` body field.
- **Protection:** The handler independently verifies ownership of both the collection and bookmark before changing the join row. The `collection_items_insert_owner` policy repeats both parent-owner checks; update/delete require collection ownership (`supabase/migrations/20260915000002_rls_policies.sql:180-210`).

### [NOT VULNERABLE] Collection lookup by slug

- **Severity:** None
- **File:** `server/live-api.ts:431-443`
- **Endpoint:** `GET /api/collections/:slug`
- **Identifier source:** Path parameter.
- **Protection:** Reading another user's collection is limited by RLS to collections intentionally marked `visibility = 'public'`; linked saved items are likewise readable only through an explicitly public collection (`supabase/migrations/20260915000002_rls_policies.sql:61-70,150-154,171-178`). This is intended public sharing rather than private-object exposure. In the current production API, the global JWT gate still requires authentication before this handler.

### [NOT VULNERABLE] X account disconnect and sync

- **Severity:** None
- **File:** `server/live-api.ts:49-84`; `server/sources/x-live.ts:161-175`
- **Endpoint:** `POST /api/integrations/x/disconnect`, `POST /api/integrations/x/sync`
- **Identifier source:** No caller-supplied owner identifier.
- **Protection:** The server passes only the verified `user.id` into service-role operations. Account lookup/deletion is constrained by that ID and provider. Body fields cannot replace the owner.

### [NOT VULNERABLE] Controlled Gemini enrichment queue and claim

- **Severity:** None
- **File:** `server/ai/live-gemini-enrichment.ts:28-49,85-100`; `supabase/migrations/20260926000008_gemini_enrichments.sql:26-28,39-43,46-79`
- **Endpoint:** Indirectly reached after owner X sync; internal worker via `GET /api/internal/gemini-enrichment`.
- **Identifier source:** Saved-item IDs produced by the completed sync, not arbitrary client destination IDs.
- **Protection:** Enqueue is restricted to one configured owner and re-queries candidate IDs by the same owner. The database has a composite ownership foreign key. The claim RPC is executable only by `service_role`, validates that JWT role, and scopes claims by configured owner. Result reads require owner RLS.

### [NOT VULNERABLE] Browser Supabase repositories and tenant RPCs

- **Severity:** None
- **File:** `src/lib/repositories/supabase/`; `supabase/migrations/20260915000002_rls_policies.sql`; `supabase/migrations/20260919000002_clear_user_library.sql:1-31`; `supabase/migrations/20260916000002_pgvector_search.sql:110-190`
- **Endpoint:** Direct PostgREST table access and RPC calls.
- **Identifier source:** Repository method arguments and authenticated JWT.
- **Protection:** Some browser repository lookups use only an object ID in the query, but enabled RLS restricts returned or mutated rows to `auth.uid()`. `clear_my_library` takes no user argument and derives `auth.uid()`; semantic and related-search RPCs also derive the caller and scope every embedding query.

## Validation Notes

- This was a static assessment only. No production requests or credentials were used.
- Service-role callers intentionally bypass RLS, so the review traced their explicit `user_id` constraints and RPC grants rather than assuming RLS protects those paths.
- The legacy file-backed handlers in `server.ts` accept client IDs, but production or `VITE_DEMO_MODE=false` dispatches to `liveApi`; otherwise the file-backed API is restricted to loopback (`server.ts:44-104`). It does not provide a remotely reachable multi-user IDOR path in the reviewed configuration.
