# Business Logic Analysis Results: Recallly (Phase 2B candidate)

## Executive Summary

- **Scope:** Stripe checkout/webhook state, X import and provider budgets, demo isolation, plan entitlements, and controlled Phase 2B Gemini enrichment.
- **Scenarios analyzed:** 9
- **Exploitable:** 0
- **Likely Exploitable:** 2
- **Needs Manual Review:** 0
- **Not Exploitable:** 7
- **Overall severity:** Medium.

Two billing-state weaknesses are likely under legitimate but delayed or prolonged Stripe lifecycle conditions. Neither allows an attacker to forge a Stripe event: the webhook signature check remains effective. Their impact is stale or extended Pro entitlement rather than direct payment theft.

## Findings

### [LIKELY EXPLOITABLE] Out-of-order Stripe subscription events can overwrite newer state

- **Severity:** Medium
- **Category:** Workflow ordering / stale event replay
- **File:** `server/economics/live-stripe.ts:54-99`; `supabase/migrations/20260918000001_phase11_billing_entitlements.sql:19-29`
- **Endpoint:** `POST /api/billing/webhook`
- **Business Rule Violated:** Subscription state should reflect the newest authoritative Stripe lifecycle event, regardless of webhook delivery order.
- **Issue:** Idempotency is enforced only per `event.id`. For every unseen `customer.subscription.created|updated|deleted` event, the handler unconditionally upserts the subscription row. It does not compare `event.created`, a subscription version, or a stored last-event timestamp before applying state. `billing_events` records individual event IDs but does not serialize events per subscription or prevent an older unseen event from applying after a newer one.
- **Concern:** Stripe webhook delivery is asynchronous and retries can arrive out of order. If a newer cancellation/deletion is applied first and an older signed `active` update arrives later, the older event can restore `plan: 'pro'` and active entitlements. The reverse ordering can also revoke access incorrectly. Exploitation requires control over timing of legitimate billing actions or naturally reordered delivery; an unsigned attacker cannot trigger it.
- **Proof:** The handler checks only whether the exact event ID is already marked `processed` (`live-stripe.ts:57-59`), derives plan/status from the event object (`:79-97`), and upserts on `user_id` without a freshness predicate (`:88-95`). The subscription schema shown in the migrations contains no `last_stripe_event_created` or equivalent monotonic field.
- **Remediation:** Store the last applied Stripe event creation time and event ID on the subscription. In one database transaction or conditional RPC, update only when `(event.created, event.id)` is newer than the stored tuple. For subscription events, retrieving the current subscription from Stripe before applying can further reduce stale payload risk, but the database still needs monotonic ordering for concurrent handlers.
- **Safe Dynamic Test:** In an isolated Stripe test environment, capture two correctly signed subscription events for the same subscription with different `created` values. Deliver the newer canceled/deleted event, then the older active event. The finding is confirmed if the database returns to `plan='pro', status='active'`. Do not run this against production.

### [LIKELY EXPLOITABLE] `past_due` Pro grace has no time bound in live entitlements

- **Severity:** Low
- **Category:** Entitlement lifecycle enforcement
- **File:** `server/live-api.ts:239-264`; `server/economics/smart-sync.ts:20-29`; `server/sources/x-live.ts:191-196`
- **Endpoint:** `GET /api/billing/entitlements` and features that trust its effective plan.
- **Business Rule Violated:** A payment grace period described as temporary should end at a defined server-side time.
- **Issue:** The live entitlement calculation considers every `plan='pro', status='past_due'` row Pro without checking `current_period_end` or a dedicated grace deadline (`server/live-api.ts:248-250`). This differs from X manual sync and Smart Sync, which require `current_period_end > now()` for past-due Pro treatment.
- **Concern:** If Stripe leaves an account past due for an extended retry schedule, or a later terminal webhook is delayed/lost, the entitlement response continues to advertise Pro limits indefinitely. The current Phase 2B enrichment rollout is owner/config controlled and does not directly consume this entitlement, so its exposure is limited to capabilities that use the live entitlement result or client gates.
- **Proof:** `periodValid` is calculated at `server/live-api.ts:248` but is applied only to `trialing`; `past_due` bypasses it at `:249`. The codebase comments describe past due as a grace period, and parallel X paths explicitly enforce period expiry.
- **Remediation:** Define a server-side past-due grace deadline, preferably from authoritative Stripe fields, and require `now < grace_end`. Apply the same helper everywhere entitlements are calculated. Default to Free when the deadline is missing or expired.
- **Safe Dynamic Test:** In an isolated database/test environment, create a signed-in test user with `plan='pro'`, `status='past_due'`, and `current_period_end` in the past. Call `GET /api/billing/entitlements`. The finding is confirmed if the response still reports `isPro: true` and Pro limits. Do not modify production billing records.

### [NOT EXPLOITABLE] Client-controlled Stripe product or price manipulation

