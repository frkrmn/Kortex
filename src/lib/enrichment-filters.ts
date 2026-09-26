import type { Bookmark } from '../types';
import { ENRICHMENT_CATEGORIES, type EnrichmentCategory } from '../config/enrichment';

export function isEnrichmentCategory(value: string): value is EnrichmentCategory {
  return (ENRICHMENT_CATEGORIES as readonly string[]).includes(value);
}

export function categoryCounts(bookmarks: Bookmark[]) {
  const counts = Object.fromEntries(ENRICHMENT_CATEGORIES.map(category => [category, 0])) as Record<EnrichmentCategory, number>;
  for (const item of bookmarks) {
    if (item.enrichment_status === 'completed' && item.ai_category) counts[item.ai_category]++;
  }
  return counts;
}

export function topicCounts(bookmarks: Bookmark[], category: EnrichmentCategory) {
  const counts = new Map<string, number>();
  for (const item of bookmarks) {
    if (item.enrichment_status !== 'completed' || item.ai_category !== category) continue;
    for (const topic of new Set(item.topics)) counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function filterEnrichedBookmarks(bookmarks: Bookmark[], category: string, topic: string, query: string) {
  const term = query.trim().toLowerCase();
  return bookmarks.filter(item => {
    if (category !== 'all' && item.ai_category !== category) return false;
    if (topic !== 'all' && !item.topics.some(value => value.toLowerCase() === topic.toLowerCase())) return false;
    if (!term) return true;
    return [item.content, item.author_name, item.author_username, item.ai_summary, item.ai_category,
      ...item.topics, ...(item.key_concepts || [])].some(value => value?.toLowerCase().includes(term));
  });
}
