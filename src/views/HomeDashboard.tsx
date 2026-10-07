import React from 'react';
import { ArrowRight, FolderKanban, FolderPlus, RefreshCw, Search } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { BookmarkCard } from '../components/BookmarkCard';
import { Bookmark } from '../types';
import { sortBookmarksNewestFirst } from '../lib/bookmark-order';

interface HomeDashboardProps { onOpenSearch: () => void; onOpenCreateCollection: () => void; }

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenSearch, onOpenCreateCollection }) => {
  const { navigate } = useRouter();
  const { dataMode, profile, bookmarks, topics, collections, bookmarksLoadState, collectionsLoadState, reloadBookmarks, reloadCollections,
    toggleFavorite, toggleRead, deleteBookmark, toggleBookmarkInCollection, xStatus, syncProgress, syncXBookmarks } = useDemoStore();

  const newestBookmarks = sortBookmarksNewestFirst<Bookmark>(bookmarks);
  const recentBookmarks = newestBookmarks.slice(0, 4);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = bookmarks.filter((bookmark) => {
    const imported = new Date(bookmark.imported_at || bookmark.bookmark_created_at).getTime();
    return Number.isFinite(imported) && imported >= weekAgo;
  }).length;

  const handleSyncClick = async () => {
    if (!xStatus.connected) { navigate('/settings?tab=sources'); return; }
    await syncXBookmarks();
  };

  if (bookmarksLoadState === 'loading') return <div className="py-20 text-center text-sm text-[#70706B]" role="status">Loading your library…</div>;
  if (bookmarksLoadState === 'error') return <div className="mx-auto max-w-lg space-y-3 py-20 text-center">
    <h1 className="text-xl font-bold text-[#171717]">Your library could not be loaded</h1>
    <p className="text-sm text-[#70706B]">Your bookmarks are still safe. Check your connection and try again.</p>
    <button type="button" onClick={() => void reloadBookmarks()} className="rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white">Try again</button>
  </div>;

  return <div id="dashboard-view" className="mx-auto max-w-6xl space-y-8 pb-16">
    <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
      <div><h1 className="text-2xl font-bold tracking-tight text-[#171717] sm:text-3xl">Welcome back{profile.display_name ? `, ${profile.display_name}` : ''}</h1><p className="mt-1 text-sm text-[#70706B]">Your saved X posts, organized in one place.</p></div>
      <div className="self-start rounded-lg border border-[#E8E8E5] bg-white px-3 py-1.5 text-xs font-medium text-[#8A8A85] shadow-2xs sm:self-center">{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</div>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
      ['Bookmarks', bookmarks.length.toLocaleString(), 'Saved'], ['New this week', newThisWeek.toLocaleString(), 'Imported'],
      ['Topics', topics.length.toLocaleString(), 'Organized'], ['Unread', bookmarks.filter((bookmark) => !bookmark.is_read).length.toLocaleString(), 'Remaining'],
    ].map(([label, value, caption]) => <div key={label} className="rounded-xl border border-[#E8E8E5] bg-white p-3.5 shadow-2xs"><span className="block text-[11px] font-semibold text-[#8A8A85]">{label}</span><div className="mt-1 flex items-baseline gap-1.5"><span className="text-xl font-bold text-[#171717]">{value}</span><span className="text-[10px] text-[#8A8A85]">{caption}</span></div></div>)}</div>

    {xStatus.connected && <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-[#E8E8E5] bg-white p-3.5 text-xs"><span className="font-semibold text-[#171717]">X source <span className="text-emerald-600">● Connected</span></span><span className="text-[#70706B]">Last synced {xStatus.last_successful_sync ? new Date(xStatus.last_successful_sync).toLocaleString() : 'not yet'}</span><span className="text-[#70706B]">{xStatus.automaticSyncActive ? 'Automatic sync active' : 'Manual sync'}</span></div>}

    {bookmarks.length === 0 ? <div className="rounded-2xl border border-[#E8E8E5] bg-white px-5 py-16 text-center"><h2 className="text-lg font-semibold text-[#171717]">No bookmarks yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-[#70706B]">Connect X and run your first import from Connected Sources, or return here after your current import finishes.</p><button type="button" onClick={() => navigate('/settings?tab=sources')} className="mt-4 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white">Open Connected Sources</button></div> : <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2"><div className="flex items-center justify-between border-b border-[#E8E8E5] pb-1"><div><h2 className="text-base font-semibold text-[#171717]">Recently saved</h2><p className="text-xs text-[#8A8A85]">Your latest imported bookmarks</p></div><button type="button" onClick={() => navigate('/bookmarks')} className="flex items-center gap-1 text-xs font-semibold text-[#1E3A8A]">View all <ArrowRight className="h-3.5 w-3.5" /></button></div>
        <div className="space-y-3">{recentBookmarks.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} collections={collections} variant="row" onOpenDetail={(item) => navigate(`/bookmarks/${item.id}`)} onToggleRead={toggleRead} onToggleFavorite={toggleFavorite} onToggleCollection={collectionsLoadState === 'ready' ? toggleBookmarkInCollection : undefined} onDeleteBookmark={dataMode === 'demo' ? deleteBookmark : undefined} onSelectTopic={(topic) => navigate(`/bookmarks?topic=${encodeURIComponent(topic.toLowerCase())}`)} />)}</div></div>

      <div className="space-y-6">
        <div className="space-y-3 rounded-xl border border-[#E8E8E5] bg-white p-4 shadow-2xs"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">Quick actions</h3><div className="grid grid-cols-2 gap-2"><button type="button" onClick={onOpenSearch} className="flex items-center gap-2 rounded-lg border border-[#E8E8E5] p-2 text-xs font-medium"><Search className="h-3.5 w-3.5" />Search</button><button type="button" onClick={() => void handleSyncClick()} disabled={syncProgress.isSyncing} className="flex items-center gap-2 rounded-lg border border-[#E8E8E5] p-2 text-xs font-medium disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${syncProgress.isSyncing ? 'animate-spin' : ''}`} />{syncProgress.isSyncing ? 'Syncing…' : 'Sync now'}</button><button type="button" onClick={onOpenCreateCollection} disabled={collectionsLoadState !== 'ready'} className="col-span-2 flex items-center gap-2 rounded-lg border border-[#E8E8E5] p-2 text-xs font-medium disabled:opacity-50"><FolderPlus className="h-3.5 w-3.5" />New collection</button></div></div>
        <div className="space-y-3 rounded-xl border border-[#E8E8E5] bg-white p-4 shadow-2xs"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">Top topics</h3><button type="button" onClick={() => navigate('/bookmarks')} className="text-xs font-medium text-[#70706B]">Explore</button></div>{topics.length ? <div className="space-y-2">{topics.slice(0, 5).map((topic) => <button type="button" key={topic.name} onClick={() => navigate(`/bookmarks?topic=${encodeURIComponent(topic.name.toLowerCase())}`)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[#F7F7F5]"><span>{topic.name}</span><span className="font-mono text-[#8A8A85]">{topic.count}</span></button>)}</div> : <p className="text-xs text-[#70706B]">Topics appear after enrichment completes.</p>}</div>
        <div className="space-y-3 rounded-xl border border-[#E8E8E5] bg-white p-4 shadow-2xs"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">Recent collections</h3><button type="button" onClick={() => navigate('/collections')} className="text-xs font-medium text-[#70706B]">View all</button></div>{collectionsLoadState === 'error' ? <button type="button" onClick={() => void reloadCollections()} className="text-xs font-medium text-rose-700">Collections unavailable · Try again</button> : collections.length ? collections.slice(0, 3).map((collection) => <button type="button" key={collection.id} onClick={() => navigate(`/collections/${collection.slug}`)} className="flex w-full items-center justify-between rounded-lg border border-[#E8E8E5] p-2.5 text-left"><span className="flex min-w-0 items-center gap-2"><FolderKanban className="h-4 w-4 shrink-0 text-[#2563EB]" /><span className="truncate text-xs font-medium">{collection.name}</span></span><span className="text-[10px] text-[#8A8A85]">{collection.bookmark_ids.length}</span></button>) : <p className="text-xs text-[#70706B]">Create a collection to group useful bookmarks.</p>}</div>
      </div>
    </div>}
  </div>;
};
