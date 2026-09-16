import React from 'react';
import {
  Layers,
  ArrowRight,
  Globe,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { Collection, Bookmark } from '../types';

interface PublicCollectionViewProps {
  collection: Collection & { bookmarks?: Bookmark[] };
  onBackToApp: () => void;
  onStartOwnLibrary: () => void;
}

export const PublicCollectionView: React.FC<PublicCollectionViewProps> = ({
  collection,
  onBackToApp,
  onStartOwnLibrary,
}) => {
  const bookmarks = collection.bookmarks || [];

  return (
    <div id="public-collection-page" className="min-h-screen bg-[#FAFAF8] text-[#171717]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E8E8E5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#171717] text-[#FAFAF8] flex items-center justify-center font-bold text-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs tracking-tight">Kortex Collection</span>
          </div>

          <button
            onClick={onStartOwnLibrary}
            className="px-3 py-1.5 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] text-xs font-medium transition-colors"
          >
            Create your library
          </button>
        </div>
      </header>

      {/* Hero Collection Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
          <Globe className="w-3 h-3" />
          <span>Public Research Collection</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
          {collection.name}
        </h1>

        <p className="text-sm text-[#70706B] max-w-2xl leading-relaxed">
          {collection.description || 'A curated knowledge collection.'}
        </p>

        <div className="flex items-center gap-3 text-xs text-[#8A8A85] pt-2">
          <span>Curated by <strong className="text-[#171717]">@faruk</strong></span>
          <span>•</span>
          <span>{bookmarks.length} curated bookmarks</span>
        </div>
      </div>

      {/* Bookmarks Feed */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 space-y-4">
        {(bookmarks || []).map((bm) => (
          <div
            key={bm.id}
            className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3 shadow-2xs hover:border-[#D0D0CB] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={bm.author_avatar}
                  alt={bm.author_name}
                  className="w-9 h-9 rounded-full object-cover border border-[#E5E5E0]"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-[#171717]">{bm.author_name}</span>
                    <span className="text-[11px] text-[#70706B]">@{bm.author_username}</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A85]">
                    {new Date(bm.bookmark_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <a
                href={bm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#70706B] hover:text-[#171717] px-2.5 py-1 rounded-lg border border-[#E8E8E5] hover:bg-[#F7F7F5] transition-colors"
              >
                <span>View on X</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs sm:text-sm text-[#2B2B2B] leading-relaxed whitespace-pre-line">
              {bm.content}
            </p>

            {bm.ai_summary && (
              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E8E8E5] text-xs text-[#4A4A45] flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#171717] block mb-0.5">Key Insight</span>
                  <p>{bm.ai_summary}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {(bm.topics || []).map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F4F4F1] text-[#70706B]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom CTA Banner */}
        <div className="p-8 rounded-3xl bg-[#171717] text-[#FAFAF8] text-center space-y-4 shadow-lg mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Build your own personal knowledge library
          </h2>
          <p className="text-xs text-[#A0A09A] max-w-md mx-auto leading-relaxed">
            Turn your saved X bookmarks into an organized, searchable intelligence database with AI summarization and weekly digests.
          </p>
          <button
            onClick={onStartOwnLibrary}
            className="px-6 py-2.5 rounded-xl bg-[#FFFFFF] text-[#171717] text-xs font-semibold hover:bg-[#E5E5E0] transition-colors inline-flex items-center gap-2"
          >
            <span>Start free with Kortex</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
