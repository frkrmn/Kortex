import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Search,
  MessageSquareText,
  FolderKanban,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { DEFAULT_TRIAL_DAYS, PLANS, X_HISTORY_EXPLANATION } from '../config/plans';
import { marketingFaqs } from '../content/marketing';

interface LandingPageProps {
  onExploreDemo: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  onStartOnboarding: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExploreDemo,
  onSignIn,
  onGoHome,
  onStartOnboarding,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div id="landing-page" className="min-h-screen bg-[#FAFAF8] text-[#171717] selection:bg-[#E5E5E0]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E8E8E5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button type="button" className="flex items-center gap-2.5 cursor-pointer" onClick={onGoHome} aria-label="Find Again home">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight">Find Again</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5C5C58]">
            <a href="#how-it-works" className="hover:text-[#171717] transition-colors">How it works</a>
            <a href="#features" className="hover:text-[#171717] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#171717] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#171717] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onSignIn}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#5C5C58] hover:text-[#171717] transition-colors"
            >
              Sign In
            </button>
            <button
              id="landing-cta-top"
              onClick={onStartOnboarding}
              className="px-3.5 py-1.5 rounded-xl bg-[#171717] text-[#FAFAF8] hover:bg-[#2B2B2B] text-sm font-medium transition-colors shadow-2xs"
            >
              Organize my bookmarks
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E8E8E5] shadow-2xs text-xs font-medium text-[#5C5C58] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Your bookmarks deserve better</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#171717] max-w-3xl mx-auto leading-[1.12]">
          Your saved ideas, <br className="hidden sm:inline" />
          <span className="text-[#555550]">finally useful.</span>
        </h1>

        <p className="mt-5 text-[17px] sm:text-lg text-[#5C5C58] max-w-2xl mx-auto leading-7">
          Turn your chaotic X bookmarks into an organized, searchable, conversational knowledge library. Automatically categorized, summarized, and synthesized.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="landing-hero-cta"
            onClick={onStartOnboarding}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Try Pro free for {DEFAULT_TRIAL_DAYS} days</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onExploreDemo}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F7F7F5] border border-[#E8E8E5] text-[#171717] text-sm font-semibold transition-all shadow-2xs"
          >
            Explore interactive demo
          </button>
        </div>

        <p className="mt-3 text-sm text-[#70706B] leading-5">
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
            <div className="hidden md:block p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3 text-[13px]">
              <div className="font-semibold text-[13px] text-[#171717]">Top Topics</div>
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
                    <span className="text-[13px] font-semibold">Andrej Karpathy</span>
                    <span className="text-[10px] text-[#8A8A85]">@karpathy</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A85]">2h ago</span>
                </div>
                <p className="text-[13px] leading-5 text-[#333330] line-clamp-2">
                  "The most exciting part of LLMs is not replacing human programmers, but augmenting cognitive bandwidth..."
                </p>
                <div className="p-2 rounded-lg bg-indigo-50/70 text-xs leading-5 text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>AI Insight: Paradigm shift toward cognitive co-pilots in software engineering.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between text-[13px] leading-5 text-purple-900">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-[#70706B]">
            The Broken Cycle
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#171717]">
            You saved it for later. Later never came.
          </h2>
          <p className="text-base sm:text-lg text-[#5C5C58] max-w-xl mx-auto leading-7">
            X bookmarks are where the internet's best insights go to die.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-2">
              <span className="text-xs font-mono font-bold text-[#70706B]">01 / SAVE</span>
              <h3 className="font-semibold text-base text-[#171717]">The Intention</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                You come across a masterclass thread on system design or startup distribution and hit bookmark.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-2">
              <span className="text-xs font-mono font-bold text-[#70706B]">02 / FORGET</span>
              <h3 className="font-semibold text-base text-[#171717]">The Abyss</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                A week later, that gem is buried beneath 50 random memes, breaking news alerts, and reaction GIFs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-2">
              <span className="text-xs font-mono font-bold text-[#70706B]">03 / RETRIEVAL FAILS</span>
              <h3 className="font-semibold text-base text-[#171717]">The Frustration</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                When you actually need the idea 3 months later, X search fails because you can't remember the exact author handle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#70706B]">Workflow</span>
          <h2 className="text-3xl font-bold tracking-tight text-[#171717]">
            Saving should be the beginning of usefulness.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-mono text-xs font-bold">
              1
            </div>
            <h3 className="font-semibold text-base text-[#171717]">Connect in 30 Seconds</h3>
            <p className="text-base text-[#5C5C58] leading-7">
              Connect through read-only OAuth, import the bookmarks X makes available, and run manual sync whenever you need it.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-mono text-xs font-bold">
              2
            </div>
            <h3 className="font-semibold text-base text-[#171717]">AI Organizes & Indexes</h3>
            <p className="text-base text-[#5C5C58] leading-7">
              Find Again can add concise summaries, categories, topics, and key concepts to eligible saved posts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-mono text-xs font-bold">
              3
            </div>
            <h3 className="font-semibold text-base text-[#171717]">Research & Rediscover</h3>
            <p className="text-base text-[#5C5C58] leading-7">
              Search saved content, narrow the library by category and topic, and reopen the original source when context matters.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-[#FFFFFF] border-t border-[#E8E8E5]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#70706B]">Capabilities</span>
            <h2 className="text-3xl font-bold tracking-tight text-[#171717]">
              Built for serious thinkers, builders, and researchers.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <Search className="w-5 h-5 text-[#171717]" />
              <h3 className="font-semibold text-base text-[#171717]">Search & Filter</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                Search saved text and enrichment, then filter within broad categories and specific topics.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-base text-[#171717]">AI Summaries & Topics</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                Add a concise summary, one primary category, focused topics, and key concepts to eligible saved posts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <ExternalLink className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-base text-[#171717]">Rich Bookmark Reader</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                Read stored post text and available media in Find Again while keeping the original X source one click away.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3">
              <FolderKanban className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-base text-[#171717]">Collections & Export</h3>
              <p className="text-base text-[#5C5C58] leading-7">
                Group useful bookmarks into collections and export the account data currently available in Settings as JSON.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-8">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#70706B]">Pricing & Plans</span>
          <h2 className="text-3xl font-bold tracking-tight text-[#171717]">
            Transparent pricing for serious curators.
          </h2>
          <p className="text-base text-[#5C5C58] leading-6">Start free. Review current Pro pricing and trial terms in checkout.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#E8E8E5] space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">Free</h3>
                  <p className="text-sm leading-5 text-[#5C5C58]">For getting started with your X bookmarks</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-[#171717]">$0</span>
                  <span className="text-sm text-[#70706B]"> / forever</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm leading-6 text-[#52524E]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#70706B] shrink-0" />
                  <span>Connect your X account</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#70706B] shrink-0" />
                  <span>Import your recent X bookmarks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#70706B] shrink-0" />
                  <span>Manual X bookmark sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#70706B] shrink-0" />
                  <span>Search and organize your library</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#70706B] shrink-0" />
                  <span>Create collections and use AI enrichment</span>
                </div>
              </div>
            </div>

            <button
              id="landing-pricing-free-btn"
              onClick={onStartOnboarding}
              className="w-full py-3 rounded-xl bg-[#FAFAF8] border border-[#D1D1CB] hover:bg-[#F2F2EE] text-[#171717] text-sm font-semibold transition-all text-center block cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier */}
          <div className="p-8 rounded-3xl bg-[#FFFFFF] border-2 border-[#171717] shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#171717] text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl">
              {DEFAULT_TRIAL_DAYS}-Day Free Trial
            </div>

            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#171717]">Find Again Pro</h3>
                  <p className="text-sm leading-5 text-[#5C5C58]">Review current Pro access in checkout</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#171717]">{PLANS.pro.prices.monthly.formatted}</span>
                  <div className="text-[10px] text-emerald-700 font-medium">Monthly or annual billing</div>
                </div>
              </div>

              <div className="space-y-2.5 text-sm leading-6 text-[#171717]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Import the latest bookmarks available from X</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Manual X bookmark sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AI summaries, categories, and topics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Category and topic filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Rich in-app bookmark Reader</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Smart collections and data export</span>
                </div>
              </div>
            </div>

            <button
              id="landing-pricing-pro-btn"
              onClick={onStartOnboarding}
              className="w-full py-3 rounded-xl bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] text-sm font-bold transition-all text-center block shadow-xs cursor-pointer"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        <p className="text-sm leading-6 text-center text-[#70706B]">
          Powered by Stripe • No commitment • Downgrading never deletes your bookmarks or summaries
        </p>
        <p className="text-sm leading-6 text-center text-[#5C5C58] max-w-2xl mx-auto">
          {X_HISTORY_EXPLANATION} Once connected, manual sync—and automatic sync where eligible and enabled—can keep your library growing.
        </p>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-[#FFFFFF] border-t border-[#E8E8E5]">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#70706B]">FAQ</span>
            <h2 className="text-2xl font-bold tracking-tight text-[#171717]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {marketingFaqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="border border-[#E8E8E5] rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 text-base leading-6 font-semibold text-[#171717] hover:bg-[#FAFAF8]"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#8A8A85]" /> : <ChevronDown className="w-4 h-4 text-[#8A8A85]" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-base text-[#5C5C58] leading-7 bg-[#FAFAF8]/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-[#E8E8E5] text-sm leading-6 text-[#70706B]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-[#171717]">Find Again</span>
            <span>•</span>
            <span>Saving something should be the beginning of its usefulness.</span>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <button onClick={onExploreDemo} className="hover:text-[#171717]">Interactive Demo</button>
            <button onClick={onStartOnboarding} className="hover:text-[#171717]">Get Started</button>
            <a href="/how-it-works" className="hover:text-[#171717]">How it works</a>
            <a href="/pricing" className="hover:text-[#171717]">Pricing</a>
            <a href="/faq" className="hover:text-[#171717]">FAQ</a>
            <a href="/blog" className="hover:text-[#171717]">Blog</a>
            <a href="/terms" className="hover:text-[#171717]">Terms</a>
            <a href="/privacy" className="hover:text-[#171717]">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};
