# Recallly Phase 2B — Full SAST Security Gate

## Scope and Method

Fresh source-grounded utkusen/sast-skills analysis of the isolated Phase 2B worktree. Architecture was mapped first in `sast/architecture.md`. The 13 vulnerability-class workflows produced separate `*-results.md` files for SQL injection, GraphQL injection, XSS, RCE, SSRF, IDOR, XXE, SSTI, JWT, missing authentication, path traversal, file upload, and business logic. Secrets, dependencies, and prompt-injection boundaries were reviewed separately. This is static analysis plus local tests; no third-party infrastructure was probed.

## Summary

| Severity | Count | Status |
|---|---:|---|
| Critical | 0 | None found |
| High | 0 | None found |
| Medium | 1 | Existing Stripe event-ordering concern; reviewed, outside Phase 2B |
| Low | 1 | Existing past-due entitlement grace concern; reviewed, outside Phase 2B |

No source-grounded Critical or High vulnerability was found in the Phase 2B enrichment path. Local migration tests confirm owner-only read access, service-role-only claim execution, composite owner FK, and a rollout cap enforced under an advisory lock. The Gemini key and service-role key remain server-side. The internal worker route requires `CRON_SECRET` and multiple fail-closed rollout flags; it accepts no caller-supplied owner/item ID. Persisted X image URLs are restricted to HTTPS `pbs.twimg.com` without credentials or alternate ports. React renders Gemini strings as text.

## Medium — Existing Stripe webhook event ordering

**Classification:** Likely; dynamic confirmation requires an isolated Stripe test environment. `server/economics/live-stripe.ts` deduplicates event IDs but does not ensure a subscription event is newer than the last applied event. A delayed, valid, signed older event could overwrite newer state and restore or revoke Pro incorrectly. The webhook signature boundary remains intact. This predates Phase 2B and does not affect controlled-owner Gemini eligibility, which is set only by server environment. Recommended separate fix: monotonic per-subscription event ordering in an atomic database update. Do not modify production Stripe data as part of this rollout.

## Low — Existing past-due entitlement grace

**Classification:** Likely. `server/live-api.ts` can present Pro entitlements for a `past_due` subscription without checking a server-side grace deadline; X sync paths apply a stricter period check. The controlled Gemini rollout does not use this entitlement. Recommended separate product/billing decision to define and enforce a grace deadline consistently.

## Phase 2B Security Controls

- **Identity and ownership:** X sync uses a Supabase-verified user; enqueue re-queries owned saved-item IDs. A composite FK prohibits cross-user result rows. Reader/list API attaches only rows filtered by the verified user and database RLS.
- **Privileged operations:** Claim RPC requires current PostgREST service-role claims and revokes `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`. PostgreSQL grants permit authenticated SELECT only on owned enrichment rows.
- **Provider-cost control:** Disabled unless explicit Free Tier confirmation, owner UUID, API key, enable flag, and positive cap are present. Claim serialization and pending/processing/completed states prevent duplicate concurrent provider requests. Transient retry is bounded.
- **Privacy and SSRF:** No public Gemini endpoint or generic URL fetch. The server sends only controlled-owner stored content and allowlisted X image URLs; no bookmark text enters structured logs.
- **Client exposure:** No server secret markers were found in the Vite bundle. No tracked local secret file was found.

## False Positives and Scope Limits

GraphQL, XML parsing, file upload, RCE/eval, and dynamic template rendering surfaces were not found. User-controlled object IDs in bookmark/collection routes are scoped by verified `user.id` and RLS. Existing email preview `srcDoc` paths were reviewed in the XSS result; they do not execute Gemini output. This report does not assert that production environment variables, migration deployment, or Free Tier billing state have been verified remotely.

## Gate

**Static security gate: PASS for this candidate diff** (0 Critical, 0 High). The migration and service-role/anonymous RPC boundary were verified in the target database, controlled-owner environment variables were set, and the private 20-item stage completed successfully. The deployed candidate now has independent fail-closed `X_AUTO_SYNC_ENABLED` and `GEMINI_ENRICHMENT_ENABLED` controls; production X auto-sync is explicitly disabled. Both cron routes reject anonymous requests. Read-only production UI validation found no new X provider usage events or Gemini attempts. Existing Medium/Low billing issues remain documented for separate work.
