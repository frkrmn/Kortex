# JWT Recon: Recallly

## Summary

JWT is used as a Supabase-issued access token. Recallly does not issue, decode, or cryptographically verify JWTs locally.

- **Library**: `@supabase/supabase-js`
- **Custom JWT library**: none (`jsonwebtoken` and `jose` are absent)
- **Application issuance sites**: 0
- **Application verification sites**: 2

## Issuance

Signup, password login, Google OAuth, refresh, and logout are delegated to Supabase Auth in `src/lib/auth/auth-context.tsx`.

## Verification Sites

### 1. Production API gate
- **File**: `server/live-api.ts` (lines 18-37)
- **Function**: `liveApi`
- **Verification**: strict Bearer parsing followed by `db.auth.getUser(bearer)`
- **Identity used**: verified returned `user.id`

### 2. Shared authentication middleware
- **File**: `server/security/auth-middleware.ts` (lines 15-38)
- **Function**: `authenticateUser`
- **Verification**: `supabase.auth.getUser(token)`
- **Identity used**: verified returned user

## Database Claim Checks

Privileged Supabase RPCs inspect gateway-populated JWT claims to require `service_role`. These functions execute behind PostgREST/Supabase JWT verification and do not accept a client-provided raw claim object as an argument. Phase 2B `claim_gemini_enrichment` also revokes public/authenticated execution and checks the parsed service-role claim.
