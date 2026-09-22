import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Clock,
  Bookmark as BookmarkIcon,
  Tag,
  Mail,
  Search,
  RefreshCw,
  FolderPlus,
  FolderKanban,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { BookmarkCard } from '../components/BookmarkCard';
import { Bookmark } from '../types';
import { sortBookmarksNewestFirst } from '../lib/bookmark-order';

interface HomeDashboardProps {
  onOpenSearch: () => void;
  onOpenCreateCollection: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenSearch,
  onOpenCreateCollection,
}) => {
  const { navigate } = useRouter();
  const {
    profile,
    bookmarks,
    topics,
    collections,
    digests,
    rediscoveryCandidates,
    sendRediscoveryFeedback,
    toggleFavorite,
    toggleRead,
    deleteBookmark,
    toggleBookmarkInCollection,
    showToast,
    xStatus,
  } = useDemoStore();

  const formattedCurrentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  // Recently saved items (4 bookmarks)
  const newestBookmarks = sortBookmarksNewestFirst<Bookmark>(bookmarks);
  const recentBookmarks = newestBookmarks.slice(0, 4);

  // Worth revisiting items (powered by Rediscovery Service)
  const worthRevisitingItems = rediscoveryCandidates.length > 0
    ? rediscoveryCandidates.slice(0, 3)
    : newestBookmarks.slice(4, 7).map((bm) => ({
        bookmark: bm,
        reason: 'Saved earlier • Revisit value',
        daysSinceSaved: 45,
        score: 0.8,
      }));

  // Top weekly digest
  const featuredDigest = digests[0];
  const featuredDigestCount = featuredDigest ? (featuredDigest.bookmarks_count ?? featuredDigest.bookmarksCount ?? 0) : 0;
  const featuredDigestPeriod = featuredDigest?.period || (featuredDigest?.period_start && featuredDigest?.period_end ? `${new Date(featuredDigest.period_start).toLocaleDateString()} – ${new Date(featuredDigest.period_end).toLocaleDateString()}` : 'Recent');
  const featuredDigestSummary = featuredDigest?.summary || featuredDigest?.overview || (featuredDigest?.key_ideas?.[0] ?? '');
  const featuredDigestTopics = featuredDigest?.dominant_topics || featuredDigest?.dominantTopics || [];

  // Dynamic Topics with percentages for horizontal bars
  const maxTopicCount = Math.max(...topics.map((t) => t.count), 1);
  const displayTopics = topics.slice(0, 5).map((t) => ({
    name: t.name,
    count: t.count,
    percent: Math.min(100, Math.max(15, Math.round((t.count / maxTopicCount) * 100))),
  }));

  const handleSyncClick = () => {
    showToast('Bookmark sync will be available when X is connected.');
  };

  const handleBookmarkClick = (b: Bookmark) => {
    navigate(`/bookmarks/${b.id}`);
  };

  return (
    <div id="dashboard-view" className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
            Good morning, {profile.display_name}
          </h1>
          <p className="text-sm text-[#70706B] mt-1">
            Here's what you've been saving.
          </p>
        </div>
        <div className="text-xs font-medium text-[#8A8A85] bg-[#FFFFFF] border border-[#E8E8E5] px-3 py-1.5 rounded-lg shadow-2xs self-start sm:self-center">
          {formattedCurrentDate}
        </div>
      </div>

      {/* 2. KPI Row: 4 compact cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8A8A85] block">Bookmarks</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-[#171717]">{bookmarks.length.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-3.5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8A8A85] block">New this week</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-700">{Math.min(bookmarks.length, 14)}</span>
            <span className="text-[10px] text-emerald-600 font-medium">↑ 12%</span>
          </div>
        </div>

        <div className="p-3.5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8A8A85] block">Topics</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-[#171717]">{topics.length}</span>
            <span className="text-[10px] text-[#8A8A85]">Categorized</span>
          </div>
        </div>

        <div className="p-3.5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-[#8A8A85] block">Unread</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-[#171717]">
              {bookmarks.length > 0
                ? `${Math.round((bookmarks.filter((b) => !b.is_read).length / bookmarks.length) * 100)}%`
                : '0%'}
            </span>
            <span className="text-[10px] text-[#8A8A85]">To discover</span>
          </div>
        </div>
      </div>

      {xStatus.connected && xStatus.initialImport && (
        <div className="p-3.5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          <span className="font-semibold text-[#171717]">X Sync <span className="text-emerald-600">● Active</span></span>
          <span className="text-[#70706B]">{xStatus.initialImport.importedCount.toLocaleString()} imported initially</span>
          <span className="text-[#70706B]">+{(xStatus.ongoingImportedCount || 0).toLocaleString()} synced since connecting</span>
          <span className="text-[#70706B]">Last synced {xStatus.last_successful_sync ? new Date(xStatus.last_successful_sync).toLocaleString() : 'not yet'}</span>
        </div>
      )}

      {/* Main Grid: Left Primary Content (Recently Saved) & Right Column (Topics, Quick Actions, Collections) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Recently Saved */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#E8E8E5]">
            <div>
              <h2 className="text-base font-semibold text-[#171717]">Recently Saved</h2>
              <p className="text-xs text-[#8A8A85]">Latest imported bookmarks and AI summaries</p>
            </div>
            <button
              onClick={() => navigate('/bookmarks')}
              className="flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:text-[#2563EB] transition-colors cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentBookmarks.map((bm) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                collections={collections}
                variant="row"
                onOpenDetail={handleBookmarkClick}
                onToggleRead={toggleRead}
                onToggleFavorite={toggleFavorite}
                onToggleCollection={toggleBookmarkInCollection}
                onDeleteBookmark={deleteBookmark}
                onSelectTopic={(t) => navigate(`/bookmarks?topic=${encodeURIComponent(t.toLowerCase())}`)}
              />
            ))}
          </div>
        </div>

        {/* Right 1 Column: Topics, Quick Actions, Recent Collections */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-2 p-2 rounded-lg border border-[#E8E8E5] hover:bg-[#F7F7F5] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#70706B]" />
                <span className="truncate">Search</span>
              </button>

              <button
                onClick={() => navigate('/ask')}
                className="flex items-center gap-2 p-2 rounded-lg border border-[#E8E8E5] hover:bg-[#F7F7F5] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="truncate">Ask AI</span>
              </button>

              <button
                onClick={handleSyncClick}
                className="flex items-center gap-2 p-2 rounded-lg border border-[#E8E8E5] hover:bg-[#F7F7F5] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#70706B]" />
                <span className="truncate">Sync now</span>
              </button>

              <button
                onClick={onOpenCreateCollection}
                className="flex items-center gap-2 p-2 rounded-lg border border-[#E8E8E5] hover:bg-[#F7F7F5] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#16A34A]" />
                <span className="truncate">New collection</span>
              </button>
            </div>
          </div>

          {/* Your Topics Card with Understated Horizontal Bars */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">
                Your Topics
              </h3>
              <button
                onClick={() => navigate('/bookmarks')}
                className="text-xs text-[#70706B] hover:text-[#171717] font-medium"
              >
                Explore
              </button>
            </div>

            <div className="space-y-2.5">
              {displayTopics.map((top) => (
                <div
                  key={top.name}
                  onClick={() => navigate(`/bookmarks?topic=${encodeURIComponent(top.name.toLowerCase())}`)}
                  className="group cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#171717] group-hover:text-[#2563EB] transition-colors">
                      {top.name}
                    </span>
                    <span className="text-[#8A8A85] font-mono text-[11px]">{top.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F0F0EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3B82F6]/80 rounded-full transition-all duration-300 group-hover:bg-[#2563EB]"
                      style={{ width: `${top.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Collections Card */}
          <div className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">
                Recent Collections
              </h3>
              <button
                onClick={() => navigate('/collections')}
                className="text-xs text-[#70706B] hover:text-[#171717] font-medium"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {collections.slice(0, 3).map((col) => (
                <div
                  key={col.id}
                  onClick={() => navigate(`/collections/${col.slug}`)}
                  className="p-2.5 rounded-lg border border-[#E8E8E5] hover:border-[#D0D0CB] hover:bg-[#FAFAF8] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderKanban className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#171717] truncate">{col.name}</p>
                      <p className="text-[10px] text-[#8A8A85]">
                        {col.bookmark_ids.length} bookmarks
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8A8A85] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Weekly Digest Wide Horizontal Card */}
      {featuredDigest && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[#EEF4FF] text-[#2563EB] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] block">
                {featuredDigest.type || 'Weekly'} Digest • {featuredDigestPeriod}
              </span>
              <h3 className="text-base font-bold text-[#171717]">
                {featuredDigest.title || 'Your week in bookmarks'}
              </h3>
              <p className="text-xs text-[#70706B] max-w-xl">
                {featuredDigestSummary || `${featuredDigestCount} Bookmarks · Synthesized from your latest saved posts.`}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/digests/${featuredDigest.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] text-xs font-semibold transition-colors shrink-0 shadow-2xs cursor-pointer self-start md:self-center"
          >
            <span>Read Digest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Worth Revisiting Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#171717]">Worth revisiting</h2>
          <p className="text-xs text-[#8A8A85]">Surfacing valuable bookmarks from your past.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {worthRevisitingItems.map((item) => {
            const bm = item.bookmark;
            if (!bm) return null;
            return (
              <div
                key={bm.id}
                onClick={() => handleBookmarkClick(bm)}
                className="p-4 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D5D5CF] rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={bm.author_avatar}
                        alt={bm.author_name}
                        className="w-6 h-6 rounded-full object-cover border border-[#E5E5E0]"
                      />
                      <span className="text-xs font-medium text-[#171717]">{bm.author_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendRediscoveryFeedback(bm.id, 'useful', 'dashboard');
                        }}
                        title="Mark useful"
                        className="p-1 text-[#8A8A85] hover:text-emerald-600 rounded transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendRediscoveryFeedback(bm.id, 'not_relevant', 'dashboard');
                        }}
                        title="Not relevant"
                        className="p-1 text-[#8A8A85] hover:text-[#DC2626] rounded transition-colors"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#2B2B2B] line-clamp-3 leading-relaxed">
                    {bm.ai_summary || bm.content}
                  </p>

                  {item.reason && (
                    <span className="inline-block text-[10px] font-medium text-[#EA580C] bg-[#FFF7ED] border border-[#FFEDD5] px-1.5 py-0.5 rounded">
                      {item.reason}
                    </span>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#F2F2EE] flex items-center justify-between text-[11px] text-[#8A8A85]">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F4F4F1] text-[#555550]">
                    {bm.topics?.[0] || 'Saved'}
                  </span>
                  <span className="flex items-center gap-1 text-[#2563EB] font-medium">
                    <span>Revisit</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
