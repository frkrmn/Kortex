import { Bookmark } from '../../src/types';
import { EnrichmentInput, EnrichmentResult, IAIProvider } from './types';

export interface SummarizeResult {
  summary: string;
  keywords: string[];
  whySavedInsight: string;
}

export interface DigestGenerationResult {
  title: string;
  topic_groups: Array<{
    topic: string;
    summary: string;
    bookmark_ids: string[];
  }>;
  key_ideas: string[];
  worth_revisiting_ids: string[];
}

export interface ChatResponseResult {
  reply: string;
  citedBookmarkIds: string[];
}

export interface AIProvider extends IAIProvider {
  name: string;
  enrichSavedItem(input: EnrichmentInput): Promise<EnrichmentResult>;
  summarize(content: string, author?: string): Promise<SummarizeResult>;
  classify(content: string, availableTopics: string[]): Promise<string[]>;
  embed(text: string): Promise<number[]>;
  chat(
    userPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    candidateBookmarks: Bookmark[]
  ): Promise<ChatResponseResult>;
  generateDigest(bookmarks: Bookmark[], periodLabel: string): Promise<DigestGenerationResult>;
}

