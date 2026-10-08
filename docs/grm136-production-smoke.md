# GRM-136 production browser smoke

The Playwright suite verifies the critical authenticated Find Again journeys established as real by GRM-133. It uses a dedicated email/password account and is read-only except for session creation and the final isolated logout.

## Required environment

- `E2E_BASE_URL`: target origin. Local default is `http://127.0.0.1:3000`; production default is `https://kortexmarks.vercel.app` when `E2E_MODE=production`.
- `E2E_USER_EMAIL`: dedicated controlled smoke account.
- `E2E_USER_PASSWORD`: that account's password.

Never use the founder's primary account. The controlled account should have at least one enriched bookmark and may have zero or more collections. Credentials belong in local/CI secrets, never source control.

Authentication setup checks the owned `/api/bookmarks` response before the other authenticated tests. It requires at least one bookmark and one completed enrichment with a summary, category, and topic. Failure reports aggregate counts only. Empty data is an account prerequisite failure; the suite never syncs X or invokes Gemini to populate it.

## Commands

```sh
# Local/pre-deploy: builds, starts the live API development server, and runs all projects.
npm run test:e2e

# Production: read-only authenticated suite plus isolated final logout.
npm run test:e2e:production

# Safe when credentials have not been configured yet.
npm run test:e2e:production:unauthenticated
```

Install the matching browser once with `npx playwright install chromium`.

## Safety model

- Tests never click X connect/sync/import, AI generation, Stripe checkout/portal, export, collection mutations, or email actions.
- The network guard fails if the browser contacts X, Gemini, Stripe, Resend, cron, enrichment, digest-generation, or provider-triggering application endpoints.
- Authentication storage is written only to `.e2e/auth/user.json`, which is ignored by Git.
- The logout project runs after authenticated tests. It may revoke the ephemeral stored session; the setup project recreates it on the next run.
- Production retries are disabled so deterministic account or product failures are reported once.
- Traces, screenshots, and video are disabled in all modes to prevent cookies, tokens, email addresses, or account data entering artifacts. Diagnostics contain only sanitized same-origin paths, HTTP/network categories, and console error locations.

The suite intentionally does not mutate bookmarks or collections, click external X links, test provider integrations, start checkout, send email, or replace the lower-level collection authorization regression.

## Failure diagnosis

Start with the failing test and its `sanitized-browser-health.json` attachment when present. It reports page exceptions, relevant console errors, same-origin API failures, and forbidden provider activity without response bodies, query strings, cookies, or request headers.

Browser health records the current route and network error category. A canceled background `GET /api/integrations/x/status` during navigation is ignored only when Chromium reports `net::ERR_ABORTED`; an HTTP error or another network failure still fails. Connected Sources must render a successful connection/disconnection state.

For authentication failures, verify the dedicated account can sign in with email/password and has an active library. Do not bypass authentication or commit a storage-state file.
