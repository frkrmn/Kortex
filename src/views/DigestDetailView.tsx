import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Bookmark as BookmarkIcon,
  BookOpen,
  GitMerge,
  Clock,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Tag,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

export const DigestDetailView: React.FC = () => {
  const { params, navigate } = useRouter();
  const { digests, bookmarks, regenerateDigest, isGeneratingDigest, sendRediscoveryFeedback, showToast } = useDemoStore();
  const [activeBookmarkFocus, setActiveBookmarkFocus] = useState<string | null>(null);

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

  const handleRegenerate = async () => {
    try {
      await regenerateDigest(digest.id);
    } catch (e) {
      console.error(e);
    }
  };

  const count = digest.bookmarks_count ?? digest.bookmarksCount ?? 0;
  const summaryText = digest.summary || digest.overview || (digest.key_ideas?.[0] ?? '');
  const periodText = digest.period || (digest.period_start && digest.period_end ? `${new Date(digest.period_start).toLocaleDateString()} – ${new Date(digest.period_end).toLocaleDateString()}` : 'Weekly Synthesis');
  
  // Key ideas
  const detailedIdeas = digest.key_ideas_detailed || (digest.keyIdeas || digest.key_ideas || []).map((text, idx) => ({
    title: `Pattern ${idx + 1}`,
    description: text,
    citation_ids: [],
  }));

  // Standout bookmarks
  const standoutIds = digest.standoutBookmarkIds || digest.standout_bookmark_ids || [];
  const standoutBookmarks = standoutIds
    .map((id) => bookmarks.find((b) => b.id === id))
    .filter(Boolean);

  // Fallback if standout bookmarks list is empty
  const displayStandoutBookmarks = standoutBookmarks.length > 0 ? standoutBookmarks : bookmarks.slice(0, 3);

  // Topic groups
  const topicGroups = digest.topic_groups || [];

  // Connections
  const connections = digest.connections || [];

  // Worth revisiting
  const worthRevisiting = digest.worth_revisiting || [];

  // Actionable takeaways
  const takeaways = digest.actionableTakeaways || digest.takeaways || [];

  return (
    <div id="digest-detail-view" className="space-y-8 pb-24 max-w-3xl mx-auto">
      {/* Header controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/digests')}
          className="flex items-center gap-2 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to digests</span>
        </button>

        <button
          onClick={handleRegenerate}
          disabled={isGeneratingDigest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E8E5] hover:bg-white text-xs font-medium text-[#52524E] hover:text-[#171717] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDigest ? 'animate-spin text-[#2563EB]' : ''}`} />
          <span>{isGeneratingDigest ? 'Regenerating...' : 'Regenerate Digest'}</span>
        </button>
      </div>

      {/* Editorial Header */}
      <div className="p-8 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs text-[#8A8A85]">
          <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#EEF4FF] text-[#2563EB] border border-[#BFDBFE]">
            {digest.type || 'weekly'} Digest
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{periodText}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] leading-tight">
          {digest.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-[#8A8A85] pt-1 flex-wrap">
          <span>{count} bookmarks analyzed</span>
          <span>•</span>
          <span>{detailedIdeas.length} key patterns synthesized</span>
          {digest.dominant_topics && digest.dominant_topics.length > 0 && (
            <>
              <span>•</span>
              <span className="text-[#2563EB]">{digest.dominant_topics.slice(0, 3).join(', ')}</span>
            </>
          )}
        </div>

        <p className="text-sm leading-relaxed text-[#383834] pt-2 border-t border-[#F0F0EC]">
          {summaryText}
        </p>
      </div>

      {/* Key Synthesized Ideas Section */}
      <div className="p-8 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4F46E5]" />
          <h2 className="text-base font-bold text-[#171717]">Key Synthesized Patterns</h2>
        </div>

        <div className="space-y-4">
          {detailedIdeas.map((idea, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-[#2B2B2B]">
              <span className="w-5 h-5 rounded-full bg-[#F4F4F1] border border-[#E0E0DC] text-[#171717] font-semibold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="space-y-1 pt-0.5 flex-1">
                {idea.title && (
                  <h4 className="font-semibold text-[#171717] text-xs">{idea.title}</h4>
                )}
                <p className="text-[#52524E]">{idea.description}</p>
                {idea.citation_ids && idea.citation_ids.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[#8A8A85]">Sources:</span>
                    {idea.citation_ids.map((cid, cidx) => (
                      <button
                        key={cid}
                        onClick={() => navigate(`/bookmarks/${cid}`)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] hover:underline font-mono"
                      >
                        [S{cidx + 1}]
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Groups Breakdown */}
      {topicGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#171717]">Topic Themes & Focus Areas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicGroups.map((tg) => (
              <div
                key={tg.topic}
                className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#171717] bg-[#F4F4F1] border border-[#E4E4DF] px-2.5 py-0.5 rounded-md">
                      {tg.topic}
                    </span>
                    <span className="text-[11px] text-[#8A8A85] font-mono">
                      {tg.count} saved
                    </span>
                  </div>
                  <p className="text-xs text-[#52524E] leading-relaxed pt-1">
                    {tg.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-xs">
                  <button
                    onClick={() => navigate(`/bookmarks?topic=${encodeURIComponent(tg.topic.toLowerCase())}`)}
                    className="text-[#2563EB] hover:underline text-[11px] font-medium"
                  >
                    View bookmarks in topic →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Cutting Knowledge Connections */}
      {connections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-base font-bold text-[#171717]">Ideas That Connect Across Topics</h2>
          </div>

          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs space-y-2.5"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A8A]">
                  <span className="px-2 py-0.5 rounded bg-[#EEF4FF] border border-[#BFDBFE]">
                    {conn.sourceTopic}
                  </span>
                  <span>↔</span>
                  <span className="px-2 py-0.5 rounded bg-[#EEF4FF] border border-[#BFDBFE]">
                    {conn.targetTopic}
                  </span>
                  <span className="text-[10px] text-[#8A8A85] font-normal ml-auto">
                    {conn.bookmarkCount} bookmarks
                  </span>
                </div>
                <p className="text-xs text-[#42423E] leading-relaxed">
                  {conn.connectionSummary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standout Bookmarks Section */}
      {displayStandoutBookmarks.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#171717]">Standout Bookmarks</h2>
            <p className="text-xs text-[#8A8A85]">
              The core reference posts anchoring this digest's synthesis
            </p>
          </div>

          <div className="space-y-3">
            {displayStandoutBookmarks.map((bm) => (
              <div
                key={bm?.id}
                onClick={() => navigate(`/bookmarks/${bm?.id}`)}
                className={`p-5 bg-[#FFFFFF] border rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  activeBookmarkFocus === bm?.id ? 'border-[#2563EB] ring-1 ring-[#2563EB]' : 'border-[#E8E8E5] hover:border-[#D0D0CB]'
                }`}
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
                  {bm?.ai_summary || bm?.content}
                </p>

                <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-[#8A8A85]">
                  <span>{bm?.topics?.[0] || 'Saved'}</span>
                  <span>{bm?.engagement?.likes?.toLocaleString()} likes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worth Revisiting / Rediscovery Section */}
      {worthRevisiting.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#EA580C]" />
            <div>
              <h2 className="text-base font-bold text-[#171717]">Worth Revisiting</h2>
              <p className="text-xs text-[#8A8A85]">
                Timely items from your library that connect to current themes
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {worthRevisiting.map((item) => (
              <div
                key={item.bookmark_id}
                className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-[#EA580C] bg-[#FFF7ED] border border-[#FFEDD5] px-2 py-0.5 rounded-md">
                    {item.reason}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendRediscoveryFeedback(item.bookmark_id, 'useful', 'digest');
                      }}
                      title="Mark as useful"
                      className="p-1 text-[#8A8A85] hover:text-emerald-600 rounded transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendRediscoveryFeedback(item.bookmark_id, 'not_relevant', 'digest');
                      }}
                      title="Not relevant"
                      className="p-1 text-[#8A8A85] hover:text-[#DC2626] rounded transition-colors"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#2B2B2B] leading-relaxed line-clamp-2">
                  {item.snippet}
                </p>

                <div className="pt-2 border-t border-[#F2F2EE] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8A8A85]">
                    Saved {item.days_ago} days ago
                  </span>
                  <button
                    onClick={() => navigate(`/bookmarks/${item.bookmark_id}`)}
                    className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    <span>Revisit post</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Takeaways Section */}
      {takeaways.length > 0 && (
        <div className="p-8 bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#16A34A]" />
            <h2 className="text-base font-bold text-[#171717]">Actionable Takeaways</h2>
          </div>

          <div className="space-y-2.5">
            {takeaways.map((takeaway, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-[#383834] leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
