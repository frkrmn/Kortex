import { TopicSuggestion } from './types';
import { aiConfig } from '../../src/config/ai';

// Common canonical alias mappings to prevent topic proliferation
const CANONICAL_TOPIC_MAP: Record<string, string> = {
  // AI
  'ai': 'AI & LLMs',
  'artificial intelligence': 'AI & LLMs',
  'machine learning': 'AI & LLMs',
  'deep learning': 'AI & LLMs',
  'llm': 'AI & LLMs',
  'llms': 'AI & LLMs',
  'genai': 'AI & LLMs',
  'generative ai': 'AI & LLMs',
  'agents': 'AI & LLMs',
  'ai agents': 'AI & LLMs',

  // Startups
  'startup': 'Startups & Venture',
  'startups': 'Startups & Venture',
  'vc': 'Startups & Venture',
  'venture capital': 'Startups & Venture',
  'founders': 'Startups & Venture',
  'fundraising': 'Startups & Venture',
  'entrepreneurship': 'Startups & Venture',

  // Product
  'product': 'Product Strategy',
  'product management': 'Product Strategy',
  'pm': 'Product Strategy',
  'product design': 'Product Strategy',
  'product strategy': 'Product Strategy',

  // Engineering
  'engineering': 'Engineering & Systems',
  'software engineering': 'Engineering & Systems',
  'systems': 'Engineering & Systems',
  'architecture': 'Engineering & Systems',
  'software architecture': 'Engineering & Systems',
  'distributed systems': 'Engineering & Systems',
  'backend': 'Engineering & Systems',
  'database': 'Engineering & Systems',
  'devops': 'Engineering & Systems',

  // Design
  'design': 'Design & UI',
  'ui': 'Design & UI',
  'ux': 'Design & UI',
  'ui/ux': 'Design & UI',
  'interface': 'Design & UI',
  'typography': 'Design & UI',

  // Crypto
  'crypto': 'Crypto & Web3',
  'cryptocurrency': 'Crypto & Web3',
  'web3': 'Crypto & Web3',
  'bitcoin': 'Crypto & Web3',
  'ethereum': 'Crypto & Web3',

  // Growth & Marketing
  'growth': 'Growth & Distribution',
  'marketing': 'Growth & Distribution',
  'distribution': 'Growth & Distribution',
  'seo': 'Growth & Distribution',
};

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
  if (!raw) return '';

  // Clean characters, trailing punctuation, hashes
  let cleaned = raw
    .trim()
    .replace(/^[#@\s]+/, '')
    .replace(/[.,;:]+$/, '')
    .trim();

  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();

  // Check canonical map
  if (CANONICAL_TOPIC_MAP[lower]) {
    return CANONICAL_TOPIC_MAP[lower];
  }

  // Preserve proper capitalization for known acronyms
  const acronyms = new Set(['AI', 'LLM', 'LLMs', 'UI', 'UX', 'API', 'APIs', 'SaaS', 'VC', 'SEO', 'CSS', 'SQL', 'B2B', 'PLG']);
  const words = cleaned.split(/\s+/);
  const normalizedWords = words.map(word => {
    const upper = word.toUpperCase();
    if (acronyms.has(upper)) return upper;
    if (word.length <= 2 && !['in', 'on', 'at', 'to', 'of', 'by', 'as'].includes(word.toLowerCase())) {
      return upper;
    }
    // Title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return normalizedWords.join(' ');
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
