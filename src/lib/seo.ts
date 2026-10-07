import { useEffect } from 'react';
import type { RouteType } from './router';
import { getBlogArticle } from '../content/blog';
import { marketingFaqs } from '../content/marketing';

export const SITE_URL = 'https://kortexmarks.vercel.app';
export const SOCIAL_IMAGE_PATH = '/find-again-social.png';

export type SeoConfig = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  ogType?: 'website' | 'article';
  schemas?: Record<string, unknown>[];
};

export function getRouteSocialImage(config: SeoConfig): string | undefined {
  return config.robots === 'noindex,nofollow' ? undefined : `${SITE_URL}${SOCIAL_IMAGE_PATH}`;
}

const webPage = (name: string, description: string, path: string) => ({ '@context': 'https://schema.org', '@type': 'WebPage', name, description, url: `${SITE_URL}${path}` });

export function getRouteSeo(route: RouteType, params: Record<string, string>): SeoConfig {
  if (route === 'landing') return {
    title: 'Find Again — AI X Bookmark Manager and Reader',
    description: 'Organize, search, read, and rediscover saved X bookmarks with AI summaries, categories, topics, and original source links.',
    canonicalPath: '/', robots: 'index,follow', schemas: [{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', name: 'Find Again', url: SITE_URL },
      { '@type': 'WebApplication', name: 'Find Again', url: SITE_URL, applicationCategory: 'ProductivityApplication', operatingSystem: 'Web', description: 'A personal library for organizing, reading, and rediscovering saved X bookmarks.' },
    ] }],
  };
  if (route === 'pricing') return { title: 'Find Again Pricing — Free and Pro X Bookmark Plans', description: 'Compare Find Again Free and Pro capabilities. Stripe Checkout shows current Pro pricing, trial eligibility, interval, and payment terms.', canonicalPath: '/pricing', robots: 'index,follow', schemas: [webPage('Find Again Pricing', 'Free and Pro plans for organizing X bookmarks.', '/pricing')] };
  if (route === 'how-it-works') return { title: 'How Find Again Organizes and Searches X Bookmarks', description: 'See how Find Again imports saved X posts, adds AI summaries and topics, and makes bookmarks searchable and readable in one library.', canonicalPath: '/how-it-works', robots: 'index,follow', schemas: [webPage('How Find Again Works', 'How Find Again imports, enriches, and helps rediscover X bookmarks.', '/how-it-works')] };
  if (route === 'faq') return { title: 'Find Again FAQ — X Bookmark Import, AI, and Data', description: 'Answers about Find Again bookmark import, X permissions, AI enrichment, search, data export, trials, and subscription behavior.', canonicalPath: '/faq', robots: 'index,follow', schemas: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: marketingFaqs.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }] };
  if (route === 'blog') return { title: 'Find Again Blog — Bookmark Workflows and Rediscovery', description: 'Practical guides for organizing, searching, and getting more value from saved X bookmarks.', canonicalPath: '/blog', robots: 'index,follow', schemas: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Find Again Blog', description: 'Practical guides for organizing, searching, and rediscovering saved X bookmarks.', url: `${SITE_URL}/blog` }] };
  if (route === 'blog-article') {
    const article = getBlogArticle(params.slug);
    if (!article) return { title: 'Article Not Found | Find Again', description: 'The requested Find Again article is not available.', robots: 'noindex,follow' };
    const schemas: Record<string, unknown>[] = [
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title, description: article.description, author: { '@type': 'Organization', name: article.author }, datePublished: article.publishedAt, dateModified: article.updatedAt || article.publishedAt, mainEntityOfPage: `${SITE_URL}/blog/${article.slug}` },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Find Again', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: article.title, item: `${SITE_URL}/blog/${article.slug}` },
      ] },
    ];
    if (article.faq?.length) schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: article.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) });
    return { title: `${article.seoTitle || article.title} | Find Again`, description: article.description, canonicalPath: `/blog/${article.slug}`, robots: 'index,follow', ogType: 'article', schemas };
  }
  if (route === 'terms') return { title: 'Terms of Service | Find Again', description: 'Terms of Service for Find Again, an X bookmark organization and personal knowledge service.', canonicalPath: '/terms', robots: 'index,follow', schemas: [webPage('Find Again Terms of Service', 'Terms governing use of Find Again.', '/terms')] };
  if (route === 'privacy') return { title: 'Privacy Policy | Find Again', description: 'Privacy Policy for Find Again, covering account, X bookmark, AI enrichment, billing, and service data.', canonicalPath: '/privacy', robots: 'index,follow', schemas: [webPage('Find Again Privacy Policy', 'How Find Again handles account, bookmark, AI, billing, and service data.', '/privacy')] };
  if (route === 'demo' || route === 'demo-bookmark') return { title: route === 'demo' ? 'Interactive Demo | Find Again' : 'Demo Bookmark Reader | Find Again', description: 'Explore Find Again using static demo data without connecting an account.', robots: 'noindex,follow' };
  if (route === 'not-found') return { title: 'Page Not Found | Find Again', description: 'The requested Find Again page is not available.', robots: 'noindex,follow' };
  if (['login', 'signup', 'forgot-password', 'reset-password', 'auth-callback', 'onboarding'].includes(route)) return { title: `${route === 'signup' ? 'Create Account' : route === 'login' ? 'Sign In' : 'Account'} | Find Again`, description: 'Find Again account access.', robots: 'noindex,nofollow' };
  return { title: 'Find Again Application', description: 'Your private Find Again bookmark library.', robots: 'noindex,nofollow' };
}

function ensureMeta(selector: string, attributes: Record<string, string>) {
  let element = document.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value));
}

export function usePageSeo(config: SeoConfig) {
  useEffect(() => {
    document.title = config.title;
    ensureMeta('meta[name="description"]', { name: 'description', content: config.description });
    ensureMeta('meta[name="robots"]', { name: 'robots', content: config.robots });
    ensureMeta('meta[property="og:title"]', { property: 'og:title', content: config.title });
    ensureMeta('meta[property="og:description"]', { property: 'og:description', content: config.description });
    ensureMeta('meta[property="og:type"]', { property: 'og:type', content: config.ogType || 'website' });
    // Never reflect search parameters into metadata. Auth callbacks and private
    // routes may carry short-lived values that must not be copied into the DOM.
    ensureMeta('meta[property="og:url"]', { property: 'og:url', content: config.canonicalPath ? `${SITE_URL}${config.canonicalPath}` : `${SITE_URL}${window.location.pathname}` });
    const socialImage = getRouteSocialImage(config);
    ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: socialImage ? 'summary_large_image' : 'summary' });
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: config.title });
    ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: config.description });
    if (socialImage) {
      ensureMeta('meta[property="og:image"]', { property: 'og:image', content: socialImage });
      ensureMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'Find Again — Find what you saved. When you need it again.' });
      ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: socialImage });
    } else {
      document.querySelectorAll('meta[property="og:image"], meta[property="og:image:alt"], meta[name="twitter:image"]').forEach(node => node.remove());
    }

    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (config.canonicalPath) {
      const canonical = existingCanonical || document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', `${SITE_URL}${config.canonicalPath}`);
      if (!existingCanonical) document.head.appendChild(canonical);
    } else {
      existingCanonical?.remove();
    }

    document.querySelectorAll('script[data-recallly-seo-schema]').forEach(node => node.remove());
    for (const schema of config.schemas || []) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.recalllySeoSchema = 'true';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [config]);
}
