/**
 * Safe redirect validator to prevent open redirect vulnerabilities.
 * Ensures the 'next' parameter points strictly to an internal relative route within Find Again.
 */
export function sanitizeRedirectPath(nextPath: string | null | undefined, fallback = '/dashboard'): string {
  if (!nextPath) return fallback;

  try {
    // Decode exactly once. Double-encoded or malformed input is rejected below.
    const decoded = decodeURIComponent(nextPath).trim();

    if (/[%\\\u0000-\u001F\u007F]/.test(decoded)) {
      return fallback;
    }

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

    // Don't redirect back to login/signup/auth pages to prevent loops.
    const authPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];
    const parsed = new URL(decoded, 'https://find-again.invalid');
    if (parsed.origin !== 'https://find-again.invalid') return fallback;
    const pathOnly = parsed.pathname.replace(/\/$/, '') || '/';
    if (authPages.includes(pathOnly)) {
      return fallback;
    }

    // Return destinations are intentionally limited to real Find Again pages.
    // This prevents callbacks from becoming a trampoline to APIs or future
    // routes that were never designed as post-auth destinations.
    const exactRoutes = new Set([
      '/', '/dashboard', '/bookmarks', '/collections', '/settings', '/onboarding',
      '/demo', '/pricing', '/faq',
      '/how-it-works', '/terms', '/privacy',
    ]);
    const dynamicRoute = /^\/(?:bookmarks|collections)\/[^/]+$/.test(pathOnly)
      || /^\/demo\/bookmarks\/[^/]+$/.test(pathOnly);
    if (!exactRoutes.has(pathOnly) && !dynamicRoute) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
