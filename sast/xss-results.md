# XSS Analysis Results: Recallly

## Executive Summary

- HTML/JavaScript rendering and navigation candidates analyzed: 5
- Vulnerable: 0
- Likely Vulnerable: 0
- Needs Manual Review: 0
- Not Vulnerable: 5
- Severity: None

The new Gemini output fields and all existing browser/server rendering paths were reviewed. No source-grounded XSS vulnerability was found.

## Findings

### [NOT VULNERABLE] Gemini enrichment output is rendered through escaped React text nodes

- **Files**: `src/components/BookmarkCard.tsx:123`, `src/components/BookmarkCard.tsx:278`, `src/views/BookmarkDetailView.tsx:218`, `src/views/BookmarkLibraryView.tsx:238`
- **Components**: `BookmarkCard`, `BookmarkDetailView`, `BookmarkLibraryView`
- **Source**: Untrusted Gemini `summary`, `category`, `topics`, and `key_concepts`, validated and stored by `server/ai/gemini-v1.ts` and `server/ai/live-gemini-enrichment.ts`.
- **Reason**: Every displayed Gemini value is placed in normal JSX interpolation. React encodes text content; none reaches `dangerouslySetInnerHTML`, `srcDoc`, an event-handler attribute, script evaluation, or a URL sink.
- **Severity**: None.

### [NOT VULNERABLE] Settings digest preview `srcDoc` receives escaped server-generated HTML

- **File**: `src/views/SettingsView.tsx:951` and `src/views/SettingsView.tsx:995`
- **Component**: `SettingsView`
- **Sink**: `iframe srcDoc={emailPreviewHtml}`
- **Taint trace**: Digest and saved-bookmark fields -> digest email renderer -> HTTP response text -> `emailPreviewHtml` -> `srcDoc`.
- **Reason**: `server/background/email-provider.ts:119-230` applies `escapeHtml(...)` to every digest title, period, overview/summary, topic, key idea, author, bookmark summary/content, reason, recipient, and subject inserted into the HTML. The two link bases derive from the server-supplied application URL and the path identifier; no user text is interpreted as markup or script.
- **Severity**: None.
- **Hardening note**: Adding an iframe `sandbox` attribute would reduce impact if a future renderer adds active content or omits escaping. This is defense in depth and is not an exploitable finding in the reviewed code.

### [NOT VULNERABLE] Automation digest preview uses the same escaped renderer

- **File**: `src/components/BackgroundReliabilitySection.tsx:134` and `src/components/BackgroundReliabilitySection.tsx:435`
- **Component**: `BackgroundReliabilitySection`
- **Sink**: `iframe srcDoc={previewHtml}`
- **Taint trace**: Digest preview response -> `previewHtml` -> `srcDoc`.
- **Reason**: This is a second consumer of the same server-generated digest HTML described above. All untrusted textual fields are escaped before the response can reach the sink.
- **Severity**: None.
- **Hardening note**: A sandboxed preview iframe would provide an additional containment layer.

### [NOT VULNERABLE] OAuth callback page safely serializes dynamic data into script context

- **File**: `server/sources/x-live.ts:62-78`
- **Function**: `callbackPage`
- **Sink**: Interpolation into an inline `<script>` in an HTML response.
- **Taint trace**: OAuth result/error values -> `payload` -> `jsonForScript(...)` -> JavaScript literals.
- **Reason**: Values are JSON serialized, and every literal `<` is converted to `\\u003c`, preventing a value from closing the script element. The target origin is derived from a parsed, allowlisted HTTPS or localhost `APP_URL` configuration.
- **Severity**: None.

### [NOT VULNERABLE] Billing redirects receive provider-created HTTPS session URLs

- **Files**: `src/components/UpgradeModal.tsx:70`, `src/components/BillingSettingsSection.tsx:83`, `server/economics/live-stripe.ts:21-52`
- **Components**: `UpgradeModal`, `BillingSettingsSection`
- **Sink**: Assignment to `window.location.href`.
- **Taint trace**: Authenticated browser request -> server-side Stripe SDK session creation -> Stripe session `url` -> JSON response -> navigation.
- **Reason**: The destination is not accepted from request input. The backend creates the Checkout or customer-portal session through Stripe's SDK and returns the provider-generated session URL. Request values only select among allowlisted product and interval options and cannot set the redirect URL.
- **Severity**: None.

## Additional coverage

- Existing bookmark content and all Gemini fields use React JSX text interpolation.
- No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function` sink was found.
- Production X bookmark links are constructed with an `https://x.com/...` prefix in `server/sources/x-content.ts:168`; Stripe navigation URLs originate from Stripe sessions created server-side.

## Result

No vulnerabilities found.
