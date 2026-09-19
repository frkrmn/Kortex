import fs from 'fs';
import path from 'path';
import {
  Bookmark,
  Collection,
  Topic,
  Digest,
  DigestSettings,
  ChatThread,
  ChatMessage,
  Subscription,
  ConnectedAccount,
  UserProfile,
  InsightsData,
  SyncProgressState,
  UsageEventRecord,
} from '../src/types';
import { GeminiAIProvider } from './ai/gemini-provider';
import { ProcessingJobRecord, AIUsageRecord, SavedItemEmbeddingRecord } from './ai/types';
import { slugifyTopic } from './ai/topic-normalizer';
import { DigestService } from './intelligence/digest-service';
import { rediscoveryService } from './intelligence/rediscovery-service';
import { insightsService } from './intelligence/insights-service';
import {
  RediscoveryRecord,
  RediscoveryFeedbackInput,
  RediscoveryCandidate,
  DigestGenerationOptions,
} from './intelligence/types';
import { JobQueueRecord, EmailDeliveryRecord } from './background/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'kortex-store.json');

export interface AppStoreData {
  profile: UserProfile;
  connectedAccounts: ConnectedAccount[];
  bookmarks: Bookmark[];
  topics: Topic[];
  collections: Collection[];
  digests: Digest[];
  digestSettings: DigestSettings;
  chatThreads: ChatThread[];
  subscription: Subscription;
  subscriptions?: Record<string, Subscription>;
  syncProgress: SyncProgressState;
  processingJobs: ProcessingJobRecord[];
  aiUsage: AIUsageRecord[];
  embeddings: SavedItemEmbeddingRecord[];
  rediscoveryEvents?: RediscoveryRecord[];
  usageEvents?: UsageEventRecord[];
  billingEvents?: any[];
  jobQueue?: JobQueueRecord[];
  emailDeliveries?: EmailDeliveryRecord[];
}

const INITIAL_TOPICS: Topic[] = [
  { id: 'top_ai', user_id: 'user_default', name: 'AI & LLMs', slug: 'ai', count: 12 },
  { id: 'top_startups', user_id: 'user_default', name: 'Startups & Venture', slug: 'startups', count: 8 },
  { id: 'top_product', user_id: 'user_default', name: 'Product Strategy', slug: 'product', count: 6 },
  { id: 'top_engineering', user_id: 'user_default', name: 'Engineering & Systems', slug: 'engineering', count: 7 },
  { id: 'top_design', user_id: 'user_default', name: 'Design & UI', slug: 'design', count: 5 },
  { id: 'top_growth', user_id: 'user_default', name: 'Growth & Distribution', slug: 'growth', count: 4 },
  { id: 'top_crypto', user_id: 'user_default', name: 'Decentralized Systems', slug: 'crypto', count: 2 },
];

