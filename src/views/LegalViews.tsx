import React, { useEffect } from 'react';
import { Layers, ArrowLeft } from 'lucide-react';
import { useRouter } from '../lib/router';

export const TermsView: React.FC = () => {
  const { navigate } = useRouter();

  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.querySelector('meta[name="description"]');
    const previousDescription = existingDescription?.getAttribute('content') ?? null;
    const description = existingDescription ?? document.createElement('meta');

    document.title = 'Terms of Service | Recallly';
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'Terms of Service for Recallly, an X bookmark organization and personal knowledge service.');
    if (!existingDescription) document.head.appendChild(description);

    return () => {
      document.title = previousTitle;
      if (existingDescription && previousDescription !== null) {
        existingDescription.setAttribute('content', previousDescription);
      } else if (!existingDescription) {
        description.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] px-4 py-8 text-[#171717] sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#E8E8E5] bg-[#FFFFFF] p-6 shadow-xs sm:p-10 lg:p-12">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0F0EC]">
          <button type="button" aria-label="Back to Recallly home" className="flex items-center gap-2.5" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight">Recallly</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-[#70706B] hover:text-[#171717] font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        </div>

        <article aria-labelledby="terms-title" className="pt-8">
          <h1 id="terms-title" className="text-3xl font-bold tracking-tight text-[#171717]">Terms of Service</h1>
          <p className="mt-2 text-sm text-[#70706B]">Last updated: September 2026</p>

          <div className="mt-8 space-y-8 text-base leading-7 text-[#42423E]">
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">1. Acceptance of these Terms</h2><p className="mt-3">By accessing or using Recallly, you agree to these Terms of Service and the Privacy Policy. If you do not agree, do not use the service.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">2. About Recallly</h2><p className="mt-3">Recallly is a personal bookmark organization and knowledge service. It can import bookmarks from a connected X account, store and organize saved items, and provide search and other features that are available on your account.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">3. Eligibility and account responsibilities</h2><p className="mt-3">You must be legally able to agree to these Terms. Keep your account credentials secure, provide accurate information, and promptly tell us if you suspect unauthorized access. You are responsible for activity performed through your account.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">4. X connection and OAuth</h2><p className="mt-3">Recallly uses X's official OAuth flow and read-only permissions to connect an X account and access bookmarks made available through that account. Recallly does not use this connection to post, send direct messages, or obtain your X password. You can disconnect X through the available account controls. Your use of X remains subject to X's own terms and policies.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">5. Bookmark import and synchronization</h2><p className="mt-3">Recallly imports the bookmarks that X makes available through its official API. An initial import is not a promise that every historical bookmark will be available. Free accounts have manual bookmark sync. Automatic synchronization may be available for eligible Pro accounts where the feature is enabled; it is not a real-time or uninterrupted guarantee. X availability, API limits, authorization state, and provider errors can affect imports and synchronization.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">6. Your content and data</h2><p className="mt-3">You remain responsible for the bookmarks, notes, links, and other material you save or submit, including having the rights and permissions needed to use it. Recallly does not take ownership of those rights. You authorize Recallly to store and process this material as needed to provide the service, including organization, search, synchronization, and available AI features. Content originating from X or another service may remain subject to that service's terms and rights.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">7. AI-generated enrichment</h2><p className="mt-3">Recallly may use configured AI providers, including Google Gemini for current bookmark enrichment, to generate summaries, categories, topics, key concepts, and related analysis from saved text and available media. AI output can be incomplete, inaccurate, or unsuitable for your situation. Review it before relying on it; it is not professional, legal, medical, financial, or other expert advice. AI features may be unavailable, delayed, or changed.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">8. Third-party services</h2><p className="mt-3">Recallly depends on third-party services that may include Supabase for authentication and data infrastructure, X for connected bookmark access, Google Gemini for configured AI enrichment, Stripe for subscription checkout and billing management, Vercel for hosting and scheduled operations, and Resend for email features when enabled. Those services operate under their own terms and privacy practices. Their availability and policies can affect Recallly.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">9. Plans, trials, subscriptions, and billing</h2><p className="mt-3">Recallly provides a Free plan and may offer Pro features through a paid subscription. Current price, billing interval, trial eligibility, and payment terms are shown in Stripe Checkout before you confirm a purchase. The configured standard trial is 7 days when Stripe Checkout indicates that you are eligible; not every account is eligible. Stripe handles payment details and subscription billing. Renewal, cancellation, payment failure, and access timing follow the terms shown in Checkout and the billing portal. Recallly does not state a separate refund policy in these Terms.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">10. Exports and account data</h2><p className="mt-3">Authenticated users can request the JSON export provided in Recallly's data settings, which may include profile information, saved items, AI enrichment, collections, and digests. Exported or imported material can depend on the continued availability of the underlying service and source account. Recallly does not provide an in-app account deletion action through the data export control.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">11. Availability and feature changes</h2><p className="mt-3">Recallly is provided as an evolving service. We may change, suspend, or discontinue features, including features that depend on X, AI providers, hosting, or billing services. We do not promise uninterrupted availability, a particular import window, or a service level agreement.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">12. Acceptable use</h2><p className="mt-3">Do not use Recallly to break the law, violate the rights or terms of another service, access another user's account or data, bypass security or plan controls, interfere with the service, distribute malware, scrape or resell private data, or submit content that you are not permitted to use.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">13. Intellectual property</h2><p className="mt-3">Recallly's software, design, names, and service materials are owned by or licensed to the service operator and are protected by applicable law. These Terms give you a limited right to use Recallly while your access is permitted. You retain the rights you have in your own content, subject to the permissions needed for Recallly to operate.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">14. Suspension and termination</h2><p className="mt-3">You may stop using Recallly at any time. Access may be suspended or terminated where reasonably necessary for security, legal compliance, service integrity, or a material breach of these Terms. Suspension or termination does not transfer ownership of your content, but access to connected sources and service features may stop.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">15. Disclaimers</h2><p className="mt-3">To the maximum extent permitted by law, Recallly is provided on an “as available” basis. We do not guarantee that imported bookmarks will be complete, that AI output will be accurate, or that the service or any third-party dependency will be uninterrupted or error-free. Nothing in these Terms excludes a right or liability that cannot lawfully be excluded.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">16. Limitation of liability</h2><p className="mt-3">To the maximum extent permitted by law, Recallly and its service providers will not be liable for indirect, incidental, special, consequential, or exemplary losses arising from or related to use of the service. This section does not limit liability that applicable law does not permit us to limit.</p></section>
            <section><h2 className="text-xl font-bold leading-7 text-[#171717]">17. Changes to these Terms</h2><p className="mt-3">We may update these Terms as Recallly changes. The updated version will be posted on this page with a revised date. Your continued use of Recallly after an update means you accept the updated Terms to the extent permitted by law.</p></section>
          </div>
          <p className="mt-10 border-t border-[#F0F0EC] pt-6 text-sm leading-6 text-[#70706B]">Please also review our <a className="font-semibold text-[#171717] underline underline-offset-2" href="/privacy">Privacy Policy</a> for information about how Recallly handles personal information.</p>
        </article>
      </div>
    </div>
  );
};