- **Severity:** None
- **Category:** Price/product manipulation
- **File:** `server/live-api.ts:223-230`; `server/economics/live-stripe.ts:12-40,61-78`
- **Business Rule:** The server, not the browser, chooses payable Stripe prices and purchased credit quantity.
- **Protection:** Checkout accepts only enumerated pack keys or `pro` with a monthly/yearly interval, then maps to server environment price IDs. The signed completion event verifies user metadata, retrieves line items, and requires the configured price and quantity 1 before granting a server-configured credit amount. Credit grant idempotency uses the Checkout session ID.

### [NOT EXPLOITABLE] Duplicate credit grants from webhook retries

- **Severity:** None
- **Category:** Idempotency / duplicate execution
- **File:** `server/economics/live-stripe.ts:57-78`; `supabase/migrations/20260919000004_import_economics.sql:133-161`
- **Business Rule:** A paid Checkout session may grant a pack once.
- **Protection:** Processed Stripe event IDs short-circuit repeats, while the credit grant has an independent unique idempotency key `stripe:checkout:<session.id>` and validates that an existing key belongs to the same user. The purchase table also uses the session ID as primary key.

### [NOT EXPLOITABLE] Concurrent X sync provider-budget overspend

- **Severity:** None
- **Category:** Race condition / spend limit
- **File:** `server/sources/x-live.ts:229-259`; `supabase/migrations/20260919000004_import_economics.sql:211-253`
- **Business Rule:** Concurrent syncs must not exceed global or per-user X provider budgets.
- **Protection:** A compare-and-set timestamp lock prevents concurrent syncs on one account. The reservation RPC takes a provider/month advisory transaction lock, counts both settled usage and outstanding reservations, and atomically refuses reservations over global or user limits. Settlement is idempotent under a row lock.

### [NOT EXPLOITABLE] Browser requests a larger X history window

- **Severity:** None
- **Category:** Limit bypass
- **File:** `server/live-api.ts:53-63`; `server/sources/x-live.ts:167-205`
- **Business Rule:** The server controls initial history depth and ongoing page size.
- **Protection:** The API validates a positive safe-integer limit. During initial import the service ignores the client limit and uses the deployment history cap; ongoing requests are bounded to 100 and provider/config limits. The client `historical` flag is not used to choose initial-history status.

### [NOT EXPLOITABLE] X E2E budget bypass by a regular caller

- **Severity:** None
- **Category:** Test-mode bypass
- **File:** `server/live-api.ts:58-63`; `server/sources/x-e2e-allowlist.ts:1-16`
- **Business Rule:** Only explicitly configured test identities may bypass provider preflight accounting.
- **Protection:** The server passes the Supabase-verified user object into an exact, normalized server-environment email allowlist. Broad sentinels such as `*`, `all`, `true`, and `development` are rejected. The request cannot supply or override the allowlist identity.

### [NOT EXPLOITABLE] Concurrent Gemini workers exceed the Phase 2B rollout cap

- **Severity:** None
- **Category:** Race condition / external-cost cap
- **File:** `server/ai/live-gemini-enrichment.ts:85-89,148-178`; `supabase/migrations/20260926000008_gemini_enrichments.sql:45-79`
- **Business Rule:** Concurrent cron/backfill workers must not claim more controlled-owner items than the configured rollout cap.
- **Protection:** Each claim receives the rollout cap. The service-role-only RPC serializes claims per owner with a transaction advisory lock and counts `processing` plus `completed` rows before selecting one with `FOR UPDATE SKIP LOCKED`. This closes the stale application-count race across invocations.

### [NOT EXPLOITABLE] Gemini caller selects an arbitrary owner or saved item

- **Severity:** None
- **Category:** Workflow/allowlist bypass
- **File:** `server/ai/live-gemini-enrichment.ts:16-70,85-100,148-178`
- **Business Rule:** Phase 2B may process only the configured controlled owner's eligible X bookmarks.
- **Protection:** Owner UUID, enablement flags, model key, batch size, concurrency, and cap all come from server environment. Enqueue re-queries saved items by that owner and Twitter source. Processing re-checks saved-item ID, owner, source, and availability before calling Gemini. Neither the cron route nor browser supplies an owner or item ID.

### [NOT EXPLOITABLE] Demo fixture state grants production access or billing entitlement

- **Severity:** None
- **Category:** Environment/workflow bypass
- **File:** `server.ts:44-104`; `server/live-api.ts:21-29`; `src/lib/repositories/index.ts:32-49`
- **Business Rule:** Browser-local demo state must not be accepted as live authentication or entitlement.
- **Protection:** Production configuration routes requests into `liveApi`, which requires Supabase and explicitly rejects `demo_token`. File-backed demo handlers are available only in demo mode and only to loopback clients. Demo repository data remains browser/local fixture state and is not used by live service-role billing, X, or Gemini paths.

## Validation Notes

- Static assessment only; no production calls, Stripe deliveries, provider requests, or secrets were used.
- The two likely findings depend on provider lifecycle timing. Their classifications avoid claiming a direct unauthenticated exploit.
- The Phase 2B files changed during the candidate review to add an atomic cap check in `claim_gemini_enrichment`; this report reflects the final reviewed worktree state.
