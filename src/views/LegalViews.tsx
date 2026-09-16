import React from 'react';
import { Layers, ArrowLeft } from 'lucide-react';
import { useRouter } from '../lib/router';

export const TermsView: React.FC = () => {
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

        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Terms of Service</h1>
        <p className="text-xs text-[#8A8A85]">Last updated: September 2026</p>

        <div className="prose prose-sm text-xs text-[#555550] space-y-4 leading-relaxed">
          <p>
            Welcome to Recallly. By accessing or using our personal knowledge base and bookmark synchronization services, you agree to be bound by these Terms of Service.
          </p>
          <h2 className="text-sm font-bold text-[#171717] pt-2">1. Your Data & Ownership</h2>
          <p>
            You retain 100% ownership of your saved bookmarks, personal notes, collections, and queries. Recallly processes your content solely to provide organization, search indexing, and synthesis features for your personal use.
          </p>
          <h2 className="text-sm font-bold text-[#171717] pt-2">2. Acceptable Use</h2>
          <p>
            You agree not to misuse Recallly services or attempt unauthorized access to other users' data. Our Row Level Security (RLS) isolates every account's data strictly to that authenticated user.
          </p>
          <h2 className="text-sm font-bold text-[#171717] pt-2">3. Subscription & Billing</h2>
          <p>
            Paid subscriptions provide enhanced features including real-time AI summaries and conversational synthesis. You may export your entire library at any time.
          </p>
        </div>
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
