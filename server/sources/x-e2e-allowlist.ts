type AuthenticatedUser = { email?: string | null };

const blockedSentinels = new Set(['*', 'all', 'true', 'development']);

function normalizedAllowlist(): Set<string> {
  const configured = process.env.X_E2E_TEST_USER_EMAILS || '';
  return new Set(configured.split(',')
    .map(value => value.trim().toLowerCase())
    .filter(value => value.includes('@') && !blockedSentinels.has(value)));
}

/** Server-only decision. The caller must pass the user returned by auth.getUser(). */
export function isXSyncE2ETestUser(user: AuthenticatedUser | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  return Boolean(email && normalizedAllowlist().has(email));
}
