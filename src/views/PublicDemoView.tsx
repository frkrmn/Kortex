import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Layers, Search, Sparkles } from 'lucide-react';
import { demoBookmarks } from '../lib/demo-data';
import { useRouter } from '../lib/router';
import { XBookmarkReader } from '../components/XBookmarkReader';

function primaryCategory(topics: string[]): string {
  return topics[0] || 'Other';
}

export const PublicDemoView: React.FC = () => {
  const { route, params, searchParams, navigate } = useRouter();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const category = searchParams.get('category') || 'All';
  const topic = searchParams.get('topic') || 'All';

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(demoBookmarks.map((bookmark) => primaryCategory(bookmark.topics || []))))],
    []
  );

  const availableTopics = useMemo(() => {
    const source = category === 'All'
      ? demoBookmarks
      : demoBookmarks.filter((bookmark) => primaryCategory(bookmark.topics || []) === category);
    return ['All', ...Array.from(new Set(source.flatMap((bookmark) => bookmark.topics || [])))];
  }, [category]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return demoBookmarks.filter((bookmark) => {
      if (category !== 'All' && primaryCategory(bookmark.topics || []) !== category) return false;
      if (topic !== 'All' && !(bookmark.topics || []).includes(topic)) return false;
      if (!normalizedSearch) return true;
      return [bookmark.content, bookmark.author_name, bookmark.ai_summary, ...(bookmark.topics || []), ...(bookmark.keywords || [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [category, search, topic]);

  const updateFilters = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'All') next.delete(key);
      else next.set(key, value);
    });
    const query = next.toString();
    navigate(`/demo${query ? `?${query}` : ''}`);
  };

  const bookmark = route === 'demo-bookmark'
    ? demoBookmarks.find((item) => item.id === params.id)
    : null;

  return (
    <div id="public-interactive-demo" className="min-h-screen bg-[#FAFAF8] text-[#171717]">
      <header className="sticky top-0 z-40 border-b border-[#E8E8E5] bg-[#FAFAF8]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5" aria-label="Back to Recallly home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#171717] text-white">
              <Layers className="h-4 w-4" />
            </span>
            <span className="font-bold tracking-tight">Recallly</span>
          </button>

          <div className="order-3 flex w-full items-center justify-center sm:order-2 sm:w-auto" aria-label="Demo environment">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" /> Interactive Demo · Demo data
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="order-2 inline-flex items-center gap-1.5 rounded-xl bg-[#171717] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2B2B2B] sm:order-3"
          >
            Start using Recallly <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {route === 'demo-bookmark' ? (
          bookmark ? (
            <div className="space-y-6">
              <button type="button" onClick={() => navigate('/demo')} className="inline-flex items-center gap-2 text-xs font-medium text-[#70706B] hover:text-[#171717]">
                <ArrowLeft className="h-4 w-4" /> Back to demo library
              </button>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <XBookmarkReader bookmark={bookmark} />
                </div>
                <aside className="h-fit space-y-4 rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    <Sparkles className="h-4 w-4" /> AI Summary
                  </div>
                  <p className="text-sm leading-6 text-[#383834]">{bookmark.ai_summary}</p>
                  <div className="border-t border-[#F0F0EC] pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A85]">Category</p>
                    <p className="mt-1 text-sm font-semibold">{primaryCategory(bookmark.topics || [])}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A85]">Topics</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(bookmark.topics || []).map((item) => (
                        <button key={item} type="button" onClick={() => navigate(`/demo?topic=${encodeURIComponent(item)}`)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900">
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-lg py-24 text-center">
              <h1 className="text-xl font-bold">Demo bookmark not found</h1>
              <p className="mt-2 text-sm text-[#70706B]">This demo link does not match an available fixture.</p>
              <button type="button" onClick={() => navigate('/demo')} className="mt-5 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white">Back to demo</button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore an organized bookmark library</h1>
              <p className="mt-2 text-sm leading-6 text-[#70706B]">Browse safe sample bookmarks, filter by category and topic, search, and open the in-app Reader. No account or connected X profile is used.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#E8E8E5] bg-white p-4 shadow-2xs">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A85]" />
                <span className="sr-only">Search demo bookmarks</span>
                <input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); updateFilters({ q: event.target.value }); }}
                  placeholder="Search demo bookmarks..."
                  className="w-full rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Demo categories">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => updateFilters({ category: item, topic: 'All' })} className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium ${category === item ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#E8E8E5] bg-white text-[#595954]'}`}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Demo topics">
                {availableTopics.map((item) => (
                  <button key={item} type="button" onClick={() => updateFilters({ topic: item })} className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium ${topic === item ? 'bg-blue-100 text-blue-900' : 'bg-[#F4F4F1] text-[#70706B]'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#70706B]">
              <span>{filtered.length} demo bookmark{filtered.length === 1 ? '' : 's'}</span>
              {(search || category !== 'All' || topic !== 'All') && <button type="button" onClick={() => { setSearch(''); navigate('/demo'); }} className="font-medium text-blue-600 hover:underline">Clear filters</button>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((item) => (
                <article key={item.id} className="flex flex-col rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <img src={item.author_avatar} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{item.author_name}</p>
                      <p className="truncate text-[11px] text-[#8A8A85]">@{item.author_username}</p>
                    </div>
                    <span className="ml-auto rounded bg-[#EEF4FF] px-2 py-1 text-[10px] font-medium text-[#1E3A8A]">{primaryCategory(item.topics || [])}</span>
                  </div>
                  <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-[#383834]">{item.content}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(item.topics || []).map((itemTopic) => <span key={itemTopic} className="rounded-full bg-[#F4F4F1] px-2 py-1 text-[10px] text-[#70706B]">{itemTopic}</span>)}
                  </div>
                  <button type="button" onClick={() => navigate(`/demo/bookmarks/${item.id}`)} className="mt-5 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-blue-600 hover:underline">
                    Open in Reader <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </article>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="rounded-2xl border border-[#E8E8E5] bg-white py-16 text-center">
                <p className="text-sm font-semibold">No demo bookmarks match</p>
                <button type="button" onClick={() => { setSearch(''); navigate('/demo'); }} className="mt-3 text-xs font-medium text-blue-600 hover:underline">Clear filters</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
