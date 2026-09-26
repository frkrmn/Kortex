# Architecture: Recallly (Phase 2B candidate)

## Scope

Fresh security reconnaissance of the isolated `rich-x-production-validation` worktree at `4c846ba` plus the Phase 2B diff. This is an architecture map; findings belong in the vulnerability results. The main development worktree is preserved.

## Technology Stack

| Area | Current implementation |
|---|---|
| Browser | React 19, TypeScript, Vite 6, Tailwind 4, custom router, demo and Supabase repositories |
| API | Node/Express 4 in `server.ts` and `server/vercel-api.ts`, bundled for Vercel |
| Database | Supabase PostgreSQL, PostgREST, Auth, RLS, PL/pgSQL RPCs |
| Authentication | Supabase JWT validated by `db.auth.getUser`; user JWT used for RLS queries |
| Providers | Official X API/OAuth, Stripe, Google Gemini, Resend |
| Jobs | Existing daily Smart Sync cron; new dedicated controlled Gemini cron and private backfill CLI |
| Packages | npm with `package-lock.json`; `@google/genai`, `@supabase/supabase-js`, Zod |

## Architecture Overview

The Vite browser app calls `/api` with a Supabase access token. `server/live-api.ts` validates the token through Supabase Auth and uses a caller-JWT database client for normal CRUD. X OAuth and sync use the server service-role key because encrypted provider credentials and privileged import RPCs must not reach the browser. The browser also has an isolated fixture/demo mode; the production API rejects `demo_token`.

The new enrichment path is separate from legacy file-backed `server/ai/enrichment-pipeline.ts`. After `syncLiveX` persists new `saved_items`, `liveApi` may enqueue owner-scoped `saved_item_enrichments` rows. Enqueue failure is caught after sync completion. A cron-secret internal route or private CLI claims pending rows through `claim_gemini_enrichment`; the claim RPC requires a service-role JWT claim and atomically changes one row to processing. The worker reads a saved item only for a configured controlled-owner UUID, calls the fixed `gemini-3.5-flash-lite` model with text and allowed persisted public X image URLs, validates structured JSON, and writes summary/category/topics/key concepts back to the enrichment table. The rollout is disabled unless multiple server-only flags, owner UUID, API key, and positive cap are set. No public enqueue or arbitrary Gemini endpoint exists.

`saved_item_enrichments` has a composite FK `(saved_item_id,user_id)` to `saved_items`, unique versioned result key, owner-only SELECT RLS, no authenticated mutation grant, and service-role write access. Authenticated bookmark reads attach enrichment rows filtered by verified user ID. The browser displays the supplemental fields; original X content remains the primary reader content. Only completed results contribute to category counts.

## Entry Points

| Entry point | Trust required | Purpose |
|---|---|---|
| `/api/health` | public | Liveness |
| `/api/integrations/x/callback` | one-use OAuth state + binding cookie | X token exchange |
| `/api/billing/webhook` | Stripe signature/raw body | Subscription state |
| `/api/internal/smart-sync` | `CRON_SECRET` | Existing scheduled X sync |
| `/api/internal/gemini-enrichment` | `CRON_SECRET` + server rollout config | Bounded Gemini work |
| `/api/internal/provider-metrics` | `CRON_SECRET` | Internal X cost metrics |
| `scripts/run-controlled-gemini-enrichment.ts` | server shell + owner env | Bounded private backfill |
| Other `/api/*` | verified Supabase JWT | Owner-scoped library, sources, billing, usage |

## Data Flows and Trust Boundaries

1. **Browser → API:** untrusted headers/query/body. The API verifies JWT server-side and derives `user.id`; it never takes an enrichment destination user from the client.
2. **API → Supabase:** regular requests use the caller JWT and RLS. X and Gemini privileged operations use `SUPABASE_SERVICE_ROLE_KEY` server-side only.
3. **X → API → database:** official bookmarks response is untrusted external content, normalized and imported through an authorized service-role RPC. Provider accounting and uniqueness remain in place.
4. **Database → Gemini:** stored controlled-owner content and allowlisted X image URLs are sent via the server SDK. X content is treated as data, not instructions. Gemini output is untrusted JSON validated against a strict schema.
5. **Gemini → database → browser:** only validated structured fields are stored. Owner RLS and explicit user filters protect reads. React renders strings as text.
6. **Stripe → API:** signed webhook is authoritative for subscription state. Gemini rollout flags are independent of client-controlled plan fields.
7. **Demo → real signup:** demo fixture state is browser-local and does not confer real entitlement or Gemini access.

## Sensitive Data Inventory

| Data | Storage | Boundary |
|---|---|---|
| X access/refresh tokens | encrypted in `connected_accounts` | service-role backend only |
| Supabase service-role key | server environment | never browser bundled |
| Gemini API key | server environment | worker/CLI only |
| Bookmark text and media metadata | `saved_items` | owner RLS; controlled owner may be sent to Gemini |
| Gemini summaries/topics/concepts | `saved_item_enrichments` | owner SELECT RLS; server-only writes |
| Stripe secrets and billing state | server environment/PostgreSQL | signed webhook, owner billing reads |
| Email provider key/content | server environment/digest jobs | trusted delivery path |

## Security-Sensitive Review Priorities

The new attack surface is the privileged claim RPC, the internal cron route, server environment allowlist/cap, composite ownership FK, provider URL allowlist, model output validation, and enrichment serialization into user-facing views. Legacy X/Stripe/auth surfaces remain part of the full scan because this is a release gate.
