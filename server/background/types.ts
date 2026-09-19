/**
 * Recallly Phase 12 Background Queue, Scheduler & Email Types
 */

export type JobType =
  | 'x_sync'
  | 'enrichment'
  | 'embedding'
  | 'digest_generation'
  | 'digest_email_delivery'
  | 'cleanup';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'retry_scheduled'
  | 'failed'
  | 'dead';

export interface JobQueueRecord {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  priority: number; // 100=manual trigger, 10=scheduled, 1=bulk backfill
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  leaseExpiresAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  digestId?: string;
  userId: string;
  headers?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isRetryable?: boolean;
}

export interface EmailDeliveryRecord {
  id: string;
  userId: string;
  digestId: string;
  type: 'weekly_digest' | 'system_alert';
  recipientEmail: string;
  subject: string;
  provider: string;
  providerMessageId?: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'bounced';
  attempts: number;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerMetrics {
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  deadJobs: number;
  staleJobsRecovered: number;
  lastTickAt: string;
  activeWorkers: number;
  jobsByType: Record<string, number>;
}