const INITIAL_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm_x_101',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901201',
    author_name: 'Andrej Karpathy',
    author_username: 'karpathy',
    author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    content: 'A mental model for the "LLM OS":\n- CPU: LLM (orchestrates reasoning)\n- RAM: Context window (fast working memory)\n- Disk: Vector database & file system (persistent retrieval)\n- Bus: System prompts & API protocols\n- Peripherals: Tools, web browsers, compilers\n\nWe are building an entirely new computing platform layer.',
    url: 'https://x.com/karpathy/status/1789012345678901201',
    bookmark_created_at: '2026-03-02T14:20:00Z',
    imported_at: '2026-03-02T15:00:00Z',
    is_read: false,
    is_favorite: true,
    ai_summary: 'Framing modern LLM architectures as an operating system where the model acts as the CPU, context window as RAM, and external vector stores as disk storage.',
    topics: ['AI & LLMs', 'Engineering & Systems'],
    keywords: ['LLM OS', 'Context Window', 'Vector DB', 'System Architecture'],
    why_saved_insight: 'Foundational mental model for designing autonomous AI agent systems with structured memory.',
    collection_ids: ['col_ai_research'],
    engagement: { likes: 38400, retweets: 6200, replies: 940 },
  },
  {
    id: 'bm_x_102',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901202',
    author_name: 'Andrew Ng',
    author_username: 'AndrewYNg',
    author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    content: 'Four agentic design patterns that drive dramatic accuracy jumps over zero-shot prompting:\n1. Reflection (self-critique before outputting)\n2. Tool use (code execution, search, APIs)\n3. Planning (multi-step decomposition)\n4. Multi-agent collaboration (specialized roles)\n\nIterative agent workflows with smaller models often beat single prompts on frontier models.',
    url: 'https://x.com/AndrewYNg/status/1789012345678901202',
    bookmark_created_at: '2026-03-08T09:15:00Z',
    imported_at: '2026-03-08T10:00:00Z',
    is_read: true,
    is_favorite: true,
    ai_summary: 'Detailed taxonomy of four core agentic design patterns: reflection, tool use, planning, and multi-agent systems that outperform direct prompting.',
    topics: ['AI & LLMs'],
    keywords: ['Agent Patterns', 'Reflection', 'Tool Use', 'Decomposition'],
    why_saved_insight: 'Practical guide for architecting resilient multi-agent software pipelines without over-relying on frontier model size.',
    collection_ids: ['col_ai_research'],
    engagement: { likes: 21900, retweets: 4300, replies: 520 },
  },
  {
    id: 'bm_x_103',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901203',
    author_name: 'Paul Graham',
    author_username: 'paulg',
    author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    content: 'The most valuable trait in a founder is relentless resourcefulness. Running a startup is a series of seemingly insurmountable obstacles. The founders who succeed simply refuse to stop looking for ways around, over, or through them.',
    url: 'https://x.com/paulg/status/1789012345678901203',
    bookmark_created_at: '2025-11-14T18:30:00Z',
    imported_at: '2025-11-15T08:00:00Z',
    is_read: true,
    is_favorite: true,
    ai_summary: 'Core thesis on founder psychology: relentless resourcefulness in overcoming repeated roadblocks is the strongest predictor of long-term startup survival.',
    topics: ['Startups & Venture'],
    keywords: ['Founders', 'Resourcefulness', 'Mindset', 'Persistence'],
    why_saved_insight: 'Timeless perspective to revisit during challenging product and fundraising cycles.',
    collection_ids: ['col_startup_ideas'],
    engagement: { likes: 45200, retweets: 8100, replies: 1200 },
  },
  {
    id: 'bm_x_104',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901204',
    author_name: 'Brian Chesky',
    author_username: 'bchesky',
    author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    content: 'Why we combined product management into product marketing and elevated designers:\nWhen product managers only manage schedules and tickets, the soul leaves the product. Designers and engineers should talk directly, obsess over craftsmanship, and ship twice a year with immense pride.',
    url: 'https://x.com/bchesky/status/1789012345678901204',
    bookmark_created_at: '2026-02-12T16:45:00Z',
    imported_at: '2026-02-13T09:12:00Z',
    is_read: false,
    is_favorite: false,
    ai_summary: 'Airbnb design-led restructuring philosophy: eliminating bureaucratic layer between design and engineering to restore product craftsmanship and velocity.',
    topics: ['Product Strategy', 'Design & UI'],
    keywords: ['Product Management', 'Design-led', 'Craftsmanship', 'Velocity'],
    why_saved_insight: 'Blueprint for lean product organization models focused on high-touch craft over bureaucratic sprint ceremonies.',
    collection_ids: ['col_design_inspo'],
    engagement: { likes: 19400, retweets: 3100, replies: 890 },
  },
  {
    id: 'bm_x_105',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901205',
    author_name: 'Shawn Wang (swyx)',
    author_username: 'swyx',
    author_avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    content: 'The Rise of the AI Engineer:\nIn 2023 we proved prompt engineering is real. In 2024 we built RAG. In 2025-2026, the biggest category is applied software engineers who know how to bridge probabilistic LLM reasoning with deterministic code, evals, and streaming UX.',
    url: 'https://x.com/swyx/status/1789012345678901205',
    bookmark_created_at: '2026-03-10T11:00:00Z',
    imported_at: '2026-03-10T11:45:00Z',
    is_read: false,
    is_favorite: true,
    ai_summary: 'Analysis of the AI Engineer discipline: bridging non-deterministic LLM capabilities with deterministic software systems, robust evals, and low-latency UX.',
    topics: ['AI & LLMs', 'Engineering & Systems'],
    keywords: ['AI Engineer', 'Evals', 'RAG', 'Streaming UX'],
    why_saved_insight: 'Defines the modern engineering stack requirements for production-ready AI applications.',
    collection_ids: ['col_ai_research'],
    engagement: { likes: 14300, retweets: 2400, replies: 310 },
  },
  {
    id: 'bm_x_106',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901206',
    author_name: 'Pieter Levels',
    author_username: 'levelsio',
    author_avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    content: 'My tech stack generating $3M/yr:\n- Single index.php file\n- Vanilla JavaScript\n- SQLite\n- Ubuntu $40/mo VPS with Nginx\n\nNo build steps. No Kubernetes. No premature microservices. You don\'t need complicated tech to build high-margin software.',
    url: 'https://x.com/levelsio/status/1789012345678901206',
    bookmark_created_at: '2025-10-20T12:00:00Z',
    imported_at: '2025-10-21T07:15:00Z',
    is_read: true,
    is_favorite: true,
    ai_summary: 'Radical tech stack simplicity: building multi-million dollar solo businesses using SQLite, vanilla JS, and monolithic architecture without infrastructure overhead.',
    topics: ['Startups & Venture', 'Engineering & Systems'],
    keywords: ['Solopreneur', 'SQLite', 'Simplicity', 'Bootstrapping'],
    why_saved_insight: 'Antidote to premature infrastructure optimization. Prioritize shipping and cash flow over architectural fashion.',
    collection_ids: ['col_startup_ideas'],
    engagement: { likes: 52100, retweets: 7400, replies: 1980 },
  },
  {
    id: 'bm_x_107',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901207',
    author_name: 'Lenny Rachitsky',
    author_username: 'lennysan',
    author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    content: 'The ultimate benchmark for product onboarding:\nIf a new user does not experience their "aha moment" within 3 to 5 minutes of signing up, 80% never return.\n\nCut your signup fields in half. Show live data immediately. Skip tutorial tooltips—let them interact directly with value.',
    url: 'https://x.com/lennysan/status/1789012345678901207',
    bookmark_created_at: '2026-03-05T15:20:00Z',
    imported_at: '2026-03-05T16:00:00Z',
    is_read: false,
    is_favorite: false,
    ai_summary: 'Product onboarding metrics: users must achieve core value within 3-5 minutes or retention drops by 80%. Prioritize instant interactivity over guided tours.',
    topics: ['Product Strategy', 'Growth & Distribution'],
    keywords: ['Onboarding', 'Time-to-Value', 'Retention', 'PLG'],
    why_saved_insight: 'Checklist for refining the Kortex onboarding flow: minimal forms, immediate bookmark processing, zero dead ends.',
    collection_ids: [],
    engagement: { likes: 11200, retweets: 1850, replies: 240 },
  },
  {
    id: 'bm_x_108',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901208',
    author_name: 'Alex Xu',
    author_username: 'alexxubyte',
    author_avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    content: 'Caching Strategies Visualized:\n1. Cache-Aside: App reads cache, misses, queries DB, writes back.\n2. Read-Through: App treats cache as main store; cache pulls from DB.\n3. Write-Through: Cache updates DB synchronously.\n4. Write-Back: Cache queues DB updates asynchronously for peak write throughput.',
    url: 'https://x.com/alexxubyte/status/1789012345678901208',
    bookmark_created_at: '2026-01-18T10:40:00Z',
    imported_at: '2026-01-18T11:00:00Z',
    is_read: true,
    is_favorite: false,
    ai_summary: 'Comparison of distributed caching strategies (Cache-aside, Read-through, Write-through, Write-back) with tradeoffs for read-heavy vs write-heavy workloads.',
    topics: ['Engineering & Systems'],
    keywords: ['Caching', 'Distributed Systems', 'Performance', 'Write-Back'],
    why_saved_insight: 'Clear reference for designing high-performance local and edge caching layers.',
    collection_ids: [],
    engagement: { likes: 28400, retweets: 5100, replies: 410 },
  },
  {
    id: 'bm_x_109',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901209',
    author_name: 'Dylan Field',
    author_username: 'zoink',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    content: 'The most enduring design systems are not just Figma files. They are living design tokens shared between design and code. When design tokens reflect semantic intent (e.g. background-surface vs background-elevated), dark mode and accessibility become free byproducts.',
    url: 'https://x.com/zoink/status/1789012345678901209',
    bookmark_created_at: '2026-02-28T17:10:00Z',
    imported_at: '2026-02-28T18:00:00Z',
    is_read: false,
    is_favorite: true,
    ai_summary: 'Design token architecture: using semantic tokens rather than raw hex values creates frictionless synchronization between design tools and production code.',
    topics: ['Design & UI', 'Engineering & Systems'],
    keywords: ['Design Tokens', 'Design Systems', 'Semantics', 'Tokens'],
    why_saved_insight: 'Guideline for maintaining clean, high-contrast, mathematically balanced interface designs.',
    collection_ids: ['col_design_inspo'],
    engagement: { likes: 16800, retweets: 2100, replies: 190 },
  },
  {
    id: 'bm_x_110',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901210',
    author_name: 'Harrison Chase',
    author_username: 'hwchase17',
    author_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    content: 'Building autonomous agents is 10% prompt engineering and 90% evaluation harness.\nIf you don\'t have an automated suite of golden test cases measuring agent regression on tool calls, you cannot ship updates with confidence. Evals are the unit tests of AI software.',
    url: 'https://x.com/hwchase17/status/1789012345678901210',
    bookmark_created_at: '2026-03-12T13:30:00Z',
    imported_at: '2026-03-12T14:10:00Z',
    is_read: false,
    is_favorite: true,
    ai_summary: 'Emphasizes evaluation harnesses as the single most critical component for reliable agentic applications. Evals act as unit tests for non-deterministic AI pipelines.',
    topics: ['AI & LLMs', 'Engineering & Systems'],
    keywords: ['AI Evals', 'Agent Reliability', 'Golden Datasets', 'Regression'],
    why_saved_insight: 'Crucial requirement when architecting RAG question-answering pipelines and auto-tagging workflows.',
    collection_ids: ['col_ai_research'],
    engagement: { likes: 13900, retweets: 1950, replies: 280 },
  },
  {
    id: 'bm_x_111',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901211',
    author_name: 'Shreyas Doshi',
    author_username: 'shreyas',
    author_avatar: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150&auto=format&fit=crop&q=80',
    content: 'High-agency people look at constraints as variables to be altered, not fixed boundary conditions.\nWhen someone says "that\'s company policy" or "that API doesn\'t support this", the high-agency response is: "What would have to be true for this to work anyway?"',
    url: 'https://x.com/shreyas/status/1789012345678901211',
    bookmark_created_at: '2025-09-14T20:00:00Z',
    imported_at: '2025-09-15T09:00:00Z',
    is_read: true,
    is_favorite: true,
    ai_summary: 'Framework on high-agency problem solving: treating perceived constraints as malleable variables rather than immutable roadblocks.',
    topics: ['Startups & Venture', 'Product Strategy'],
    keywords: ['High Agency', 'Leadership', 'Mindset', 'Execution'],
    why_saved_insight: 'Mindset anchor for overcoming technical and organizational bottlenecks.',
    collection_ids: ['col_startup_ideas'],
    engagement: { likes: 34100, retweets: 5900, replies: 670 },
  },
  {
    id: 'bm_x_112',
    user_id: 'user_default',
    source: 'twitter',
    external_id: '1789012345678901212',
    author_name: 'Vitalik Buterin',
    author_username: 'VitalikButerin',
    author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    content: 'The intersection of crypto and AI where decentralization actually matters:\n1. AI as a player in games/mechanisms (bots interacting on-chain with micropayments)\n2. AI as interface (agent helping users understand smart contracts)\n3. Cryptographic proofs of inference (verifying an output came from a specific weights file)',
    url: 'https://x.com/VitalikButerin/status/1789012345678901212',
    bookmark_created_at: '2026-01-30T11:15:00Z',
    imported_at: '2026-01-30T12:00:00Z',
    is_read: false,
    is_favorite: false,
    ai_summary: 'Pragmatic assessment of the AI and blockchain intersection: micropayments for autonomous agents, agentic UX for protocol interactions, and cryptographic verification of model weights.',
    topics: ['Decentralized Systems', 'AI & LLMs'],
    keywords: ['Crypto AI', 'Inference Proofs', 'Agentic Payments', 'Decentralization'],
    why_saved_insight: 'Separates genuine technological synergy between blockchains and AI from speculative marketing hype.',
    collection_ids: [],
    engagement: { likes: 27500, retweets: 4800, replies: 890 },
  },
];

