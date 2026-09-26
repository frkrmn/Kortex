# JWT Analysis Results: Recallly

## Executive Summary

- Verification sites analyzed: 2
- Vulnerable: 0
- Likely Vulnerable: 0
- Not Vulnerable: 2
- Needs Manual Review: 0

## Findings

### [NOT VULNERABLE] Production Supabase access-token validation
- **File**: `server/live-api.ts` (lines 18-37)
- **Endpoint / function**: `liveApi`
- **Reason**: The server sends the Bearer token to Supabase `auth.getUser` and uses only the verified returned user. It does not decode claims locally, accept `alg:none`, select keys from `kid`/`jku`/`x5u`, or use a local HMAC secret. Invalid/expired tokens and literal `demo_token` fail closed.

### [NOT VULNERABLE] Shared authentication middleware
- **File**: `server/security/auth-middleware.ts` (lines 15-38)
- **Endpoint / function**: `authenticateUser`
- **Reason**: Non-demo Bearer tokens are validated through Supabase `auth.getUser`; no unverified token payload is trusted. Production routing uses the stricter `liveApi` boundary.

## Lifecycle Notes

- Browser session persistence/refresh and logout are delegated to Supabase Auth.
- Static review cannot verify hosted Supabase access-token lifetime or project settings, but no application path bypasses Supabase token validation.
- Service-role RPC claim checks rely on claims supplied by the authenticated Supabase/PostgREST gateway and are paired with revoked client execution grants.
