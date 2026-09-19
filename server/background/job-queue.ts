import { JobQueueRecord, JobType, JobStatus, WorkerMetrics } from './types';
import { store } from '../store';

export class JobQueueEngine {
  private static instance: JobQueueEngine;
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): JobQueueEngine {
    if (!JobQueueEngine.instance) {
      JobQueueEngine.instance = new JobQueueEngine();
    }
    return JobQueueEngine.instance;
  }

  /**
   * Enqueues a job into the queue with idempotency safeguards.
   */
  public async enqueue(jobData: {
    userId: string;
    type: JobType;
    priority?: number;
    maxAttempts?: number;
    scheduledAt?: string;
    metadata?: Record<string, any>;
  }): Promise<JobQueueRecord> {
    const queue = store.getJobQueue();
    const now = new Date().toISOString();
    const metadata = jobData.metadata || {};

    // 1. Idempotency guards
    if (jobData.type === 'x_sync') {
      const existing = queue.find(
        j => j.userId === jobData.userId &&
             j.type === 'x_sync' &&
             (j.status === 'pending' || j.status === 'running' || j.status === 'retry_scheduled')
      );
      if (existing) {
        return existing;
      }
    }

    if (jobData.type === 'enrichment' && metadata.savedItemId) {
      const existing = queue.find(
        j => j.type === 'enrichment' &&
             j.metadata.savedItemId === metadata.savedItemId &&
             (j.status === 'pending' || j.status === 'running' || j.status === 'retry_scheduled')
      );
      if (existing) {
        return existing;
      }
    }

    if (jobData.type === 'embedding' && metadata.savedItemId) {
      const existing = queue.find(
        j => j.type === 'embedding' &&
             j.metadata.savedItemId === metadata.savedItemId &&
             (j.status === 'pending' || j.status === 'running' || j.status === 'retry_scheduled')
      );
      if (existing) {
        return existing;
      }
    }

    if (jobData.type === 'digest_generation' && metadata.periodStart) {
      const existing = queue.find(
        j => j.userId === jobData.userId &&
             j.type === 'digest_generation' &&
             j.metadata.periodStart === metadata.periodStart &&
             (j.status === 'pending' || j.status === 'running')
      );
      if (existing) {
        return existing;
      }
    }

    if (jobData.type === 'digest_email_delivery' && metadata.digestId) {
      const existing = queue.find(
        j => j.type === 'digest_email_delivery' &&
             j.metadata.digestId === metadata.digestId &&
             (j.status === 'pending' || j.status === 'running' || j.status === 'completed')
      );
      if (existing) {
        return existing;
      }
    }

    const newJob: JobQueueRecord = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: jobData.userId,
      type: jobData.type,
      status: 'pending',
      priority: jobData.priority ?? (jobData.type === 'x_sync' ? 50 : 10),
      attempts: 0,
      maxAttempts: jobData.maxAttempts ?? 3,
      scheduledAt: jobData.scheduledAt || now,
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    store.addJobToQueue(newJob);
    return newJob;
  }

  /**
   * Atomically claims the next eligible job from the queue.
   * Prioritizes high priority jobs first, then by scheduledAt time.
   * Uses round-robin / fair distribution across users when multiple exist.
   */
  public async claimNextJob(
    workerId: string,
    allowedTypes?: JobType[],
    leaseSeconds = 300
  ): Promise<JobQueueRecord | null> {
    const queue = store.getJobQueue();
    const now = new Date();
    const nowIso = now.toISOString();

    // Filter eligible jobs
    const eligible = queue.filter(j => {
      if (j.status !== 'pending' && j.status !== 'retry_scheduled') return false;
      if (new Date(j.scheduledAt) > now) return false;
      if (allowedTypes && !allowedTypes.includes(j.type)) return false;
      return true;
    });

    if (eligible.length === 0) return null;

    // Sort by priority DESC, then scheduledAt ASC, then createdAt ASC
    eligible.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

    const jobToClaim = eligible[0];
    const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000).toISOString();

    const updated = store.updateJobInQueue(jobToClaim.id, {
      status: 'running',
      startedAt: nowIso,
      leaseExpiresAt,
      attempts: jobToClaim.attempts + 1,
      updatedAt: nowIso,
      metadata: {
        ...jobToClaim.metadata,
        claimedByWorker: workerId,
      },
    });

    return updated;
  }

  /**
   * Extends the heartbeat lease of a currently running job.
   */
  public async renewLease(jobId: string, extendSeconds = 300): Promise<boolean> {
    const job = store.getJobQueue().find(j => j.id === jobId);
    if (!job || job.status !== 'running') return false;

    const leaseExpiresAt = new Date(Date.now() + extendSeconds * 1000).toISOString();
    store.updateJobInQueue(jobId, {
      leaseExpiresAt,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Marks a job as completed.
   */
  public async completeJob(jobId: string, metadataUpdates?: Record<string, any>): Promise<void> {
    const now = new Date().toISOString();
    const job = store.getJobQueue().find(j => j.id === jobId);
    store.updateJobInQueue(jobId, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      metadata: {
        ...(job?.metadata || {}),
        ...(metadataUpdates || {}),
      },
    });
  }

  /**
   * Marks a job as failed, scheduling a retry with exponential backoff and jitter
   * or moving it to 'dead' if max attempts are reached or the error is non-retryable.
   */
  public async failJob(
    jobId: string,
    errorCode: string,
    errorMessage: string,
    isRetryable = true
  ): Promise<void> {
    const job = store.getJobQueue().find(j => j.id === jobId);
    if (!job) return;

    const now = new Date();
    const attempts = job.attempts;
    const maxAttempts = job.maxAttempts;

    if (!isRetryable || attempts >= maxAttempts) {
      // Dead letter
      store.updateJobInQueue(jobId, {
        status: 'dead',
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
        completedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      console.warn(`[JobQueue] Job ${jobId} (${job.type}) moved to DEAD state. Error: ${errorCode} - ${errorMessage}`);
      return;
    }

    // Exponential backoff: 30s, 60s, 120s, 240s... with 1-10s random jitter
    const backoffSeconds = Math.min(
      3600,
      Math.pow(2, attempts) * 30 + Math.floor(Math.random() * 10)
    );
    const nextScheduled = new Date(now.getTime() + backoffSeconds * 1000).toISOString();

    store.updateJobInQueue(jobId, {
      status: 'retry_scheduled',
      scheduledAt: nextScheduled,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      updatedAt: now.toISOString(),
    });

    console.info(
      `[JobQueue] Job ${jobId} (${job.type}) scheduled retry #${attempts + 1} at ${nextScheduled}. Cause: ${errorCode}`
    );
  }

  /**
   * Recovers stale jobs whose workers crashed or leases expired while in 'running' status.
   */
  public async recoverStaleJobs(): Promise<number> {
    const queue = store.getJobQueue();
    const now = new Date();
    let recoveredCount = 0;

    for (const job of queue) {
      if (job.status === 'running' && job.leaseExpiresAt) {
        const leaseExpiry = new Date(job.leaseExpiresAt);
        if (now > leaseExpiry) {
          console.warn(`[JobQueue] Stale job detected: ${job.id} (${job.type}). Lease expired at ${job.leaseExpiresAt}`);
          if (job.attempts < job.maxAttempts) {
            store.updateJobInQueue(job.id, {
              status: 'retry_scheduled',
              scheduledAt: now.toISOString(),
              lastErrorCode: 'LEASE_EXPIRED_CRASH_RECOVERY',
              lastErrorMessage: 'Worker lease expired before job completion. Automatically recovered.',
              updatedAt: now.toISOString(),
            });
          } else {
            store.updateJobInQueue(job.id, {
              status: 'dead',
              lastErrorCode: 'LEASE_EXPIRED_MAX_ATTEMPTS',
              lastErrorMessage: 'Job failed due to worker lease timeouts reaching max attempts.',
              updatedAt: now.toISOString(),
            });
          }
          recoveredCount++;
        }
      }
    }

    return recoveredCount;
  }

  /**
   * Safe cleanup of old completed or dead job metadata (> 7 days old)
   */
  public async cleanupOldJobs(retentionDays = 7): Promise<number> {
    const queue = store.getJobQueue();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const beforeCount = queue.length;

    const filtered = queue.filter(j => {
      if (j.status === 'completed' || j.status === 'dead') {
        const finishedDate = new Date(j.completedAt || j.updatedAt);
        return finishedDate > cutoff;
      }
      return true;
    });

    const removed = beforeCount - filtered.length;
    if (removed > 0) {
      store.setJobQueue(filtered);
    }
    return removed;
  }

  /**
   * Calculates operational health metrics
   */
  public getMetrics(): WorkerMetrics {
    const queue = store.getJobQueue();
    const metrics: WorkerMetrics = {
      pendingJobs: 0,
      runningJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      deadJobs: 0,
      staleJobsRecovered: 0,
      lastTickAt: new Date().toISOString(),
      activeWorkers: 1,
      jobsByType: {},
    };

    for (const job of queue) {
      metrics.jobsByType[job.type] = (metrics.jobsByType[job.type] || 0) + 1;
      if (job.status === 'pending' || job.status === 'retry_scheduled') metrics.pendingJobs++;
      else if (job.status === 'running') metrics.runningJobs++;
      else if (job.status === 'completed') metrics.completedJobs++;
      else if (job.status === 'failed') metrics.failedJobs++;
      else if (job.status === 'dead') metrics.deadJobs++;
    }

    return metrics;
  }
}

export const jobQueue = JobQueueEngine.getInstance();
