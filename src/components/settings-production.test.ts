import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

test('Settings contains only supported production surfaces and explicit async states', () => {
  const source = read('../views/SettingsView.tsx');
  for (const required of ['Loading connection state', 'Connection state could not be loaded', 'Managed by your sign-in provider', 'Manual', 'Download JSON export']) {
    assert.match(source, new RegExp(required));
  }
  for (const removed of ['Developer OAuth Setup', 'Sample verified test stream', 'Demo State Reset', 'Intelligence & Digests', 'Background & Reliability']) {
    assert.doesNotMatch(source, new RegExp(removed));
  }
});

test('customer-facing Settings billing has no obsolete prices, credits, quotas, or unsupported auto-sync claim', () => {
  const source = [read('./BillingSettingsSection.tsx'), read('./UpgradeModal.tsx'), read('./AppSidebar.tsx')].join('\n');
  for (const removed of ['\\$12', '14-day', '14 day', 'Import Credits', 'Buy credits', 'credit pack', 'Automatic X Bookmark Sync', 'automatic X sync', 'AI usage', 'bookmark quota']) {
    assert.doesNotMatch(source, new RegExp(removed, 'i'));
  }
  assert.match(source, /See Stripe Checkout/);
  assert.match(source, /Manual X bookmark sync remains available/);
});

test('Settings navigation uses semantic tabs and accessible destructive confirmation', () => {
  const source = read('../views/SettingsView.tsx');
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /role="alertdialog"/);
  assert.match(source, /Disconnect X account\?/);
});

test('Settings prevents stale cross-session X and billing details', () => {
  const settings = read('../views/SettingsView.tsx');
  const store = read('../lib/store/demo-store.tsx');
  const billing = read('./BillingSettingsSection.tsx');
  assert.match(settings, /sourceLoadState === 'ready'/);
  assert.match(store, /setXStatus\(disconnectedXStatus\(\)\)/);
  assert.match(store, /request !== xStatusRequest\.current/);
  assert.match(billing, /\[profile\?\.user_id\]/);
  assert.match(billing, /loadVersion\.current/);
});

test('billing lifecycle uses Stripe state and keeps portal access for prior customers', () => {
  const billing = read('./BillingSettingsSection.tsx');
  assert.match(billing, /\['active', 'trialing', 'past_due'\]\.includes/);
  assert.match(billing, /has_billing_account/);
  const stripe = read('../../server/economics/live-stripe.ts');
  assert.match(stripe, /trial_start:/);
  assert.match(stripe, /trial_end:/);
});
