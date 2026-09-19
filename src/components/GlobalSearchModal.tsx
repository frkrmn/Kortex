import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Bookmark as BookmarkIcon,
  FolderKanban,
  Tag,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { api } from '../lib/api';
import { Bookmark, Collection, Topic } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { navigate } = useRouter();
  const { bookmarks, collections, topics, searchBookmarks } = useDemoStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [serverResults, setServerResults] = useState<{
    bookmarks: Bookmark[];
    searchResults?: { item: Bookmark; score: number; matchType: 'lexical' | 'semantic' | 'hybrid' }[];
    collections: Collection[];
    topics: Topic[];
    searchMode?: string;
    latencyMs?: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
      setServerResults(null);
    }
  }, [isOpen]);

  // Global ESC and key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced server-side hybrid search with fallback to local store
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setServerResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.globalSearch(trimmed);
        setServerResults(res);
      } catch (err) {
        console.warn('Global search API fallback to local:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  // Bookmarks from server hybrid search or local fallback
  const searchResultsList = serverResults?.searchResults || [];
  const matchedBookmarks: Bookmark[] = serverResults
    ? serverResults.bookmarks.slice(0, 6)
    : query.trim()
    ? searchBookmarks(query).slice(0, 5)
    : [];

  // Match lookup for hybrid/semantic badge
  const matchMap = new Map<string, { matchType: 'lexical' | 'semantic' | 'hybrid'; score: number }>();
  searchResultsList.forEach((sr) => {
    matchMap.set(sr.item.id, { matchType: sr.matchType, score: sr.score });
  });

  // Collections
  const matchedCollections = serverResults
    ? serverResults.collections.slice(0, 3)
    : query.trim()
    ? collections
        .filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 3)
    : [];

  // Topics
  const matchedTopics = serverResults
    ? serverResults.topics.slice(0, 4)
    : query.trim()
    ? topics.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : [];

  const hasQuery = query.trim().length > 0;

  return (
    <div
      id="global-search-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E8E8E5]">
          <Search className="w-4 h-4 text-[#8A8A85] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search bookmarks, collections, or topics..."
            className="flex-1 bg-transparent text-sm text-[#171717] placeholder:text-[#8A8A85] outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#8A8A85] hover:text-[#171717] rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F4F1] border border-[#E0E0DC] text-[#8A8A85]">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {!hasQuery ? (
            /* Suggested when empty */
            <div className="p-3 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85] block">
                Quick Navigation & Topics
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate('/ask');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAFAF8] text-xs font-medium text-[#171717] transition-colors text-left"
                >
                  <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  <span>Ask AI Assistant</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/bookmarks?filter=unread');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAFAF8] text-xs font-medium text-[#171717] transition-colors text-left"
                >
                  <BookmarkIcon className="w-4 h-4 text-[#70706B]" />
                  <span>Unread Bookmarks</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/bookmarks?topic=ai');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAFAF8] text-xs font-medium text-[#171717] transition-colors text-left"
                >
                  <Tag className="w-4 h-4 text-[#2563EB]" />
                  <span>AI & Agents</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/bookmarks?topic=product');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAFAF8] text-xs font-medium text-[#171717] transition-colors text-left"
                >
                  <Tag className="w-4 h-4 text-[#70706B]" />
                  <span>Product Strategy</span>
                </button>
              </div>
            </div>
          ) : (
            /* Search Results */
            <div className="space-y-4">
              {/* Collections Results */}
              {matchedCollections.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A85] px-2 block">
                    Collections
                  </span>
                  {matchedCollections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        navigate(`/collections/${col.slug}`);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-[#F4F4F1] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FolderKanban className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <span className="text-xs font-semibold text-[#171717] truncate">
                          {col.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8A8A85]">
                        {col.bookmark_ids.length} items
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Topics Results */}
              {matchedTopics.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A85] px-2 block">
                    Topics
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap px-2">
                    {matchedTopics.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          navigate(`/bookmarks?topic=${t.id}`);
                          onClose();
                        }}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#EEF4FF] text-[#1E3A8A] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                      >
                        #{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookmarks Results */}
              {matchedBookmarks.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A85]">
                      Bookmarks
                    </span>
                    {serverResults?.latencyMs !== undefined && (
                      <span className="text-[10px] text-[#8A8A85] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                        {serverResults.searchMode || 'Hybrid'} • {serverResults.latencyMs}ms
                      </span>
                    )}
                  </div>
                  {matchedBookmarks.map((bm) => {
                    const matchInfo = matchMap.get(bm.id);
                    return (
                      <button
                        key={bm.id}
                        onClick={() => {
                          navigate(`/bookmarks/${bm.id}`);
                          onClose();
                        }}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-[#F4F4F1] transition-colors cursor-pointer group"
                      >
                        <img
                          src={bm.author_avatar}
                          alt={bm.author_name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-[#E8E8E5]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-[#171717] truncate">
                              {bm.author_name}
                            </span>
                            <span className="text-[10px] text-[#8A8A85]">@{bm.author_username}</span>
                            {matchInfo && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                                  matchInfo.matchType === 'semantic'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : matchInfo.matchType === 'hybrid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {matchInfo.matchType === 'semantic'
                                  ? 'Vector'
                                  : matchInfo.matchType === 'hybrid'
                                  ? 'Hybrid'
                                  : 'Keyword'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#52524E] line-clamp-2 mt-0.5">
                            {bm.content}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#8A8A85] group-hover:text-[#2563EB] shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedBookmarks.length === 0 &&
                matchedCollections.length === 0 &&
                matchedTopics.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#8A8A85]">
                    No matching bookmarks, collections, or topics found for "{query}".
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#E8E8E5] bg-[#FAFAF8] text-[11px] text-[#8A8A85] flex items-center justify-between">
          <span>Navigate with click or search query</span>
          <span>Recallly Global Search</span>
        </div>
      </div>
    </div>
  );
};
