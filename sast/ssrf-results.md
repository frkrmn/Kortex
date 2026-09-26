# SSRF Analysis Results: Recallly

## Executive Summary

- Outbound call groups analyzed: 9
- Vulnerable: 0
- Likely Vulnerable: 0
- Not Vulnerable: 9
- Needs Manual Review: 0

## Findings

### [NOT VULNERABLE] Official X API requests
- **Files**: `server/sources/x-live.ts` (lines 135-140, 210-220, 261-272); `server/sources/x-sync-engine.ts` (lines 268-296, 393-409)
- **Reason**: Scheme and host are literal official X endpoints. Provider IDs are encoded path segments, and pagination values become query parameters; neither can replace the URL origin.

### [NOT VULNERABLE] Resend and OpenAI requests
- **Files**: `server/background/email-provider.ts` (lines 52-60); `server/ai/openai-provider.ts` (lines 18-29, 114-124)
- **Reason**: Each destination is a fixed literal provider endpoint. User data affects request bodies only.

### [NOT VULNERABLE] Gemini text operations
- **Files**: `server/ai/gemini-provider.ts`; `server/ai/rag-service.ts`
- **Reason**: The Google SDK selects the provider destination. User content controls prompts, not the URL, hostname, scheme, or port.

### [NOT VULNERABLE] Controlled Gemini image inputs
- **Files**: `server/ai/x-media-urls.ts` (lines 1-15); `server/ai/gemini-v1.ts` (lines 22-27); `server/ai/live-gemini-enrichment.ts` (lines 92-107)
- **Reason**: `publicXImageUrls` accepts only `https:`, exact `pbs.twimg.com`, default/443 port, and no URL credentials, with at most four images. The application itself does not fetch these URLs. Stored external media cannot select an internal or arbitrary host.

### [NOT VULNERABLE] Stripe/Supabase SDK traffic
- **Files**: `server/economics/live-stripe.ts`; `server/economics/credit-service.ts`; `server/live-api.ts`
- **Reason**: Provider configuration comes from server environment or SDK defaults. No HTTP request field influences those base destinations.

No source-grounded SSRF path was found.
