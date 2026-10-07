import type { Bookmark } from '../types';
import { ENRICHMENT_CATEGORIES, type EnrichmentCategory } from '../config/enrichment';
import { normalizeTopic, normalizeTopics } from './topic-normalization';

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
    for (const topic of normalizeTopics(item.topics)) counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function filterEnrichedBookmarks(bookmarks: Bookmark[], category: string, topic: string, query: string) {
  const term = query.trim().toLowerCase();
  const normalizedTopic = topic === 'all' ? 'all' : normalizeTopic(topic).toLowerCase();
  return bookmarks.filter(item => {
    if (category !== 'all' && item.ai_category !== category) return false;
    const canonicalTopics = normalizeTopics(item.topics);
    if (normalizedTopic !== 'all' && !canonicalTopics.some(value => value.toLowerCase() === normalizedTopic)) return false;
    if (!term) return true;
    return [item.content, item.author_name, item.author_username, item.ai_summary, item.ai_category,
      ...canonicalTopics, ...(item.key_concepts || [])].some(value => value?.toLowerCase().includes(term));
  });
}

export function visibleTopicOptions(
  topics: Array<[string, number]>, search: string, selectedTopic: string, expanded: boolean, limit = 12,
) {
  const term = search.trim().toLowerCase();
  if (term) return topics.filter(([topic]) => topic.toLowerCase().includes(term));
  if (expanded || topics.length <= limit) return topics;
  const visible = topics.slice(0, limit);
  const selected = normalizeTopic(selectedTopic);
  const selectedEntry = topics.find(([topic]) => topic.toLowerCase() === selected.toLowerCase());
  if (selectedEntry && !visible.some(([topic]) => topic.toLowerCase() === selected.toLowerCase())) {
    return [...visible.slice(0, Math.max(0, limit - 1)), selectedEntry];
  }
  return visible;
}
