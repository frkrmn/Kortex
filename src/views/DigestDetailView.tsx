import React from 'react';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Bookmark as BookmarkIcon,
  BookOpen,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

export const DigestDetailView: React.FC = () => {
  const { params, navigate } = useRouter();
  const { digests, bookmarks } = useDemoStore();

  const digest = digests.find((d) => d.id === params.id) || digests[0];

  if (!digest) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-[#171717]">Digest not found</h2>
        <button
          onClick={() => navigate('/digests')}
          className="px-4 py-2 rounded-xl bg-[#171717] text-[#FAFAF8] text-xs font-semibold"
        >
          Back to digests
        </button>
      </div>
    );
  }

  const standoutBookmarks = (digest.standoutBookmarkIds || [])
    .map((id) => bookmarks.find((b) => b.id === id))
    .filter(Boolean);

  return (
    <div id="digest-detail-view" className="space-y-8 pb-24 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/digests')}
        className="flex items-center gap-2 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to digests</span>
      </button>

      {/* Editorial Header */}
      <div className="p-8 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs text-[#8A8A85]">
          <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#EEF4FF] text-[#2563EB] border border-[#BFDBFE]">
            {digest.type} Digest
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{digest.period}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] leading-tight">
          {digest.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-[#8A8A85] pt-1">
          <span>{digest.bookmarksCount} bookmarks analyzed</span>
          <span>•</span>
          <span>{digest.keyIdeas.length} key patterns identified</span>
        </div>

        <p className="text-sm leading-relaxed text-[#383834] pt-2 border-t border-[#F0F0EC]">
          {digest.summary}
        </p>
      </div>

      {/* Key Ideas Section */}
      <div className="p-8 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4F46E5]" />
          <h2 className="text-base font-bold text-[#171717]">Key Synthesized Ideas</h2>
        </div>

        <div className="space-y-4">
          {digest.keyIdeas.map((idea, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-[#2B2B2B]">
              <span className="w-5 h-5 rounded-full bg-[#F4F4F1] border border-[#E0E0DC] text-[#171717] font-semibold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="pt-0.5">{idea}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Standout Bookmarks Section */}
      {standoutBookmarks.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#171717]">Standout Bookmarks</h2>
            <p className="text-xs text-[#8A8A85]">
              The core reference posts defining this period's insights
            </p>
          </div>

          <div className="space-y-3">
            {standoutBookmarks.map((bm) => (
              <div
                key={bm?.id}
                onClick={() => navigate(`/bookmarks/${bm?.id}`)}
                className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={bm?.author_avatar}
                      alt={bm?.author_name}
                      className="w-7 h-7 rounded-full object-cover border border-[#E5E5E0]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#171717]">{bm?.author_name}</span>
                      <span className="text-[10px] text-[#8A8A85] block">@{bm?.author_username}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#2563EB] font-medium flex items-center gap-1">
                    <span>View bookmark</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>

                <p className="text-xs text-[#2B2B2B] leading-relaxed line-clamp-3">
                  {bm?.content}
                </p>

                <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-[#8A8A85]">
                  <span>{bm?.topics?.[0] || 'Saved'}</span>
                  <span>{bm?.engagement?.likes.toLocaleString()} likes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Takeaways Section */}
      <div className="p-8 bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#16A34A]" />
          <h2 className="text-base font-bold text-[#171717]">Actionable Takeaways</h2>
        </div>

        <div className="space-y-2.5">
          {digest.actionableTakeaways.map((takeaway, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-[#383834] leading-relaxed">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{takeaway}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
