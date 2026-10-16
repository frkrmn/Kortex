import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  FolderKanban,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { DEFAULT_TRIAL_DAYS, PLANS, X_HISTORY_EXPLANATION } from '../config/plans';
import { marketingFaqs } from '../content/marketing';
import './LandingPage.css';

interface LandingPageProps {
  onExploreDemo: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  onStartOnboarding: () => void;
}

const featureCards = [
  { icon: Sparkles, title: 'AI summaries', body: 'Turn long threads into clear, concise insights.' },
  { icon: Tag, title: 'Smart organization', body: 'Organize your bookmarks with AI-powered topics.' },
  { icon: Search, title: 'Powerful search', body: 'Find saved ideas by text, category, or topic—without endless scrolling.' },
  { icon: Download, title: 'Your data, always', body: 'Export your available account data as structured JSON and stay in control.' },
];

const audiences = [
  ['Individuals', 'Build a calmer, searchable home for ideas worth keeping.'],
  ['Researchers', 'Return to source material, summaries, and topics without losing context.'],
  ['Creators', 'Collect references and organize sparks before they disappear in the feed.'],
  ['Product teams', 'Keep useful market, product, and technical reading in focused collections.'],
  ['Lifelong learners', 'Turn everyday saving into a library you can actually revisit.'],
];

const Logo: React.FC = () => (
  <span className="mi-logo-mark" aria-hidden="true"><Layers size={18} strokeWidth={2.2} /></span>
);

const ProductPreview: React.FC = () => (
  <div className="mi-product-frame" data-testid="hero-product-preview">
    <div className="mi-window-bar">
      <div className="mi-window-dots" aria-hidden="true"><i /><i /><i /></div>
      <span>Find Again · Library</span>
      <span className="mi-sample-pill">Sample data</span>
    </div>
    <div className="mi-app-shell">
      <aside className="mi-preview-sidebar" aria-label="Sample product navigation">
        <div className="mi-preview-brand"><Logo /><strong>Find Again</strong></div>
        <div className="mi-preview-nav">
          <span><Layers size={14} /> Home</span>
          <span className="is-active"><BookOpen size={14} /> Bookmarks</span>
          <span><FolderKanban size={14} /> Collections</span>
        </div>
        <div className="mi-preview-library">
          <small>LIBRARY</small>
          <span><i className="is-blue" /> Technology</span>
          <span><i className="is-violet" /> Product</span>
          <span><i className="is-amber" /> Research</span>
        </div>
        <div className="mi-preview-account"><span>FA</span><div><strong>Sample workspace</strong><small>Free plan</small></div></div>
      </aside>

      <div className="mi-preview-main">
        <div className="mi-preview-toolbar">
          <div><small>YOUR LIBRARY</small><strong>Bookmarks</strong></div>
          <div className="mi-preview-search"><Search size={14} /><span>Search saved content</span><kbd>⌘ K</kbd></div>
          <button type="button" tabIndex={-1}><SlidersHorizontal size={14} /> Filters</button>
        </div>
        <div className="mi-preview-filters">
          <span className="is-selected">All bookmarks</span><span>AI & LLMs</span><span>Product</span><span>Research</span>
        </div>
        <div className="mi-preview-grid">
          <article className="mi-bookmark-card mi-bookmark-card--primary">
            <div className="mi-post-author"><span className="mi-avatar">R</span><div><strong>Research notes</strong><small>@sample_source · recently saved</small></div><ExternalLink size={13} /></div>
            <p>A practical framework for evaluating retrieval quality: start with the questions people actually need answered, then measure whether the right source returns.</p>
            <div className="mi-ai-summary"><Sparkles size={14} /><div><small>AI SUMMARY</small><span>Evaluate retrieval against real questions and source relevance—not only index size.</span></div></div>
            <div className="mi-tags"><span>Artificial Intelligence</span><span>Search</span><span>Evaluation</span></div>
          </article>
          <article className="mi-bookmark-card mi-bookmark-card--secondary">
            <div className="mi-card-visual" aria-hidden="true"><span /><span /><span /></div>
            <div className="mi-post-author"><span className="mi-avatar is-navy">P</span><div><strong>Product field notes</strong><small>@sample_source · saved yesterday</small></div></div>
            <p>Good knowledge tools make the path back to the original context obvious.</p>
            <div className="mi-tags"><span>Product</span><span>Knowledge</span></div>
          </article>
        </div>
        <div className="mi-preview-status"><span><i /> AI enrichment queued</span><small>Processing continues in the background</small></div>
      </div>
    </div>
  </div>
);

