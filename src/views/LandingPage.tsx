import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Search,
  MessageSquareText,
  Mail,
  FolderKanban,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onStartOnboarding: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onStartOnboarding,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What permissions does Recallly request from my X account?',
      a: 'We only request read-only permissions (bookmark.read and tweet.read). We cannot post tweets, send direct messages, follow accounts, or access your password. Your account remains 100% under your control.',
    },
    {
      q: 'How does semantic search work?',
      a: 'Traditional keyword search fails when you remember the concept rather than the exact wording. Recallly converts each post and summary into vector embeddings, allowing you to search by idea (e.g., "fast databases" will match posts talking about DuckDB or SQLite even without the word "fast").',
    },
    {
      q: 'Will you support platforms other than X?',
      a: 'Yes! Recallly is built on a modular SourceProvider architecture. Reddit, LinkedIn, YouTube, Substack, and direct web URLs are already in active development.',
    },
    {
      q: 'Can I export my data if I want to leave?',
      a: 'Absolutely. You can export your entire library, including all original tweets, AI summaries, collections, and digests, as a single structured JSON file with one click at any time.',
    },
    {
      q: 'What is included in the 7-day free trial?',
      a: 'You get full, unrestricted access to the Pro tier: unlimited bookmark imports, real-time AI summarization, weekly digests, and unlimited conversational queries with Ask AI. No lock-in, cancel anytime.',
    },
  ];

  return (
    <div id="landing-page" className="min-h-screen bg-[#FAFAF8] text-[#171717] selection:bg-[#E5E5E0]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E8E8E5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onEnterApp}>
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight">Recallly</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#70706B]">
            <a href="#how-it-works" className="hover:text-[#171717] transition-colors">How it works</a>
            <a href="#features" className="hover:text-[#171717] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#171717] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#171717] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onEnterApp}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors"
            >
              Sign In
            </button>
            <button
              id="landing-cta-top"
              onClick={onStartOnboarding}
              className="px-3.5 py-1.5 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] text-xs font-medium transition-colors shadow-2xs"
            >
              Organize my bookmarks
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E8E8E5] shadow-2xs text-[11px] font-medium text-[#70706B] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Your bookmarks deserve better</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#171717] max-w-3xl mx-auto leading-[1.12]">
          Your saved ideas, <br className="hidden sm:inline" />
          <span className="text-[#555550]">finally useful.</span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-[#70706B] max-w-xl mx-auto leading-relaxed">
          Turn your chaotic X bookmarks into an organized, searchable, conversational knowledge library. Automatically categorized, summarized, and synthesized.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="landing-hero-cta"
            onClick={onStartOnboarding}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Start 7-day free trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F7F7F5] border border-[#E8E8E5] text-[#171717] text-xs font-semibold transition-all shadow-2xs"
          >
            Explore interactive demo
          </button>
        </div>

        <p className="mt-3 text-[11px] text-[#8A8A85]">
          Connect with X in 30 seconds • Strictly read-only access • Cancel anytime
        </p>

        {/* Realistic Product Mockup Frame */}
        <div className="mt-14 p-2.5 sm:p-4 bg-[#FFFFFF] border border-[#E0E0DC] rounded-3xl shadow-xl max-w-4xl mx-auto text-left overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2F2EE] px-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E0]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E0]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E0]"></div>
              <span className="text-[11px] text-[#8A8A85] ml-2 font-mono">recallly.app/bookmarks</span>
            </div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              Live Index (2,847 items)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Sidebar mock */}
            <div className="hidden md:block p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3 text-xs">
              <div className="font-semibold text-xs text-[#171717]">Top Topics</div>
              {['AI & LLMs', 'Startups & Venture', 'Product Strategy', 'System Architecture'].map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E8E8E5]">
                  <span>{t}</span>
                  <span className="text-[10px] text-[#8A8A85] px-1 rounded bg-[#F4F4F1]">48</span>
                </div>
              ))}
            </div>

            {/* Main feed mock */}
            <div className="md:col-span-2 space-y-3">
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#171717] text-white flex items-center justify-center text-[10px]">A</div>
                    <span className="text-xs font-semibold">Andrej Karpathy</span>
                    <span className="text-[10px] text-[#8A8A85]">@karpathy</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A85]">2h ago</span>
                </div>
                <p className="text-xs text-[#333330] line-clamp-2">
                  "The most exciting part of LLMs is not replacing human programmers, but augmenting cognitive bandwidth..."
                </p>
                <div className="p-2 rounded-lg bg-indigo-50/70 text-[11px] text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>AI Insight: Paradigm shift toward cognitive co-pilots in software engineering.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between text-xs text-purple-900">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Ask your bookmarks: "What did I save about prompt caching?"</span>
                </div>
                <span className="text-[10px] underline font-semibold">Try now →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-4 sm:px-6 bg-[#FFFFFF] border-y border-[#E8E8E5]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">
            The Broken Cycle
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
            You saved it for later. Later never came.
          </h2>
          <p className="text-xs sm:text-sm text-[#70706B] max-w-lg mx-auto">
            X bookmarks are where the internet's best insights go to die.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-2">
              <span className="text-xs font-mono font-bold text-[#8A8A85]">01 / SAVE</span>
              <h3 className="font-semibold text-sm text-[#171717]">The Intention</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                You come across a masterclass thread on system design or startup distribution and hit bookmark.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-2">
              <span className="text-xs font-mono font-bold text-[#8A8A85]">02 / FORGET</span>
              <h3 className="font-semibold text-sm text-[#171717]">The Abyss</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                A week later, that gem is buried beneath 50 random memes, breaking news alerts, and reaction GIFs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-2">
              <span className="text-xs font-mono font-bold text-[#8A8A85]">03 / RETRIEVAL FAILS</span>
              <h3 className="font-semibold text-sm text-[#171717]">The Frustration</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                When you actually need the idea 3 months later, X search fails because you can't remember the exact author handle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">Workflow</span>
          <h2 className="text-3xl font-bold tracking-tight text-[#171717]">
            Saving should be the beginning of usefulness.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-mono text-xs font-bold">
              1
            </div>
            <h3 className="font-semibold text-sm text-[#171717]">Connect in 30 Seconds</h3>
            <p className="text-xs text-[#70706B] leading-relaxed">
              Authenticate securely via read-only OAuth 2.0. We fetch your existing archive and stay automatically in sync.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-mono text-xs font-bold">
              2
            </div>
            <h3 className="font-semibold text-sm text-[#171717]">AI Organizes & Indexes</h3>
            <p className="text-xs text-[#70706B] leading-relaxed">
              Every bookmark receives automatic topic tags, a 1-sentence executive takeaway, and deep vector embeddings.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-mono text-xs font-bold">
              3
            </div>
            <h3 className="font-semibold text-sm text-[#171717]">Research & Rediscover</h3>
            <p className="text-xs text-[#70706B] leading-relaxed">
              Search by concept, converse with your archive using Ask AI, and receive personalized weekly digests.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-[#FFFFFF] border-t border-[#E8E8E5]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">Capabilities</span>
            <h2 className="text-3xl font-bold tracking-tight text-[#171717]">
              Built for serious thinkers, builders, and researchers.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <Search className="w-5 h-5 text-[#171717]" />
              <h3 className="font-semibold text-sm text-[#171717]">Semantic Search (Not Just Keywords)</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                Query ideas naturally. Search "pricing strategy" and locate posts analyzing ARPU, tiering, and freemium economics.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <MessageSquareText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-sm text-[#171717]">Ask AI: Conversational RAG</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                Ask your library questions. Receive comprehensive synthesized answers complete with direct citations to original threads.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <Mail className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-sm text-[#171717]">Weekly Intelligence Digest</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                Delivered straight to your email every Sunday: categorized themes, recurring ideas, and resurfaced forgotten bookmarks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <FolderKanban className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-sm text-[#171717]">Curated Shareable Collections</h3>
              <p className="text-xs text-[#70706B] leading-relaxed">
                Bundle your best bookmarks into beautiful public libraries to share with colleagues or publish on your personal site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 max-w-3xl mx-auto text-center space-y-8">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">Pricing</span>
          <h2 className="text-3xl font-bold tracking-tight text-[#171717]">
            Simple, honest pricing.
          </h2>
          <p className="text-xs text-[#70706B]">No hidden tiers, no complicated token math.</p>
        </div>

        <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#E8E8E5] shadow-lg max-w-md mx-auto text-left space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#171717]">Kortex Pro</h3>
              <p className="text-xs text-[#70706B]">Everything you need for lifetime research</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-[#171717]">$9</span>
              <span className="text-xs text-[#8A8A85]"> / month</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-[#333330]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Unlimited X bookmark syncing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>AI automatic tagging & 1-sentence takeaways</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Unlimited semantic search queries</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full Ask AI conversational assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Weekly intelligence email digests</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Public shareable collections & 1-click JSON export</span>
            </div>
          </div>

          <button
            id="landing-pricing-btn"
            onClick={onStartOnboarding}
            className="w-full py-3 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-xs font-semibold transition-all text-center block shadow-xs"
          >
            Start 7-day free trial
          </button>

          <p className="text-[11px] text-center text-[#8A8A85]">
            No credit card required upfront • Cancel anytime with one click
          </p>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-[#FFFFFF] border-t border-[#E8E8E5]">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">FAQ</span>
            <h2 className="text-2xl font-bold tracking-tight text-[#171717]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="border border-[#E8E8E5] rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs font-semibold text-[#171717] hover:bg-[#FAFAF8]"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#8A8A85]" /> : <ChevronDown className="w-4 h-4 text-[#8A8A85]" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-[#70706B] leading-relaxed bg-[#FAFAF8]/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-[#E8E8E5] text-xs text-[#8A8A85]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-[#171717]">Recallly</span>
            <span>•</span>
            <span>Saving something should be the beginning of its usefulness.</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button onClick={onEnterApp} className="hover:text-[#171717]">Interactive Demo</button>
            <button onClick={onStartOnboarding} className="hover:text-[#171717]">Get Started</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
