import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Clock3 } from 'lucide-react';
import { useRouter } from '../lib/router';
import { BrandMark } from '../components/BrandMark';
import { blogArticles, getBlogArticle, getBlogReadingTime, type BlogArticle, type BlogBlock, type BlogInlinePart } from '../content/blog';
import './BlogViews.css';

const formatDate = (value: string) => new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

function InlineParts({ parts }: { parts: BlogInlinePart[] }) {
  return <>{parts.map((part, index) => typeof part === 'string' ? part : <a key={`${part.href}-${index}`} href={part.href}>{part.label}</a>)}</>;
}

function BlogBlockView({ block }: { block: BlogBlock; key?: React.Key }) {
  if (block.type === 'paragraph') return <p><InlineParts parts={block.parts} /></p>;
  if (block.type === 'heading') return block.level === 2 ? <h2>{block.text}</h2> : <h3>{block.text}</h3>;
  if (block.type === 'list') return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <aside className="blog-callout"><strong>{block.title}</strong><p>{block.text}</p></aside>;
}

function BlogShell({ children }: { children: React.ReactNode }) {
  const { navigate } = useRouter();
  return <div className="blog-mi">
    <header className="blog-header"><div className="blog-container blog-nav">
      <button type="button" onClick={() => navigate('/')} aria-label="Back to Find Again home" className="blog-brand-button"><BrandMark /></button>
      <nav aria-label="Blog navigation"><a href="/">Product</a><a href="/blog" aria-current="page">Blog</a><a href="/signup" className="blog-button blog-button--primary">Get started <ArrowRight size={15} /></a></nav>
    </div></header>
    {children}
    <footer className="blog-footer"><div className="blog-container"><div><BrandMark /><p>Ideas for a more useful bookmark library.</p></div><nav aria-label="Footer navigation"><a href="/">Product</a><a href="/demo">Interactive Demo</a><a href="/blog">Blog</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav></div></footer>
  </div>;
}

function ArticleMeta({ article }: { article: BlogArticle }) {
  return <div className="blog-meta"><span><CalendarDays size={14} />{formatDate(article.publishedAt)}</span><span><Clock3 size={14} />{getBlogReadingTime(article)}</span></div>;
}

function ArticleCard({ article, featured = false }: { article: BlogArticle; featured?: boolean; key?: React.Key }) {
  return <a href={`/blog/${article.slug}`} className={`blog-card${featured ? ' blog-card--featured' : ''}`}>
    <div className="blog-card-image"><img src={article.coverImage} alt={article.coverAlt} width="1600" height="900" loading={featured ? 'eager' : 'lazy'} fetchPriority={featured ? 'high' : 'auto'} /></div>
    <div className="blog-card-copy"><span className="blog-category"><BookOpen size={14} />{article.category}</span><h2>{article.title}</h2><p>{article.description}</p><div className="blog-card-foot"><ArticleMeta article={article} /><span className="blog-read">Read article <ArrowRight size={15} /></span></div></div>
  </a>;
}

export const BlogIndexView: React.FC = () => {
  const [featured, ...latest] = blogArticles;
  return <BlogShell><main>
    <section className="blog-hero"><div className="blog-orb blog-orb--one" /><div className="blog-orb blog-orb--two" /><div className="blog-container"><p className="blog-eyebrow">FIND AGAIN EDITORIAL</p><h1>Ideas worth saving.<br /><span>Systems worth returning to.</span></h1><p>Practical guidance for organizing, understanding, and rediscovering the useful things you save on X.</p></div></section>
    <section className="blog-section blog-container" aria-labelledby="featured-article"><div className="blog-section-head"><div><p className="blog-eyebrow">FEATURED</p><h2 id="featured-article">A thoughtful place to start.</h2></div><p>Build a library around retrieval—not filing for its own sake.</p></div><ArticleCard article={featured} featured /></section>
    <section className="blog-section blog-section--soft" aria-labelledby="latest-articles"><div className="blog-container"><div className="blog-section-head"><div><p className="blog-eyebrow">LATEST GUIDES</p><h2 id="latest-articles">Work better with what you save.</h2></div><p>Real workflows, clear trade-offs, and no invented productivity claims.</p></div><div className="blog-grid">{latest.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div></section>
    <section className="blog-container blog-cta"><div><p className="blog-eyebrow">YOUR LIBRARY, READY WHEN YOU ARE</p><h2>Build a library you can use.</h2><p>Keep saved content searchable, readable, and connected to its original source.</p></div><a href="/signup" className="blog-button blog-button--light">Start with Find Again <ArrowRight size={16} /></a></section>
  </main></BlogShell>;
};

export const BlogArticleView: React.FC = () => {
  const { params, navigate } = useRouter();
  const article = getBlogArticle(params.slug);
  if (!article) return <BlogShell><main className="blog-not-found blog-container"><h1>Article not found</h1><p>This article is not available.</p><button type="button" onClick={() => navigate('/blog')} className="blog-button blog-button--primary"><ArrowLeft size={16} />Back to blog</button></main></BlogShell>;
  const related = article.relatedSlugs.map(getBlogArticle).filter((item): item is BlogArticle => Boolean(item)).slice(0, 3);
  return <BlogShell><main>
    <article aria-labelledby="article-title"><header className="article-hero"><div className="blog-container"><a href="/blog" className="article-back"><ArrowLeft size={16} />Back to blog</a><span className="blog-category"><BookOpen size={14} />{article.category}</span><h1 id="article-title">{article.title}</h1><p>{article.description}</p><div className="article-byline"><span>By {article.author}</span><ArticleMeta article={article} />{article.updatedAt && <span>Updated {formatDate(article.updatedAt)}</span>}</div></div></header>
      <div className="article-cover blog-container"><img src={article.coverImage} alt={article.coverAlt} width="1600" height="900" fetchPriority="high" /></div>
      <div className="article-body">{article.blocks.map((block, index) => <BlogBlockView key={`${article.slug}-${index}`} block={block} />)}{article.faq && <section className="article-faq" aria-labelledby="article-faq"><p className="blog-eyebrow">QUICK ANSWERS</p><h2 id="article-faq">Frequently asked questions</h2>{article.faq.map((faq) => <div key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></div>)}</section>}<section className="article-cta"><p className="blog-eyebrow">PUT SAVED IDEAS TO WORK</p><h2>Build the library you wish X bookmarks were.</h2><p>Organize saved posts, add useful context, and return to the original source whenever it matters.</p><a href="/signup" className="blog-button blog-button--light">Start using Find Again <ArrowRight size={16} /></a></section></div>
    </article><section className="blog-section blog-section--soft" aria-labelledby="related-articles"><div className="blog-container"><div className="blog-section-head"><div><p className="blog-eyebrow">KEEP READING</p><h2 id="related-articles">Related articles</h2></div></div><div className="blog-grid blog-grid--related">{related.map((item) => <ArticleCard key={item.slug} article={item} />)}</div></div></section>
  </main></BlogShell>;
};
