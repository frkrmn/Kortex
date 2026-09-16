export interface TopicSuggestion {
  name: string;
  confidence: number;
}

export interface EnrichmentInput {
  savedItemId: string;
  content: string;
  authorName?: string;
  authorUsername?: string;
  existingTopics?: string[];
  url?: string;
}

export interface EnrichmentTokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  estimatedCost?: number;
}

export interface EnrichmentResult {
  language: string;
  summary: string;
  keywords: string[];
  topics: TopicSuggestion[];
  whySavedInsight?: string;
  tokenUsage?: EnrichmentTokenUsage;
}

export type EnrichmentErrorCode =
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_INVALID_RESPONSE'
  | 'AI_TIMEOUT'
  | 'AI_CONFIGURATION_ERROR'
  | 'ENRICHMENT_PERSIST_FAILED';

export class EnrichmentError extends Error {
  public code: EnrichmentErrorCode;
  public retryable: boolean;

  constructor(message: string, code: EnrichmentErrorCode, retryable = false) {
    super(message);
    this.name = 'EnrichmentError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface ProcessingJobRecord {
  id: string;
  userId: string;
  savedItemId: string;
  jobType: 'enrichment' | 'embedding';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  errorCode?: EnrichmentErrorCode | string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AIUsageRecord {
  id: string;
  userId: string;
  savedItemId?: string;
  operation: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost?: number;
  createdAt: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: string;
  tokensUsed?: number;
}

export interface EmbeddingProvider {
  name: string;
  embedText(input: string): Promise<EmbeddingResult>;
  embedBatch?(inputs: string[]): Promise<EmbeddingResult[]>;
}

export interface SavedItemEmbeddingRecord {
  id: string;
  userId: string;
  savedItemId: string;
  embedding: number[];
  provider: string;
  model: string;
  embeddingVersion: string;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  topic?: string;
  source?: string;
  filter?: 'all' | 'unread' | 'favorites' | 'recent';
  isRead?: boolean;
  isFavorite?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'relevant';
}

export interface SearchResultItem {
  item: any; // Bookmark
  score: number;
  matchType: 'lexical' | 'semantic' | 'hybrid';
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  mode: 'hybrid' | 'lexical' | 'semantic';
  latencyMs: number;
}

export interface IAIProvider {
  name: string;
  enrichSavedItem(input: EnrichmentInput): Promise<EnrichmentResult>;
  embedText?(input: string): Promise<EmbeddingResult>;
  embedBatch?(inputs: string[]): Promise<EmbeddingResult[]>;
}
