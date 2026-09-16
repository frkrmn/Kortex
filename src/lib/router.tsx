import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type RouteType =
  | 'landing'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'auth-callback'
  | 'onboarding'
  | 'terms'
  | 'privacy'
  | 'dashboard'
  | 'bookmarks'
  | 'bookmark-detail'
  | 'collections'
  | 'collection-detail'
  | 'ask'
  | 'insights'
  | 'digests'
  | 'digest-detail'
  | 'settings';

interface RouterContextType {
  path: string;
  route: RouteType;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  navigate: (url: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

function parseRoute(pathname: string): { route: RouteType; params: Record<string, string> } {
  const cleanPath = pathname.replace(/\/$/, '') || '/';

  if (cleanPath === '/' || cleanPath === '') {
    return { route: 'landing', params: {} };
  }
  if (cleanPath === '/login') {
    return { route: 'login', params: {} };
  }
  if (cleanPath === '/signup') {
    return { route: 'signup', params: {} };
  }
  if (cleanPath === '/forgot-password') {
    return { route: 'forgot-password', params: {} };
  }
  if (cleanPath === '/reset-password') {
    return { route: 'reset-password', params: {} };
  }
  if (cleanPath === '/auth/callback' || cleanPath === '/auth-callback') {
    return { route: 'auth-callback', params: {} };
  }
  if (cleanPath === '/onboarding') {
    return { route: 'onboarding', params: {} };
  }
  if (cleanPath === '/terms') {
    return { route: 'terms', params: {} };
  }
  if (cleanPath === '/privacy') {
    return { route: 'privacy', params: {} };
  }
  if (cleanPath === '/dashboard') {
    return { route: 'dashboard', params: {} };
  }
  if (cleanPath === '/bookmarks') {
    return { route: 'bookmarks', params: {} };
  }
  const bmMatch = cleanPath.match(/^\/bookmarks\/([^/]+)$/);
  if (bmMatch) {
    return { route: 'bookmark-detail', params: { id: bmMatch[1] } };
  }
  if (cleanPath === '/collections') {
    return { route: 'collections', params: {} };
  }
  const colMatch = cleanPath.match(/^\/collections\/([^/]+)$/);
  if (colMatch) {
    return { route: 'collection-detail', params: { slug: colMatch[1] } };
  }
  if (cleanPath === '/ask' || cleanPath === '/ask-ai') {
    return { route: 'ask', params: {} };
  }
  if (cleanPath === '/insights') {
    return { route: 'insights', params: {} };
  }
  if (cleanPath === '/digests') {
    return { route: 'digests', params: {} };
  }
  const digMatch = cleanPath.match(/^\/digests\/([^/]+)$/);
  if (digMatch) {
    return { route: 'digest-detail', params: { id: digMatch[1] } };
  }
  if (cleanPath === '/settings') {
    return { route: 'settings', params: {} };
  }

  // Fallback default
  return { route: 'dashboard', params: {} };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((url: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
    setCurrentUrl(window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [pathname, search] = currentUrl.split('?');
  const searchParams = useMemo(() => new URLSearchParams(search || ''), [search]);
  const { route, params } = useMemo(() => parseRoute(pathname), [pathname]);

  const value = useMemo(
    () => ({
      path: pathname,
      route,
      params,
      searchParams,
      navigate,
    }),
    [pathname, route, params, searchParams, navigate]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
