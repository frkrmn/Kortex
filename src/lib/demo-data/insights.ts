import { InsightsData } from '../../types';

export interface EmergingInterest {
  topic: string;
  growth: number;
  description: string;
}

export interface IdeaConnection {
  id: string;
  sourceTopic: string;
  targetTopic: string;
  connectionSummary: string;
  bookmarkCount: number;
  primaryBookmarkId: string;
}

export interface ActivityWeek {
  weekLabel: string;
  count: number;
  highlightTopic: string;
}

export interface RichInsightsData {
  total_bookmarks: number;
  topics_distribution: Array<{ topic: string; percentage: number; count: number }>;
  emergingInterests: EmergingInterest[];
  ideaConnections: IdeaConnection[];
  savingActivityTimeline: ActivityWeek[];
  top_sources: Array<{ source: string; count: number; percentage: number }>;
  peak_saving_day: string;
  avg_bookmarks_per_week: number;
  reading_completion_rate: number;
}

export const demoInsights: RichInsightsData = {
  total_bookmarks: 2847,
  topics_distribution: [
    { topic: 'AI', percentage: 32, count: 842 },
    { topic: 'Product', percentage: 18, count: 418 },
    { topic: 'Crypto', percentage: 15, count: 186 },
    { topic: 'Design', percentage: 12, count: 291 },
    { topic: 'Startups', percentage: 9, count: 327 },
    { topic: 'Engineering', percentage: 8, count: 145 },
    { topic: 'Growth', percentage: 6, count: 98 },
  ],
  emergingInterests: [
    {
      topic: 'AI Agents & Evaluation Harnesses',
      growth: 42,
      description: 'Shift from single-turn prompts to multi-agent planning loops and automated regression suites.',
    },
    {
      topic: 'Browser Automation & Web Scrapers',
      growth: 28,
      description: 'Growing focus on autonomous workflows navigating dynamic client-side web interfaces.',
    },
    {
      topic: 'Product Distribution & Onboarding',
      growth: 17,
      description: 'Increased bookmarks analyzing 3-minute time-to-value benchmarks and PLG activation.',
    },
  ],
  ideaConnections: [
    {
      id: 'conn_1',
      sourceTopic: 'AI Agents',
      targetTopic: 'Browser Automation',
      connectionSummary: 'Autonomous reasoning loops driving headless browser sessions for end-to-end task completion.',
      bookmarkCount: 6,
      primaryBookmarkId: 'bm_102',
    },
    {
      id: 'conn_2',
      sourceTopic: 'Solopreneurship',
      targetTopic: 'Radical Simplicity',
      connectionSummary: 'Solo software founders deliberately pairing SQLite and vanilla stacks to maximize shipping velocity.',
      bookmarkCount: 4,
      primaryBookmarkId: 'bm_106',
    },
    {
      id: 'conn_3',
      sourceTopic: 'Design Tokens',
      targetTopic: 'Developer Velocity',
      connectionSummary: 'Treating UI design tokens as shared code contracts to eliminate designer-developer friction.',
      bookmarkCount: 5,
      primaryBookmarkId: 'bm_109',
    },
  ],
  savingActivityTimeline: [
    { weekLabel: 'Jun 23', count: 18, highlightTopic: 'Startups' },
    { weekLabel: 'Jun 30', count: 24, highlightTopic: 'Engineering' },
    { weekLabel: 'Jul 07', count: 21, highlightTopic: 'Product' },
    { weekLabel: 'Jul 14', count: 28, highlightTopic: 'AI' },
    { weekLabel: 'Jul 21', count: 19, highlightTopic: 'Design' },
    { weekLabel: 'Jul 28', count: 31, highlightTopic: 'AI' },
    { weekLabel: 'Aug 04', count: 26, highlightTopic: 'Crypto' },
    { weekLabel: 'Aug 11', count: 34, highlightTopic: 'AI' },
    { weekLabel: 'Aug 18', count: 24, highlightTopic: 'Engineering' },
    { weekLabel: 'Aug 25', count: 29, highlightTopic: 'Product' },
    { weekLabel: 'Sep 01', count: 36, highlightTopic: 'AI' },
    { weekLabel: 'Sep 08', count: 43, highlightTopic: 'AI' },
  ],
  top_sources: [
    { source: 'twitter', count: 2847, percentage: 100 },
  ],
  peak_saving_day: 'Wednesday',
  avg_bookmarks_per_week: 32,
  reading_completion_rate: 24,
};
