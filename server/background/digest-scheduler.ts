import { DigestSettings, Digest } from '../../src/types';
import { store } from '../store';
import { DigestService } from '../intelligence/digest-service';
import { GeminiAIProvider } from '../ai/gemini-provider';
import { EntitlementService } from '../billing/entitlement-service';
import { jobQueue } from './job-queue';

export class DigestScheduler {
  private static instance: DigestScheduler;
  private digestService: DigestService;

  private constructor() {
    this.digestService = new DigestService(new GeminiAIProvider());
  }

  public static getInstance(): DigestScheduler {
    if (!DigestScheduler.instance) {
      DigestScheduler.instance = new DigestScheduler();
    }
    return DigestScheduler.instance;
  }

  /**
   * Translates current UTC time to user's local day-of-week and hour using IANA timezone
   */
  public getUserLocalTime(timezone: string, now = new Date()): { dayOfWeek: string; hour: number; minute: number } {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      let dayOfWeek = 'Monday';
      let hour = 9;
      let minute = 0;

      for (const p of parts) {
        if (p.type === 'weekday') dayOfWeek = p.value;
        if (p.type === 'hour') {
          // Handle '24' if returned by some runtimes
          const parsed = parseInt(p.value, 10);
          hour = parsed === 24 ? 0 : parsed;
        }
        if (p.type === 'minute') minute = parseInt(p.value, 10);
      }
      return { dayOfWeek, hour, minute };
    } catch {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        dayOfWeek: days[now.getUTCDay()],
        hour: now.getUTCHours(),
        minute: now.getUTCMinutes(),
      };
    }
  }

  /**
   * Checks if a user's digest is due for generation and delivery right now
   */
  public isDigestDue(settings: DigestSettings, now = new Date()): boolean {
    if (!settings.enabled || settings.frequency === 'off') {
      return false;
    }

    const local = this.getUserLocalTime(settings.timezone, now);
    const targetDay = settings.delivery_day || 'Monday';

    // Parse target delivery hour (e.g., "09:00" -> 9)
    let targetHour = 9;
    if (settings.delivery_time) {
      const parts = settings.delivery_time.split(':');
      targetHour = parseInt(parts[0], 10);
    }

    // Must match day of week (case-insensitive)
    if (local.dayOfWeek.toLowerCase() !== targetDay.toLowerCase()) {
      return false;
    }

    // Must match the scheduled delivery hour
    if (local.hour !== targetHour) {
      return false;
    }

    // Idempotency: Check if already delivered within the last 20 hours
    if (settings.last_delivered_at) {
      const lastDelivery = new Date(settings.last_delivered_at).getTime();
      const hoursSinceLast = (now.getTime() - lastDelivery) / (1000 * 60 * 60);
      if (hoursSinceLast < 20) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates all users with digest settings and triggers scheduled digest generation
   */
  public async evaluateScheduledDigests(now = new Date()): Promise<number> {
    const settings = store.getDigestSettings();
    if (!settings) return 0;

    let enqueuedCount = 0;
    const isDue = this.isDigestDue(settings, now);

    if (isDue) {
      // Check entitlements
      const entitlements = await EntitlementService.getUserEntitlements(settings.user_id);
      if (!entitlements.features.digests) {
        console.info(`[DigestScheduler] User ${settings.user_id} has digest due, but plan "${entitlements.plan}" does not include digests. Skipping.`);
        return 0;
      }

      const { periodStart, periodEnd } = this.digestService.calculatePeriodWindow(now, {
        timezone: settings.timezone,
      });

      // Check if digest already exists for this period
      const existing = store.getDigests().find(
        d => d.user_id === settings.user_id && d.period_start === periodStart && d.period_end === periodEnd
      );

      if (existing) {
        // If digest exists and hasn't been emailed yet, enqueue email delivery
        await jobQueue.enqueue({
          userId: settings.user_id,
          type: 'digest_email_delivery',
          priority: 20,
          metadata: {
            digestId: existing.id,
            recipientEmail: settings.email,
          },
        });
        return 1;
      }

      // Enqueue digest generation job
      await jobQueue.enqueue({
        userId: settings.user_id,
        type: 'digest_generation',
        priority: 20,
        metadata: {
          periodStart,
          periodEnd,
          targetDate: now.toISOString(),
          recipientEmail: settings.email,
        },
      });

      enqueuedCount++;
    }

    return enqueuedCount;
  }

  /**
   * Executes digest generation when claimed by worker
   */
  public async executeDigestGeneration(
    userId: string,
    metadata: Record<string, any>
  ): Promise<Digest> {
    const bookmarks = store.getBookmarks(userId);
    const rediscovery = store.getRediscoveryEvents();
    const settings = store.getDigestSettings();

    const targetDate = metadata.targetDate ? new Date(metadata.targetDate) : new Date();
    const digest = await this.digestService.generateDigest(
      userId,
      bookmarks,
      rediscovery,
      settings,
      { targetDate }
    );

    // Persist digest
    store.addDigest(digest);

    // Update digest settings timestamp
    store.updateDigestSettings({
      last_delivered_at: new Date().toISOString(),
    });

    // Enqueue email delivery job
    if (settings?.email) {
      await jobQueue.enqueue({
        userId,
        type: 'digest_email_delivery',
        priority: 25,
        metadata: {
          digestId: digest.id,
          recipientEmail: settings.email,
        },
      });
    }

    return digest;
  }
}

export const digestScheduler = DigestScheduler.getInstance();