const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col_ai_research',
    user_id: 'user_default',
    name: 'AI Agent Research',
    slug: 'ai-agent-research',
    description: 'Foundational papers, mental models, and architectural patterns for autonomous software agents.',
    visibility: 'public',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-12T14:10:00Z',
    bookmark_ids: ['bm_x_101', 'bm_x_102', 'bm_x_105', 'bm_x_110'],
    creator_name: 'Faruk',
  },
  {
    id: 'col_startup_ideas',
    user_id: 'user_default',
    name: 'Startup Strategy & Execution',
    slug: 'startup-strategy-execution',
    description: 'Mental models on bootstrapping, founder psychology, high agency, and distribution velocity.',
    visibility: 'private',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-03-05T15:20:00Z',
    bookmark_ids: ['bm_x_103', 'bm_x_106', 'bm_x_111'],
    creator_name: 'Faruk',
  },
  {
    id: 'col_design_inspo',
    user_id: 'user_default',
    name: 'Craft & Design Systems',
    slug: 'craft-design-systems',
    description: 'Curated perspectives on design tokens, typography, craftsmanship, and developer-designer empathy.',
    visibility: 'public',
    created_at: '2026-02-15T11:30:00Z',
    updated_at: '2026-02-28T18:00:00Z',
    bookmark_ids: ['bm_x_104', 'bm_x_109'],
    creator_name: 'Faruk',
  },
];

const INITIAL_DIGESTS: Digest[] = [
  {
    id: 'dig_week_current',
    user_id: 'user_default',
    period_start: '2026-03-08T00:00:00Z',
    period_end: '2026-03-14T23:59:59Z',
    status: 'sent',
    title: 'YOUR WEEK IN BOOKMARKS: March 8 – 14',
    bookmarks_count: 42,
    topics_count: 7,
    key_ideas_count: 4,
    topic_groups: [
      {
        topic: 'AI & Agent Infrastructure',
        summary: 'Deep dive into LLM operating systems, evaluation harnesses, and iterative agent loops with specialized sub-agents.',
        bookmark_ids: ['bm_x_101', 'bm_x_102', 'bm_x_105', 'bm_x_110'],
      },
      {
        topic: 'Product & Simplicity',
        summary: 'Focus on instant time-to-value onboarding, reducing bureaucratic layers, and solo-founder capital efficiency.',
        bookmark_ids: ['bm_x_106', 'bm_x_107', 'bm_x_104'],
      },
    ],
    key_ideas: [
      'Iterative agent design patterns (reflection, tool use, planning) consistently outperform monolithic zero-shot prompts.',
      'Autonomous software products require golden evaluation harnesses as the modern equivalent of continuous integration testing.',
      'Time-to-first-value under 3 minutes is the strongest predictor of product retention for developer SaaS.',
      'Lean technical architectures without premature microservices yield higher iteration velocity and profit margins.',
    ],
    worth_revisiting_ids: ['bm_x_103', 'bm_x_111'],
    created_at: '2026-03-15T08:00:00Z',
    sent_at: '2026-03-15T08:00:00Z',
  },
];

export class AppStore {
  private data: AppStoreData;
  private aiProvider: GeminiAIProvider;
  private digestService: DigestService;

  constructor() {
    this.aiProvider = new GeminiAIProvider();
    this.digestService = new DigestService(this.aiProvider);
    this.data = this.loadInitialData();
  }

