import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth/auth-context';
import { useRouter } from './lib/router';
import { DemoStoreProvider, useDemoStore } from './lib/store/demo-store';
import { AppSidebar } from './components/AppSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { Toast } from './components/Toast';

const HomeDashboard = lazy(() => import('./views/HomeDashboard').then((module) => ({ default: module.HomeDashboard })));
const BookmarkLibraryView = lazy(() => import('./views/BookmarkLibraryView').then((module) => ({ default: module.BookmarkLibraryView })));
const BookmarkDetailView = lazy(() => import('./views/BookmarkDetailView').then((module) => ({ default: module.BookmarkDetailView })));
const CollectionsView = lazy(() => import('./views/CollectionsView').then((module) => ({ default: module.CollectionsView })));
const CollectionDetailView = lazy(() => import('./views/CollectionDetailView').then((module) => ({ default: module.CollectionDetailView })));
const SettingsView = lazy(() => import('./views/SettingsView').then((module) => ({ default: module.SettingsView })));
const OnboardingView = lazy(() => import('./views/OnboardingView').then((module) => ({ default: module.OnboardingView })));
const LoginView = lazy(() => import('./views/LoginView').then((module) => ({ default: module.LoginView })));
const SignupView = lazy(() => import('./views/SignupView').then((module) => ({ default: module.SignupView })));
const ForgotPasswordView = lazy(() => import('./views/ForgotPasswordView').then((module) => ({ default: module.ForgotPasswordView })));
const ResetPasswordView = lazy(() => import('./views/ResetPasswordView').then((module) => ({ default: module.ResetPasswordView })));
const AuthCallbackView = lazy(() => import('./views/AuthCallbackView').then((module) => ({ default: module.AuthCallbackView })));
const GlobalSearchModal = lazy(() => import('./components/GlobalSearchModal').then((module) => ({ default: module.GlobalSearchModal })));
const CollectionModal = lazy(() => import('./components/CollectionModal').then((module) => ({ default: module.CollectionModal })));

const ViewLoading: React.FC = () => <div className="flex min-h-48 items-center justify-center text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">Loading…</div>;

const AuthenticatedApplication: React.FC = () => {
  const { route, navigate } = useRouter();
  const { createCollection } = useDemoStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (['ask', 'insights', 'digests', 'digest-detail'].includes(route)) navigate('/dashboard', { replace: true });
  }, [navigate, route]);

  return (
    <div id="recallly-app-root" className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col md:flex-row">
      <AppSidebar onOpenSearch={() => setIsSearchOpen(true)} />
      <MobileNavigation onOpenSearch={() => setIsSearchOpen(true)} />
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full pb-20 md:pb-8">
        <Suspense fallback={<ViewLoading />}>
          {route === 'dashboard' && <HomeDashboard onOpenSearch={() => setIsSearchOpen(true)} onOpenCreateCollection={() => setIsCreateCollectionOpen(true)} />}
          {route === 'bookmarks' && <BookmarkLibraryView />}
          {route === 'bookmark-detail' && <BookmarkDetailView />}
          {route === 'collections' && <CollectionsView onOpenCreateCollection={() => setIsCreateCollectionOpen(true)} />}
          {route === 'collection-detail' && <CollectionDetailView />}
          {route === 'settings' && <SettingsView />}
        </Suspense>
      </main>
      {isSearchOpen && <Suspense fallback={null}><GlobalSearchModal isOpen onClose={() => setIsSearchOpen(false)} /></Suspense>}
      {isCreateCollectionOpen && <Suspense fallback={null}><CollectionModal isOpen onClose={() => setIsCreateCollectionOpen(false)} onSave={async (name, description, visibility) => { await createCollection(name, description, visibility); }} /></Suspense>}
      <Toast />
    </div>
  );
};

const AuthenticatedRouteContent: React.FC = () => {
  const { route, navigate } = useRouter();
  const { authState, isAuthenticated, isDemo, user } = useAuth();
  const authPage = ['login', 'signup', 'forgot-password', 'reset-password', 'auth-callback'].includes(route);
  const canRenderAccountRoute = isDemo || (authState !== 'initializing' && isAuthenticated);

  useEffect(() => {
    if (!authPage && authState === 'unauthenticated' && !isDemo) {
      const next = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [authPage, authState, isDemo, navigate]);

  return (
    <Suspense fallback={<ViewLoading />}>
      {route === 'login' && <LoginView />}
      {route === 'signup' && <SignupView />}
      {route === 'forgot-password' && <ForgotPasswordView />}
      {route === 'reset-password' && <ResetPasswordView />}
      {route === 'auth-callback' && <AuthCallbackView />}
      {!authPage && !canRenderAccountRoute && <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">Checking your session…</div>}
      {!authPage && canRenderAccountRoute && route === 'onboarding' && <OnboardingView />}
      {!authPage && canRenderAccountRoute && route !== 'onboarding' && <DemoStoreProvider key={user?.id || 'demo'}><AuthenticatedApplication /></DemoStoreProvider>}
    </Suspense>
  );
};

export default function AuthenticatedRoutes() {
  return <AuthProvider><AuthenticatedRouteContent /></AuthProvider>;
}
