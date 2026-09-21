# Import economics rollout

## Migration plan

1. Apply `20260919000004_import_economics.sql` to Supabase. It snapshots existing users in `import_legacy_users` and existing X imports in `import_history`.
2. Choose the commercial values in `.env.example` and configure the corresponding server environment variables. Confirm the X estimated read price for the account and set global and per-user monthly budgets. Set `CRON_SECRET` before enabling the scheduled endpoint.
3. Create Stripe one-time prices for the configured packs and register `/api/billing/webhook` with the Stripe signing secret. Keep the existing subscription prices and billing webhooks.
4. Deploy code only after the migration and budget configuration are in place. Missing X cost or budget configuration blocks new X reads and leaves the saved library available.

## Policy

- A successful first import of a distinct `(user, X bookmark id)` consumes one credit in the same PostgreSQL transaction that creates `saved_items`. A duplicate or retry consumes none. `import_history` survives item deletion; reimport after deletion is free. A zero-credit wallet cannot start a provider read.
- The migration backfills import history from surviving `twitter` and `x` saved items. An item deleted before this migration has no recoverable import history and is treated as a first import if fetched again.
- Signup and migration grants use the same stable idempotency key per user. Existing accounts are those captured by the migration snapshot, including users with no bookmarks yet.
- Grants have separate buckets. Expiring buckets, if configured later, are consumed first; then oldest nonexpiring buckets. V1 signup, trial, monthly, migration, support, and purchased grants do not expire or reset. Monthly Pro allowances roll over; purchased credits never expire. Monthly allowance periods are UTC calendar months for both monthly and yearly Pro subscriptions. Trial allowance is separate and only granted when configured.
- Subscription status controls Recallly intelligence. The existing Import Credit ledger remains available for sources or metered capabilities that explicitly use it; X imports and ongoing X sync do not consume these credits. Downgrading does not remove existing balances.
- X usage is recorded independently of user credits. Each successful page records returned resources, request count, estimated unit cost and pricing version, imported count, and zero-yield status. Failed and malformed responses record conservative estimates. Provider reservations serialize global and user monthly budget checks. Unsettled reservations remain counted for the month and appear in internal metrics, so a failed ledger write cannot silently restore spending capacity; support can investigate stale reservations.
- Historical import is explicit and bounded by wallet, requested limit, configured maximum, page size, page count, and provider budget. A continuation cursor lets the user request the next bounded batch. If a run stops in the middle of a provider page, continuation repeats that page and deduplicates it, so unseen items are not skipped. The X API's result order is not assumed to be strictly newest-first; incremental sync does not stop at a known bookmark. This costs more than an unsafe early stop but avoids gaps when known and unknown items interleave.
- X's current bookmark endpoint allows 1–100 results per request, so a wallet with one credit requests one result; the integration uses `post.fields` and supports pagination tokens as documented by X.
- Automatic sync requires an active Pro subscription, credits, an X connection, recent enough activity, due interval, rate-limit clearance, and provider budget. Recent users are eligible daily, 7–30 day dormant users weekly, and older users monthly. Three zero-yield pages extend the minimum interval to 72 hours. The cron batch is bounded. Free users retain manual sync subject to credits and budget.
- Configurable priority ceilings reserve budget for paid manual work, then Pro Smart Sync, Free manual sync, and opportunistic work. The warning threshold emits an internal warning; the hard threshold stops all fresh X reads. Search and the existing library continue working.
- Refund events create an internal support review. No automatic reversal can make a wallet negative. Support can issue a positive compensating refund via `CreditService.refundCredits`.
- Demo mode remains the existing in-memory implementation and uses only sample X items. Local live mode and production both route through the credit and budget protected API. The production simulator is hidden.

## Internal metrics

The authenticated server-only `/api/internal/provider-metrics` endpoint reports monthly estimated X spend, reads, imports, reads per import, estimated cost per imported item and active user, today's reads, and zero-yield pages. The `import_pack_purchases`, `credit_ledger`, and `provider_usage_events` tables support pack revenue, credits outstanding, provider cost per user, and gross-margin analysis. No private bookmark content enters analytics events.

## Known deployment gates

The migration has not been applied by this repository change. No live Stripe charge or live X read is required for local validation. Keep `X_POST_READ_ESTIMATED_COST`, `X_API_MONTHLY_BUDGET`, and `X_API_USER_MONTHLY_BUDGET` accurate; blank values fail closed. Configure production pricing explicitly. `CRON_SECRET` is required for scheduled sync and internal metrics.

`npm run test:economics` runs mocked API tests and executes the new SQL migration in PGlite, covering grant replay, one-charge import, zero-balance rollback, provider reservation, and read-only RLS. PGlite is a local PostgreSQL-compatible runtime; production Supabase and a multi-connection race still require separate verification after migration deployment.

## X bookmark window and content compliance

- X's current official `GET /2/users/:id/bookmarks` reference documents OAuth access, pagination tokens, and `max_results` from 1 through 100. It does **not** publish a total retrievable-bookmark window. Recallly therefore uses the server-only `X_BOOKMARK_HISTORY_LIMIT` safeguard (default 800) as a product boundary, not as a claim about the number of bookmarks in a user's X account. It must be reviewed if X publishes an official total limit.
- The first import follows pagination until there is no next token or that configured boundary is reached. Later syncs use the same official endpoint and can add more items than the initial history boundary over time. X reads remain in `provider_usage_events`; X imports no longer consume user Import Credits. Existing balances, ledger entries, Stripe purchase records, and subscriptions are unchanged.
- The X Developer Policy requires stored X content to stay current and to be deleted or modified when it is deleted, modified, protected, suspended, withheld, or removed on X. Explicit partial API errors now mark content unavailable, replace cached post text, clear summaries and embeddings, and keep the external ID and Recallly-owned organization. Omission from a history page is not treated as deletion because it may be outside the accessible window. A scheduled reconciliation needs an official X mechanism that can identify a specific unavailable post; this endpoint alone cannot safely infer it.
- The present AI pipeline passes saved-item content to Gemini or OpenAI for enrichment, embeddings, summaries, semantic search, Ask Recallly, insights, and digests. The current policy page reviewed does not state a distinct AI/ML clause, but it does require a transparent privacy policy, express and informed consent for covered use, and lifecycle compliance. This is a material product/legal review item before enabling third-party AI processing for imported X content at scale; this patch does not silently disable the existing pipeline.
