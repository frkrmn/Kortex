import { EventEmitter } from 'node:events';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Page, TestInfo } from '@playwright/test';
import { BrowserHealth } from './health';

const origin = 'https://kortexmarks.vercel.app';

function monitor() {
  const events = new EventEmitter();
  const page = Object.assign(events, { url: () => `${origin}/dashboard` }) as unknown as Page;
  const health = new BrowserHealth(page, origin);
  const attachments: string[] = [];
  const info = {
    title: 'health regression',
    status: 'passed',
    expectedStatus: 'passed',
    attach: async (_name: string, attachment: { body: Buffer }) => { attachments.push(attachment.body.toString()); },
  } as unknown as TestInfo;
  return { events, health, info, attachments };
}

test('navigation-aborted X status read is ignored, but other network failures remain fatal', async () => {
  const { events, health, info } = monitor();
  events.emit('requestfailed', {
    url: () => `${origin}/api/integrations/x/status`,
    method: () => 'GET',
    failure: () => ({ errorText: 'net::ERR_ABORTED' }),
  });
  await health.assertClean(info);

  events.emit('requestfailed', {
    url: () => `${origin}/api/integrations/x/status`,
    method: () => 'GET',
    failure: () => ({ errorText: 'net::ERR_CONNECTION_RESET' }),
  });
  await assert.rejects(health.assertClean(info), /net::ERR_CONNECTION_RESET/);
});

test('HTTP errors retain status, route, and test name without response content', async () => {
  const { events, health, info, attachments } = monitor();
  events.emit('response', {
    url: () => `${origin}/api/integrations/x/status?private=value`,
    status: () => 500,
    request: () => ({ method: () => 'GET' }),
  });
  await assert.rejects(health.assertClean(info), /500 GET/);
  const report = JSON.parse(attachments[0]);
  assert.equal(report.test, 'health regression');
  assert.equal(report.route, `${origin}/dashboard`);
  assert.deepEqual(report.unexpectedApiResponses, [`500 GET ${origin}/api/integrations/x/status`]);
  assert.doesNotMatch(attachments[0], /private=value/);
});

test('authentication errors and aborted bookmark requests remain fatal', async () => {
  const { events, health, info } = monitor();
  events.emit('response', {
    url: () => `${origin}/api/integrations/x/status`,
    status: () => 401,
    request: () => ({ method: () => 'GET' }),
  });
  events.emit('requestfailed', {
    url: () => `${origin}/api/bookmarks`,
    method: () => 'GET',
    failure: () => ({ errorText: 'net::ERR_ABORTED' }),
  });
  await assert.rejects(health.assertClean(info), error =>
    error instanceof Error && error.message.includes('401 GET') && error.message.includes('net::ERR_ABORTED'));
});
