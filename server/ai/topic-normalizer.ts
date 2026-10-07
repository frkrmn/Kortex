import { TopicSuggestion } from './types';
import { aiConfig } from '../../src/config/ai';
import { normalizeTopic } from '../../src/lib/topic-normalization';

export function slugifyTopic(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Normalizes a raw topic string into a clean, canonical format.
 */
export function normalizeTopicName(raw: string): string {
  return normalizeTopic(raw.replace(/^[#@\s]+/, ''));
}

/**
 * Filters and resolves topic suggestions against existing user topics.
 * Prefers reusing existing topics over minting new ones whenever possible.
 */
export function resolveTopicSuggestions(
  suggestions: TopicSuggestion[],
  existingTopics: string[],
  confidenceThreshold = aiConfig.confidenceThreshold
): string[] {
  const resolved = new Set<string>();

  // Build lookup maps for existing topics (by lowercase and by slug)
  const existingMap = new Map<string, string>();
  for (const t of existingTopics) {
    existingMap.set(t.toLowerCase(), t);
    existingMap.set(slugifyTopic(t), t);
  }

  for (const suggestion of suggestions) {
    if (suggestion.confidence < confidenceThreshold) {
      continue;
    }

    const normalized = normalizeTopicName(suggestion.name);
    if (!normalized || normalized.length < 2) {
      continue;
    }

    const lower = normalized.toLowerCase();
    const slug = slugifyTopic(normalized);

    // Check if an existing topic matches
    if (existingMap.has(lower)) {
      resolved.add(existingMap.get(lower)!);
    } else if (existingMap.has(slug)) {
      resolved.add(existingMap.get(slug)!);
    } else {
      // New distinct topic
      resolved.add(normalized);
    }
  }

  // Default fallback if no topic passed the confidence threshold
  if (resolved.size === 0) {
    resolved.add('Knowledge');
  }

  return Array.from(resolved).slice(0, 3);
}

/**
 * Normalizes an array of keywords:
 * Deduplicates, trims whitespace, removes hashes and generic words.
 */
export function normalizeKeywords(rawKeywords: string[]): string[] {
  const genericBanned = new Set([
    'post', 'tweet', 'x', 'thread', 'thoughts', 'interesting', 'good',
    'great', 'check', 'out', 'reading', 'read', 'bookmark', 'saved',
    'today', 'link', 'article', 'new', 'here', 'why', 'what', 'how'
  ]);

  const unique = new Set<string>();

  for (const raw of rawKeywords) {
    if (!raw) continue;
    let clean = raw
      .trim()
      .replace(/^[#@\s]+/, '')
      .replace(/[.,;:]+$/, '')
      .trim();

    if (clean.length < 2 || clean.length > 40) continue;
    if (genericBanned.has(clean.toLowerCase())) continue;

    // Normalize casing (Title Case or clean string)
    const words = clean.split(/\s+/);
    const capitalized = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    unique.add(capitalized);
  }

  return Array.from(unique).slice(0, 6);
}