  private loadInitialData(): AppStoreData {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_FILE)) {
      try {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        parsed.processingJobs = Array.isArray(parsed.processingJobs) ? parsed.processingJobs : [];
        parsed.aiUsage = Array.isArray(parsed.aiUsage) ? parsed.aiUsage : [];
        parsed.embeddings = Array.isArray(parsed.embeddings) ? parsed.embeddings : [];
        parsed.rediscoveryEvents = Array.isArray(parsed.rediscoveryEvents) ? parsed.rediscoveryEvents : [];
        parsed.usageEvents = Array.isArray(parsed.usageEvents) ? parsed.usageEvents : [];
        parsed.billingEvents = Array.isArray(parsed.billingEvents) ? parsed.billingEvents : [];
        parsed.jobQueue = Array.isArray(parsed.jobQueue) ? parsed.jobQueue : [];
        parsed.emailDeliveries = Array.isArray(parsed.emailDeliveries) ? parsed.emailDeliveries : [];
        if (Array.isArray(parsed.bookmarks)) {
          for (const b of parsed.bookmarks) {
            if (!b.enrichment_status) {
              b.enrichment_status = b.ai_summary ? 'completed' : 'not_processed';
            }
          }
        }
        return parsed;
      } catch (e) {
        console.warn('Error reading store file, initializing fresh store:', e);
      }
    }

    const defaultData: AppStoreData = {
      profile: {
        id: 'prof_1',
        user_id: 'user_default',
        display_name: 'Demo User',
        email: 'demo@example.com',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        timezone: 'America/New_York',
        created_at: '2026-01-01T00:00:00Z',
        has_onboarded: true,
      },
      connectedAccounts: [
        {
          id: 'acc_x_1',
          user_id: 'user_default',
          provider: 'twitter',
          username: 'demouser',
          displayName: 'Demo User',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          connected: true,
          last_sync_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
          last_successful_sync: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          sync_status: 'idle',
        },
        {
          id: 'acc_reddit',
          user_id: 'user_default',
          provider: 'reddit',
          username: '',
          displayName: 'Reddit',
          avatarUrl: '',
          connected: false,
          sync_status: 'idle',
        },
        {
          id: 'acc_linkedin',
          user_id: 'user_default',
          provider: 'linkedin',
          username: '',
          displayName: 'LinkedIn',
          avatarUrl: '',
          connected: false,
          sync_status: 'idle',
        },
        {
          id: 'acc_youtube',
          user_id: 'user_default',
          provider: 'youtube',
          username: '',
          displayName: 'YouTube Watch Later',
          avatarUrl: '',
          connected: false,
          sync_status: 'idle',
        },
        {
          id: 'acc_rss',
          user_id: 'user_default',
          provider: 'rss',
          username: '',
          displayName: 'RSS Feeds',
          avatarUrl: '',
          connected: false,
          sync_status: 'idle',
        },
      ],
      bookmarks: INITIAL_BOOKMARKS,
      topics: INITIAL_TOPICS,
      collections: INITIAL_COLLECTIONS,
      digests: INITIAL_DIGESTS,
      digestSettings: {
        user_id: 'user_default',
        frequency: 'weekly',
        delivery_day: 'Sunday',
        delivery_time: '09:00',
        timezone: 'America/New_York',
        email: 'demo@example.com',
        enabled: true,
      },
      chatThreads: [
        {
          id: 'thread_default',
          user_id: 'user_default',
          title: 'AI Agent Architectures',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          messages: [
            {
              id: 'msg_1',
              thread_id: 'thread_default',
              role: 'user',
              content: 'What have I saved about AI agents and system design?',
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            },
            {
              id: 'msg_2',
              thread_id: 'thread_default',
              role: 'assistant',
              content: `Based on your bookmarks, three key themes appear repeatedly across your saved posts:

1. **The "LLM as Operating System" Metaphor**: @karpathy compares the modern agent stack to computer architecture, where the LLM is the CPU, context windows serve as working RAM, and vector databases act as disk storage.
2. **Iterative Agentic Design Patterns**: @AndrewYNg emphasizes four core patterns (Reflection, Tool use, Planning, and Multi-agent collaboration) that consistently surpass zero-shot frontier prompts.
3. **Rigorous Evaluation Harnesses**: @hwchase17 notes that shipping production agents reliably is 90% evaluation harnesses (automated golden test datasets) and 10% prompt engineering.`,
              sources: [
                {
                  bookmark_id: 'bm_x_101',
                  author_name: 'Andrej Karpathy',
                  author_username: 'karpathy',
                  excerpt: 'A mental model for the "LLM OS": CPU: LLM, RAM: Context window, Disk: Vector DB...',
                  url: 'https://x.com/karpathy/status/1789012345678901201',
                },
                {
                  bookmark_id: 'bm_x_102',
                  author_name: 'Andrew Ng',
                  author_username: 'AndrewYNg',
                  excerpt: 'Four agentic design patterns that drive dramatic accuracy jumps...',
                  url: 'https://x.com/AndrewYNg/status/1789012345678901202',
                },
                {
                  bookmark_id: 'bm_x_110',
                  author_name: 'Harrison Chase',
                  author_username: 'hwchase17',
                  excerpt: 'Building autonomous agents is 10% prompt engineering and 90% evaluation harness...',
                  url: 'https://x.com/hwchase17/status/1789012345678901210',
                },
              ],
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 2 + 2000).toISOString(),
            },
          ],
        },
      ],
      subscription: {
        user_id: 'user_default',
        provider: 'stripe',
        status: 'trialing',
        plan: 'pro',
        current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        trial_days_left: 7,
        price_monthly: 9,
      },
      syncProgress: {
        isSyncing: false,
        stage: 'idle',
        processedCount: 2847,
        totalCount: 2847,
        message: 'All bookmarks up to date.',
      },
      processingJobs: [],
      aiUsage: [],
      embeddings: [],
      rediscoveryEvents: [],
      jobQueue: [],
      emailDeliveries: [],
    };

    this.persist(defaultData);
    return defaultData;
  }

  private persist(data = this.data) {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to persist store:', e);
    }
  }

  // Profile
  getProfile(): UserProfile {
    return this.data.profile;
  }

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    this.data.profile = { ...this.data.profile, ...updates };
    this.persist();
    return this.data.profile;
  }

  // Connected Accounts
  getConnectedAccounts(): ConnectedAccount[] {
    return this.data.connectedAccounts;
  }

  updateConnectedAccount(provider: string, updates: Partial<ConnectedAccount>): ConnectedAccount | null {
    const acc = this.data.connectedAccounts.find(a => a.provider === provider);
    if (acc) {
      Object.assign(acc, updates);
      this.persist();
      return acc;
    }
    return null;
  }

  // Bookmarks
  getBookmarks(paramsOrUserId?: string | {
    userId?: string;
    query?: string;
    topic?: string;
    filter?: 'all' | 'unread' | 'favorites' | 'recent';
    sort?: 'newest' | 'oldest' | 'relevant';
  }): Bookmark[] {
    const params = typeof paramsOrUserId === 'string' ? { userId: paramsOrUserId } : paramsOrUserId;
    let list = [...this.data.bookmarks];

    if (params?.userId) {
      list = list.filter(b => !b.user_id || b.user_id === params.userId);
    }

    if (params?.filter === 'unread') {
      list = list.filter(b => !b.is_read);
    } else if (params?.filter === 'favorites') {
      list = list.filter(b => b.is_favorite);
    }

    if (params?.topic && params.topic !== 'all') {
      list = list.filter(b => b.topics.some(t => t.toLowerCase() === params.topic?.toLowerCase()));
    }

    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      list = list.filter(b =>
        b.content.toLowerCase().includes(q) ||
        b.author_name.toLowerCase().includes(q) ||
        b.author_username.toLowerCase().includes(q) ||
        b.ai_summary.toLowerCase().includes(q) ||
        b.topics.some(t => t.toLowerCase().includes(q)) ||
        b.keywords.some(k => k.toLowerCase().includes(q))
      );
    }

    if (params?.sort === 'oldest') {
      list.sort((a, b) => new Date(a.bookmark_created_at).getTime() - new Date(b.bookmark_created_at).getTime());
    } else {
      // Default newest
      list.sort((a, b) => new Date(b.bookmark_created_at).getTime() - new Date(a.bookmark_created_at).getTime());
    }

    return list;
  }

  getBookmarkById(id: string, userId?: string): Bookmark | undefined {
    const b = this.data.bookmarks.find(item => item.id === id);
    if (!b) return undefined;
    if (!userId) {
      // Unauthenticated access: allowed only if part of a public collection
      const isPublic = this.data.collections.some(c => c.visibility === 'public' && c.bookmark_ids.includes(id));
      return isPublic ? b : undefined;
    }
    // If owned by the user or part of a public collection
    if (!b.user_id || b.user_id === userId || b.user_id === 'user_default') return b;
    const isPublic = this.data.collections.some(c => c.visibility === 'public' && c.bookmark_ids.includes(id));
    return isPublic ? b : undefined;
  }

  updateBookmark(id: string, updates: Partial<Bookmark>, userId?: string): Bookmark | null {
    const idx = this.data.bookmarks.findIndex(b => b.id === id);
    if (idx !== -1) {
      const existing = this.data.bookmarks[idx];
      if (userId && existing.user_id && existing.user_id !== userId && existing.user_id !== 'user_default') {
        return null; // IDOR protection: cannot edit another user's bookmark
      }
      this.data.bookmarks[idx] = { ...existing, ...updates };
      this.persist();
      return this.data.bookmarks[idx];
    }
    return null;
  }

  deleteBookmark(id: string, userId?: string): boolean {
    const idx = this.data.bookmarks.findIndex(b => b.id === id);
    if (idx !== -1) {
      const existing = this.data.bookmarks[idx];
      if (userId && existing.user_id && existing.user_id !== userId && existing.user_id !== 'user_default') {
        return false; // IDOR protection: cannot delete another user's bookmark
      }
      this.data.bookmarks.splice(idx, 1);
      // Remove from collections
      for (const col of this.data.collections) {
        col.bookmark_ids = col.bookmark_ids.filter(bId => bId !== id);
      }
      // Remove corresponding embeddings
      this.data.embeddings = this.data.embeddings.filter(e => e.savedItemId !== id);
      this.updateTopicCounts();
      this.persist();
      return true;
    }
    return false;
  }

  addBookmark(b: Bookmark, userId?: string): Bookmark {
    if (userId) {
      b.user_id = userId;
    }
    this.data.bookmarks.unshift(b);
    this.updateTopicCounts();
    this.persist();
    return b;
  }

  // Related bookmarks (semantic similarity)
  getRelatedBookmarks(bookmarkId: string, limit = 3): Bookmark[] {
    const current = this.getBookmarkById(bookmarkId);
    if (!current) return [];

    return this.data.bookmarks
      .filter(b => b.id !== bookmarkId)
      .map(b => {
        let score = 0;
        // Shared topics
        for (const t of b.topics) {
          if (current.topics.includes(t)) score += 3;
        }
        // Shared keywords
        for (const k of b.keywords) {
          if (current.keywords.includes(k)) score += 2;
        }
        // Author match
        if (b.author_username === current.author_username) score += 1;

        return { bookmark: b, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.bookmark);
  }

  // Rediscover ("Worth revisiting")
  getRediscoverBookmarks(limit = 4, userId?: string): Bookmark[] {
    // Surface valuable bookmarks saved weeks/months ago that user might have forgotten
    const now = Date.now();
    const twoWeeksAgo = now - 1000 * 60 * 60 * 24 * 14;

    const userBookmarks = this.getBookmarks(userId);
    const olderHighValue = userBookmarks.filter(b => {
      const created = new Date(b.bookmark_created_at).getTime();
      return created < twoWeeksAgo;
    });

    if (olderHighValue.length > 0) {
      return olderHighValue.slice(0, limit);
    }
    return userBookmarks.slice(-limit);
  }

  // Topics
  getTopics(): Topic[] {
    this.updateTopicCounts();
    return this.data.topics;
  }

  public refreshTopicCounts() {
    this.updateTopicCounts();
    this.persist();
  }

  public createTopic(name: string): Topic {
    const slug = slugifyTopic(name);
    let existing = this.data.topics.find(t => t.slug === slug || t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newTopic: Topic = {
      id: `top_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: 'user_default',
      name,
      slug,
      count: 0,
    };
    this.data.topics.push(newTopic);
    this.updateTopicCounts();
    this.persist();
    return newTopic;
  }

  public removeTopicFromBookmark(bookmarkId: string, topicName: string): Bookmark | null {
    const bookmark = this.getBookmarkById(bookmarkId);
    if (!bookmark) return null;
    bookmark.topics = bookmark.topics.filter(t => t.toLowerCase() !== topicName.toLowerCase());
    this.updateTopicCounts();
    this.persist();
    return bookmark;
  }

  // Processing Jobs
  getProcessingJobs(): ProcessingJobRecord[] {
    this.data.processingJobs = this.data.processingJobs || [];
    return this.data.processingJobs;
  }

  addProcessingJob(job: ProcessingJobRecord): ProcessingJobRecord {
    this.data.processingJobs = this.data.processingJobs || [];
    this.data.processingJobs.unshift(job);
    this.persist();
    return job;
  }

  updateProcessingJob(id: string, updates: Partial<ProcessingJobRecord>): ProcessingJobRecord | null {
    this.data.processingJobs = this.data.processingJobs || [];
    const job = this.data.processingJobs.find(j => j.id === id);
    if (job) {
      Object.assign(job, updates);
      this.persist();
      return job;
    }
    return null;
  }

  // AI Usage
  getAIUsage(): AIUsageRecord[] {
    this.data.aiUsage = this.data.aiUsage || [];
    return this.data.aiUsage;
  }

  addAIUsage(record: AIUsageRecord): AIUsageRecord {
    this.data.aiUsage = this.data.aiUsage || [];
    this.data.aiUsage.unshift(record);
    this.persist();
    return record;
  }

  private updateTopicCounts() {
    const counts: Record<string, number> = {};
    for (const b of this.data.bookmarks) {
      for (const t of b.topics) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    for (const top of this.data.topics) {
      top.count = counts[top.name] || 0;
    }
  }

  // Collections
  getCollections(userId?: string): Collection[] {
    if (!userId) {
      // Unauthenticated: only public collections
      return this.data.collections.filter(c => c.visibility === 'public');
    }
    return this.data.collections.filter(
      c => c.user_id === userId || c.user_id === 'user_default' || c.visibility === 'public'
    );
  }

  getCollectionBySlug(slug: string, userId?: string): Collection | undefined {
    const col = this.data.collections.find(c => c.slug === slug);
    if (!col) return undefined;
    if (col.visibility === 'public') return col;
    if (!userId) return undefined;
    if (col.user_id === userId || col.user_id === 'user_default') return col;
    return undefined;
  }

  getCollectionById(id: string, userId?: string): Collection | undefined {
    const col = this.data.collections.find(c => c.id === id);
    if (!col) return undefined;
    if (col.visibility === 'public') return col;
    if (!userId) return undefined;
    if (col.user_id === userId || col.user_id === 'user_default') return col;
    return undefined;
  }

  createCollection(
    name: string,
    description: string,
    visibility: 'private' | 'public' = 'private',
    userId: string = 'user_default'
  ): Collection {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCol: Collection = {
      id: `col_${Date.now()}`,
      user_id: userId,
      name,
      slug: slug || `collection-${Date.now()}`,
      description,
      visibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bookmark_ids: [],
      creator_name: this.data.profile.display_name,
    };
    this.data.collections.push(newCol);
    this.persist();
    return newCol;
  }

  updateCollection(id: string, updates: Partial<Collection>, userId?: string): Collection | null {
    const col = this.data.collections.find(c => c.id === id);
    if (col) {
      if (userId && col.user_id && col.user_id !== userId && col.user_id !== 'user_default') {
        return null; // IDOR protection: cannot edit another user's collection
      }
      Object.assign(col, { ...updates, updated_at: new Date().toISOString() });
      this.persist();
      return col;
    }
    return null;
  }

  deleteCollection(id: string, userId?: string): boolean {
    const idx = this.data.collections.findIndex(c => c.id === id);
    if (idx !== -1) {
      const existing = this.data.collections[idx];
      if (userId && existing.user_id && existing.user_id !== userId && existing.user_id !== 'user_default') {
        return false; // IDOR protection: cannot delete another user's collection
      }
      this.data.collections.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  toggleBookmarkInCollection(collectionId: string, bookmarkId: string, userId?: string): Collection | null {
    const col = this.data.collections.find(c => c.id === collectionId);
    if (!col) return null;
    if (userId && col.user_id && col.user_id !== userId && col.user_id !== 'user_default') {
      return null; // IDOR protection
    }

    if (col.bookmark_ids.includes(bookmarkId)) {
      col.bookmark_ids = col.bookmark_ids.filter(id => id !== bookmarkId);
    } else {
      col.bookmark_ids.push(bookmarkId);
    }
    col.updated_at = new Date().toISOString();

    // Also update bookmark.collection_ids
    const b = this.getBookmarkById(bookmarkId, userId);
    if (b) {
      b.collection_ids = b.collection_ids || [];
      if (b.collection_ids.includes(collectionId)) {
        b.collection_ids = b.collection_ids.filter(id => id !== collectionId);
      } else {
        b.collection_ids.push(collectionId);
      }
    }

    this.persist();
    return col;
  }

  // Digests
  getDigests(userId: string = 'user_default'): Digest[] {
    const list = this.data.digests.filter(d => !d.user_id || d.user_id === userId);
    return list.sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());
  }

  getDigestById(id: string, userId: string = 'user_default'): Digest | null {
    const digest = this.data.digests.find(d => d.id === id && (!d.user_id || d.user_id === userId));
    return digest || null;
  }

  getDigestSettings(): DigestSettings {
    return this.data.digestSettings;
  }

  updateDigestSettings(updates: Partial<DigestSettings>): DigestSettings {
    this.data.digestSettings = { ...this.data.digestSettings, ...updates };
    this.persist();
    return this.data.digestSettings;
  }

  addDigest(digest: Digest): Digest {
    const existingIndex = this.data.digests.findIndex(
      d => (d.user_id === digest.user_id || !d.user_id) &&
           d.period_start === digest.period_start &&
           d.period_end === digest.period_end
    );
    if (existingIndex >= 0) {
      this.data.digests[existingIndex] = digest;
    } else {
      this.data.digests.unshift(digest);
    }
    this.persist();
    return digest;
  }

  getRediscoveryEvents(userId: string = 'user_default'): RediscoveryRecord[] {
    return (this.data.rediscoveryEvents || []).filter(e => !e.user_id || e.user_id === userId);
  }

  async generateNewDigest(userId: string = 'user_default', options?: DigestGenerationOptions): Promise<Digest> {
    const userBookmarks = this.data.bookmarks.filter(b => !b.user_id || b.user_id === userId);
    const userEvents = (this.data.rediscoveryEvents || []).filter(e => !e.user_id || e.user_id === userId);

    const newDigest = await this.digestService.generateDigest(
      userId,
      userBookmarks,
      userEvents,
      this.data.digestSettings,
      options
    );

    // Check for existing digest with matching period for idempotency
    const existingIndex = this.data.digests.findIndex(
      d => (d.user_id === userId || !d.user_id) &&
           d.period_start === newDigest.period_start &&
           d.period_end === newDigest.period_end
    );

    if (existingIndex >= 0) {
      if (options?.forceRegenerate) {
        newDigest.id = this.data.digests[existingIndex].id;
        this.data.digests[existingIndex] = newDigest;
      } else {
        return this.data.digests[existingIndex];
      }
    } else {
      this.data.digests.unshift(newDigest);
    }

    // Record rediscovery events for items in worth_revisiting_ids
    if (newDigest.worth_revisiting_ids && newDigest.worth_revisiting_ids.length > 0) {
      this.data.rediscoveryEvents = this.data.rediscoveryEvents || [];
      const nowIso = new Date().toISOString();
      for (const id of newDigest.worth_revisiting_ids) {
        this.data.rediscoveryEvents.push({
          id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          user_id: userId,
          saved_item_id: id,
          surface: 'digest',
          surfaced_at: nowIso,
          created_at: nowIso,
        });
      }
    }

    this.persist();
    return newDigest;
  }

  async regenerateDigest(id: string, userId: string = 'user_default'): Promise<Digest | null> {
    const existing = this.getDigestById(id, userId);
    if (!existing) return null;

    return this.generateNewDigest(userId, {
      forceRegenerate: true,
      targetDate: new Date(existing.period_start),
    });
  }

  // Rediscovery
  getRediscoveryCandidates(
    userId: string = 'user_default',
    options?: { limit?: number; surface?: 'dashboard' | 'digest' | 'insights' }
  ): RediscoveryCandidate[] {
    const userBookmarks = this.data.bookmarks.filter(b => !b.user_id || b.user_id === userId);
    const userEvents = (this.data.rediscoveryEvents || []).filter(e => !e.user_id || e.user_id === userId);

    const candidates = rediscoveryService.scoreCandidates(userBookmarks, userEvents, {
      limit: options?.limit ?? 4,
      minAgeDays: 14,
      surface: options?.surface ?? 'dashboard',
    });

    if (options?.surface) {
      this.data.rediscoveryEvents = this.data.rediscoveryEvents || [];
      const nowIso = new Date().toISOString();
      for (const c of candidates) {
        this.data.rediscoveryEvents.push({
          id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          user_id: userId,
          saved_item_id: c.bookmark.id,
          surface: options.surface,
          surfaced_at: nowIso,
          interaction: 'view',
          created_at: nowIso,
        });
      }
      this.persist();
    }

    return candidates;
  }

  recordRediscoveryFeedback(input: RediscoveryFeedbackInput): RediscoveryRecord {
    this.data.rediscoveryEvents = this.data.rediscoveryEvents || [];
    const nowIso = new Date().toISOString();
    const record: RediscoveryRecord = {
      id: `rev_fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: input.userId || 'user_default',
      saved_item_id: input.bookmarkId,
      surface: input.surface,
      interaction: input.interaction,
      surfaced_at: nowIso,
      created_at: nowIso,
    };

    this.data.rediscoveryEvents.push(record);
    this.persist();
    return record;
  }

  // Insights (Real deterministic intelligence calculations)
  getInsights(userId: string = 'user_default'): any {
    const userBookmarks = this.data.bookmarks.filter(b => !b.user_id || b.user_id === userId);
    const userEvents = (this.data.rediscoveryEvents || []).filter(e => !e.user_id || e.user_id === userId);
    const total = userBookmarks.length;

    const topicDistribution = insightsService.calculateTopicDistribution(userBookmarks);
    const emergingInterests = insightsService.calculateEmergingInterests(userBookmarks);
    const rediscoveryCandidates = rediscoveryService.scoreCandidates(userBookmarks, userEvents, {
      limit: 4,
      minAgeDays: 14,
      surface: 'insights',
    });
    const forgottenKnowledge = rediscoveryCandidates.map(c => c.bookmark);
    const ideaConnections = insightsService.calculateTopicConnections(userBookmarks);
    const savingActivityTimeline = insightsService.calculateSavingTimeline(userBookmarks);

    const avgBookmarksPerWeek = total > 0 ? Math.max(1, Math.round(total / 12)) : 0;
    const completedCount = userBookmarks.filter(b => b.is_read).length;
    const readingCompletionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const b of userBookmarks) {
      const d = new Date(b.bookmark_created_at || b.imported_at).getDay();
      dayCounts[d]++;
    }
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const peakSavingDay = dayNames[maxDayIdx] || 'Wednesday';

    return {
      total_bookmarks: total,
      topics_distribution: topicDistribution,
      topicDistribution,
      emergingInterests,
      ideaConnections,
      connections: ideaConnections.map(c => ({
        theme: `${c.sourceTopic} & ${c.targetTopic}`,
        description: c.connectionSummary,
        bookmark_ids: c.supportingBookmarkIds,
      })),
      forgottenKnowledge,
      savingActivityTimeline,
      top_sources: [
        { source: 'twitter', count: total, percentage: 100 },
      ],
      peak_saving_day: peakSavingDay,
      avg_bookmarks_per_week: avgBookmarksPerWeek,
      reading_completion_rate: readingCompletionRate,
    };
  }

  // Chat RAG
  getChatThreads(userId: string = 'user_default'): ChatThread[] {
    this.data.chatThreads = this.data.chatThreads || [];
    return this.data.chatThreads.filter(t => !t.user_id || t.user_id === userId);
  }

  getChatThreadById(id: string, userId: string = 'user_default'): ChatThread | undefined {
    this.data.chatThreads = this.data.chatThreads || [];
    return this.data.chatThreads.find(t => t.id === id && (!t.user_id || t.user_id === userId));
  }

  createChatThread(firstMessage?: string, userId: string = 'user_default', scopeDescription?: string): ChatThread {
    this.data.chatThreads = this.data.chatThreads || [];
    const title = firstMessage
      ? (firstMessage.length > 40 ? firstMessage.slice(0, 40) + '...' : firstMessage)
      : 'New Exploration';
    const newThread: ChatThread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      title,
      scope_description: scopeDescription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };
    this.data.chatThreads.unshift(newThread);
    this.persist();
    return newThread;
  }

  deleteChatThread(id: string, userId: string = 'user_default'): boolean {
    this.data.chatThreads = this.data.chatThreads || [];
    const idx = this.data.chatThreads.findIndex(t => t.id === id && (!t.user_id || t.user_id === userId));
    if (idx !== -1) {
      this.data.chatThreads.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  addChatMessage(threadId: string, message: ChatMessage, userId: string = 'user_default'): ChatMessage | null {
    let thread = this.getChatThreadById(threadId, userId);
    if (!thread) {
      thread = this.createChatThread(message.content, userId);
      message.thread_id = thread.id;
    }
    thread.messages.push(message);
    thread.updated_at = new Date().toISOString();
    this.persist();
    return message;
  }

  async askChat(threadId: string, userMessageText: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    let thread = this.data.chatThreads.find(t => t.id === threadId);
    if (!thread) {
      thread = this.createChatThread(userMessageText);
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      thread_id: thread.id,
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString(),
    };
    thread.messages.push(userMessage);

    // RAG Retrieval: score all bookmarks against query
    const q = userMessageText.toLowerCase();
    const scoredBookmarks = this.data.bookmarks.map(b => {
      let score = 0;
      const text = `${b.content} ${b.ai_summary} ${b.author_name} ${b.topics.join(' ')} ${b.keywords.join(' ')}`.toLowerCase();
      const words = q.split(/\W+/).filter(w => w.length > 2);
      for (const word of words) {
        if (text.includes(word)) score += 3;
      }
      if (b.is_favorite) score += 1;
      return { b, score };
    });

    scoredBookmarks.sort((a, b) => b.score - a.score);
    const candidateBookmarks = scoredBookmarks
      .filter(item => item.score > 0)
      .slice(0, 8)
      .map(item => item.b);

    // AI chat generation
    const history = thread.messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const result = await this.aiProvider.chat(userMessageText, history, candidateBookmarks);

    // Build citations
    const citedBookmarks = result.citedBookmarkIds
      .map(id => this.getBookmarkById(id))
      .filter((b): b is Bookmark => Boolean(b));

    const citations = citedBookmarks.map(b => ({
      bookmark_id: b.id,
      author_name: b.author_name,
      author_username: b.author_username,
      excerpt: b.ai_summary || b.content.slice(0, 100) + '...',
      url: b.url,
    }));

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      thread_id: thread.id,
      role: 'assistant',
      content: result.reply,
      sources: citations,
      created_at: new Date().toISOString(),
    };

    thread.messages.push(assistantMessage);
    thread.updated_at = new Date().toISOString();
    this.persist();

    return { userMessage, assistantMessage };
  }

  // Subscription & Entitlements Store Methods
  getSubscription(userId: string = 'user_default'): Subscription {
    if (!this.data.subscriptions) {
      this.data.subscriptions = {};
    }
    if (!this.data.subscriptions[userId]) {
      if (userId === 'user_default' && this.data.subscription) {
        this.data.subscriptions[userId] = this.data.subscription;
      } else {
        this.data.subscriptions[userId] = {
          user_id: userId,
          provider: 'stripe',
          status: 'trialing',
          plan: 'free',
          interval: 'monthly',
          price_monthly: 9,
          trial_days_left: 7,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        };
      }
      this.persist();
    }
    return this.data.subscriptions[userId];
  }

  updateSubscription(
    first: string | Partial<Subscription>,
    second?: Partial<Subscription>
  ): Subscription {
    let targetUserId = 'user_default';
    let updates: Partial<Subscription>;

    if (typeof first === 'string') {
      targetUserId = first;
      updates = second || {};
    } else {
      updates = first;
      if (updates.user_id) {
        targetUserId = updates.user_id;
      }
    }

    const current = this.getSubscription(targetUserId);
    const updated = {
      ...current,
      ...updates,
    };
    if (!this.data.subscriptions) {
      this.data.subscriptions = {};
    }
    this.data.subscriptions[targetUserId] = updated;
    if (targetUserId === 'user_default') {
      this.data.subscription = updated;
    }
    this.persist();
    return updated;
  }

  upgradeSubscription(userId: string = 'user_default'): Subscription {
    return this.updateSubscription(userId, {
      status: 'active',
      plan: 'pro',
      interval: 'monthly',
      trial_days_left: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      cancel_at_period_end: false,
    });
  }

  getSubscriptionByCustomerId(customerId: string): Subscription | undefined {
    if (this.data.subscriptions) {
      const found = Object.values(this.data.subscriptions).find(s => s.customer_id === customerId);
      if (found) return found;
    }
    if (this.data.subscription?.customer_id === customerId) {
      return this.data.subscription;
    }
    return undefined;
  }

  // Usage Metering Store Methods
  addUsageEvent(record: Omit<UsageEventRecord, 'id' | 'created_at'>): UsageEventRecord {
    this.data.usageEvents = this.data.usageEvents || [];
    const event: UsageEventRecord = {
      ...record,
      id: `usg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.data.usageEvents.unshift(event);
    this.persist();
    return event;
  }

  getUsageEvents(userId: string, periodStartIso?: string): UsageEventRecord[] {
    const list = this.data.usageEvents || [];
    return list.filter(e => {
      if (userId && e.user_id !== userId && e.user_id !== 'user_default') return false;
      if (periodStartIso && new Date(e.created_at) < new Date(periodStartIso)) return false;
      return true;
    });
  }

  countUsage(userId: string, metric: string, periodStartIso?: string): number {
    const events = this.getUsageEvents(userId, periodStartIso);
    return events
      .filter(e => e.metric === metric)
      .reduce((sum, e) => sum + (e.quantity || 1), 0);
  }

  // Billing Webhook Idempotency Events
  recordBillingEvent(event: {
    provider_event_id: string;
    type: string;
    status?: 'processing' | 'processed' | 'failed' | 'ignored';
    payload?: any;
    error?: string;
  }) {
    this.data.billingEvents = this.data.billingEvents || [];
    const existingIdx = this.data.billingEvents.findIndex(
      e => e.provider_event_id === event.provider_event_id
    );
    const record = {
      id: `bev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: event.status || 'processed',
      ...event,
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      this.data.billingEvents[existingIdx] = { ...this.data.billingEvents[existingIdx], ...record };
    } else {
      this.data.billingEvents.unshift(record);
    }
    this.persist();
    return record;
  }

  getBillingEvent(providerEventId: string) {
    this.data.billingEvents = this.data.billingEvents || [];
    return this.data.billingEvents.find(e => e.provider_event_id === providerEventId);
  }

  // Sync state & simulator
  getSyncProgress(): SyncProgressState {
    return this.data.syncProgress;
  }

  async runSync(newBatchCount = 3): Promise<Bookmark[]> {
    this.data.syncProgress = {
      isSyncing: true,
      stage: 'fetching',
      processedCount: 0,
      totalCount: newBatchCount,
      message: 'Connecting to X OAuth 2.0 and fetching latest bookmarks...',
    };
    this.persist();

    // Simulate progress stages
    await new Promise(r => setTimeout(r, 600));

    this.data.syncProgress.stage = 'organizing';
    this.data.syncProgress.message = 'Normalizing content and mapping topics...';
    this.persist();
    await new Promise(r => setTimeout(r, 600));

    this.data.syncProgress.stage = 'summarizing';
    this.data.syncProgress.message = 'Generating crisp AI summaries and extracting keywords...';
    this.persist();
    await new Promise(r => setTimeout(r, 600));

    this.data.syncProgress.stage = 'indexing';
    this.data.syncProgress.message = 'Building semantic vector embeddings and updating search indexes...';
    this.persist();
    await new Promise(r => setTimeout(r, 500));

    // Add a freshly synced bookmark
    const freshBookmark: Bookmark = {
      id: `bm_x_${Date.now()}`,
      user_id: 'user_default',
      source: 'twitter',
      external_id: `ext_${Date.now()}`,
      author_name: 'Guillermo Rauch',
      author_username: 'rauchg',
      author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      content: 'The web is moving from pre-rendered static content to real-time generative interfaces tailored to the individual reader at execution time.',
      url: 'https://x.com/rauchg',
      bookmark_created_at: new Date().toISOString(),
      imported_at: new Date().toISOString(),
      is_read: false,
      is_favorite: true,
      ai_summary: 'Generative interface paradigm: shifting from one-size-fits-all static websites to dynamic interfaces synthesized at runtime.',
      topics: ['AI & LLMs', 'Engineering & Systems'],
      keywords: ['Generative UI', 'Real-time', 'Web Architecture'],
      why_saved_insight: 'Key trend alert for future UI development workflows.',
      collection_ids: ['col_ai_research'],
      engagement: { likes: 12400, retweets: 1800, replies: 320 },
    };

    this.data.bookmarks.unshift(freshBookmark);
    this.updateTopicCounts();

    const xAcc = this.data.connectedAccounts.find(a => a.provider === 'twitter');
    if (xAcc) {
      xAcc.last_sync_at = new Date().toISOString();
      xAcc.last_successful_sync = new Date().toISOString();
      xAcc.sync_status = 'idle';
    }

    this.data.syncProgress = {
      isSyncing: false,
      stage: 'complete',
      processedCount: newBatchCount,
      totalCount: newBatchCount,
      message: `Sync complete. ${newBatchCount} new bookmarks indexed.`,
    };
    this.persist();

    return [freshBookmark];
  }

  // Global search (Cmd+K)
  globalSearch(query: string) {
    if (!query || !query.trim()) {
      return { bookmarks: [], collections: [], topics: [] };
    }
    const q = query.toLowerCase().trim();

    const bookmarks = this.data.bookmarks
      .filter(b => 
        b.content.toLowerCase().includes(q) ||
        b.author_name.toLowerCase().includes(q) ||
        b.author_username.toLowerCase().includes(q) ||
        b.ai_summary.toLowerCase().includes(q) ||
        b.topics.some(t => t.toLowerCase().includes(q))
      )
      .slice(0, 5);

    const collections = this.data.collections
      .filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .slice(0, 3);

    const topics = this.data.topics
      .filter(t => t.name.toLowerCase().includes(q))
      .slice(0, 4);

    return { bookmarks, collections, topics };
  }

  // Embeddings Management
  getEmbedding(savedItemId: string, version?: string): SavedItemEmbeddingRecord | undefined {
    return this.data.embeddings.find(
      (e) => e.savedItemId === savedItemId && (!version || e.embeddingVersion === version)
    );
  }

  getAllEmbeddings(userId?: string): SavedItemEmbeddingRecord[] {
    if (!userId) return this.data.embeddings;
    return this.data.embeddings.filter((e) => e.userId === userId);
  }

  saveEmbedding(record: SavedItemEmbeddingRecord): void {
    const existingIdx = this.data.embeddings.findIndex(
      (e) => e.savedItemId === record.savedItemId && e.embeddingVersion === record.embeddingVersion
    );
    if (existingIdx >= 0) {
      this.data.embeddings[existingIdx] = record;
    } else {
      this.data.embeddings.push(record);
    }
    this.persist();
  }

  deleteEmbedding(savedItemId: string): void {
    this.data.embeddings = this.data.embeddings.filter((e) => e.savedItemId !== savedItemId);
    this.persist();
  }

  // Phase 12 Background Job Queue Management
  getJobQueue(): JobQueueRecord[] {
    this.data.jobQueue = this.data.jobQueue || [];
    return this.data.jobQueue;
  }

  setJobQueue(jobs: JobQueueRecord[]): void {
    this.data.jobQueue = jobs;
    this.persist();
  }

  addJobToQueue(job: JobQueueRecord): JobQueueRecord {
    this.data.jobQueue = this.data.jobQueue || [];
    this.data.jobQueue.push(job);
    this.persist();
    return job;
  }

  updateJobInQueue(id: string, updates: Partial<JobQueueRecord>): JobQueueRecord | null {
    this.data.jobQueue = this.data.jobQueue || [];
    const job = this.data.jobQueue.find(j => j.id === id);
    if (job) {
      Object.assign(job, updates);
      this.persist();
      return job;
    }
    return null;
  }

  // Phase 12 Email Deliveries
  getEmailDeliveries(): EmailDeliveryRecord[] {
    this.data.emailDeliveries = this.data.emailDeliveries || [];
    return this.data.emailDeliveries;
  }

  addEmailDelivery(delivery: EmailDeliveryRecord): EmailDeliveryRecord {
    this.data.emailDeliveries = this.data.emailDeliveries || [];
    this.data.emailDeliveries.push(delivery);
    this.persist();
    return delivery;
  }

  updateEmailDelivery(id: string, updates: Partial<EmailDeliveryRecord>): EmailDeliveryRecord | null {
    this.data.emailDeliveries = this.data.emailDeliveries || [];
    const delivery = this.data.emailDeliveries.find(d => d.id === id);
    if (delivery) {
      Object.assign(delivery, updates);
      this.persist();
      return delivery;
    }
    return null;
  }

  // Account Lifecycle & Data Privacy Methods
  deleteUserData(userId: string): {
    deletedBookmarks: number;
    deletedCollections: number;
    deletedDigests: number;
    deletedThreads: number;
  } {
    const initialBookmarks = this.data.bookmarks.length;
    const bookmarkIdsToDelete = new Set(
      this.data.bookmarks
        .filter(b => b.user_id === userId || (userId === 'user_default' && !b.user_id))
        .map(b => b.id)
    );

    // 1. Delete user bookmarks
    this.data.bookmarks = this.data.bookmarks.filter(
      b => b.user_id !== userId && (userId !== 'user_default' || Boolean(b.user_id))
    );

    // 2. Delete user embeddings
    this.data.embeddings = this.data.embeddings.filter(
      e => e.userId !== userId && !bookmarkIdsToDelete.has(e.savedItemId)
    );

    // 3. Delete user collections
    const initialCollections = this.data.collections.length;
    this.data.collections = this.data.collections.filter(
      c => c.user_id !== userId && (userId !== 'user_default' || Boolean(c.user_id))
    );

    // 4. Delete user digests
    const initialDigests = this.data.digests.length;
    this.data.digests = this.data.digests.filter(
      d => d.user_id !== userId && (userId !== 'user_default' || Boolean(d.user_id))
    );

    // 5. Delete user chat threads
    const initialThreads = this.data.chatThreads.length;
    this.data.chatThreads = this.data.chatThreads.filter(
      t => t.user_id !== userId && (userId !== 'user_default' || Boolean(t.user_id))
    );

    // 6. Delete user rediscovery events
    if (this.data.rediscoveryEvents) {
      this.data.rediscoveryEvents = this.data.rediscoveryEvents.filter(r => r.user_id !== userId);
    }

    // 7. Delete user usage events
    if (this.data.usageEvents) {
      this.data.usageEvents = this.data.usageEvents.filter(u => u.user_id !== userId);
    }

    // 8. Delete user background jobs
    if (this.data.jobQueue) {
      this.data.jobQueue = this.data.jobQueue.filter(j => j.userId !== userId);
    }

    // 9. Delete user email deliveries
    if (this.data.emailDeliveries) {
      this.data.emailDeliveries = this.data.emailDeliveries.filter(e => e.userId !== userId);
    }

    // 10. Delete subscription record
    if (this.data.subscriptions) {
      delete this.data.subscriptions[userId];
    }
    if (userId === 'user_default') {
      delete (this.data as any).subscription;
    }

    // 11. Refresh topic counts
    this.updateTopicCounts();
    this.persist();

    return {
      deletedBookmarks: initialBookmarks - this.data.bookmarks.length,
      deletedCollections: initialCollections - this.data.collections.length,
      deletedDigests: initialDigests - this.data.digests.length,
      deletedThreads: initialThreads - this.data.chatThreads.length,
    };
  }

  deleteXImportedData(userId: string): { deletedCount: number } {
    const xBookmarks = this.data.bookmarks.filter(
      b =>
        (b.user_id === userId || (!b.user_id && userId === 'user_default')) &&
        b.source === 'twitter'
    );
    const xBookmarkIds = new Set(xBookmarks.map(b => b.id));

    // Remove bookmarks
    this.data.bookmarks = this.data.bookmarks.filter(b => !xBookmarkIds.has(b.id));

    // Remove corresponding embeddings
    this.data.embeddings = this.data.embeddings.filter(e => !xBookmarkIds.has(e.savedItemId));

    // Remove from collections
    for (const col of this.data.collections) {
      if (col.user_id === userId || col.user_id === 'user_default') {
        col.bookmark_ids = col.bookmark_ids.filter(id => !xBookmarkIds.has(id));
      }
    }

    this.updateTopicCounts();
    this.persist();

    return { deletedCount: xBookmarks.length };
  }

  exportUserData(userId: string) {
    const userBookmarks = this.getBookmarks(userId);
    const userCollections = this.getCollections(userId).filter(
      c => c.user_id === userId || c.user_id === 'user_default'
    );
    const userDigests = this.getDigests(userId);
    const userThreads = this.getChatThreads(userId);
    const userTopics = this.getTopics();
    const profile = this.getProfile();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: userId,
        displayName: profile.display_name,
        email: profile.email,
        timezone: profile.timezone,
      },
      bookmarks: userBookmarks.map(b => ({
        id: b.id,
        url: b.url,
        content: b.content,
        authorName: b.author_name,
        authorUsername: b.author_username,
        aiSummary: b.ai_summary,
        topics: b.topics,
        keywords: b.keywords,
        isFavorite: b.is_favorite,
        isRead: b.is_read,
        savedAt: b.bookmark_created_at,
        importedAt: b.imported_at,
      })),
      collections: userCollections.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        visibility: c.visibility,
        bookmarkCount: c.bookmark_ids.length,
        createdAt: c.created_at,
      })),
      digests: userDigests.map(d => ({
        id: d.id,
        title: d.title,
        summary: d.summary,
        periodStart: d.period_start,
        periodEnd: d.period_end,
        createdAt: d.created_at,
      })),
      chatThreads: userThreads.map(t => ({
        id: t.id,
        title: t.title,
        messageCount: t.messages?.length || 0,
        createdAt: t.created_at,
      })),
      topics: userTopics.map(t => ({
        name: t.name,
        slug: t.slug,
        count: t.count,
      })),
      settings: {
        digestFrequency: this.getDigestSettings().frequency,
        digestDay: this.getDigestSettings().delivery_day,
        digestTime: this.getDigestSettings().delivery_time,
      },
    };
  }

  // Clear or reset
  resetAllData() {
    this.data = this.loadInitialData();
    this.persist();
  }
}

export const store = new AppStore();
