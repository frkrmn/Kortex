import { jobQueue } from './job-queue';
import { syncScheduler } from './sync-scheduler';
import { digestScheduler } from './digest-scheduler';
import { emailService } from './email-provider';
import { enrichmentPipeline } from '../ai/enrichment-pipeline';
import { getEmbeddingPipeline } from '../ai/embedding-pipeline';
import { store } from '../store';
import { JobQueueRecord, WorkerMetrics } from './types';

export class BackgroundWorkerRunner {
  private static instance: BackgroundWorkerRunner;
  private isRunning = false;
  private isTickInProgress = false;
  private intervalTimer: NodeJS.Timeout | null = null;
  private workerId: string;
  private activeJobsCount = 0;
  private maxConcurrency = 3;

  private constructor() {
    this.workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 6)}`;
  }

  public static getInstance(): BackgroundWorkerRunner {
    if (!BackgroundWorkerRunner.instance) {
      BackgroundWorkerRunner.instance = new BackgroundWorkerRunner();
    }
    return BackgroundWorkerRunner.instance;
  }

  /**
   * Starts the continuous in-process worker loop.
   */
  public start(pollIntervalMs = 15000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.info(`[BackgroundWorker] Started worker instance ${this.workerId} (interval: ${pollIntervalMs}ms)`);

    // Initial tick immediately
    this.tick().catch(err => console.error('[BackgroundWorker] Initial tick error:', err));

    this.intervalTimer = setInterval(() => {
      this.tick().catch(err => console.error('[BackgroundWorker] Tick error:', err));
    }, pollIntervalMs);
  }

  /**
   * Stops the worker loop gracefully
   */
  public stop(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    console.info(`[BackgroundWorker] Stopped worker ${this.workerId}`);
  }

  /**
   * Main worker tick:
   * 1. Recovers stale crashed jobs
   * 2. Evaluates scheduled sync accounts
   * 3. Evaluates scheduled digests
   * 4. Claims and drains pending jobs with controlled concurrency
   */
  public async tick(): Promise<{
    recoveredStale: number;
    dueSyncsEnqueued: number;
    dueDigestsEnqueued: number;
    jobsProcessed: number;
  }> {
    if (this.isTickInProgress) {
      return { recoveredStale: 0, dueSyncsEnqueued: 0, dueDigestsEnqueued: 0, jobsProcessed: 0 };
    }

    this.isTickInProgress = true;
    let recoveredStale = 0;
    let dueSyncsEnqueued = 0;
    let dueDigestsEnqueued = 0;
    let jobsProcessed = 0;

    try {
      // 1. Recover stale running jobs
      recoveredStale = await jobQueue.recoverStaleJobs();

      // 2. Evaluate scheduled syncs if enabled
      const syncEnabled = process.env.X_SYNC_ENABLED !== 'false';
      if (syncEnabled) {
        dueSyncsEnqueued = await syncScheduler.evaluateDueAccounts();
      }

      // 3. Evaluate scheduled digests if enabled
      const digestEnabled = process.env.DIGEST_GENERATION_ENABLED !== 'false';
      if (digestEnabled) {
        dueDigestsEnqueued = await digestScheduler.evaluateScheduledDigests();
      }

      // 4. Drain pending jobs
      while (this.activeJobsCount < this.maxConcurrency) {
        const job = await jobQueue.claimNextJob(this.workerId);
        if (!job) break; // No more eligible jobs

        this.activeJobsCount++;
        jobsProcessed++;

        // Process job asynchronously with lease maintenance
        this.processJobWithLease(job).finally(() => {
          this.activeJobsCount--;
        });
      }
    } catch (err) {
      console.error('[BackgroundWorker] Error during tick:', err);
    } finally {
      this.isTickInProgress = false;
    }

    return {
      recoveredStale,
      dueSyncsEnqueued,
      dueDigestsEnqueued,
      jobsProcessed,
    };
  }

  /**
   * Processes a single claimed job with lease heartbeat renewal and error isolation
   */
  private async processJobWithLease(job: JobQueueRecord): Promise<void> {
    const correlationId = `[Job:${job.id}][${job.type}]`;
    console.info(`${correlationId} Starting processing (attempt ${job.attempts}/${job.maxAttempts})`);

    // Setup heartbeat interval (renew lease every 60s)
    const heartbeat = setInterval(() => {
      jobQueue.renewLease(job.id, 300).catch(err => {
        console.warn(`${correlationId} Failed to renew lease:`, err);
      });
    }, 60000);

    try {
      const resultMetadata: Record<string, any> = {};

      switch (job.type) {
        case 'x_sync': {
          const syncRes = await syncScheduler.executeSyncJob(job.userId, job.metadata);
          if (!syncRes.success) {
            throw new Error(syncRes.error || 'X sync failed');
          }
          resultMetadata.addedCount = syncRes.addedCount;
          break;
        }

        case 'enrichment': {
          const aiEnabled = process.env.AI_PROCESSING_ENABLED !== 'false';
          if (!aiEnabled) {
            throw new Error('AI processing is currently disabled by system flag');
          }
          const savedItemId = job.metadata.savedItemId;
          if (!savedItemId) throw new Error('Missing savedItemId in enrichment job metadata');
          
          await enrichmentPipeline.processItem(savedItemId);
          resultMetadata.savedItemId = savedItemId;
          break;
        }

        case 'embedding': {
          const aiEnabled = process.env.AI_PROCESSING_ENABLED !== 'false';
          if (!aiEnabled) {
            throw new Error('AI processing is currently disabled by system flag');
          }
          const savedItemId = job.metadata.savedItemId;
          if (!savedItemId) throw new Error('Missing savedItemId in embedding job metadata');

          await getEmbeddingPipeline().processItem(savedItemId);
          resultMetadata.savedItemId = savedItemId;
          break;
        }

        case 'digest_generation': {
          const digest = await digestScheduler.executeDigestGeneration(job.userId, job.metadata);
          resultMetadata.digestId = digest.id;
          resultMetadata.bookmarksCount = digest.bookmarks_count;
          break;
        }

        case 'digest_email_delivery': {
          const emailEnabled = process.env.EMAIL_DELIVERY_ENABLED !== 'false';
          if (!emailEnabled) {
            throw new Error('Email delivery is currently disabled by system flag');
          }
          const digestId = job.metadata.digestId;
          const recipientEmail = job.metadata.recipientEmail;
          if (!digestId || !recipientEmail) {
            throw new Error('Missing digestId or recipientEmail in email delivery metadata');
          }

          const digest = store.getDigests().find(d => d.id === digestId);
          if (!digest) {
            throw new Error(`Digest not found: ${digestId}`);
          }

          const sendResult = await emailService.deliverDigestEmail(digest, recipientEmail);
          if (!sendResult.success) {
            throw new Error(sendResult.error || 'Failed to deliver digest email');
          }
          resultMetadata.providerMessageId = sendResult.messageId;
          break;
        }

        case 'cleanup': {
          const cleaned = await jobQueue.cleanupOldJobs(7);
          resultMetadata.cleanedJobs = cleaned;
          break;
        }

        default:
          throw new Error(`Unknown job type: ${(job as any).type}`);
      }

      // Mark success
      clearInterval(heartbeat);
      await jobQueue.completeJob(job.id, resultMetadata);
      console.info(`${correlationId} Successfully completed`);
    } catch (err: any) {
      clearInterval(heartbeat);
      const isRetryable = !err.message?.includes('Reauthorization required') &&
                          !err.message?.includes('not found') &&
                          !err.message?.includes('Unknown job type');

      const errorCode = err.code || 'JOB_EXECUTION_ERROR';
      const errorMessage = err.message || 'Unknown background execution error';

      console.error(`${correlationId} Failed: ${errorMessage}`);
      await jobQueue.failJob(job.id, errorCode, errorMessage, isRetryable);
    }
  }

  /**
   * Retrieves operational health metrics
   */
  public getMetrics(): WorkerMetrics {
    const metrics = jobQueue.getMetrics();
    metrics.activeWorkers = this.isRunning ? 1 : 0;
    return metrics;
  }
}

export const workerRunner = BackgroundWorkerRunner.getInstance();
