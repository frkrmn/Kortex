import React from 'react';
import {
  Sparkles,
  TrendingUp,
  GitMerge,
  Clock,
  Calendar,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Layers,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

export const InsightsView: React.FC = () => {
  const { navigate } = useRouter();
  const { insights, bookmarks, rediscoveryCandidates, refreshInsights, sendRediscoveryFeedback } = useDemoStore();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshInsights();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Topic distribution resolution
  const topicDistribution = (insights as any)?.topics_distribution || (insights as any)?.topicDistribution || [];
  const totalAnalyzed = (insights as any)?.total_bookmarks ?? bookmarks.length;
  const activeDomainsCount = topicDistribution.length;

  // Emerging interests resolution
  const emergingInterests = (insights as any)?.emergingInterests || [];

  // Idea connections resolution
  const ideaConnections = (insights as any)?.ideaConnections || (insights as any)?.knowledgeConnections || [];

  // Saving activity timeline resolution
  const savingTimeline = (insights as any)?.savingActivityTimeline || [];
  const totalVolume = savingTimeline.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
  const avgPerWeek = savingTimeline.length > 0 ? Math.round(totalVolume / savingTimeline.length) : 0;
  const maxWeeklyCount = Math.max(...savingTimeline.map((w: any) => w.count || 0), 10);

  // Rediscovery items: prefer rediscoveryCandidates, fallback to forgottenKnowledge or older bookmarks
  const candidateItems = rediscoveryCandidates.length > 0 
    ? rediscoveryCandidates 
    : ((insights as any)?.forgottenKnowledge || []).map((fk: any) => ({
        bookmark: bookmarks.find(b => b.id === fk.id) || bookmarks[0],
        reason: fk.revisitReason || 'Saved over 30 days ago',
        score: 0.8,
        daysSinceSaved: 45,
      })).filter((c: any) => Boolean(c.bookmark));

  return (
    <div id="insights-view" className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Insights</h1>
          <p className="text-xs sm:text-sm text-[#70706B] mt-0.5">
            Deterministic patterns and intelligence synthesized from your {totalAnalyzed.toLocaleString()} saved bookmarks.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E8E5] hover:bg-white text-xs font-medium text-[#52524E] hover:text-[#171717] transition-all cursor-pointer shadow-2xs self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : ''}`} />
          <span>{isRefreshing ? 'Calculating...' : 'Recalculate Insights'}</span>
        </button>
      </div>

      {/* Section A: What you're paying attention to (Topic distribution horizontal bars) */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#171717]">
              What you're paying attention to
            </h2>
            <p className="text-xs text-[#8A8A85]">
              Topic distribution based on {totalAnalyzed.toLocaleString()} categorized bookmarks
            </p>
          </div>
          <span className="text-xs font-medium text-[#2563EB]">{activeDomainsCount} active domains</span>
        </div>

        <div className="space-y-3 pt-2">
          {topicDistribution.slice(0, 8).map((item: any) => {
            const pct = item.percentage ?? (totalAnalyzed > 0 ? Math.round((item.count / totalAnalyzed) * 100) : 0);
            return (
              <div
                key={item.topic}
                onClick={() => navigate(`/bookmarks?topic=${encodeURIComponent(item.topic.toLowerCase())}`)}
                className="group cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#171717] group-hover:text-[#2563EB] transition-colors">
                    {item.topic}
                  </span>
                  <span className="text-[#70706B] font-mono text-[11px]">
                    {pct}% ({item.count?.toLocaleString()} saved)
                  </span>
                </div>
                <div className="w-full h-2 bg-[#F0F0EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3B82F6] rounded-full transition-all duration-300 group-hover:bg-[#2563EB]"
                    style={{ width: `${Math.min(100, Math.max(5, pct * 2.5))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Emerging Interests */}
      {emergingInterests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-[#171717]">Emerging interests</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emergingInterests.map((interest: any) => {
              const growthVal = typeof interest.growth === 'number' ? interest.growth : parseInt(interest.growth, 10) || 25;
              const desc = interest.description || interest.explanation || 'Accelerating save frequency in recent weeks';
              return (
                <div
                  key={interest.topic}
                  className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ↑ {growthVal}% this period
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#171717] leading-snug">
                      {interest.topic}
                    </h3>
                    <p className="text-xs text-[#5C5C58] leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/bookmarks?topic=${encodeURIComponent(interest.topic.toLowerCase())}`)}
                    className="flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline pt-2 border-t border-[#F2F2EE]"
                  >
                    <span>Filter bookmarks</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section C: Connections ("Ideas that keep appearing together") */}
      {ideaConnections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-base font-bold text-[#171717]">
              Ideas that keep appearing together
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ideaConnections.map((conn: any) => (
              <div
                key={conn.id || `${conn.sourceTopic}-${conn.targetTopic}`}
                className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A8A]">
                    <span className="px-2 py-0.5 rounded bg-[#EEF4FF] border border-[#BFDBFE]">
                      {conn.sourceTopic}
                    </span>
                    <span>↔</span>
                    <span className="px-2 py-0.5 rounded bg-[#EEF4FF] border border-[#BFDBFE]">
                      {conn.targetTopic}
                    </span>
                  </div>
                  <p className="text-xs text-[#42423E] leading-relaxed">
                    {conn.connectionSummary || conn.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F2F2EE] flex items-center justify-between text-xs">
                  <span className="text-[#8A8A85] text-[11px]">
                    {conn.bookmarkCount || 2} intersecting posts
                  </span>
                  {conn.primaryBookmarkId && (
                    <button
                      onClick={() => navigate(`/bookmarks/${conn.primaryBookmarkId}`)}
                      className="flex items-center gap-1 font-semibold text-[#2563EB] hover:underline"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section D: Forgotten Knowledge / Rediscovery */}
      {candidateItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#EA580C]" />
            <div>
              <h2 className="text-base font-bold text-[#171717]">Forgotten knowledge & rediscovery</h2>
              <p className="text-xs text-[#8A8A85]">
                High-value bookmarks saved weeks or months ago that deserve another look
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidateItems.slice(0, 3).map((item: any) => {
              const bm = item.bookmark;
              if (!bm) return null;
              return (
                <div
                  key={bm.id}
                  className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] rounded-xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={bm.author_avatar}
                          alt={bm.author_name}
                          className="w-6 h-6 rounded-full object-cover border border-[#E8E8E5]"
                        />
                        <span className="text-xs font-medium text-[#171717] truncate max-w-[120px]">
                          {bm.author_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendRediscoveryFeedback(bm.id, 'useful', 'insights');
                          }}
                          title="Useful"
                          className="p-1 text-[#8A8A85] hover:text-emerald-600 rounded transition-colors"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendRediscoveryFeedback(bm.id, 'not_relevant', 'insights');
                          }}
                          title="Not relevant"
                          className="p-1 text-[#8A8A85] hover:text-[#DC2626] rounded transition-colors"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#383834] line-clamp-3 leading-relaxed">
                      {bm.ai_summary || bm.content}
                    </p>

                    {item.reason && (
                      <span className="inline-block text-[10px] font-medium text-[#EA580C] bg-[#FFF7ED] border border-[#FFEDD5] px-1.5 py-0.5 rounded">
                        {item.reason}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-[#8A8A85]">
                    <span>{bm.topics?.[0] || 'Saved'}</span>
                    <button
                      onClick={() => navigate(`/bookmarks/${bm.id}`)}
                      className="text-[#2563EB] font-medium hover:underline flex items-center gap-0.5"
                    >
                      <span>Revisit</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section E: Saving Activity (12-week timeline visualization) */}
      {savingTimeline.length > 0 && (
        <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Saving Activity</h2>
              <p className="text-xs text-[#8A8A85]">
                Weekly bookmark volume over the last {savingTimeline.length} weeks
              </p>
            </div>
            <span className="text-xs font-medium text-[#171717]">
              Avg {avgPerWeek} bookmarks / week
            </span>
          </div>

          <div className="pt-4 flex items-end gap-2 sm:gap-4 h-36 border-b border-[#E8E8E5] pb-2">
            {savingTimeline.map((wk: any) => {
              const heightPercent = Math.min(100, Math.max(8, Math.round((wk.count / maxWeeklyCount) * 100)));
              return (
                <div
                  key={wk.weekLabel || wk.week}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                >
                  <span className="text-[10px] font-mono text-[#8A8A85] opacity-0 group-hover:opacity-100 transition-opacity">
                    {wk.count}
                  </span>
                  <div
                    className="w-full bg-[#E2E8F0] group-hover:bg-[#2563EB] rounded-t-md transition-all duration-200"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] text-[#8A8A85] whitespace-nowrap">
                    {wk.weekLabel || wk.week}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
