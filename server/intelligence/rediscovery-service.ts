import { Bookmark } from '../../src/types';
import { RediscoveryCandidate, RediscoveryRecord, RediscoveryFeedbackInput } from './types';

export class RediscoveryService {
  /**
   * Deterministically scores and ranks older bookmarks that the user might have forgotten,
   * weighted by age, unread/favorite status, alignment with recent topics, and surface history.
   */
  public scoreCandidates(
    bookmarks: Bookmark[],
    events: RediscoveryRecord[],
    options?: {
      limit?: number;
      minAgeDays?: number;
      surface?: 'dashboard' | 'digest' | 'insights';
      excludeIds?: Set<string>;
    }
  ): RediscoveryCandidate[] {
    const limit = options?.limit ?? 4;
    const minAgeDays = options?.minAgeDays ?? 14;
    const excludeIds = options?.excludeIds ?? new Set<string>();
    const now = Date.now();

    // 1. Identify recent topics (from bookmarks saved within the last 14 days)
    const twoWeeksAgoMs = now - 14 * 24 * 60 * 60 * 1000;
    const recentBookmarks = bookmarks.filter(b => {
      const created = new Date(b.bookmark_created_at || b.imported_at).getTime();
      return created >= twoWeeksAgoMs;
    });

    const recentTopicCounts = new Map<string, number>();
    for (const b of recentBookmarks) {
      for (const t of b.topics || []) {
        const lower = t.toLowerCase();
        recentTopicCounts.set(lower, (recentTopicCounts.get(lower) || 0) + 1);
      }
    }

    // 2. Index rediscovery events by bookmarkId
    const eventsByBookmark = new Map<string, RediscoveryRecord[]>();
    for (const ev of events) {
      const list = eventsByBookmark.get(ev.saved_item_id) || [];
      list.push(ev);
      eventsByBookmark.set(ev.saved_item_id, list);
    }

    const scored: RediscoveryCandidate[] = [];

    for (const b of bookmarks) {
      if (excludeIds.has(b.id)) continue;

      const dateMs = new Date(b.bookmark_created_at || b.imported_at).getTime();
      const ageDays = Math.floor((now - dateMs) / (24 * 60 * 60 * 1000));

      // Must meet minimum age threshold to qualify for rediscovery
      if (ageDays < minAgeDays) continue;

      const bEvents = eventsByBookmark.get(b.id) || [];
      const hasHidden = bEvents.some(e => e.interaction === 'hide');
      if (hasHidden) continue; // User chose to hide this bookmark from rediscovery

      let score = 0;
      const reasons: string[] = [];

      // A. Age factor (older bookmarks gain score, plateauing around 180 days)
      const ageScore = Math.min(40, Math.floor((ageDays / 14) * 6));
      score += ageScore;
      if (ageDays >= 30) {
        const months = Math.floor(ageDays / 30);
        reasons.push(`Saved ${months} ${months === 1 ? 'month' : 'months'} ago`);
      } else {
        reasons.push(`Saved ${ageDays} days ago`);
      }

      // B. Alignment with recent topics
      const matchingRecentTopics = (b.topics || []).filter(t => recentTopicCounts.has(t.toLowerCase()));
      if (matchingRecentTopics.length > 0) {
        score += 35;
        reasons.push(`Connects with your current interest in ${matchingRecentTopics.slice(0, 2).join(' & ')}`);
      }

      // C. Unread evergreen boost
      if (!b.is_read) {
        score += 18;
        reasons.push('Unread in your library');
      }

      // D. Favorite boost
      if (b.is_favorite) {
        score += 25;
        reasons.push('Starred favorite');
      }

      // E. Quality & Enrichment signals
      if (b.ai_summary && b.ai_summary.length > 30) {
        score += 10;
      }
      if (b.engagement && (b.engagement.likes || 0) > 100) {
        score += 8;
      }

      // F. Surface history & feedback penalties
      let lastSurfacedAt: string | undefined;
      let surfacedCount = 0;

      for (const ev of bEvents) {
        surfacedCount++;
        if (!lastSurfacedAt || new Date(ev.surfaced_at).getTime() > new Date(lastSurfacedAt).getTime()) {
          lastSurfacedAt = ev.surfaced_at;
        }

        if (ev.interaction === 'useful') {
          score += 20;
        } else if (ev.interaction === 'not_relevant') {
          score -= 50;
        }
      }

      if (lastSurfacedAt) {
        const daysSinceSurfaced = (now - new Date(lastSurfacedAt).getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceSurfaced < 7) {
          score -= 45; // Avoid repetitive recommendations within 1 week
        } else if (daysSinceSurfaced < 14) {
          score -= 20;
        }
      }

      // Add default reason if empty
      if (reasons.length === 0) {
        reasons.push('Evergreen saved insight');
      }

      scored.push({
        bookmark: b,
        score,
        reasons,
        surfacedCount,
        lastSurfacedAt,
      });
    }

    // Sort descending by calculated score
    scored.sort((a, b) => b.score - a.score);

    // If too few candidates exceed minAgeDays, fall back to older bookmarks in the collection
    if (scored.length < limit && bookmarks.length > 0) {
      const existingIds = new Set(scored.map(s => s.bookmark.id));
      const olderFallback = [...bookmarks]
        .filter(b => !existingIds.has(b.id) && !excludeIds.has(b.id))
        .sort((a, b) => new Date(a.bookmark_created_at || a.imported_at).getTime() - new Date(b.bookmark_created_at || b.imported_at).getTime())
        .slice(0, limit - scored.length);

      for (const fb of olderFallback) {
        scored.push({
          bookmark: fb,
          score: 10,
          reasons: ['Saved earlier in your library'],
          surfacedCount: 0,
        });
      }
    }

    return scored.slice(0, limit);
  }
}

export const rediscoveryService = new RediscoveryService();
