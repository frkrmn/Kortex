import { Bookmark, Digest, InsightsData } from '../../src/types';

export interface RediscoveryCandidate {
  bookmark: Bookmark;
  score: number;
  reasons: string[];
  surfacedCount: number;
  lastSurfacedAt?: string;
}

export interface RediscoveryFeedbackInput {
  userId: string;
  bookmarkId: string;
  surface: 'dashboard' | 'digest' | 'insights';
  interaction: 'view' | 'click' | 'useful' | 'not_relevant' | 'hide';
}

export interface RediscoveryRecord {
  id: string;
  user_id: string;
  saved_item_id: string;
  surface: 'dashboard' | 'digest' | 'insights';
  surfaced_at: string;
  interaction?: 'view' | 'click' | 'useful' | 'not_relevant' | 'hide';
  created_at: string;
}

export interface EmergingTrendCalculation {
  topic: string;
  recentCount: number;
  baselineCount: number;
  growth: number;
  growthLabel: string;
  status: 'growing' | 'new';
  explanation: string;
}

export interface TopicConnectionCalculation {
  id: string;
  sourceTopic: string;
  targetTopic: string;
  bookmarkCount: number;
  primaryBookmarkId: string;
  supportingBookmarkIds: string[];
  connectionSummary: string;
}

export interface SavingActivityWeekCalculation {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  count: number;
  highlightTopic?: string;
}

export interface DigestGenerationOptions {
  period?: 'weekly' | 'monthly';
  targetDate?: Date;
  timezone?: string;
  forceRegenerate?: boolean;
}