const ReaderShowcase: React.FC = () => (
  <div className="mi-reader-frame" data-testid="reader-product-preview">
    <div className="mi-window-bar">
      <div className="mi-window-dots" aria-hidden="true"><i /><i /><i /></div>
      <span>Find Again · Reader</span>
      <span className="mi-sample-pill">Sample data</span>
    </div>
    <div className="mi-reader-shell">
      <aside className="mi-reader-list" aria-label="Sample saved posts">
        <div className="mi-reader-list-head"><Logo /><strong>Library</strong></div>
        <div className="mi-reader-mini-search"><Search size={13} /> Search bookmarks</div>
        <article className="is-active"><small>ARTIFICIAL INTELLIGENCE</small><strong>A practical framework for evaluating retrieval quality</strong><span>Research notes · 8 min</span></article>
        <article><small>PRODUCT</small><strong>Why useful tools preserve the path back to context</strong><span>Product field notes · 4 min</span></article>
        <article><small>RESEARCH</small><strong>Building a repeatable reading and recall system</strong><span>Saved source · 6 min</span></article>
      </aside>
      <article className="mi-reader-content">
        <div className="mi-reader-topline"><span><BookOpen size={14} /> Reader</span><a href="/demo">Open original <ExternalLink size={13} /></a></div>
        <div className="mi-reader-author"><span className="mi-avatar">R</span><div><strong>Research notes</strong><small>@sample_source · recently saved</small></div></div>
        <h3>Evaluate retrieval against the questions people actually need answered.</h3>
        <p>Start with representative questions, preserve the original source, and measure whether the most useful context is easy to recover when it matters.</p>
        <blockquote>“The goal is not a larger archive. It is a clearer path back to the right idea.”</blockquote>
        <div className="mi-reader-insight"><Sparkles size={17} /><div><small>AI SUMMARY</small><strong>Retrieval quality depends on real questions, source relevance, and visible context.</strong></div></div>
        <div className="mi-reader-metadata"><span>Artificial Intelligence</span><span>Search</span><span>Evaluation</span></div>
      </article>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  onExploreDemo,
  onSignIn,
  onGoHome,
  onStartOnboarding,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div id="landing-page" className="landing-mi">
      <header className="mi-header">
        <div className="mi-container mi-nav-row">
          <button type="button" className="mi-brand" onClick={onGoHome} aria-label="Find Again home">
            <Logo /><span>Find Again</span>
          </button>

          <nav className="mi-desktop-nav" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/blog">Blog</a>
          </nav>

          <div className="mi-nav-actions">
            <button type="button" className="mi-sign-in" onClick={onSignIn}>Sign In</button>
            <button type="button" id="landing-cta-top" className="mi-button mi-button--primary mi-nav-cta" onClick={onStartOnboarding}>Get Started Free</button>
            <button
              type="button"
              className="mi-menu-button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMenuOpen(value => !value)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        <div id="landing-mobile-menu" className="mi-mobile-menu" hidden={!menuOpen}>
          <nav aria-label="Mobile navigation">
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#pricing" onClick={closeMenu}>Pricing</a>
            <a href="/blog" onClick={closeMenu}>Blog</a>
            <button type="button" onClick={() => { closeMenu(); onSignIn(); }}>Sign In</button>
            <button type="button" className="mi-button mi-button--primary" onClick={() => { closeMenu(); onStartOnboarding(); }}>Get Started Free</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mi-hero">
          <div className="mi-hero-glow mi-hero-glow--one" aria-hidden="true" />
          <div className="mi-hero-glow mi-hero-glow--two" aria-hidden="true" />
          <div className="mi-container mi-hero-layout">
            <div className="mi-hero-copy mi-reveal">
              <p className="mi-eyebrow mi-eyebrow--pill"><Sparkles size={14} /> YOUR X BOOKMARKS, MORE USEFUL WITH AI</p>
              <h1>Save, understand and find anything you’ve seen <span>on X.</span></h1>
              <p className="mi-hero-lede">Find Again turns your X bookmarks into a searchable, organized knowledge library with AI summaries, topics and collections.</p>
              <div className="mi-hero-actions">
                <button type="button" id="landing-hero-cta" className="mi-button mi-button--primary mi-button--large" onClick={onStartOnboarding}>Get Started Free <ArrowRight size={17} /></button>
                <button type="button" className="mi-button mi-button--secondary mi-button--large" onClick={onExploreDemo}>Watch Demo</button>
              </div>
              <div className="mi-capability-strip" aria-label="Core capabilities">
                {['Import your bookmarks', 'AI summaries', 'Smart organization', 'Find anything, fast'].map(item => <span key={item}><Check size={14} />{item}</span>)}
              </div>
            </div>
            <div className="mi-hero-stage mi-reveal mi-reveal--delay">
              <div className="mi-stage-orb mi-stage-orb--one" aria-hidden="true" />
              <div className="mi-stage-orb mi-stage-orb--two" aria-hidden="true" />
              <ProductPreview />
              <div className="mi-stage-float mi-stage-float--top"><Sparkles size={15} /><span><strong>AI enrichment</strong><small>Summary ready</small></span><Check size={14} /></div>
              <div className="mi-stage-float mi-stage-float--bottom"><Search size={15} /><span><strong>Found in seconds</strong><small>Across text, topics, and categories</small></span></div>
            </div>
          </div>
        </section>

        <section id="features" className="mi-section mi-section--soft">
          <div className="mi-container">
            <div className="mi-section-heading">
              <p className="mi-eyebrow">TURN BOOKMARKS INTO KNOWLEDGE</p>
              <h2>More than a bookmark manager.</h2>
              <p>Find Again helps you save important posts, understand them with AI, organize by topics and collections, and find them when you need them.</p>
            </div>
            <div className="mi-feature-grid">
              {featureCards.map(({ icon: Icon, title, body }) => (
                <article className="mi-feature-card" key={title}>
                  <span className="mi-icon-box"><Icon size={20} /></span>
                  <h3>{title}</h3><p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mi-section mi-showcase-section">
          <div className="mi-container">
            <div className="mi-section-heading mi-section-heading--center">
              <p className="mi-eyebrow">EXPLORE THE PRODUCT</p>
              <h2>A clear view of everything worth returning to.</h2>
              <p>Keep source content, AI enrichment, organization, and retrieval in one focused workspace.</p>
            </div>
            <div className="mi-showcase">
              <div className="mi-showcase-points">
                <div><BrainCircuit size={18} /><span><strong>AI-powered categorization</strong><small>Categories, topics, and key concepts for eligible posts.</small></span></div>
                <div><Layers size={18} /><span><strong>Rich X content</strong><small>Stored text and available media stay connected to the source.</small></span></div>
                <div><BookOpen size={18} /><span><strong>Built-in Reader</strong><small>Read with less feed noise and reopen the original post anytime.</small></span></div>
              </div>
              <ReaderShowcase />
              <div className="mi-showcase-points">
                <div><Search size={18} /><span><strong>Search and filters</strong><small>Narrow by saved text, enrichment metadata, category, or topic.</small></span></div>
                <div><FolderKanban size={18} /><span><strong>Collections</strong><small>Group useful bookmarks around the work that matters.</small></span></div>
                <div><Download size={18} /><span><strong>Export and ownership</strong><small>Export available account data as structured JSON from Settings.</small></span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mi-section mi-insight-section">
          <div className="mi-container">
            <div className="mi-section-heading">
              <p className="mi-eyebrow">FROM SCATTERED POSTS TO LASTING KNOWLEDGE</p>
              <h2>Turn what you save into insights.</h2>
              <p>Eligible bookmarks can move through queued AI enrichment in the background, while the original source remains easy to reach.</p>
            </div>
            <div className="mi-flow" aria-label="X bookmark to organized knowledge">
              <article className="mi-flow-card mi-flow-card--source">
                <div className="mi-flow-label"><span>01</span> X BOOKMARK</div>
                <div className="mi-source-post"><span className="mi-avatar">R</span><div><strong>Research notes</strong><small>@sample_source · saved from X</small></div><ExternalLink size={16} /></div>
                <p>Three useful ways to make research notes easier to revisit, compare, and apply later.<br /><br />Keep the source visible. Capture the useful idea. Build a structure that makes returning effortless.</p>
                <div className="mi-source-media" aria-hidden="true"><span>Notes</span><strong>CONTEXT → CLARITY</strong><i /></div>
                <div className="mi-source-footer"><span>Saved to Library</span><a href="/demo">View source <ExternalLink size={13} /></a></div>
              </article>
              <div className="mi-flow-bridge" aria-hidden="true"><span><Sparkles size={20} /></span><ArrowRight /></div>
              <article className="mi-flow-card mi-flow-card--result">
                <div className="mi-flow-label"><span>02</span> ORGANIZED KNOWLEDGE</div>
                <span className="mi-queue-pill"><i /> Enriched after background processing</span>
                <div className="mi-result-heading"><BrainCircuit size={20} /><div><small>AI-GENERATED SUMMARY</small><strong>A clearer system for ideas worth returning to.</strong></div></div>
                <p className="mi-result-summary">Preserve original context, capture the central insight, and organize notes so they are easier to retrieve and use later.</p>
                <div className="mi-result-group"><small>CATEGORY</small><span>Research</span></div>
                <div className="mi-result-group"><small>TOPICS</small><div><span>Note-taking</span><span>Retrieval</span><span>Knowledge systems</span></div></div>
                <div className="mi-result-group"><small>KEY CONCEPTS</small><div><span>Context</span><span>Recall</span><span>Clarity</span></div></div>
              </article>
            </div>
            <button type="button" className="mi-button mi-button--light mi-flow-cta" onClick={onExploreDemo}>See It in Action <ArrowRight size={17} /></button>
          </div>
        </section>

        <section className="mi-section mi-section--soft">
          <div className="mi-container">
            <div className="mi-section-heading mi-section-heading--center">
              <p className="mi-eyebrow">BUILT FOR CURIOUS MINDS</p>
              <h2>Keep the ideas that move your work forward.</h2>
            </div>
            <div className="mi-audience-grid">
              {audiences.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}
            </div>
          </div>
        </section>

        <section className="mi-section mi-control-section">
          <div className="mi-container mi-control-grid">
            <div className="mi-control-copy">
              <p className="mi-eyebrow">KNOWLEDGE WITHOUT THE LOCK-IN</p>
              <h2>Your library stays connected to its source.</h2>
              <p>Find Again is designed around useful context and clear controls—not made-up engagement metrics or mystery automation.</p>
              <div className="mi-control-list">
                <span><ExternalLink size={17} /><span><strong>Source links stay visible</strong><small>Return to the original X post when context matters.</small></span></span>
                <span><Database size={17} /><span><strong>Structured data export</strong><small>Export available account, content, and enrichment data from Settings.</small></span></span>
                <span><ShieldCheck size={17} /><span><strong>Read-only X access</strong><small>Find Again cannot post, follow accounts, or read your X password.</small></span></span>
              </div>
            </div>
            <div className="mi-control-panel">
              <div className="mi-control-panel-head"><span>Library controls</span><small>Available in Settings</small></div>
              <div className="mi-control-stat"><Download size={18} /><div><strong>Export account data</strong><small>Profile, saved content, enrichment, collections, and available digests</small></div><span>JSON</span></div>
              <div className="mi-control-stat"><ShieldCheck size={18} /><div><strong>X connection</strong><small>Read-only authorization with visible connection status</small></div><span>Connected</span></div>
              <div className="mi-control-stat"><BrainCircuit size={18} /><div><strong>AI processing</strong><small>Queued, processing, completed, and failed states</small></div><span>Transparent</span></div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mi-section mi-section--soft">
          <div className="mi-container">
            <div className="mi-section-heading mi-section-heading--center">
              <p className="mi-eyebrow">SIMPLE, HONEST PRICING</p>
              <h2>Start for free. Upgrade when you need more.</h2>
              <p>Stripe Checkout shows the authoritative Pro price, billing interval, trial eligibility, and payment terms before confirmation.</p>
            </div>
            <div className="mi-pricing-grid">
              <article className="mi-price-card">
                <div className="mi-price-head"><div><span>FREE</span><h3>{PLANS.free.name}</h3></div><p><strong>{PLANS.free.prices.monthly.formatted}</strong><small>forever</small></p></div>
                <p>{PLANS.free.description}</p>
                <ul>{PLANS.free.marketingHighlights.map(item => <li key={item}><Check size={16} />{item}</li>)}</ul>
                <button type="button" id="landing-pricing-free-btn" className="mi-button mi-button--secondary" onClick={onStartOnboarding}>Get Started Free</button>
              </article>
              <article className="mi-price-card mi-price-card--pro">
                <div className="mi-price-badge">{DEFAULT_TRIAL_DAYS}-DAY TRIAL WHEN ELIGIBLE</div>
                <div className="mi-price-head"><div><span>PRO</span><h3>{PLANS.pro.name}</h3></div><p><strong>{PLANS.pro.prices.monthly.formatted}</strong><small>in checkout</small></p></div>
                <p>{PLANS.pro.description}</p>
                <ul>{PLANS.pro.marketingHighlights.map(item => <li key={item}><Check size={16} />{item}</li>)}</ul>
                <button type="button" id="landing-pricing-pro-btn" className="mi-button mi-button--primary" onClick={onStartOnboarding}>Review Pro Access <ArrowRight size={16} /></button>
              </article>
            </div>
            <p className="mi-pricing-note">{X_HISTORY_EXPLANATION}</p>
          </div>
        </section>

        <section id="faq" className="mi-section mi-faq-section">
          <div className="mi-container mi-faq-layout">
            <div className="mi-section-heading"><p className="mi-eyebrow">QUESTIONS, ANSWERED</p><h2>Everything you need to know.</h2><p>Clear answers about import, AI enrichment, search, data controls, and billing.</p></div>
            <div className="mi-faq-list">
              {marketingFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                const buttonId = `landing-faq-button-${index}`;
                const panelId = `landing-faq-panel-${index}`;
                return (
                  <article className="mi-faq-item" data-open={isOpen} key={faq.question}>
                    <h3><button type="button" id={buttonId} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenFaq(isOpen ? null : index)}><span>{faq.question}</span><ChevronDown size={19} /></button></h3>
                    <div id={panelId} role="region" aria-labelledby={buttonId} className="mi-faq-answer"><div><p>{faq.answer}</p></div></div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mi-final-wrap">
          <div className="mi-container">
            <div className="mi-final-cta">
              <div className="mi-final-orb" aria-hidden="true" />
              <p className="mi-eyebrow">YOUR IDEAS DESERVE A SECOND LIFE</p>
              <h2>Start building your knowledge library today.</h2>
              <div><button type="button" className="mi-button mi-button--dark mi-button--large" onClick={onStartOnboarding}>Get Started Free <ArrowRight size={17} /></button><button type="button" className="mi-button mi-button--glass mi-button--large" onClick={onExploreDemo}>Explore Demo</button></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mi-footer">
        <div className="mi-container mi-footer-grid">
          <div><button type="button" className="mi-brand" onClick={onGoHome}><Logo /><span>Find Again</span></button><p>Turn saved X bookmarks into a library worth returning to.</p></div>
          <nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="/blog">Blog</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
        </div>
        <div className="mi-container mi-footer-bottom"><span>© {new Date().getFullYear()} Find Again</span><span>Built for ideas worth finding again.</span></div>
      </footer>
    </div>
  );
};
