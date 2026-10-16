# Task-scoped SAST: Public UI consistency and Interactive Demo

## Scope

Reviewed the new public landing/hash behavior, shared brand component, testimonial schema, Interactive Demo query/filter flows, Reader rendering, local JSON export, and public fixture assets. The existing architecture map in `sast/architecture.md` was used for trust-boundary context.

## Result

- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- XSS vulnerabilities: 0

## XSS sink/source review

1. URL query values in `PublicDemoView` (`view`, `q`, `category`, `topic`, `collection`) are compared with local allowlists or rendered through normal React JSX text interpolation. No value reaches `innerHTML`, `dangerouslySetInnerHTML`, script evaluation, or an event-handler attribute.
2. The landing hash is decoded defensively, resolved only through `document.getElementById`, and passed to `scrollIntoView`; it is never interpreted as markup or code.
3. Demo bookmark text, summaries, topics, concepts, collection names, and future approved testimonial strings use React's escaped text nodes.
4. The sample export uses `JSON.stringify` inside an `application/json` Blob and a fixed download filename. It does not execute or inject exported data into HTML.
5. Demo media and X links come from deterministic repository fixtures. Demo media paths are local; fixture source links are fixed HTTPS URLs. The Reader's `target="_blank"` link retains `rel="noopener noreferrer"`.
6. No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function` sink was introduced.

## Isolation review

`PublicDemoView` imports only static demo fixtures, routing, the shared Reader, and presentation components. It has no API client, Supabase, X, Gemini, Stripe, authenticated store, or persistence import. Browser coverage records network requests during Library, Search, AI Insights, Collections, Reader, and export interactions and fails on `/api/`, X API, Gemini, or Stripe traffic.

## Conclusion

No task-introduced security finding requires remediation. Existing authentication, provider, billing, persistence, and RLS boundaries were not changed.
