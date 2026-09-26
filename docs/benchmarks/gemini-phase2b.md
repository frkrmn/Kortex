# Gemini production enrichment — controlled rollout

Phase 2B adds versioned, owner-scoped enrichment records. It does not alter X OAuth, the bookmark request, the import RPC, SavedItem content, or existing provider accounting. The approved Phase 2A instruction and four-field output are retained; `Books` is the only taxonomy addition.

## Rollout order

1. Review and deploy the application diff and apply `supabase/migrations/20260926000008_gemini_enrichments.sql`. Verify the service-role claim RPC grants and owner RLS in the target database.
2. Complete the full SAST and application checks. `sast/final-report.md` records the static scan; verify the deployed artifact matches the reviewed candidate.
3. Set server-only `GEMINI_ENRICHMENT_OWNER_USER_ID` to the controlled account UUID, `GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED=true`, `GEMINI_ENRICHMENT_ROLLOUT_CAP=20`, and `GEMINI_ENRICHMENT_ENABLED=true`. Keep the Gemini key server-only. Defaults are disabled, cap zero, batch five, concurrency one.
4. Run `node --import tsx scripts/run-controlled-gemini-enrichment.ts 20` once from a trusted server shell. The script queues at most 20 eligible owner X bookmarks and runs bounded batches. It does not call X or modify `saved_items`.
5. Inspect the printed aggregate state and server-side rows. Stop on provider/schema failures. Do not raise the cap or process the next 50 until the owner reviews Stage 1.

The daily internal worker route requires `CRON_SECRET`. It returns a harmless disabled result until the owner-specific server settings are enabled. The database claim function enforces the rollout cap across concurrent worker invocations.

This file contains no private bookmark text, account UUID, or credentials. The separate Phase 2A benchmark artifacts remain gitignored.

## Controlled Stage 1 observation — 2026-09-26

The target database migration was verified with a read-only table query and a zero-cap RPC call. `service_role` could execute the RPC; an anonymous call was rejected with `42501`. Local migration tests also verify the `authenticated` and PUBLIC privilege boundary.

The private runner queued 20 existing owner bookmarks and processed exactly 20. All 20 completed, with 0 failures and 0 retries. Provider usage was 9,200 input tokens and 2,214 output tokens. Categories were AI 4, Business 2, Engineering 2, Finance 2, Marketing 1, Other 2, Books 6, and Crypto 1. A read-only follow-up confirmed 20 unique completed rows under the controlled owner, valid v1 provenance, summaries, topics, and key concepts. X API calls were 0; `saved_items` were not modified.

Stage 1 was run from the private server runner before application deployment. No additional Gemini items may be processed without explicit Stage 2 approval.

## Deployment and cron isolation — 2026-09-26

The existing production schedule was `/api/internal/smart-sync` at 08:00 UTC. This route previously treated an absent `X_SYNC_ENABLED` as enabled, so setting `CRON_SECRET` alone could activate X requests. The new `X_AUTO_SYNC_ENABLED` control defaults to disabled and is checked inside both Smart Sync and the background scheduler; the legacy `X_SYNC_ENABLED=false` remains a kill switch. Manual X sync is unaffected. Gemini uses its own fail-closed owner, Free Tier, enabled, and rollout-cap controls. A shared `CRON_SECRET` remains authentication only.

Production now explicitly has `X_AUTO_SYNC_ENABLED=false` and a server-only cron secret. The Phase 2B candidate was deployed as Vercel deployment `dpl_FPzbhDToJqMiPshxVCJFzRMkFHxc`, aliased to `kortexmarks.vercel.app`. Vercel lists both daily schedules after deployment. Anonymous requests to each internal route returned 401. The controlled owner is still capped at 20 completed enrichments; both cron and private worker claims return no additional work at this cap.

In the controlled authenticated production browser, Library displayed All 323 and Books 6. Books filtering returned only six cards; selecting one of its topics reduced the set to two; a category-scoped unmatched search returned zero while retaining Books. A completed image bookmark Reader displayed the original content, stored AI summary and topic text, category, X source link, and loaded image. An unenriched bookmark remained readable. A database check after the UI visit found zero X provider usage events since deployment and the same 20 completed Gemini rows with 20 total attempts. No next-stage enrichment was run.
