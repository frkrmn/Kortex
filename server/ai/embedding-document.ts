import crypto from 'crypto';
import { Bookmark } from '../../src/types';

export interface EmbeddingDocumentResult {
  document: string;
  contentHash: string;
}

/**
 * Normalizes input string by stripping redundant whitespace and control characters,
 * while preserving unicode characters (Turkish, German, Arabic, Chinese, emojis, etc.).
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Builds the canonical embedding document representation of a saved item for dense vector retrieval.
 * 
 * Rules:
 * 1. Normalize whitespace and clean repetitive text.
 * 2. Preserve rich contextual semantics:
 *    - Author and platform source
 *    - Original post content / text
 *    - AI summary & key insights
 *    - Normalized canonical topics
 *    - Extracted keywords
 * 3. Handles multi-lingual Unicode correctly without lossy ASCII stripping.
 * 4. Strictly excludes sensitive/internal metadata (user IDs, emails, sync cursors, tokens).
 * 5. Enforces a sensible maximum text length (e.g. 3500 chars) to stay safely within embedding model context.
 * 6. Generates a deterministic SHA-256 content hash for idempotency and cost control.
 */
export function buildEmbeddingDocument(item: Partial<Bookmark>): EmbeddingDocumentResult {
  const parts: string[] = [];

  // Context: Source & Author
  const authorInfo = [
    item.author_name ? normalizeText(item.author_name) : '',
    item.author_username ? `@${normalizeText(item.author_username)}` : '',
    item.source ? `[${normalizeText(item.source)}]` : '',
  ].filter(Boolean).join(' ');

  if (authorInfo) {
    parts.push(`Author: ${authorInfo}`);
  }

  // Original content
  const cleanContent = normalizeText(item.content);
  if (cleanContent) {
    parts.push(`Content: ${cleanContent}`);
  }

  // AI Summary
  const cleanSummary = normalizeText(item.ai_summary);
  if (cleanSummary) {
    parts.push(`Summary: ${cleanSummary}`);
  }

  // Why Saved Insight (if available)
  const cleanInsight = normalizeText(item.why_saved_insight);
  if (cleanInsight) {
    parts.push(`Key Insight: ${cleanInsight}`);
  }

  // Topics
  if (item.topics && item.topics.length > 0) {
    const cleanTopics = Array.from(new Set(item.topics.map(t => normalizeText(t)).filter(Boolean)));
    if (cleanTopics.length > 0) {
      parts.push(`Topics: ${cleanTopics.join(', ')}`);
    }
  }

  // Keywords
  if (item.keywords && item.keywords.length > 0) {
    const cleanKeywords = Array.from(new Set(item.keywords.map(k => normalizeText(k)).filter(Boolean)));
    if (cleanKeywords.length > 0) {
      parts.push(`Keywords: ${cleanKeywords.join(', ')}`);
    }
  }

  // Combine into single normalized document
  let document = parts.join('\n\n').trim();

  // Enforce sensible maximum document length (3500 characters)
  const MAX_DOCUMENT_LENGTH = 3500;
  if (document.length > MAX_DOCUMENT_LENGTH) {
    document = document.slice(0, MAX_DOCUMENT_LENGTH).trim();
  }

  // Deterministic SHA-256 content hash
  const contentHash = crypto
    .createHash('sha256')
    .update(document, 'utf8')
    .digest('hex');

  return {
    document,
    contentHash,
  };
}
