import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { useRouter } from '../lib/router';
import { blogArticles, getBlogArticle, type BlogArticle, type BlogBlock, type BlogInlinePart } from '../content/blog';

function InlineParts({ parts }: { parts: BlogInlinePart[] }) {
  return <>{parts.map((part, index) => typeof part === 'string' ? part : <a key={`${part.href}-${index}`} href={part.href} className="font-semibold text-[#171717] underline decoration-[#B7B7B0] underline-offset-2 hover:decoration-[#171717]">{part.label}</a>)}</>;
}

function BlogBlockView({ block }: { block: BlogBlock; key?: React.Key }) {
  if (block.type === 'paragraph') return <p><InlineParts parts={block.parts} /></p>;
  if (block.type === 'heading') return block.level === 2
    ? <h2 className="pt-4 text-2xl font-bold leading-8 text-[#171717]">{block.text}</h2>
    : <h3 className="pt-3 text-xl font-bold leading-7 text-[#171717]">{block.text}</h3>;
  if (block.type === 'list') return <ul className="list-disc space-y-2 pl-6">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <aside className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-indigo-950"><p className="font-semibold">{block.title}</p><p className="mt-1">{block.text}</p></aside>;
}

function BlogShell({ children }: { children: React.ReactNode }) {
  const { navigate } = useRouter();
  return <div className="min-h-screen bg-[#FAFAF8] text-[#171717]">
    <header className="border-b border-[#E8E8E5] bg-[#FAFAF8]/95">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button type="button" onClick={() => navigate('/')} aria-label="Back to Recallly home" className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#171717] text-white"><Layers className="h-4 w-4" /></span><span className="font-bold tracking-tight">Recallly</span></button>
        <nav aria-label="Blog navigation" className="flex items-center gap-4 text-sm text-[#70706B]"><a href="/blog" className="font-semibold text-[#171717]">Blog</a><a href="/demo" className="hover:text-[#171717]">Interactive Demo</a><a href="/signup" className="inline-flex items-center gap-1 rounded-xl bg-[#171717] px-3 py-2 font-semibold text-white hover:bg-[#2B2B2B]">Get started <ArrowRight className="h-3.5 w-3.5" /></a></nav>
      </div>
    </header>
    {children}
    <footer className="border-t border-[#E8E8E5] px-4 py-10 text-sm leading-6 text-[#70706B] sm:px-6"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><span>Recallly · Ideas for a more useful bookmark library.</span><nav aria-label="Legal navigation" className="flex gap-4"><a href="/blog" className="hover:text-[#171717]">Blog</a><a href="/terms" className="hover:text-[#171717]">Terms</a><a href="/privacy" className="hover:text-[#171717]">Privacy</a></nav></div></footer>
  </div>;
}

function ArticleCard({ article, featured = false }: { article: BlogArticle; featured?: boolean; key?: React.Key }) {
  return <a href={`/blog/${article.slug}`} className={`group block rounded-3xl border border-[#E8E8E5] bg-white p-6 shadow-xs transition hover:-translate-y-0.5 hover:border-[#D0D0CB] ${featured ? 'sm:p-8' : ''}`}>
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#70706B]"><BookOpen className="h-3.5 w-3.5" /> {article.category}</div>
    <h2 className={`mt-4 font-bold leading-tight text-[#171717] group-hover:underline group-hover:decoration-[#B7B7B0] ${featured ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{article.title}</h2>
    <p className="mt-4 text-base leading-7 text-[#5C5C58]">{article.description}</p>
    <p className="mt-6 text-sm text-[#70706B]">{article.readingTime} · {article.publishedAt}</p>
  </a>;
}

export const BlogIndexView: React.FC = () => {
  const featured = blogArticles[0];
  return <BlogShell><main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"><div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#70706B]">Recallly editorial</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Make saved ideas easier to return to.</h1><p className="mt-5 text-lg leading-8 text-[#5C5C58]">Useful thinking on X bookmark organization, AI-assisted enrichment, and the habits that turn a saved post into a future resource.</p></div><section aria-labelledby="featured-article" className="mt-12"><h2 id="featured-article" className="sr-only">Featured article</h2><ArticleCard article={featured} featured /></section><section aria-labelledby="latest-articles" className="mt-12"><h2 id="latest-articles" className="text-2xl font-bold">Latest articles</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{blogArticles.slice(1).map((article) => <ArticleCard key={article.slug} article={article} />)}</div></section><section className="mt-14 rounded-3xl bg-[#171717] p-7 text-white sm:p-9"><h2 className="text-2xl font-bold">Build a library you can use.</h2><p className="mt-3 max-w-2xl text-base leading-7 text-white/70">See how Recallly keeps saved content searchable, readable, and connected to its original source.</p><a href="/demo" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#171717]">Explore the demo <ArrowRight className="h-4 w-4" /></a></section></main></BlogShell>;
};

export const BlogArticleView: React.FC = () => {
  const { params, navigate } = useRouter();
  const article = getBlogArticle(params.slug);
  if (!article) return <BlogShell><main className="mx-auto max-w-3xl px-4 py-20 sm:px-6"><h1 className="text-3xl font-bold">Article not found</h1><p className="mt-3 text-base text-[#5C5C58]">This article is not available.</p><button type="button" onClick={() => navigate('/blog')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> Back to blog</button></main></BlogShell>;
  const related = article.relatedSlugs.map(getBlogArticle).filter((item): item is BlogArticle => Boolean(item));
  return <BlogShell><main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><article className="mx-auto max-w-3xl" aria-labelledby="article-title"><a href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#70706B] hover:text-[#171717]"><ArrowLeft className="h-4 w-4" /> Back to blog</a><p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em] text-[#70706B]">{article.category}</p><h1 id="article-title" className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{article.title}</h1><p className="mt-5 text-xl leading-8 text-[#5C5C58]">{article.description}</p><div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#70706B]"><span>By {article.author}</span><span>Published {article.publishedAt}</span>{article.updatedAt && <span>Updated {article.updatedAt}</span>}<span>{article.readingTime}</span></div><div className="mt-10 space-y-6 text-lg leading-8 text-[#42423E]">{article.blocks.map((block, index) => <BlogBlockView key={`${article.slug}-${index}`} block={block} />)}</div>{article.faq && <section className="mt-12 border-t border-[#E8E8E5] pt-10" aria-labelledby="article-faq"><h2 id="article-faq" className="text-2xl font-bold">Frequently asked questions</h2><div className="mt-5 space-y-5">{article.faq.map((faq) => <div key={faq.question}><h3 className="text-lg font-bold">{faq.question}</h3><p className="mt-2 text-base leading-7 text-[#5C5C58]">{faq.answer}</p></div>)}</div></section>}<section className="mt-12 rounded-3xl bg-[#171717] p-7 text-white sm:p-9"><h2 className="text-2xl font-bold">Put your saved ideas to work.</h2><p className="mt-3 text-base leading-7 text-white/70">Explore Recallly with demo data, then start building your own searchable bookmark library.</p><div className="mt-6 flex flex-wrap gap-3"><a href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#171717]">Explore the demo <ArrowRight className="h-4 w-4" /></a><a href="/signup" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white">Start using Recallly</a></div></section></article><section className="mx-auto mt-16 max-w-6xl border-t border-[#E8E8E5] pt-10" aria-labelledby="related-articles"><h2 id="related-articles" className="text-2xl font-bold">Related articles</h2><div className="mt-5 grid gap-5 md:grid-cols-2">{related.map((item) => <ArticleCard key={item.slug} article={item} />)}</div></section></main></BlogShell>;
};
