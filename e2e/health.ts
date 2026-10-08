import type { Page, TestInfo } from '@playwright/test';

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

export class BrowserHealth {
  private readonly page: Page;
  private readonly baseOrigin: string;
  private readonly pageErrors: string[] = [];
  private readonly consoleErrors: string[] = [];
  private readonly failedCoreRequests: string[] = [];
  private readonly unexpectedApiResponses: string[] = [];
  private readonly providerActivity: string[] = [];

  constructor(page: Page, baseURL: string) {
    this.page = page;
    this.baseOrigin = new URL(baseURL).origin;

    page.on('pageerror', error => this.pageErrors.push(`${error.name || 'Error'} at ${safeLocation(page.url())}`));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const location = message.location().url;
      if (message.text().includes('Failed to load resource') && location && !location.startsWith(this.baseOrigin)) return;
      this.consoleErrors.push(`console error at ${safeLocation(location || page.url())}`);
    });
    page.on('requestfailed', request => {
      const url = new URL(request.url());
      if (url.origin === this.baseOrigin && url.pathname !== '/favicon.ico') {
        const rawError = request.failure()?.errorText || '';
        const category = /^net::ERR_[A-Z_]+$/.test(rawError) ? rawError : 'network_error';
        // A page transition can cancel this background read. The source screen
        // still has to render its successful status, and HTTP errors remain fatal.
        if (request.method() === 'GET' && url.pathname === '/api/integrations/x/status' && category === 'net::ERR_ABORTED') return;
        this.failedCoreRequests.push(`${request.method()} ${url.origin}${url.pathname} ${category}`);
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
      test: testInfo.title,
      route: safeLocation(this.page.url()),
      pageErrors: this.pageErrors,
      consoleErrors: this.consoleErrors,
      failedCoreRequests: this.failedCoreRequests,
      unexpectedApiResponses: this.unexpectedApiResponses,
      providerActivity: this.providerActivity,
    };
    const failures = Object.entries(result).filter(([, entries]) => Array.isArray(entries) && entries.length > 0);
    if (testInfo.status !== testInfo.expectedStatus || failures.length) {
      await testInfo.attach('sanitized-browser-health.json', {
        body: Buffer.from(JSON.stringify(result, null, 2)),
        contentType: 'application/json',
      });
    }
    if (failures.length) {
      throw new Error(`Browser health failed in ${result.test} at ${result.route}: ${failures.map(([kind, entries]) => `${kind}=${(entries as string[]).join(', ')}`).join('; ')}`);
    }
  }
}
