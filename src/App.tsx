import React, { useState, useEffect } from 'react';
import { DemoStoreProvider, useDemoStore } from './lib/store/demo-store';
import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './lib/auth/auth-context';
import { AppSidebar } from './components/AppSidebar';
import { MobileNavigation } from './components/MobileNavigation';
import { Toast } from './components/Toast';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { CollectionModal } from './components/CollectionModal';

// Views
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
import { OnboardingView } from './views/OnboardingView';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/SignupView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { TermsView, PrivacyView } from './views/LegalViews';

const AppContent: React.FC = () => {
  const { route, navigate } = useRouter();
  const { isLoading, isAuthenticated, isDemo } = useAuth();
  const { createCollection } = useDemoStore();

  const protectedRoute = !['landing', 'login', 'signup', 'forgot-password', 'reset-password',
    'auth-callback', 'terms', 'privacy'].includes(route);

  useEffect(() => {
    if (protectedRoute && !isLoading && !isAuthenticated && !isDemo) {
      const next = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [protectedRoute, isLoading, isAuthenticated, isDemo, navigate]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);

  // Global CMD+K / CTRL+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (protectedRoute && !isDemo && (isLoading || !isAuthenticated)) {
    return <div className="min-h-screen bg-[#FAFAF8]" />;
  }

  // Landing Page Route
  if (route === 'landing') {
    return (
      <LandingPage
        onEnterApp={() => navigate('/dashboard')}
        onStartOnboarding={() => navigate('/onboarding')}
      />
    );
  }

  // Full-page Non-shell Routes
  if (route === 'onboarding') {
    return <OnboardingView />;
  }

  if (route === 'login') {
    return <LoginView />;
  }

  if (route === 'signup') {
    return <SignupView />;
  }

  if (route === 'forgot-password') {
    return <ForgotPasswordView />;
  }

  if (route === 'reset-password') {
    return <ResetPasswordView />;
  }

  if (route === 'auth-callback') {
    return <AuthCallbackView />;
  }

  if (route === 'terms') {
    return <TermsView />;
  }

  if (route === 'privacy') {
    return <PrivacyView />;
  }

  // Authenticated Application Shell
  return (
    <div id="recallly-app-root" className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col md:flex-row">
      {/* Desktop Left Sidebar */}
      <AppSidebar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Mobile Top Header and Bottom Navigation */}
      <MobileNavigation onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full pb-20 md:pb-8">
        {route === 'dashboard' && (
          <HomeDashboard
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenCreateCollection={() => setIsCreateCollectionOpen(true)}
          />
        )}

        {route === 'bookmarks' && <BookmarkLibraryView />}

        {route === 'bookmark-detail' && <BookmarkDetailView />}

        {route === 'collections' && (
          <CollectionsView onOpenCreateCollection={() => setIsCreateCollectionOpen(true)} />
        )}

        {route === 'collection-detail' && <CollectionDetailView />}

        {route === 'ask' && <AskAIView />}

        {route === 'insights' && <InsightsView />}

        {route === 'digests' && <DigestsView />}

        {route === 'digest-detail' && <DigestDetailView />}

        {route === 'settings' && <SettingsView />}
      </main>

      {/* Global Search Modal (⌘K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Create Collection Modal */}
      <CollectionModal
        isOpen={isCreateCollectionOpen}
        onClose={() => setIsCreateCollectionOpen(false)}
        onSave={async (name, description, visibility) => {
          createCollection(name, description, visibility);
        }}
      />

      {/* Global Floating Toast */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <DemoStoreProvider>
      <RouterProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </RouterProvider>
    </DemoStoreProvider>
  );
}
