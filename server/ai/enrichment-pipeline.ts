import { store } from '../store';
import { aiConfig } from '../../src/config/ai';
import { EntitlementService } from '../billing/entitlement-service';
import {
  EnrichmentInput,
  EnrichmentResult,
  EnrichmentError,
  ProcessingJobRecord,
  AIUsageRecord,
  IAIProvider,
} from './types';
import { GeminiAIProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { resolveTopicSuggestions, normalizeKeywords, slugifyTopic } from './topic-normalizer';
import { getEmbeddingPipeline } from './embedding-pipeline';

export class EnrichmentPipeline {
  private geminiProvider: GeminiAIProvider;
  private openaiProvider: OpenAIProvider;
  private activeJobs = new Set<string>();
  private queue: string[] = [];
  private isDraining = false;

  constructor() {
    this.geminiProvider = new GeminiAIProvider();
    this.openaiProvider = new OpenAIProvider();
  }

  private getProvider(): IAIProvider {
    return aiConfig.provider === 'openai' ? this.openaiProvider : this.geminiProvider;
  }

  /**
   * Enqueues a batch of saved items for asynchronous background AI enrichment.
   */
  public enqueueBatch(savedItemIds: string[], force = false): void {
    for (const id of savedItemIds) {
      this.enqueue(id, force);
    }
  }

  /**
   * Enqueues a single saved item.
   */
  public enqueue(savedItemId: string, force = false): void {
    const bookmark = store.getBookmarkById(savedItemId);
    if (!bookmark) {
      console.warn(`[AI Enrichment] Skipping unknown bookmark ID: ${savedItemId}`);
      return;
    }

    // Check idempotency: skip if already completed unless forced
    if (!force && bookmark.enrichment_status === 'completed') {
      return;
    }

    // Set initial pending state
    store.updateBookmark(savedItemId, {
      enrichment_status: 'pending',
    });

    // Create or retrieve processing job record
    const existingJob = store.getProcessingJobs().find(j => j.savedItemId === savedItemId && j.status === 'pending');
    if (!existingJob) {
      const newJob: ProcessingJobRecord = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: bookmark.user_id || 'user_default',
        savedItemId,
        jobType: 'enrichment',
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

    // Start draining queue
    this.drainQueue();
  }

  /**
   * Processes queued items with controlled concurrency.
   */
  private async drainQueue(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;

    try {
      while (this.queue.length > 0 && this.activeJobs.size < aiConfig.concurrency) {
        const nextId = this.queue.shift();
        if (!nextId) break;

        this.activeJobs.add(nextId);
        this.processItem(nextId)
          .finally(() => {
            this.activeJobs.delete(nextId);
            this.drainQueue();
          });
      }
    } finally {
      this.isDraining = false;
    }
  }

  /**
   * Core worker logic for enriching a single saved item.
   */
  public async processItem(savedItemId: string): Promise<void> {
    const startTime = Date.now();
    const bookmark = store.getBookmarkById(savedItemId);
    if (!bookmark) {
      console.warn(`[AI Enrichment] Item ${savedItemId} not found during processing.`);
      return;
    }

    const userId = bookmark.user_id || 'user_default';
    const remainingEnrichment = await EntitlementService.getRemainingUsage(userId, 'enrichment');
    if (remainingEnrichment !== null && remainingEnrichment <= 0) {
      console.log(`[AI Enrichment] Item ${savedItemId} skipped: Monthly enrichment quota reached for user ${userId}.`);
      store.updateBookmark(savedItemId, {
        enrichment_status: 'not_processed',
        enrichment_error: 'Monthly AI enrichment limit reached. Upgrade to Pro to analyze this bookmark.',
      });
      return;
    }

    let job = store.getProcessingJobs().find(j => j.savedItemId === savedItemId && (j.status === 'pending' || j.status === 'processing'));
    if (!job) {
      job = {
        id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: bookmark.user_id || 'user_default',
        savedItemId,
        jobType: 'enrichment',
        status: 'processing',
        attempts: 1,
        maxAttempts: aiConfig.maxRetries,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      store.addProcessingJob(job);
    } else {
      store.updateProcessingJob(job.id, {
        status: 'processing',
        attempts: job.attempts + 1,
        startedAt: new Date().toISOString(),
      });
    }

    store.updateBookmark(savedItemId, {
      enrichment_status: 'processing',
    });

    const provider = this.getProvider();
    const userTopics = store.getTopics().map(t => t.name);

    const input: EnrichmentInput = {
      savedItemId: bookmark.id,
      content: bookmark.content,
      authorName: bookmark.author_name,
      authorUsername: bookmark.author_username,
      existingTopics: userTopics,
      url: bookmark.url,
    };

    let attempt = 0;
    let lastError: any = null;
    let enrichmentResult: EnrichmentResult | null = null;

    while (attempt < aiConfig.maxRetries) {
      attempt++;
      try {
        enrichmentResult = await provider.enrichSavedItem(input);
        break; // Success!
      } catch (err: any) {
        lastError = err;
        const isRetryable = err instanceof EnrichmentError ? err.retryable : true;
        console.warn(`[AI Enrichment] Attempt ${attempt}/${aiConfig.maxRetries} failed for item ${savedItemId}: ${err.message}`);

        if (attempt < aiConfig.maxRetries && isRetryable) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          await new Promise(res => setTimeout(res, backoffMs));
        } else {
          break;
        }
      }
    }

    const durationMs = Date.now() - startTime;

    if (enrichmentResult) {
      // Resolve topics and keywords
      const resolvedTopics = resolveTopicSuggestions(
        enrichmentResult.topics,
        userTopics,
        aiConfig.confidenceThreshold
      );
      const normalizedKeywords = normalizeKeywords(enrichmentResult.keywords);

      // Register any newly introduced topics in store taxonomy
      for (const topicName of resolvedTopics) {
        const slug = slugifyTopic(topicName);
        const exists = store.getTopics().some(t => t.slug === slug || t.name.toLowerCase() === topicName.toLowerCase());
        if (!exists) {
          store.createTopic(topicName);
        }
      }

      // Persist enriched bookmark
      store.updateBookmark(savedItemId, {
        enrichment_status: 'completed',
        language: enrichmentResult.language || 'en',
        ai_summary: enrichmentResult.summary,
        keywords: normalizedKeywords,
        topics: resolvedTopics,
        why_saved_insight: enrichmentResult.whySavedInsight,
        enriched_at: new Date().toISOString(),
        enrichment_version: aiConfig.version,
      });

      // Update topic counts
      store.refreshTopicCounts();

      // Record processing job completion
      store.updateProcessingJob(job.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        errorMessage: undefined,
        errorCode: undefined,
      });

      // Record AI Usage
      if (enrichmentResult.tokenUsage) {
        const usage: AIUsageRecord = {
          id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: bookmark.user_id || 'user_default',
          savedItemId,
          operation: 'enrichment',
          provider: enrichmentResult.tokenUsage.provider,
          model: enrichmentResult.tokenUsage.model,
          inputTokens: enrichmentResult.tokenUsage.inputTokens,
          outputTokens: enrichmentResult.tokenUsage.outputTokens,
          estimatedCost: enrichmentResult.tokenUsage.estimatedCost,
          createdAt: new Date().toISOString(),
        };
        store.addAIUsage(usage);
      }

      // Authoritative Entitlement Usage Metering
      try {
        EntitlementService.recordUsage(userId, 'enrichment', 1, { savedItemId });
      } catch (usgErr) {
        console.warn(`[AI Enrichment] Failed to record usage event for ${savedItemId}:`, usgErr);
      }

      console.log(
        `[AI Enrichment] COMPLETED: Job ${job.id} | Item: ${savedItemId} | Provider: ${enrichmentResult.tokenUsage?.provider || provider.name} | Model: ${enrichmentResult.tokenUsage?.model || aiConfig.enrichmentModel} | Duration: ${durationMs}ms | Tokens: ${enrichmentResult.tokenUsage?.inputTokens || 0}+${enrichmentResult.tokenUsage?.outputTokens || 0}`
      );

      // Trigger asynchronous embedding generation (Import -> Enrich -> Embed) without blocking
      try {
        getEmbeddingPipeline().enqueue(savedItemId);
      } catch (embErr) {
        console.warn(`[AI Enrichment] Failed to trigger embedding for ${savedItemId}:`, embErr);
      }
    } else {
      // Mark as failed
      const errorCode = lastError instanceof EnrichmentError ? lastError.code : 'AI_PROVIDER_ERROR';
      const errorMessage = String(lastError?.message || 'Enrichment failed');

      store.updateBookmark(savedItemId, {
        enrichment_status: 'failed',
      });

      store.updateProcessingJob(job.id, {
        status: 'failed',
        errorCode,
        errorMessage,
        completedAt: new Date().toISOString(),
      });

      console.error(
        `[AI Enrichment] FAILED: Job ${job.id} | Item: ${savedItemId} | Code: ${errorCode} | Error: ${errorMessage} | Duration: ${durationMs}ms`
      );
    }
  }

  /**
   * Reprocesses a specific bookmark.
   */
  public async reprocessItem(savedItemId: string): Promise<boolean> {
    const b = store.getBookmarkById(savedItemId);
    if (!b) return false;
    this.enqueue(savedItemId, true);
    return true;
  }

  /**
   * Enriches a specific bookmark on demand or background backfill.
   */
  public async enrichBookmark(
    savedItemId: string,
    options?: { userId?: string; isDemo?: boolean; forceRefresh?: boolean }
  ): Promise<void> {
    this.enqueue(savedItemId, options?.forceRefresh ?? false);
  }

  /**
   * Reprocesses all un-enriched or failed bookmarks.
   */
  public reprocessAllPending(): number {
    const bookmarks = store.getBookmarks();
    const targets = bookmarks.filter(b => b.enrichment_status === 'pending' || b.enrichment_status === 'failed' || !b.ai_summary);
    for (const item of targets) {
      this.enqueue(item.id, true);
    }
    return targets.length;
  }

  /**
   * Returns current pipeline status and metrics.
   */
  public getStatus() {
    const jobs = store.getProcessingJobs();
    const pendingCount = this.queue.length;
    const activeCount = this.activeJobs.size;
    const completedCount = jobs.filter(j => j.status === 'completed').length;
    const failedCount = jobs.filter(j => j.status === 'failed').length;

    return {
      isProcessing: activeCount > 0 || pendingCount > 0,
      activeCount,
      pendingCount,
      completedCount,
      failedCount,
      provider: aiConfig.provider,
      model: aiConfig.enrichmentModel,
      version: aiConfig.version,
      recentJobs: jobs.slice(0, 20),
    };
  }
}

export const enrichmentPipeline = new EnrichmentPipeline();
