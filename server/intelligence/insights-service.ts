import { Bookmark } from '../../src/types';
import {
  EmergingTrendCalculation,
  TopicConnectionCalculation,
  SavingActivityWeekCalculation,
} from './types';

export class InsightsService {
  /**
   * Deterministically calculates emerging interests and topic trends
   * by comparing the last 30 days against the prior 60 days baseline.
   */
  public calculateEmergingInterests(
    bookmarks: Bookmark[],
    now: number = Date.now()
  ): EmergingTrendCalculation[] {
    const dayMs = 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * dayMs;
    const ninetyDaysAgo = now - 90 * dayMs;

    const recentCounts = new Map<string, number>();
    const baselineCounts = new Map<string, number>();

    for (const b of bookmarks) {
      const dateMs = new Date(b.bookmark_created_at || b.imported_at).getTime();
      const topics = b.topics || [];

      if (dateMs >= thirtyDaysAgo) {
        for (const t of topics) {
          const key = t.trim();
          if (!key) continue;
          recentCounts.set(key, (recentCounts.get(key) || 0) + 1);
        }
      } else if (dateMs >= ninetyDaysAgo) {
        for (const t of topics) {
          const key = t.trim();
          if (!key) continue;
          baselineCounts.set(key, (baselineCounts.get(key) || 0) + 1);
        }
      }
    }

    const trends: EmergingTrendCalculation[] = [];

    for (const [topic, recentCount] of recentCounts.entries()) {
      // Minimum volume threshold: at least 2 bookmarks in the last 30 days
      if (recentCount < 2) continue;

      const rawBaseline = baselineCounts.get(topic) || 0;
      // Normalize baseline 60-day count to a 30-day equivalent
      const baseline30d = rawBaseline / 2;

      if (baseline30d === 0) {
        trends.push({
          topic,
          recentCount,
          baselineCount: rawBaseline,
          growth: 100,
          growthLabel: 'New interest',
          status: 'new',
          explanation: `You saved ${recentCount} bookmarks on ${topic} this month. This is an emerging domain in your library.`,
        });
      } else {
        const growthPercent = Math.round(((recentCount - baseline30d) / baseline30d) * 100);
        if (growthPercent > 10) {
          trends.push({
            topic,
            recentCount,
            baselineCount: rawBaseline,
            growth: growthPercent,
            growthLabel: `+${growthPercent}%`,
            status: 'growing',
            explanation: `You saved ${recentCount} bookmarks in the last 30 days (up from ~${Math.round(baseline30d)} per month previously).`,
          });
        }
      }
    }

    // Sort by growth percentage, then by recent count
    trends.sort((a, b) => b.growth - a.growth || b.recentCount - a.recentCount);
    return trends.slice(0, 5);
  }

  /**
   * Discovers knowledge connections across topics based on topic co-occurrence in user bookmarks.
   */
  public calculateTopicConnections(bookmarks: Bookmark[]): TopicConnectionCalculation[] {
    const pairMap = new Map<string, { topicA: string; topicB: string; bookmarkIds: string[] }>();

    for (const b of bookmarks) {
      const rawTopics = Array.from(new Set((b.topics || []).map(t => t.trim()).filter(Boolean)));
      if (rawTopics.length < 2) continue;

      // Generate pairs
      for (let i = 0; i < rawTopics.length; i++) {
        for (let j = i + 1; j < rawTopics.length; j++) {
          const t1 = rawTopics[i];
          const t2 = rawTopics[j];
          if (t1.toLowerCase() === t2.toLowerCase()) continue;

          // Standardize pair key alphabetically
          const [first, second] = t1.localeCompare(t2) < 0 ? [t1, t2] : [t2, t1];
          const key = `${first}:::${second}`;

          const existing = pairMap.get(key) || { topicA: first, topicB: second, bookmarkIds: [] };
          if (!existing.bookmarkIds.includes(b.id)) {
            existing.bookmarkIds.push(b.id);
          }
          pairMap.set(key, existing);
        }
      }
    }

    // Filter connections with at least 2 co-occurring bookmarks
    const candidates = Array.from(pairMap.values())
      .filter(p => p.bookmarkIds.length >= 2)
      .sort((a, b) => b.bookmarkIds.length - a.bookmarkIds.length);

    return candidates.slice(0, 5).map((p, idx) => {
      const primaryBookmark = bookmarks.find(b => b.id === p.bookmarkIds[0]);
      return {
        id: `conn_${idx + 1}_${p.topicA.toLowerCase().replace(/[^a-z0-9]/g, '')}_${p.topicB.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        sourceTopic: p.topicA,
        targetTopic: p.topicB,
        bookmarkCount: p.bookmarkIds.length,
        primaryBookmarkId: p.bookmarkIds[0],
        supportingBookmarkIds: p.bookmarkIds,
        connectionSummary: `You consistently bridge ${p.topicA} with ${p.topicB} across ${p.bookmarkIds.length} bookmarks${
          primaryBookmark ? `, highlighted by @${primaryBookmark.author_username}'s insights` : ''
        }.`,
      };
    });
  }

  /**
   * Generates a 12-week timeline of saving activity from real bookmark timestamps.
   */
  public calculateSavingTimeline(
    bookmarks: Bookmark[],
    now: number = Date.now()
  ): SavingActivityWeekCalculation[] {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks: SavingActivityWeekCalculation[] = [];

    // Build 12 weekly buckets backward from current week
    for (let i = 11; i >= 0; i--) {
      const weekEndMs = now - i * weekMs;
      const weekStartMs = weekEndMs - weekMs;

      const startDate = new Date(weekStartMs);
      const endDate = new Date(weekEndMs);

      const label = startDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

      const inWeek = bookmarks.filter(b => {
        const ms = new Date(b.bookmark_created_at || b.imported_at).getTime();
        return ms >= weekStartMs && ms < weekEndMs;
      });

      // Find top topic for the week
      const topicFreq = new Map<string, number>();
      for (const b of inWeek) {
        for (const t of b.topics || []) {
          topicFreq.set(t, (topicFreq.get(t) || 0) + 1);
        }
      }
      let topTopic = 'General';
      let topCount = 0;
      for (const [topic, count] of topicFreq.entries()) {
        if (count > topCount) {
          topTopic = topic;
          topCount = count;
        }
      }

      weeks.push({
        weekLabel: label,
        weekStart: startDate.toISOString(),
        weekEnd: endDate.toISOString(),
        count: inWeek.length,
        highlightTopic: inWeek.length > 0 ? topTopic : undefined,
      });
    }

    return weeks;
  }

  /**
   * Generates real topic distribution
   */
  public calculateTopicDistribution(
    bookmarks: Bookmark[]
  ): Array<{ topic: string; count: number; percentage: number }> {
    const total = bookmarks.length;
    const counts = new Map<string, number>();

    for (const b of bookmarks) {
      for (const t of b.topics || []) {
        const clean = t.trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

export const insightsService = new InsightsService();
