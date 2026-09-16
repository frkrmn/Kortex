import React from 'react';
import {
  Sparkles,
  TrendingUp,
  GitMerge,
  Clock,
  Calendar,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

export const InsightsView: React.FC = () => {
  const { navigate } = useRouter();
  const { insights, bookmarks } = useDemoStore();

  const forgottenBookmarks = bookmarks.slice(4, 7);

  return (
    <div id="insights-view" className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8E8E5]">
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Insights</h1>
        <p className="text-xs sm:text-sm text-[#70706B] mt-0.5">
          Patterns hidden inside the things you save.
        </p>
      </div>

      {/* Section A: What you're paying attention to (Topic distribution horizontal bars) */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#171717]">
              What you're paying attention to
            </h2>
            <p className="text-xs text-[#8A8A85]">
              Topic distribution based on 2,847 categorized bookmarks
            </p>
          </div>
          <span className="text-xs font-medium text-[#2563EB]">18 active domains</span>
        </div>

        <div className="space-y-3 pt-2">
          {insights.topics_distribution.map((item) => (
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
                  {item.percentage}% ({item.count.toLocaleString()} saved)
                </span>
              </div>
              <div className="w-full h-2 bg-[#F0F0EB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3B82F6] rounded-full transition-all duration-300 group-hover:bg-[#2563EB]"
                  style={{ width: `${item.percentage * 2.8}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section B: Emerging Interests */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-bold text-[#171717]">Emerging interests</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.emergingInterests.map((interest) => (
            <div
              key={interest.topic}
              className="p-5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    ↑ {interest.growth}% this month
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#171717] leading-snug">
                  {interest.topic}
                </h3>
                <p className="text-xs text-[#5C5C58] leading-relaxed">
                  {interest.description}
                </p>
              </div>

              <button
                onClick={() => navigate('/bookmarks')}
                className="flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline pt-2 border-t border-[#F2F2EE]"
              >
                <span>Filter bookmarks</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section C: Connections ("Ideas that keep appearing together") */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-[#4F46E5]" />
          <h2 className="text-base font-bold text-[#171717]">
            Ideas that keep appearing together
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.ideaConnections.map((conn) => (
            <div
              key={conn.id}
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
                  {conn.connectionSummary}
                </p>
              </div>

              <div className="pt-3 border-t border-[#F2F2EE] flex items-center justify-between text-xs">
                <span className="text-[#8A8A85] text-[11px]">
                  {conn.bookmarkCount} intersecting posts
                </span>
                <button
                  onClick={() => navigate(`/bookmarks/${conn.primaryBookmarkId}`)}
                  className="flex items-center gap-1 font-semibold text-[#2563EB] hover:underline"
                >
                  <span>Explore connection</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section D: Forgotten Knowledge */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#EA580C]" />
          <div>
            <h2 className="text-base font-bold text-[#171717]">Forgotten knowledge</h2>
            <p className="text-xs text-[#8A8A85]">
              High value bookmarks saved months ago that deserve another look
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forgottenBookmarks.map((bm) => (
            <div
              key={bm.id}
              onClick={() => navigate(`/bookmarks/${bm.id}`)}
              className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img
                    src={bm.author_avatar}
                    alt={bm.author_name}
                    className="w-6 h-6 rounded-full object-cover border border-[#E8E8E5]"
                  />
                  <span className="text-xs font-medium text-[#171717]">{bm.author_name}</span>
                </div>
                <p className="text-xs text-[#383834] line-clamp-3 leading-relaxed">
                  {bm.content}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-[#8A8A85]">
                <span>{bm.topics?.[0] || 'Saved'}</span>
                <span className="text-[#2563EB] font-medium">Revisit →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section E: Saving Activity (12-week timeline visualization) */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#171717]">Saving Activity</h2>
            <p className="text-xs text-[#8A8A85]">
              Weekly bookmark volume over the last 12 weeks
            </p>
          </div>
          <span className="text-xs font-medium text-[#171717]">
            Avg 32 bookmarks / week
          </span>
        </div>

        <div className="pt-4 flex items-end gap-2 sm:gap-4 h-36 border-b border-[#E8E8E5] pb-2">
          {insights.savingActivityTimeline.map((wk) => {
            const heightPercent = Math.min(100, Math.round((wk.count / 45) * 100));
            return (
              <div
                key={wk.weekLabel}
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
                  {wk.weekLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
