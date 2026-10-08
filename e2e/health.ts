import { expect, type Page, type TestInfo } from '@playwright/test';

const PROVIDER_HOSTS = [
  /(^|\.)api\.x\.com$/i,
  /(^|\.)generativelanguage\.googleapis\.com$/i,
  /(^|\.)api\.stripe\.com$/i,
  /(^|\.)api\.resend\.com$/i,
];

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function safeLocation(raw: string) {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[invalid-url]';
  }
}

function sanitizeMessage(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .slice(0, 500);
}

export class BrowserHealth {
  private readonly baseOrigin: string;
  private readonly pageErrors: string[] = [];
  private readonly consoleErrors: string[] = [];
  private readonly failedCoreRequests: string[] = [];
  private readonly unexpectedApiResponses: string[] = [];
  private readonly providerActivity: string[] = [];

  constructor(page: Page, baseURL: string) {
    this.baseOrigin = new URL(baseURL).origin;

    page.on('pageerror', error => this.pageErrors.push(sanitizeMessage(error.message)));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const location = message.location().url;
      if (message.text().includes('Failed to load resource') && location && !location.startsWith(this.baseOrigin)) return;
      this.consoleErrors.push(sanitizeMessage(message.text()));
    });
    page.on('requestfailed', request => {
      const location = safeLocation(request.url());
      if (location.startsWith(this.baseOrigin) && !location.endsWith('/favicon.ico')) {
        this.failedCoreRequests.push(`${request.method()} ${location}`);
      }
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === this.baseOrigin && url.pathname.startsWith('/api/') && response.status() >= 400) {
        this.unexpectedApiResponses.push(`${response.status()} ${response.request().method()} ${url.origin}${url.pathname}`);
      }
    });
    page.on('request', request => {
      const url = new URL(request.url());
      if (PROVIDER_HOSTS.some(pattern => pattern.test(url.hostname))) {
        this.providerActivity.push(`${request.method()} ${url.origin}${url.pathname}`);
      }
      if (url.origin === this.baseOrigin && url.pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method())) {
        this.providerActivity.push(`${request.method()} ${url.origin}${url.pathname}`);
      }
    });
  }

  async assertClean(testInfo: TestInfo) {
    const result = {
      pageErrors: this.pageErrors,
      consoleErrors: this.consoleErrors,
      failedCoreRequests: this.failedCoreRequests,
      unexpectedApiResponses: this.unexpectedApiResponses,
      providerActivity: this.providerActivity,
    };
    if (Object.values(result).some(entries => entries.length > 0)) {
      await testInfo.attach('sanitized-browser-health.json', {
        body: Buffer.from(JSON.stringify(result, null, 2)),
        contentType: 'application/json',
      });
    }
    expect(result.pageErrors, 'uncaught browser page errors').toEqual([]);
    expect(result.consoleErrors, 'relevant browser console errors').toEqual([]);
    expect(result.failedCoreRequests, 'failed same-origin application requests').toEqual([]);
    expect(result.unexpectedApiResponses, 'unexpected application API errors').toEqual([]);
    expect(result.providerActivity, 'production smoke must not call X, Gemini, Stripe, Resend, or mutation endpoints').toEqual([]);
  }
}
