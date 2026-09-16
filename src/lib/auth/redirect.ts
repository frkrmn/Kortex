/**
 * Safe redirect validator to prevent open redirect vulnerabilities.
 * Ensures the 'next' parameter points strictly to an internal relative route within Recallly.
 */
export function sanitizeRedirectPath(nextPath: string | null | undefined, fallback = '/dashboard'): string {
  if (!nextPath) return fallback;

  try {
    // Decode URI component if encoded
    const decoded = decodeURIComponent(nextPath).trim();

    // Disallow absolute protocol URLs (http://, https://, javascript:, data:)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
      return fallback;
    }

    // Disallow protocol-relative URLs (//example.com)
    if (decoded.startsWith('//') || decoded.startsWith('\\\\')) {
      return fallback;
    }

    // Must begin with a single slash
    if (!decoded.startsWith('/')) {
      return fallback;
    }

    // Don't redirect back to login/signup/auth pages to prevent loops
    const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];
    const pathOnly = decoded.split('?')[0];
    if (authPages.includes(pathOnly)) {
      return fallback;
    }

    return decoded;
  } catch {
    return fallback;
  }
}
