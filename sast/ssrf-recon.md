# SSRF Recon: Recallly

## Summary

Found 9 outbound network call groups in production/server code. SDK calls are grouped by provider because their network destinations are selected inside the SDK rather than by application request data.

## Outbound Call Sites

### 1. X OAuth token exchange and profile
- **File**: `server/sources/x-live.ts` (lines 135-140)
- **Function**: `handleXCallback`
- **Call type**: HTTPS POST/GET via `fetch`
- **Destination**: literal `https://api.x.com/...` endpoints

### 2. X token refresh
- **File**: `server/sources/x-live.ts` (lines 210-220)
- **Function**: `syncLiveX`
- **Call type**: HTTPS POST via `fetch`
- **Destination**: literal `https://api.x.com/2/oauth2/token`

### 3. X bookmark pagination
- **File**: `server/sources/x-live.ts` (lines 261-272)
- **Function**: `syncLiveX`
- **Call type**: HTTPS GET via `fetch`
- **Destination**: literal X host/path; provider user ID is path encoded and pagination fields are query parameters

### 4. Legacy X sync engine
- **File**: `server/sources/x-sync-engine.ts` (lines 268-296, 393-409)
- **Function**: OAuth exchange/refresh
- **Call type**: HTTPS via `fetch`
- **Destination**: literal official X/Twitter API hosts

### 5. Resend email delivery
- **File**: `server/background/email-provider.ts` (lines 52-60)
- **Function**: `ResendEmailProvider.send`
- **Call type**: HTTPS POST via `fetch`
- **Destination**: literal `https://api.resend.com/emails`

### 6. OpenAI provider
- **File**: `server/ai/openai-provider.ts` (lines 18-29, 114-124)
- **Function**: chat completions and embeddings
- **Call type**: HTTPS POST via `fetch`
- **Destination**: literal OpenAI API endpoints

### 7. Gemini provider SDK calls
- **File**: `server/ai/gemini-provider.ts`; `server/ai/rag-service.ts`
- **Function**: generate content, chat, digest, embeddings
- **Call type**: Google GenAI SDK
- **Destination**: SDK/provider controlled; application supplies model/input, not a base URL

### 8. Controlled Gemini enrichment with X images
- **File**: `server/ai/live-gemini-enrichment.ts` (lines 85-107, 142-173); `server/ai/gemini-v1.ts` (lines 22-27); `server/ai/x-media-urls.ts` (lines 1-15)
- **Function**: `processClaim`
- **Call type**: Google GenAI SDK with remote image URI
- **Destination**: stored media URL after strict HTTPS, hostname, port, and credential allowlist

### 9. Stripe and Supabase SDK calls
- **File**: `server/economics/live-stripe.ts`; `server/economics/credit-service.ts`; `server/live-api.ts`
- **Function**: billing and database/auth operations
- **Call type**: provider SDK
- **Destination**: Stripe SDK defaults or server environment `VITE_SUPABASE_URL`; no request field selects a destination