export const PrivacyView: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E8E8E5] rounded-3xl p-8 sm:p-12 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0F0EC]">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight">Recallly</span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-xs text-[#70706B] hover:text-[#171717] font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Privacy Policy</h1>
        <p className="text-xs text-[#8A8A85]">Last updated: September 2026</p>

        <div className="prose prose-sm text-xs text-[#555550] space-y-4 leading-relaxed">
          <p>
            At Recallly, we treat your bookmarks and saved ideas with extreme privacy and care. This Privacy Policy describes how we collect, store, and safeguard your information.
          </p>
          <h2 className="text-sm font-bold text-[#171717] pt-2">1. Information We Collect</h2>
          <p>
            When you register, we collect your email address and display name. When you connect external sources, we store your saved bookmarks, post metadata, and author details strictly within your isolated user schema.
          </p>
          <h2 className="text-sm font-bold text-[#171717] pt-2">2. Security & Data Isolation</h2>
          <p>
            Your bookmarks and profile data are protected by strict PostgreSQL Row Level Security (RLS) policies. Only your authenticated user session can read or modify your items.
          </p>
          <h2 className="text-sm font-bold text-[#171717] pt-2">3. Third-Party Connections</h2>
          <p>
            When connecting services like X, we request strictly read-only permissions necessary to fetch your bookmarks. We never post on your behalf or access your direct messages.
          </p>
        </div>
      </div>
    </div>
  );
};
