import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, BrainCircuit, Check, Download, FileJson, FolderKanban, Library, RotateCcw, Search, Sparkles } from 'lucide-react';
import { demoBookmarks, demoCollections } from '../lib/demo-data';
import { useRouter } from '../lib/router';
import { XBookmarkReader } from '../components/XBookmarkReader';
import { BrandMark } from '../components/BrandMark';
import type { Bookmark } from '../types';
import './PublicDemoView.css';

type DemoView = 'library' | 'insights' | 'collections' | 'export';

function primaryCategory(bookmark: Bookmark): string { return bookmark.topics?.[0] || 'Other'; }
function initials(value: string) { return value.replace(' · Sample', '').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(); }

function demoExport() {
  return {
    sample: true,
    product: 'Find Again Interactive Demo',
    generated_at: '2026-10-16T12:00:00.000Z',
    bookmarks: demoBookmarks.map(({ user_id: _userId, ...bookmark }) => bookmark),
    collections: demoCollections.map(({ user_id: _userId, ...collection }) => collection),
  };
}

const demoTabs: Array<{ id: DemoView; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'insights', label: 'AI Insights', icon: BrainCircuit },
  { id: 'collections', label: 'Collections', icon: FolderKanban },
  { id: 'export', label: 'Export preview', icon: FileJson },
];

