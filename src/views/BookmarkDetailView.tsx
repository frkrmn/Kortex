import React, { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Trash2,
  Check,
  RefreshCw,
  Globe,
  Cpu,
  X,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { BookmarkCard } from '../components/BookmarkCard';
import { XBookmarkReader } from '../components/XBookmarkReader';
import { api } from '../lib/api';
import { Bookmark } from '../types';

export const BookmarkDetailView: React.FC = () => {
  const { params, navigate } = useRouter();
  const {
    getBookmark,
    getRelatedBookmarks,
    collections,
    toggleFavorite,
    toggleRead,
    deleteBookmark,
    toggleBookmarkInCollection,
    reprocessBookmark,
    removeTopicFromBookmark,
  } = useDemoStore();

  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  const bookmark = getBookmark(params.id);

  if (!bookmark) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-[#171717]">Bookmark not found</h2>
        <p className="text-sm text-[#70706B]">
          The bookmark you are looking for may have been removed or does not exist.
        </p>
        <button
          onClick={() => navigate('/bookmarks')}
          className="px-4 py-2 rounded-xl bg-[#171717] text-[#FAFAF8] text-xs font-semibold"
        >
          Back to library
        </button>
      </div>
    );
  }

  const fallbackRelated = getRelatedBookmarks(bookmark.id, 3);
  const [vectorRelated, setVectorRelated] = useState<{ bookmark: Bookmark; similarity: number }[]>([]);

  React.useEffect(() => {
    let isSubscribed = true;
    api.getRelatedBookmarks(bookmark.id, 3)
      .then((items) => {
        if (isSubscribed && items && items.length > 0) {
          setVectorRelated(items);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch vector-related bookmarks:', err);
      });
    return () => {
      isSubscribed = false;
    };
  }, [bookmark.id]);

  const relatedBookmarks = vectorRelated.length > 0
    ? vectorRelated.map(r => ({ ...r.bookmark, _similarity: r.similarity }))
    : fallbackRelated.map(b => ({ ...b, _similarity: undefined }));

  const formattedImportDate = new Date(bookmark.imported_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div id="bookmark-detail-view" className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Back button & Action Bar */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E8E8E5]">
        <button
          onClick={() => navigate('/bookmarks')}
          className="flex items-center gap-2 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to bookmarks</span>
        </button>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleRead(bookmark.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              bookmark.is_read
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-[#E8E8E5] text-[#70706B] hover:text-[#171717]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{bookmark.is_read ? 'Read' : 'Mark as read'}</span>
          </button>

          <button
            onClick={() => toggleFavorite(bookmark.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              bookmark.is_favorite
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-white border-[#E8E8E5] text-[#70706B] hover:text-[#171717]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${bookmark.is_favorite ? 'fill-rose-500' : ''}`} />
            <span>{bookmark.is_favorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <button
            onClick={() => navigate(`/ask?bookmarkId=${bookmark.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] border border-[#DBEAFE] hover:bg-[#DBEAFE] text-xs font-semibold text-[#2563EB] transition-colors cursor-pointer"
            title="Ask conversational AI questions scoped to this bookmark"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Ask AI</span>
          </button>

          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8E8E5] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
          >
            <span>Open on X</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8A8A85]" />
          </a>

          <button
            onClick={() => {
              if (window.confirm('Delete this bookmark from your library?')) {
                deleteBookmark(bookmark.id);
                navigate('/bookmarks');
              }
            }}
            title="Delete from Recallly"
            className="p-2 text-[#8A8A85] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two-Column Layout: Main Content + Sidebar Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Original saved content */}
        <div className="lg:col-span-2 space-y-6">
          <XBookmarkReader bookmark={bookmark} />
        </div>

        {/* Side Column: Recallly Intelligence */}
        <div className="space-y-5">
          {/* AI Summary Card */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4F46E5]">
                  AI Key Summary
                </h3>
              </div>

              <button
                onClick={() => reprocessBookmark(bookmark.id)}
                disabled={bookmark.enrichment_status === 'processing'}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg border border-[#C7D2FE] transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-run AI enrichment"
              >
                <RefreshCw className={`w-3 h-3 ${bookmark.enrichment_status === 'processing' ? 'animate-spin' : ''}`} />
                <span>{bookmark.enrichment_status === 'processing' ? 'Analyzing...' : 'Re-analyze'}</span>
              </button>
            </div>

            {/* Processing Banner */}
            {(bookmark.enrichment_status === 'processing' || bookmark.enrichment_status === 'pending') && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span>Enrichment in progress</span>
                </div>
                <p className="text-[11px] text-indigo-700">
                  Synthesizing content and classifying canonical topics...
                </p>
              </div>
            )}

            {/* Failed Banner */}
            {bookmark.enrichment_status === 'failed' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">AI Enrichment Incomplete</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Click "Re-analyze" above to retry AI processing.
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs leading-relaxed text-[#383834]">
              {bookmark.ai_summary || (bookmark.enrichment_status === 'processing' ? 'Generating summary...' : 'No AI summary generated yet.')}
            </p>

            {bookmark.why_saved_insight && (
              <div className="pt-3 border-t border-[#F0F0EC] space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A85] block">
                  Why you saved this
                </span>
                <p className="text-xs text-[#595954] leading-relaxed italic">
                  "{bookmark.why_saved_insight}"
                </p>
              </div>
            )}

            {/* AI Meta Footer */}
            <div className="pt-2 border-t border-[#F0F0EC] flex items-center justify-between text-[10px] text-[#8A8A85] flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {bookmark.language && (
                  <span className="flex items-center gap-1 font-mono uppercase">
                    <Globe className="w-3 h-3" />
                    <span>{bookmark.language}</span>
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
                <span>
                  Enriched {new Date(bookmark.enriched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Topics & Keywords Card */}
          <div className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A85] block">
                Topics
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(bookmark.topics || []).map((t) => (
                  <span
                    key={t}
                    className="group inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#EEF4FF] text-[#1E3A8A] border border-[#BFDBFE]"
                  >
                    <button
                      onClick={() => navigate(`/bookmarks?topic=${encodeURIComponent(t.toLowerCase())}`)}
                      className="hover:underline cursor-pointer"
                    >
                      {t}
                    </button>
                    <button
                      onClick={() => removeTopicFromBookmark(bookmark.id, t)}
                      title={`Remove topic "${t}"`}
                      className="text-blue-400 hover:text-rose-600 rounded p-0.5 hover:bg-rose-50 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {bookmark.keywords && bookmark.keywords.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#F0F0EC]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A85] block">
                  Keywords
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {bookmark.keywords.map((k) => (
                    <span
                      key={k}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F4F4F1] text-[#555550] border border-[#E4E4DF]"
                    >
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Collection assignment */}
            <div className="space-y-2 pt-3 border-t border-[#F0F0EC]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A85]">
                  Collections
                </span>
                <button
                  onClick={() => setShowCollectionPicker(!showCollectionPicker)}
                  className="text-xs text-[#2563EB] hover:underline font-medium"
                >
                  Manage
                </button>
              </div>

              <div className="space-y-1">
                {collections
                  .filter((c) => (c.bookmark_ids || []).includes(bookmark.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/collections/${c.slug}`)}
                      className="w-full text-left p-2 rounded-lg bg-[#FAFAF8] border border-[#E8E8E5] text-xs font-medium text-[#171717] hover:bg-[#F2F2EE] transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
              </div>

              {showCollectionPicker && (
                <div className="p-2 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl space-y-1">
                  {collections.map((col) => {
                    const inCol = (col.bookmark_ids || []).includes(bookmark.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => toggleBookmarkInCollection(col.id, bookmark.id)}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg text-xs text-[#171717] hover:bg-[#FFFFFF]"
                      >
                        <span className="truncate">{col.name}</span>
                        {inCol && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metadata Timestamps */}
            <div className="pt-3 border-t border-[#F0F0EC] text-[11px] text-[#8A8A85] space-y-1">
              <div className="flex items-center justify-between">
                <span>Imported to Recallly</span>
                <span>{formattedImportDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Content: "Similar things you've saved" */}
      {relatedBookmarks.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-[#E8E8E5]">
          <div>
            <h2 className="text-base font-semibold text-[#171717]">
              Similar things you've saved
            </h2>
            <p className="text-xs text-[#8A8A85]">
              Connected by topics, keywords, and conceptual overlap
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedBookmarks.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/bookmarks/${rel.id}`)}
                className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D5D5CF] rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={rel.author_avatar}
                      alt={rel.author_name}
                      className="w-6 h-6 rounded-full object-cover border border-[#E8E8E5]"
                    />
                    <span className="text-xs font-medium text-[#171717] truncate">
                      {rel.author_name}
                    </span>
                  </div>
                  <p className="text-xs text-[#383834] line-clamp-3 leading-relaxed">
                    {rel.content}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#F0F0EC] flex items-center justify-between text-[11px] text-[#8A8A85]">
                  <span>
                    {(rel as any)._similarity !== undefined
                      ? `${Math.round((rel as any)._similarity * 100)}% match`
                      : rel.topics?.[0] || 'Saved'}
                  </span>
                  <span className="text-[#2563EB] font-medium">View →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
