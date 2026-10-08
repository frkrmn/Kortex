import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutList,
  Rows,
  Sparkles,
  X,
  Bookmark as BookmarkIcon,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { BookmarkCard } from '../components/BookmarkCard';
import { ENRICHMENT_CATEGORIES } from '../config/enrichment';
import { categoryCounts, filterEnrichedBookmarks, isEnrichmentCategory, topicCounts, visibleTopicOptions } from '../lib/enrichment-filters';
import { enrichmentStatusPresentation } from '../lib/enrichment-status';

export const BookmarkLibraryView: React.FC = () => {
  const { navigate, searchParams } = useRouter();
  const {
    dataMode,
    bookmarks,
    collections,
    bookmarksLoadState,
    collectionsLoadState,
    reloadBookmarks,
    bookmarkViewMode,
    enrichmentStatus,
    setBookmarkViewMode,
    toggleFavorite,
    toggleRead,
    deleteBookmark,
    toggleBookmarkInCollection,
    searchBookmarks,
    reprocessAllBookmarks,
  } = useDemoStore();

  // URL query params
  const urlTopic = searchParams.get('topic') || 'all';
  const urlCategory = searchParams.get('category') || 'all';
  const urlFilter = (searchParams.get('filter') as 'all' | 'unread' | 'favorites') || 'all';
  const urlSort = (searchParams.get('sort') as 'newest' | 'oldest') || 'newest';
  const urlSearch = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [topicSearch, setTopicSearch] = useState('');
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Sync search query changes to URL debounce
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    setTopicSearch('');
    setShowAllTopics(false);
  }, [urlCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: searchQuery });
  };

  const updateUrlParams = (newParams: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (!v || v === 'all' || (k === 'sort' && v === 'newest')) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    });
    const qs = next.toString();
    navigate(`/bookmarks${qs ? `?${qs}` : ''}`);
  };

  const localFiltered = searchBookmarks('', {
    filter: urlFilter,
    sort: urlSort,
  });

  const displayedBookmarks = filterEnrichedBookmarks(localFiltered, urlCategory, urlTopic, searchQuery);

  const selectedCategory = isEnrichmentCategory(urlCategory) ? urlCategory : null;
  const counts = categoryCounts(bookmarks);
  const availableTopics = selectedCategory ? topicCounts(bookmarks, selectedCategory) : [];
  const visibleTopics = visibleTopicOptions(availableTopics, topicSearch, urlTopic, showAllTopics);
  const hasActiveFilters = Boolean(searchQuery.trim()) || urlCategory !== 'all' || urlTopic !== 'all' || urlFilter !== 'all' || urlSort !== 'newest';

  const clearAllFilters = () => {
    setSearchQuery('');
    setTopicSearch('');
    setShowAllTopics(false);
    navigate('/bookmarks');
  };

  const pendingCount = bookmarks.filter(
    (b) => !b.ai_summary || b.enrichment_status === 'pending' || b.enrichment_status === 'failed'
  ).length;
  const enrichmentPresentation = enrichmentStatusPresentation(enrichmentStatus.activeCount > 0 ? 'processing' : 'pending');

  if (bookmarksLoadState === 'loading') {
    return <div className="py-20 text-center text-sm text-[#70706B]" role="status">Loading your bookmarks…</div>;
  }

  if (bookmarksLoadState === 'error') {
    return <div className="mx-auto max-w-lg space-y-3 py-20 text-center"><h1 className="text-xl font-bold text-[#171717]">Bookmarks could not be loaded</h1><p className="text-sm text-[#70706B]">This is a loading error, not an empty library.</p><button type="button" onClick={() => void reloadBookmarks()} className="rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white">Try again</button></div>;
  }

  return (
    <div id="bookmark-library-view" className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header with Title and Display Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Bookmarks</h1>
          <p className="text-xs sm:text-sm text-[#70706B] mt-0.5">
            Everything you've saved, organized automatically.
          </p>
        </div>

        {/* View Mode & Reprocess Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {dataMode === 'demo' && pendingCount > 0 && !enrichmentStatus.isProcessing && (
            <button
              onClick={reprocessAllBookmarks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
              title="Trigger AI analysis on pending bookmarks"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Enrich All ({pendingCount})</span>
            </button>
          )}

          <div className="flex items-center p-0.5 bg-[#FFFFFF] border border-[#E8E8E5] rounded-lg shadow-2xs">
            <button
              onClick={() => setBookmarkViewMode('comfortable')}
              title="Comfortable view"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                bookmarkViewMode === 'comfortable'
                  ? 'bg-[#F2F2EE] text-[#171717]'
                  : 'text-[#8A8A85] hover:text-[#171717]'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Comfortable</span>
            </button>
            <button
              onClick={() => setBookmarkViewMode('compact')}
              title="Compact view"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                bookmarkViewMode === 'compact'
                  ? 'bg-[#F2F2EE] text-[#171717]'
                  : 'text-[#8A8A85] hover:text-[#171717]'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
              <span>Compact</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Enrichment Background Progress Banner */}
      {(enrichmentStatus.isProcessing || enrichmentStatus.pendingCount > 0) && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className={`w-4 h-4 text-indigo-600 shrink-0 ${enrichmentPresentation.busy ? 'animate-spin' : ''}`} />
            <div className="min-w-0">
              <span className="font-semibold block text-indigo-900">
                {enrichmentPresentation.title}
              </span>
              <span className="text-[11px] text-indigo-700">
                {enrichmentStatus.activeCount} active • {enrichmentStatus.pendingCount} queued • {enrichmentStatus.completedCount} completed
              </span>
            </div>
          </div>
          <span className="text-[11px] font-medium text-indigo-600 shrink-0 bg-white/80 px-2.5 py-1 rounded-md border border-indigo-100">
            Background Queue
          </span>
        </div>
      )}

      {collectionsLoadState === 'error' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Collections could not be loaded. Bookmark search and reading still work; collection actions are unavailable.</div>}

      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A85]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            updateUrlParams({ q: e.target.value });
          }}
          placeholder="Search text, authors, summaries, categories, topics, or key concepts..."
          className="w-full pl-10 pr-10 py-2.5 bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] focus:border-[#2563EB] rounded-xl text-sm text-[#171717] placeholder:text-[#8A8A85] outline-none shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              updateUrlParams({ q: '' });
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8A85] hover:text-[#171717]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Filter Bar: Status Tabs, Topic Chips & Sort */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Categories">
          <button onClick={() => updateUrlParams({ category: 'all', topic: 'all' })}
            className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap border ${urlCategory === 'all' ? 'bg-[#171717] text-white' : 'bg-white text-[#70706B]'}`}>
            All ({bookmarks.length})
          </button>
          {ENRICHMENT_CATEGORIES.map(category => (
            <button key={category} onClick={() => updateUrlParams({ category, topic: 'all' })}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap border ${urlCategory === category ? 'bg-[#171717] text-white' : 'bg-white text-[#70706B]'}`}>
              {category} ({counts[category]})
            </button>
          ))}
        </div>
        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
          <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-2xs">
            <button
              onClick={() => updateUrlParams({ filter: 'all' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                urlFilter === 'all'
                  ? 'bg-[#171717] text-[#FAFAF8]'
                  : 'text-[#70706B] hover:text-[#171717]'
              }`}
            >
              All ({bookmarks.length})
            </button>
            <button
              onClick={() => updateUrlParams({ filter: 'unread' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                urlFilter === 'unread'
                  ? 'bg-[#171717] text-[#FAFAF8]'
                  : 'text-[#70706B] hover:text-[#171717]'
              }`}
            >
              Unread ({bookmarks.filter((b) => !b.is_read).length})
            </button>
            <button
              onClick={() => updateUrlParams({ filter: 'favorites' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                urlFilter === 'favorites'
                  ? 'bg-[#171717] text-[#FAFAF8]'
                  : 'text-[#70706B] hover:text-[#171717]'
              }`}
            >
              Favorites ({bookmarks.filter((b) => b.is_favorite).length})
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8A8A85]">Sort:</span>
            <select
              value={urlSort}
              onChange={(e) => updateUrlParams({ sort: e.target.value })}
              className="bg-[#FFFFFF] border border-[#E8E8E5] rounded-lg px-2.5 py-1 text-xs text-[#171717] outline-none shadow-2xs"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {selectedCategory && availableTopics.length > 0 && <div className="space-y-2 rounded-xl border border-[#E8E8E5] bg-white p-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A85]" />
              <input value={topicSearch} onChange={(event) => setTopicSearch(event.target.value)}
                aria-label={`Search ${selectedCategory} topics`} placeholder="Find a topic"
                className="w-full rounded-lg border border-[#E8E8E5] bg-[#FAFAF8] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#2563EB]" />
            </div>
            {!topicSearch && availableTopics.length > 12 && <button type="button" onClick={() => setShowAllTopics(value => !value)}
              className="self-start text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] sm:self-auto">
              {showAllTopics ? 'Show fewer topics' : `Show all topics (${availableTopics.length})`}
            </button>}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="Topics">
          {[['all', counts[selectedCategory]] as const, ...visibleTopics].map(([topic, count]) => {
            const isSelected =
              topic === 'all'
                ? urlTopic === 'all'
                : urlTopic.toLowerCase() === topic.toLowerCase();
            return (
              <button
                key={topic}
                onClick={() => updateUrlParams({ topic })}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-[#EEF4FF] border-[#BFDBFE] text-[#1E3A8A] font-semibold'
                    : 'bg-[#FFFFFF] border-[#E8E8E5] text-[#70706B] hover:text-[#171717] hover:border-[#D0D0CB]'
                }`}
              >
                {topic === 'all' ? 'All topics' : topic} ({count})
              </button>
            );
          })}
          </div>
          {topicSearch && visibleTopics.length === 0 && <p className="px-1 text-xs text-[#8A8A85]">No topics match “{topicSearch.trim()}”.</p>}
        </div>}

        {hasActiveFilters && <div className="flex justify-end">
          <button type="button" onClick={clearAllFilters} className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]">Clear all filters</button>
        </div>}
      </div>

      {/* Search Result Overview Bar */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between p-3 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl text-xs text-[#70706B] shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#171717]">
              {displayedBookmarks.length} result(s)
            </span>
            <span>for <span className="font-medium text-[#171717]">"{searchQuery.trim()}"</span></span>
            <span className="text-[11px] text-[#8A8A85]">Keyword search</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              updateUrlParams({ q: '' });
            }}
            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium cursor-pointer"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Bookmarks Feed */}
      {displayedBookmarks.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl">
          <BookmarkIcon className="w-8 h-8 text-[#A0A09A] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#171717]">No bookmarks found</h3>
          <p className="text-xs text-[#70706B] mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, active topic filter, or unread tab to see more results.
          </p>
          <button
            onClick={() => navigate('/bookmarks')}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#F4F4F1] border border-[#E2E2DC] text-xs font-medium text-[#171717] hover:bg-[#EBEBE6]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedBookmarks.map((bm) => (
            <BookmarkCard
              key={bm.id}
              bookmark={bm}
              collections={collections}
              variant={bookmarkViewMode === 'compact' ? 'compact' : 'row'}
              onOpenDetail={(b) => navigate(`/bookmarks/${b.id}`)}
              onToggleRead={toggleRead}
              onToggleFavorite={toggleFavorite}
              onToggleCollection={collectionsLoadState === 'ready' ? toggleBookmarkInCollection : undefined}
              onDeleteBookmark={dataMode === 'demo' ? deleteBookmark : undefined}
              onSelectTopic={(t) => updateUrlParams({ topic: t.toLowerCase() })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