export const PublicDemoView: React.FC = () => {
  const { route, params, searchParams, navigate } = useRouter();
  const initialView = searchParams.get('view');
  const view: DemoView = demoTabs.some(tab => tab.id === initialView) ? initialView as DemoView : 'library';
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const searchRef = useRef<HTMLInputElement>(null);
  const category = searchParams.get('category') || 'All';
  const topic = searchParams.get('topic') || 'All';
  const collectionId = searchParams.get('collection');
  const activeCollection = demoCollections.find(item => item.id === collectionId);
  const categories = useMemo(() => ['All', ...new Set(demoBookmarks.map(primaryCategory))], []);
  const availableTopics = useMemo(() => {
    const source = category === 'All' ? demoBookmarks : demoBookmarks.filter(item => primaryCategory(item) === category);
    return ['All', ...new Set(source.flatMap(item => item.topics || []))];
  }, [category]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return demoBookmarks.filter(bookmark => {
      if (activeCollection && !activeCollection.bookmark_ids.includes(bookmark.id)) return false;
      if (category !== 'All' && primaryCategory(bookmark) !== category) return false;
      if (topic !== 'All' && !bookmark.topics?.includes(topic)) return false;
      if (!query) return true;
      return [bookmark.content, bookmark.author_name, bookmark.ai_summary, ...(bookmark.topics || []), ...(bookmark.keywords || [])].join(' ').toLowerCase().includes(query);
    });
  }, [activeCollection, category, search, topic]);

  const setView = (nextView: DemoView) => navigate(`/demo${nextView === 'library' ? '' : `?view=${nextView}`}`);
  const updateFilters = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    Object.entries(updates).forEach(([key, value]) => value && value !== 'All' ? next.set(key, value) : next.delete(key));
    const query = next.toString();
    navigate(`/demo${query ? `?${query}` : ''}`);
  };
  const resetFilters = () => { setSearch(''); navigate('/demo'); };
  const bookmark = route === 'demo-bookmark' ? demoBookmarks.find(item => item.id === params.id) : null;
  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(demoExport(), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'find-again-demo-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div id="public-interactive-demo" className="demo-mi">
    <header className="demo-header"><div className="demo-shell demo-header-row">
      <button type="button" onClick={() => navigate('/')} className="demo-brand-button" aria-label="Back to Find Again home"><BrandMark /></button>
      <span className="demo-environment"><Sparkles size={14} /> Interactive Demo <i /> Sample data</span>
      <button type="button" onClick={() => navigate('/signup')} className="demo-signup">Start with your own bookmarks <ArrowRight size={15} /></button>
    </div></header>

    <main className="demo-shell demo-main">
      {route === 'demo-bookmark' ? bookmark ? <div className="demo-reader-view">
        <button type="button" onClick={() => navigate('/demo')} className="demo-back"><ArrowLeft size={16} /> Back to demo library</button>
        <div className="demo-reader-grid"><XBookmarkReader bookmark={bookmark} sample />
          <aside className="demo-insight-panel" aria-label="Sample AI-generated insights">
            <span className="demo-ai-label"><Sparkles size={15} /> Sample AI-generated output</span><h2>Summary</h2><p>{bookmark.ai_summary}</p>
            <dl><div><dt>Category</dt><dd>{primaryCategory(bookmark)}</dd></div><div><dt>Topics</dt><dd>{bookmark.topics.map(item => <button key={item} type="button" onClick={() => navigate(`/demo?topic=${encodeURIComponent(item)}`)}>{item}</button>)}</dd></div><div><dt>Key concepts</dt><dd>{bookmark.keywords.slice(0, 4).map(item => <span key={item}>{item}</span>)}</dd></div></dl>
            <p className="demo-ai-note">This precomputed sample demonstrates the current enrichment fields. Production enrichment can queue and complete in the background.</p>
          </aside>
        </div>
      </div> : <div className="demo-empty"><h1>Demo bookmark not found</h1><p>This link does not match the isolated sample library.</p><button type="button" onClick={() => navigate('/demo')}>Back to Interactive Demo</button></div> : <>
        <section className="demo-intro" aria-labelledby="demo-title"><div><p className="demo-eyebrow">A SAFE, HANDS-ON PRODUCT TOUR</p><h1 id="demo-title">See how saved posts become a useful library.</h1><p>Explore Find Again with sample bookmarks. No account or X connection required.</p></div><div className="demo-safety-card"><span><Check size={15} /> Local fixture data</span><span><Check size={15} /> No provider calls</span><span><Check size={15} /> Disposable interactions</span></div></section>
        <section className="demo-guided" aria-label="Demo starting points">
          <button type="button" onClick={() => setView('library')}><Library size={18} /><span><strong>Explore Library</strong><small>Browse sample bookmarks</small></span></button>
          <button type="button" onClick={() => { setView('library'); requestAnimationFrame(() => searchRef.current?.focus()); }}><Search size={18} /><span><strong>Try Search</strong><small>Search text and metadata</small></span></button>
          <button type="button" onClick={() => setView('insights')}><Sparkles size={18} /><span><strong>View AI Insights</strong><small>See precomputed outputs</small></span></button>
          <button type="button" onClick={() => navigate('/demo/bookmarks/bm_102')}><BookOpen size={18} /><span><strong>Open Reader</strong><small>View a sample thread</small></span></button>
        </section>
        <nav className="demo-tabs" aria-label="Interactive Demo sections">{demoTabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}><Icon size={16} />{label}</button>)}</nav>

        {view === 'library' && <section className="demo-view" aria-labelledby="demo-library-title">
          <div className="demo-view-heading"><div><p className="demo-eyebrow">{activeCollection ? 'SAMPLE COLLECTION' : 'SAMPLE LIBRARY'}</p><h2 id="demo-library-title">{activeCollection?.name || 'Bookmarks worth returning to.'}</h2>{activeCollection && <p>{activeCollection.description}</p>}</div><span>{filtered.length} of {demoBookmarks.length} bookmarks</span></div>
          <div className="demo-filter-panel"><label><Search size={17} /><span className="sr-only">Search demo bookmarks</span><input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search sample bookmark text, topics, or summaries" /></label><div className="demo-filter-row" aria-label="Demo categories">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => updateFilters({ category: item, topic: 'All' })}>{item}</button>)}</div><div className="demo-topic-row" aria-label="Demo topics">{availableTopics.map(item => <button key={item} type="button" aria-pressed={topic === item} onClick={() => updateFilters({ topic: item })}>{item}</button>)}</div>{(search || category !== 'All' || topic !== 'All' || activeCollection) && <button type="button" className="demo-reset" onClick={resetFilters}><RotateCcw size={14} /> Reset filters</button>}</div>
          <div className="demo-bookmark-grid">{filtered.map(item => <article key={item.id} className="demo-bookmark-card">
            {item.media?.[0] && <img className="demo-card-media" src={item.media[0].previewUrl || item.media[0].url} alt={item.media[0].alt || ''} loading="lazy" />}
            <div className="demo-author"><span>{initials(item.author_name)}</span><div><strong>{item.author_name}</strong><small>@{item.author_username}</small></div><i>{primaryCategory(item)}</i></div><p>{item.content}</p><div className="demo-card-summary"><Sparkles size={14} /><span><small>SAMPLE AI SUMMARY</small>{item.ai_summary}</span></div><div className="demo-tags">{item.topics.map(itemTopic => <span key={itemTopic}>{itemTopic}</span>)}</div><button type="button" onClick={() => navigate(`/demo/bookmarks/${item.id}`)}>Open in Reader <ArrowRight size={14} /></button>
          </article>)}</div>
          {!filtered.length && <div className="demo-empty"><Search size={24} /><h3>No sample bookmarks match</h3><p>Try a different word, category, or topic.</p><button type="button" onClick={resetFilters}>Reset filters</button></div>}
        </section>}

        {view === 'insights' && <section className="demo-view" aria-labelledby="demo-insights-title"><div className="demo-view-heading"><div><p className="demo-eyebrow">PRECOMPUTED EXAMPLES</p><h2 id="demo-insights-title">Sample AI-generated insights.</h2><p>These fixtures make no live AI call. Real enrichment may queue and finish in the background.</p></div></div><div className="demo-insights-grid">{demoBookmarks.slice(0, 6).map(item => <article key={item.id}><div className="demo-author"><span>{initials(item.author_name)}</span><div><strong>{item.author_name}</strong><small>@{item.author_username}</small></div></div><span className="demo-ai-label"><Sparkles size={13} /> Sample AI-generated</span><h3>{item.ai_summary}</h3><dl><div><dt>Category</dt><dd>{primaryCategory(item)}</dd></div><div><dt>Topics</dt><dd>{item.topics.join(' · ')}</dd></div><div><dt>Key concepts</dt><dd>{item.keywords.slice(0, 4).join(' · ')}</dd></div></dl><button type="button" onClick={() => navigate(`/demo/bookmarks/${item.id}`)}>Read source context <ArrowRight size={14} /></button></article>)}</div></section>}

        {view === 'collections' && <section className="demo-view" aria-labelledby="demo-collections-title"><div className="demo-view-heading"><div><p className="demo-eyebrow">SAMPLE COLLECTIONS</p><h2 id="demo-collections-title">Ideas grouped around real work.</h2><p>Explore disposable collections built entirely from the local demo dataset.</p></div></div><div className="demo-collection-grid">{demoCollections.map(collection => <article key={collection.id}><span className="demo-collection-icon"><FolderKanban size={20} /></span><div><small>{collection.visibility === 'public' ? 'SHARED SAMPLE' : 'PRIVATE SAMPLE'}</small><h3>{collection.name}</h3><p>{collection.description}</p></div><footer><span>{collection.bookmark_ids.length} bookmarks</span><div>{collection.bookmark_ids.slice(0, 3).map(id => <i key={id}>{initials(demoBookmarks.find(item => item.id === id)?.author_name || 'Sample')}</i>)}</div></footer><button type="button" className="demo-open-collection" onClick={() => navigate(`/demo?collection=${encodeURIComponent(collection.id)}`)}>Open collection <ArrowRight size={14} /></button></article>)}</div></section>}

        {view === 'export' && <section className="demo-view demo-export" aria-labelledby="demo-export-title"><div><p className="demo-eyebrow">SAMPLE JSON EXPORT</p><h2 id="demo-export-title">Preview a portable library.</h2><p>The real Settings export uses structured JSON. This download contains only the synthetic demo fixtures shown here.</p><ul><li><Check size={15} /> {demoBookmarks.length} sample bookmarks</li><li><Check size={15} /> {demoCollections.length} sample collections</li><li><Check size={15} /> Precomputed sample enrichment</li></ul><button type="button" onClick={downloadSample}><Download size={16} /> Download sample JSON</button></div><pre aria-label="Sample export structure"><code>{JSON.stringify({ sample: true, product: 'Find Again Interactive Demo', bookmarks: [{ id: 'bm_101', content: '…', ai_summary: '…', topics: ['AI', 'Engineering'] }], collections: [{ id: 'col_ai_research', bookmark_ids: ['bm_101', '…'] }] }, null, 2)}</code></pre></section>}
      </>}
    </main>
  </div>;
};
