import { store } from '../store';
import { aiConfig } from '../../src/config/ai';
import {
  EmbeddingProvider,
  EmbeddingResult,
  ProcessingJobRecord,
  AIUsageRecord,
  SavedItemEmbeddingRecord,
} from './types';
import { GeminiAIProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { buildEmbeddingDocument } from './embedding-document';

export class EmbeddingPipeline {
  private geminiProvider: GeminiAIProvider;
  private openaiProvider: OpenAIProvider;
  private activeJobs = new Set<string>();
  private queue: string[] = [];
  private isDraining = false;

  constructor() {
    this.geminiProvider = new GeminiAIProvider();
    this.openaiProvider = new OpenAIProvider();
  }

  private getProvider(): EmbeddingProvider {
    return aiConfig.provider === 'openai' ? this.openaiProvider : this.geminiProvider;
  }

  /**
   * Enqueues an enriched bookmark for embedding generation.
   * Performs idempotency checks against content hash and embedding version.
   */
  public enqueue(savedItemId: string, force = false): void {
    const bookmark = store.getBookmarkById(savedItemId);
    if (!bookmark) {
      console.warn(`[Embedding Pipeline] Bookmark ${savedItemId} not found.`);
      return;
    }

    const { document, contentHash } = buildEmbeddingDocument(bookmark);
    const existingEmbedding = store.getEmbedding(savedItemId, aiConfig.embeddingVersion);

    // Idempotency: skip if already embedded with same version and content hash
    if (!force && existingEmbedding && existingEmbedding.contentHash === contentHash) {
      return;
    }

    // Create or find processing job for embedding
    const existingJob = store.getProcessingJobs().find(
      (j) => j.savedItemId === savedItemId && j.jobType === 'embedding' && j.status === 'pending'
    );

    if (!existingJob) {
      const newJob: ProcessingJobRecord = {
        id: `job_emb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: bookmark.user_id || 'user_default',
        savedItemId,
        jobType: 'embedding',
        status: 'pending',
        attempts: 0,
        maxAttempts: aiConfig.maxRetries,
        createdAt: new Date().toISOString(),
      };
      store.addProcessingJob(newJob);
    }

    if (!this.queue.includes(savedItemId) && !this.activeJobs.has(savedItemId)) {
      this.queue.push(savedItemId);
    }

    this.drainQueue();
  }

  /**
   * Enqueues a batch of bookmarks for embedding generation.
   */
  public enqueueBatch(savedItemIds: string[], force = false): void {
    for (const id of savedItemIds) {
      this.enqueue(id, force);
    }
  }

  /**
   * Safe backfill for all existing bookmarks lacking an embedding or with outdated hashes.
   */
  public backfillMissing(): { enqueuedCount: number } {
    const allBookmarks = store.getBookmarks();
    let count = 0;

    for (const b of allBookmarks) {
      const { contentHash } = buildEmbeddingDocument(b);
      const existing = store.getEmbedding(b.id, aiConfig.embeddingVersion);
      if (!existing || existing.contentHash !== contentHash) {
        this.enqueue(b.id);
        count++;
      }
    }

    return { enqueuedCount: count };
  }

  /**
   * Concurrently processes queued embedding items according to aiConfig.embeddingConcurrency.
   */
  private async drainQueue(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;

    try {
      while (this.queue.length > 0 && this.activeJobs.size < aiConfig.embeddingConcurrency) {
        const nextId = this.queue.shift();
        if (!nextId) break;

        this.activeJobs.add(nextId);
        this.processItem(nextId)
          .finally(() => {
            this.activeJobs.delete(nextId);
            this.drainQueue();
          })
          .catch((err) => {
            console.error(`[Embedding Pipeline] Error processing item ${nextId}:`, err);
          });
      }
    } finally {
      this.isDraining = false;
    }
  }

  /**
   * Processes a single bookmark: constructs the canonical document,
   * generates the dense vector, and persists it with content hash and AI usage records.
   */
  public async processItem(savedItemId: string): Promise<SavedItemEmbeddingRecord | null> {
    const bookmark = store.getBookmarkById(savedItemId);
    if (!bookmark) {
      return null;
    }

    const job = store.getProcessingJobs().find(
      (j) => j.savedItemId === savedItemId && j.jobType === 'embedding' && (j.status === 'pending' || j.status === 'processing')
    );

    if (job) {
      store.updateProcessingJob(job.id, {
        status: 'processing',
        startedAt: new Date().toISOString(),
        attempts: job.attempts + 1,
      });
    }

    const provider = this.getProvider();
    const { document, contentHash } = buildEmbeddingDocument(bookmark);

    try {
      const embeddingRes: EmbeddingResult = await provider.embedText(document);

      const record: SavedItemEmbeddingRecord = {
        id: `emb_${savedItemId}_${aiConfig.embeddingVersion}`,
        userId: bookmark.user_id || 'user_default',
        savedItemId,
        embedding: embeddingRes.embedding,
        provider: embeddingRes.provider,
        model: embeddingRes.model,
        embeddingVersion: aiConfig.embeddingVersion,
        contentHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist in store
      store.saveEmbedding(record);

      // Record AI usage for cost and metric tracking
      const usageRecord: AIUsageRecord = {
        id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: bookmark.user_id || 'user_default',
        savedItemId,
        operation: 'bookmark_embedding',
        provider: embeddingRes.provider,
        model: embeddingRes.model,
        inputTokens: embeddingRes.tokensUsed || Math.ceil(document.length / 4),
        outputTokens: 0,
        estimatedCost: (embeddingRes.tokensUsed || 100) * 0.00000002, // ~$0.02 / 1M tokens
        createdAt: new Date().toISOString(),
      };
      store.addAIUsage(usageRecord);

      if (job) {
        store.updateProcessingJob(job.id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      }

      return record;
    } catch (err: any) {
      console.warn(`[Embedding Pipeline] Embedding failed for ${savedItemId}:`, err?.message || err);

      if (job) {
        const isExhausted = job.attempts >= job.maxAttempts;
        store.updateProcessingJob(job.id, {
          status: isExhausted ? 'failed' : 'pending',
          errorCode: 'AI_PROVIDER_ERROR',
          errorMessage: err?.message || 'Embedding generation failed',
          completedAt: isExhausted ? new Date().toISOString() : undefined,
        });
      }

      return null;
    }
  }

  /**
   * Generates a query vector for live user search queries.
   * Discards immediately after retrieval (does not persist).
   */
  public async embedQuery(queryText: string): Promise<number[]> {
    const provider = this.getProvider();
    const cleanQuery = queryText.trim().slice(0, 500);

    const res = await provider.embedText(cleanQuery);

    // Track query embedding usage
    const usageRecord: AIUsageRecord = {
      id: `usage_q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: 'user_default',
      operation: 'query_embedding',
      provider: res.provider,
      model: res.model,
      inputTokens: res.tokensUsed || Math.ceil(cleanQuery.length / 4),
      outputTokens: 0,
      estimatedCost: 0.000001,
      createdAt: new Date().toISOString(),
    };
    store.addAIUsage(usageRecord);

    return res.embedding;
  }
}

// Lazy singleton
let embeddingPipelineInstance: EmbeddingPipeline | null = null;

export function getEmbeddingPipeline(): EmbeddingPipeline {
  if (!embeddingPipelineInstance) {
    embeddingPipelineInstance = new EmbeddingPipeline();
  }
  return embeddingPipelineInstance;
}
