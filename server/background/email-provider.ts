import { Digest } from '../../src/types';
import { EmailMessage, EmailResult, EmailDeliveryRecord } from './types';
import { store } from '../store';

export interface IEmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailResult>;
}

/**
 * Escapes untrusted text to prevent HTML injection in emails.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resend Email Provider implementation
 */
export class ResendEmailProvider implements IEmailProvider {
  public name = 'resend';
  private apiKey: string;
  private fromEmail: string;
  private appUrl: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'Recallly Digest <onboarding@resend.dev>';
    this.appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  public async send(message: EmailMessage): Promise<EmailResult> {
    const isDemo = process.env.VITE_DEMO_MODE === 'true';

    // If no API key or in Demo mode, simulate delivery safely
    if (!this.apiKey || isDemo) {
      const mockId = `resend_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      console.info(`[ResendEmailProvider] [SIMULATED] Email to ${message.to} | Subject: "${message.subject}" | MessageId: ${mockId}`);
      return {
        success: true,
        messageId: mockId,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: {
            'List-Unsubscribe': `<${this.appUrl}/settings?tab=digest&unsubscribe=1>`,
            ...(message.headers || {}),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const errorMessage = errorData.message || response.statusText;
        const isRetryable = status >= 500 || status === 429;

        console.error(`[ResendEmailProvider] Send failed [${status}]: ${errorMessage}`);
        return {
          success: false,
          error: `Resend API error (${status}): ${errorMessage}`,
          isRetryable,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id,
      };
    } catch (err: any) {
      console.error('[ResendEmailProvider] Network error:', err);
      return {
        success: false,
        error: err.message || 'Network error communicating with Resend',
        isRetryable: true,
      };
    }
  }
}

export class EmailService {
  private static instance: EmailService;
  private provider: IEmailProvider;

  private constructor() {
    this.provider = new ResendEmailProvider();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Generates the sanitized HTML email template for a weekly digest
   */
  public renderWeeklyDigestEmail(digest: Digest, recipientEmail: string, appUrl: string): { html: string; text: string; subject: string } {
    const periodLabel = escapeHtml(digest.period || digest.title || 'Weekly Digest');
    const subject = `Your week in Recallly: ${digest.bookmarks_count || digest.bookmarksCount || 0} ideas captured`;
    const cleanAppUrl = appUrl.replace(/\/$/, '');
    const digestUrl = `${cleanAppUrl}/digests/${digest.id}`;
    const unsubscribeUrl = `${cleanAppUrl}/settings?tab=digest&unsubscribe=1`;

    const topTopics = (digest.top_topics || []).slice(0, 5);
    const keyIdeas = (digest.key_ideas || digest.keyIdeas || []).slice(0, 4);
    const worthRevisiting = (digest.worth_revisiting || []).slice(0, 3);

    const topicsHtml = topTopics.length > 0
      ? `
        <div style="margin-bottom: 24px;">
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #70706B; margin: 0 0 10px 0;">Top Topics</p>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${topTopics.map(t => `
              <span style="display: inline-block; background-color: #F4F4F0; color: #171717; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; margin-right: 6px; margin-bottom: 6px;">
                ${escapeHtml(t.topic)} <span style="color: #8A8A85; font-size: 11px;">(${t.count})</span>
              </span>
            `).join('')}
          </div>
        </div>
      `
      : '';

    const ideasHtml = keyIdeas.length > 0
      ? `
        <div style="margin-bottom: 24px;">
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #70706B; margin: 0 0 10px 0;">Key Takeaways</p>
          <ul style="margin: 0; padding-left: 20px; color: #383836; font-size: 14px; line-height: 1.6;">
            ${keyIdeas.map(idea => `<li style="margin-bottom: 8px;">${escapeHtml(idea)}</li>`).join('')}
          </ul>
        </div>
      `
      : '';

    const revisitHtml = worthRevisiting.length > 0
      ? `
        <div style="margin-bottom: 28px; background-color: #FAFAF8; border: 1px solid #E8E8E5; border-radius: 12px; padding: 16px;">
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #2563EB; margin: 0 0 12px 0;">Worth Revisiting</p>
          ${worthRevisiting.map(item => `
            <div style="margin-bottom: 12px; border-bottom: 1px solid #F0F0EC; padding-bottom: 12px;">
              <p style="font-size: 13px; font-weight: 600; color: #171717; margin: 0 0 4px 0;">${escapeHtml(item.authorName)} (@${escapeHtml(item.authorUsername)})</p>
              <p style="font-size: 13px; color: #52524E; margin: 0 0 6px 0; line-height: 1.4;">${escapeHtml(item.summary || item.content.slice(0, 160))}</p>
              <p style="font-size: 11px; font-style: italic; color: #8A8A85; margin: 0;">Reason: ${escapeHtml(item.reason)}</p>
            </div>
          `).join('')}
        </div>
      `
      : '';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F7F5; margin: 0; padding: 32px 16px; color: #171717;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E8E8E5; overflow: hidden;">
    <tr>
      <td style="padding: 28px 32px; border-bottom: 1px solid #F0F0EC;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px; font-weight: 800; color: #171717; letter-spacing: -0.02em;">Recallly</span>
                <span style="background-color: #EEF2FF; color: #2563EB; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Weekly Digest</span>
              </div>
            </td>
            <td align="right">
              <span style="font-size: 12px; color: #8A8A85;">${periodLabel}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 32px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #171717; margin: 0 0 12px 0;">${escapeHtml(digest.title)}</h1>
        <p style="font-size: 14px; color: #52524E; line-height: 1.6; margin: 0 0 24px 0;">
          ${escapeHtml(digest.overview || digest.summary || 'Here is your weekly synthesis of saved insights, top ideas, and topics worth revisiting.')}
        </p>

        ${topicsHtml}
        ${ideasHtml}
        ${revisitHtml}

        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="${digestUrl}" style="display: inline-block; background-color: #171717; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px;">
            Open Full Digest in Recallly &rarr;
          </a>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding: 24px 32px; background-color: #FAFAF8; border-top: 1px solid #F0F0EC; text-align: center; font-size: 11px; color: #8A8A85; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">Sent to ${escapeHtml(recipientEmail)} by Recallly AI Knowledge Base.</p>
        <p style="margin: 0;">
          Want to change frequency or stop receiving digests? 
          <a href="${unsubscribeUrl}" style="color: #70706B; text-decoration: underline;">Manage Preferences or Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
Recallly Weekly Digest - ${digest.title}
${periodLabel}

${digest.overview || digest.summary || ''}

TOP TOPICS:
${topTopics.map(t => `- ${t.topic} (${t.count})`).join('\n')}

KEY TAKEAWAYS:
${keyIdeas.map(idea => `* ${idea}`).join('\n')}

WORTH REVISITING:
${worthRevisiting.map(item => `* ${item.authorName}: ${item.summary || item.content.slice(0, 100)}`).join('\n')}

View the complete interactive digest: ${digestUrl}

Manage digest preferences or unsubscribe: ${unsubscribeUrl}
    `.trim();

    return { html, text, subject };
  }

  /**
   * Delivers a weekly digest with strict idempotency
   */
  public async deliverDigestEmail(digest: Digest, recipientEmail: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const existingDelivery = store.getEmailDeliveries().find(
      d => d.digestId === digest.id && d.type === 'weekly_digest' && d.status === 'sent'
    );

    if (existingDelivery) {
      console.info(`[EmailService] Digest ${digest.id} already delivered to ${existingDelivery.recipientEmail} at ${existingDelivery.sentAt}. Skipping duplicate.`);
      return { success: true, messageId: existingDelivery.providerMessageId };
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const { html, text, subject } = this.renderWeeklyDigestEmail(digest, recipientEmail, appUrl);

    // Create queued record
    const deliveryRecord: EmailDeliveryRecord = {
      id: `em_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: digest.user_id,
      digestId: digest.id,
      type: 'weekly_digest',
      recipientEmail,
      subject,
      provider: this.provider.name,
      status: 'sending',
      attempts: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.addEmailDelivery(deliveryRecord);

    const result = await this.provider.send({
      to: recipientEmail,
      subject,
      html,
      text,
      digestId: digest.id,
      userId: digest.user_id,
    });

    if (result.success) {
      store.updateEmailDelivery(deliveryRecord.id, {
        status: 'sent',
        providerMessageId: result.messageId,
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return { success: true, messageId: result.messageId };
    } else {
      store.updateEmailDelivery(deliveryRecord.id, {
        status: 'failed',
        errorMessage: result.error,
        updatedAt: new Date().toISOString(),
      });
      return { success: false, error: result.error };
    }
  }
}

export const emailService = EmailService.getInstance();
