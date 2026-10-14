import React, { lazy, Suspense } from 'react';
import { RouterProvider, isPublicRoute, useRouter } from './lib/router';
import { getRouteSeo, usePageSeo } from './lib/seo';

const LandingPage = lazy(() => import('./views/LandingPage').then((module) => ({ default: module.LandingPage })));
const TermsView = lazy(() => import('./views/LegalViews').then((module) => ({ default: module.TermsView })));
const PrivacyView = lazy(() => import('./views/LegalViews').then((module) => ({ default: module.PrivacyView })));
const PricingView = lazy(() => import('./views/MarketingViews').then((module) => ({ default: module.PricingView })));
const FaqView = lazy(() => import('./views/MarketingViews').then((module) => ({ default: module.FaqView })));
const HowItWorksView = lazy(() => import('./views/MarketingViews').then((module) => ({ default: module.HowItWorksView })));
const BlogIndexView = lazy(() => import('./views/BlogViews').then((module) => ({ default: module.BlogIndexView })));
const BlogArticleView = lazy(() => import('./views/BlogViews').then((module) => ({ default: module.BlogArticleView })));
const PublicDemoView = lazy(() => import('./views/PublicDemoView').then((module) => ({ default: module.PublicDemoView })));
const NotFoundView = lazy(() => import('./views/NotFoundView').then((module) => ({ default: module.NotFoundView })));
const AuthenticatedRoutes = lazy(() => import('./AuthenticatedRoutes'));

const RouteLoading: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--color-page)] text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">
    Loading…
  </div>
);

const RouteBoundary: React.FC = () => {
  const { route, params, navigate } = useRouter();
  const seo = React.useMemo(() => getRouteSeo(route, params), [route, params]);
  usePageSeo(seo);

  const renderPublicRoute = () => {
    if (route === 'landing') return <LandingPage onExploreDemo={() => navigate('/demo')} onSignIn={() => navigate('/login')} onGoHome={() => navigate('/')} onStartOnboarding={() => navigate('/onboarding')} />;
    if (route === 'terms') return <TermsView />;
    if (route === 'privacy') return <PrivacyView />;
    if (route === 'pricing') return <PricingView />;
    if (route === 'faq') return <FaqView />;
    if (route === 'how-it-works') return <HowItWorksView />;
    if (route === 'blog') return <BlogIndexView />;
    if (route === 'blog-article') return <BlogArticleView />;
    if (route === 'demo' || route === 'demo-bookmark') return <PublicDemoView />;
    if (route === 'not-found') return <NotFoundView />;
    return null;
  };

  if (isPublicRoute(route) && !['login', 'signup', 'forgot-password', 'reset-password', 'auth-callback'].includes(route)) {
    // Public marketing, legal, and demo routes do not hydrate private account or bookmark state.
    return <Suspense fallback={<RouteLoading />}>{renderPublicRoute()}</Suspense>;
  }

  return <Suspense fallback={<RouteLoading />}><AuthenticatedRoutes /></Suspense>;
};

export default function App() {
  return <RouterProvider><RouteBoundary /></RouterProvider>;
}
