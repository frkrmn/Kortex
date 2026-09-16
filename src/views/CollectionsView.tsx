import React from 'react';
import {
  FolderKanban,
  Plus,
  Lock,
  Globe,
  ArrowRight,
  Bookmark as BookmarkIcon,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

interface CollectionsViewProps {
  onOpenCreateCollection: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onOpenCreateCollection,
}) => {
  const { navigate } = useRouter();
  const { collections, bookmarks } = useDemoStore();

  return (
    <div id="collections-view" className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Collections</h1>
          <p className="text-xs sm:text-sm text-[#70706B] mt-0.5">
            Turn scattered bookmarks into focused knowledge.
          </p>
        </div>

        <button
          onClick={onOpenCreateCollection}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] text-xs font-semibold transition-colors shadow-2xs cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New collection</span>
        </button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {collections.map((col) => {
          // Gather bookmark previews
          const colBookmarks = col.bookmark_ids
            .map((id) => bookmarks.find((b) => b.id === id))
            .filter(Boolean);

          return (
            <div
              key={col.id}
              onClick={() => navigate(`/collections/${col.slug}`)}
              className="group p-5 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#EEF4FF] text-[#2563EB]">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-bold text-[#171717] group-hover:text-[#2563EB] transition-colors">
                      {col.name}
                    </h2>
                  </div>

                  <span
                    className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                      col.visibility === 'public'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#F4F4F1] text-[#70706B] border-[#E5E5E0]'
                    }`}
                  >
                    {col.visibility === 'public' ? (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Private</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs text-[#5C5C58] leading-relaxed line-clamp-2">
                  {col.description || 'No description provided.'}
                </p>
              </div>

              {/* Bottom Meta & Avatar Previews */}
              <div className="pt-4 mt-4 border-t border-[#F2F2EE] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {colBookmarks.length > 0 && (
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {colBookmarks.slice(0, 3).map((bm) => (
                        <img
                          key={bm?.id}
                          src={bm?.author_avatar}
                          alt={bm?.author_name}
                          className="inline-block w-5 h-5 rounded-full object-cover ring-2 ring-white"
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-[#8A8A85] text-[11px]">
                    {col.bookmark_ids.length} {col.bookmark_ids.length === 1 ? 'bookmark' : 'bookmarks'}
                  </span>
                </div>

                <span className="flex items-center gap-1 text-[#2563EB] font-medium text-xs group-hover:translate-x-0.5 transition-transform">
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
