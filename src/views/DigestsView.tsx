import React, { useState } from 'react';
import { Mail, Calendar, ArrowRight, Sparkles, Layers } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

export const DigestsView: React.FC = () => {
  const { navigate } = useRouter();
  const { digests } = useDemoStore();
  const [filter, setFilter] = useState<'all' | 'weekly' | 'monthly'>('all');

  const filteredDigests = digests.filter((d) => {
    if (filter === 'all') return true;
    return d.type === filter;
  });

  return (
    <div id="digests-view" className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Digests</h1>
          <p className="text-xs sm:text-sm text-[#70706B] mt-0.5">
            Weekly and monthly intelligence synthesized from your bookmarks.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs self-start sm:self-center">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#171717] text-[#FAFAF8]'
                : 'text-[#70706B] hover:text-[#171717]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('weekly')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'weekly'
                ? 'bg-[#171717] text-[#FAFAF8]'
                : 'text-[#70706B] hover:text-[#171717]'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setFilter('monthly')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'monthly'
                ? 'bg-[#171717] text-[#FAFAF8]'
                : 'text-[#70706B] hover:text-[#171717]'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Digest Cards List */}
      <div className="space-y-4">
        {filteredDigests.map((digest) => (
          <div
            key={digest.id}
            onClick={() => navigate(`/digests/${digest.id}`)}
            className="group p-6 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EEF4FF] text-[#2563EB] border border-[#BFDBFE]">
                    {digest.type} Digest
                  </span>
                  <span className="text-xs text-[#8A8A85] flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{digest.period}</span>
                  </span>
                </div>
                <span className="text-xs text-[#8A8A85] font-medium">
                  {digest.bookmarksCount} bookmarks
                </span>
              </div>

              <h2 className="text-lg font-bold text-[#171717] group-hover:text-[#2563EB] transition-colors leading-snug">
                {digest.title}
              </h2>

              <p className="text-xs text-[#52524E] leading-relaxed line-clamp-3">
                {digest.summary}
              </p>
            </div>

            {/* Bottom Meta & Topics */}
            <div className="pt-3 border-t border-[#F2F2EE] flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {digest.dominantTopics.map((topic) => (
                  <span
                    key={topic}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F4F4F1] text-[#555550] border border-[#E4E4DF]"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <span className="flex items-center gap-1 font-semibold text-xs text-[#2563EB] group-hover:translate-x-0.5 transition-transform">
                <span>Read digest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
