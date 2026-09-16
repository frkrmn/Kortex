import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Heart,
  CheckCircle2,
  FolderPlus,
  Sparkles,
  Compass,
  Tag,
  Lightbulb,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Globe,
  Cpu,
} from 'lucide-react';
import { Bookmark, Collection } from '../types';
import { api } from '../lib/api';

interface BookmarkDetailModalProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  collections: Collection[];
  onToggleRead: (id: string, isRead: boolean) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onToggleCollection: (collectionId: string, bookmarkId: string) => void;
  onSelectBookmark: (bookmark: Bookmark) => void;
  onReprocess?: (id: string) => void;
  onRemoveTopic?: (bookmarkId: string, topic: string) => void;
}

export const BookmarkDetailModal: React.FC<BookmarkDetailModalProps> = ({
  bookmark,
  onClose,
  collections,
  onToggleRead,
  onToggleFavorite,
  onToggleCollection,
  onSelectBookmark,
  onReprocess,
  onRemoveTopic,
}) => {
  const [related, setRelated] = useState<Bookmark[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  useEffect(() => {
    if (!bookmark) return;
    setIsLoadingRelated(true);
    api.getRelatedBookmarks(bookmark.id)
      .then((data) => setRelated(data))
      .catch((err) => console.warn('Failed to fetch related:', err))
      .finally(() => setIsLoadingRelated(false));
  }, [bookmark]);

  if (!bookmark) return null;

  const handleReprocess = async () => {
    if (!bookmark) return;
    setIsReprocessing(true);
    try {
      if (onReprocess) {
        onReprocess(bookmark.id);
      } else {
        await api.reprocessBookmark(bookmark.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsReprocessing(false), 800);
    }
  };

  const formattedDate = new Date(bookmark.bookmark_created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      id="bookmark-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">
              Bookmark Intelligence
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(bookmark.id, !bookmark.is_favorite)}
              title="Favorite"
              className={`p-2 rounded-lg transition-colors ${
                bookmark.is_favorite ? 'text-rose-600 bg-rose-50' : 'text-[#8A8A85] hover:bg-[#F2F2EE]'
              }`}
            >
              <Heart className={`w-4 h-4 ${bookmark.is_favorite ? 'fill-rose-500' : ''}`} />
            </button>

            <button
              onClick={() => onToggleRead(bookmark.id, !bookmark.is_read)}
              title="Toggle Read"
              className={`p-2 rounded-lg transition-colors ${
                bookmark.is_read ? 'text-[#8A8A85] hover:bg-[#F2F2EE]' : 'text-blue-600 bg-blue-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open on X"
              className="p-2 text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE] rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-2 text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE] rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Author Header */}
          <div className="flex items-center gap-3">
            <img
              src={bookmark.author_avatar}
              alt={bookmark.author_name}
              className="w-12 h-12 rounded-full object-cover border border-[#E8E8E5]"
            />
            <div>
              <h3 className="text-base font-semibold text-[#171717]">{bookmark.author_name}</h3>
              <p className="text-xs text-[#70706B]">@{bookmark.author_username} • {formattedDate}</p>
            </div>
          </div>

          {/* Original Post Body */}
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-sm text-[#171717] leading-relaxed whitespace-pre-line font-normal selection:bg-amber-100">
            {bookmark.content}
          </div>

          {/* AI Distillation Section */}
          <div className="space-y-4 p-4 rounded-xl bg-[#F8F9FE] border border-[#E0E7FF]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4338CA]">
                <Sparkles className="w-4 h-4" />
                <span>AI Synthesized Knowledge</span>
              </div>

              {/* Reprocess / Status Action */}
              <button
                onClick={handleReprocess}
                disabled={isReprocessing || bookmark.enrichment_status === 'processing'}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#4338CA] hover:bg-[#EEF2FF] rounded-lg border border-[#C7D2FE] transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-run AI enrichment analysis"
              >
                <RefreshCw className={`w-3 h-3 ${isReprocessing || bookmark.enrichment_status === 'processing' ? 'animate-spin' : ''}`} />
                <span>{isReprocessing || bookmark.enrichment_status === 'processing' ? 'Analyzing...' : 'Re-analyze'}</span>
              </button>
            </div>

            {/* Processing State */}
            {(bookmark.enrichment_status === 'processing' || bookmark.enrichment_status === 'pending') && (
              <div className="p-3 rounded-lg bg-indigo-100/50 border border-indigo-200/70 text-xs text-indigo-900 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span>Enrichment pipeline in progress</span>
                </div>
                <p className="text-[11px] text-indigo-700">
                  Extracting key takeaways, detecting language, generating keywords, and classifying topics via background queue.
                </p>
              </div>
            )}

            {/* Failed State */}
            {bookmark.enrichment_status === 'failed' && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">AI Enrichment Incomplete</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    The AI provider encountered an issue. Click "Re-analyze" above to retry processing.
                  </p>
                </div>
              </div>
            )}

            {/* Summary Body */}
            {bookmark.ai_summary && (
              <div>
                <span className="text-[11px] font-medium text-[#6B7280] block mb-1">Executive Summary</span>
                <p className="text-sm font-medium text-[#1E1B4B] leading-relaxed">
                  {bookmark.ai_summary}
                </p>
              </div>
            )}

            {bookmark.why_saved_insight && (
              <div className="pt-3 border-t border-[#E0E7FF]/80 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-medium text-[#6B7280] block mb-0.5">Why you may have saved this</span>
                  <p className="text-xs text-[#374151] leading-relaxed">
                    {bookmark.why_saved_insight}
                  </p>
                </div>
              </div>
            )}

            {/* AI Metadata Footer */}
            <div className="pt-2 border-t border-[#E0E7FF]/70 flex items-center justify-between text-[10px] text-[#6366F1] flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {bookmark.language && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span className="uppercase font-mono">{bookmark.language}</span>
                  </span>
                )}
                {bookmark.enrichment_model && (
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu className="w-3 h-3" />
                    <span>{bookmark.enrichment_model}</span>
                  </span>
                )}
              </div>
              {bookmark.enriched_at && (
                <span className="text-[#818CF8]">
                  Enriched {new Date(bookmark.enriched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Topics & Keywords */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-[#70706B] uppercase tracking-wider block">
              Topics & Keywords
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {(bookmark.topics || []).map((t) => (
                <span
                  key={t}
                  className="group/tag inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-[#F4F4F1] border border-[#E0E0DC] text-[#171717]"
                >
                  <span>{t}</span>
                  {onRemoveTopic && (
                    <button
                      onClick={() => onRemoveTopic(bookmark.id, t)}
                      title={`Remove topic "${t}"`}
                      className="text-[#8A8A85] hover:text-rose-600 rounded-sm p-0.5 hover:bg-rose-50 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {(bookmark.keywords || []).map((k) => (
                <span
                  key={k}
                  className="text-xs text-[#70706B] px-2 py-0.5 rounded-md bg-[#EDEDE9]"
                >
                  #{k}
                </span>
              ))}
            </div>
          </div>

          {/* Collections containing this bookmark */}
          <div className="space-y-3 pt-3 border-t border-[#E8E8E5]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#70706B] uppercase tracking-wider">
                In Collections
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(collections || []).map((col) => {
                const inCol = (col.bookmark_ids || []).includes(bookmark.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => onToggleCollection(col.id, bookmark.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      inCol
                        ? 'bg-[#171717] text-[#FAFAF8] border-[#171717]'
                        : 'bg-[#FAFAF8] text-[#70706B] border-[#E8E8E5] hover:text-[#171717] hover:border-[#D0D0CB]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{col.name}</span>
                    <span className="text-[10px] ml-1 opacity-70">
                      {inCol ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Semantic Similarity: "Similar things you've saved" */}
          <div className="space-y-3 pt-4 border-t border-[#E8E8E5]">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#6366F1]" />
              <span className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
                Similar things you've saved
              </span>
            </div>

            {isLoadingRelated ? (
              <p className="text-xs text-[#8A8A85]">Finding semantically related bookmarks...</p>
            ) : related.length > 0 ? (
              <div className="space-y-2">
                {related.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectBookmark(rel)}
                    className="cursor-pointer p-3 rounded-xl bg-[#FAFAF8] hover:bg-[#F2F2EE] border border-[#E8E8E5] transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs text-[#171717]">{rel.author_name}</span>
                        <span className="text-[11px] text-[#70706B]">@{rel.author_username}</span>
                      </div>
                      <p className="text-xs text-[#555550] line-clamp-2 leading-relaxed">
                        {rel.ai_summary || rel.content}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8A8A85] group-hover:text-[#171717] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8A8A85]">No closely similar bookmarks found yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
