import React, { useEffect, useState } from 'react';
import { DemoStoreProvider, useDemoStore } from './lib/store/demo-store';
import { RouterProvider, isPublicRoute, useRouter } from './lib/router';
import { getRouteSeo, usePageSeo } from './lib/seo';
import { AuthProvider, useAuth } from './lib/auth/auth-context';
import { AppSidebar } from './components/AppSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { Toast } from './components/Toast';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { CollectionModal } from './components/CollectionModal';
import { HomeDashboard } from './views/HomeDashboard';
import { BookmarkLibraryView } from './views/BookmarkLibraryView';
import { BookmarkDetailView } from './views/BookmarkDetailView';
import { CollectionsView } from './views/CollectionsView';
import { CollectionDetailView } from './views/CollectionDetailView';
import { AskAIView } from './views/AskAIView';
import { InsightsView } from './views/InsightsView';
import { DigestsView } from './views/DigestsView';
import { DigestDetailView } from './views/DigestDetailView';
import { SettingsView } from './views/SettingsView';
import { LandingPage } from './views/LandingPage';
import { PublicDemoView } from './views/PublicDemoView';
import { OnboardingView } from './views/OnboardingView';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/SignupView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { TermsView, PrivacyView } from './views/LegalViews';
import { BlogIndexView, BlogArticleView } from './views/BlogViews';
import { FaqView, HowItWorksView, PricingView } from './views/MarketingViews';
import { NotFoundView } from './views/NotFoundView';

const AuthenticatedApplication: React.FC = () => {
  const { route } = useRouter();
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

  return (
    <div id="recallly-app-root" className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col md:flex-row">
      <AppSidebar onOpenSearch={() => setIsSearchOpen(true)} />
      <MobileNavigation onOpenSearch={() => setIsSearchOpen(true)} />

      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full pb-20 md:pb-8">
        {route === 'dashboard' && <HomeDashboard onOpenSearch={() => setIsSearchOpen(true)} onOpenCreateCollection={() => setIsCreateCollectionOpen(true)} />}
        {route === 'bookmarks' && <BookmarkLibraryView />}
        {route === 'bookmark-detail' && <BookmarkDetailView />}
        {route === 'collections' && <CollectionsView onOpenCreateCollection={() => setIsCreateCollectionOpen(true)} />}
        {route === 'collection-detail' && <CollectionDetailView />}
        {route === 'ask' && <AskAIView />}
        {route === 'insights' && <InsightsView />}
        {route === 'digests' && <DigestsView />}
        {route === 'digest-detail' && <DigestDetailView />}
        {route === 'settings' && <SettingsView />}
      </main>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CollectionModal
        isOpen={isCreateCollectionOpen}
        onClose={() => setIsCreateCollectionOpen(false)}
        onSave={async (name, description, visibility) => {
          createCollection(name, description, visibility);
        }}
      />
      <Toast />
    </div>
  );
};

const AuthenticatedRoutes: React.FC = () => {
  const { route, navigate } = useRouter();
  const { authState, isAuthenticated, isDemo, user } = useAuth();
  const authPage = ['login', 'signup', 'forgot-password', 'reset-password', 'auth-callback'].includes(route);

  useEffect(() => {
    if (!authPage && authState === 'unauthenticated' && !isDemo) {
      const next = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [authPage, authState, isDemo, navigate]);

  if (route === 'login') return <LoginView />;
  if (route === 'signup') return <SignupView />;
  if (route === 'forgot-password') return <ForgotPasswordView />;
  if (route === 'reset-password') return <ResetPasswordView />;
  if (route === 'auth-callback') return <AuthCallbackView />;

  if (!isDemo && (authState === 'initializing' || !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] text-sm text-[#70706B]" role="status" aria-live="polite">
        Checking your session…
      </div>
    );
  }

  if (route === 'onboarding') return <OnboardingView />;

  return (
    <DemoStoreProvider key={user?.id || 'demo'}>
      <AuthenticatedApplication />
    </DemoStoreProvider>
  );
};

const RouteBoundary: React.FC = () => {
  const { route, params, navigate } = useRouter();
  const seo = React.useMemo(() => getRouteSeo(route, params), [route, params]);
  usePageSeo(seo);

  if (route === 'landing') {
    return (
      <LandingPage
        onExploreDemo={() => navigate('/demo')}
        onSignIn={() => navigate('/login')}
        onGoHome={() => navigate('/')}
        onStartOnboarding={() => navigate('/onboarding')}
      />
    );
  }
  if (route === 'terms') return <TermsView />;
  if (route === 'privacy') return <PrivacyView />;
  if (route === 'pricing') return <PricingView />;
  if (route === 'faq') return <FaqView />;
  if (route === 'how-it-works') return <HowItWorksView />;
  if (route === 'blog') return <BlogIndexView />;
  if (route === 'blog-article') return <BlogArticleView />;
  if (route === 'demo' || route === 'demo-bookmark') return <PublicDemoView />;
  if (route === 'not-found') return <NotFoundView />;

  // Authentication is mounted only for routes that use it. Public marketing,
  // legal, and demo routes do not hydrate private account or bookmark state.
  if (!isPublicRoute(route) || ['login', 'signup', 'forgot-password', 'reset-password', 'auth-callback'].includes(route)) {
    return (
      <AuthProvider>
        <AuthenticatedRoutes />
      </AuthProvider>
    );
  }

  return null;
};

export default function App() {
  return (
    <RouterProvider>
      <RouteBoundary />
    </RouterProvider>
  );
}
