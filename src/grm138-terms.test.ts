import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const terms = fs.readFileSync(new URL('./views/LegalViews.tsx', import.meta.url), 'utf8');
const termsView = terms.split('export const PrivacyView')[0];
const landing = fs.readFileSync(new URL('./views/LandingPage.tsx', import.meta.url), 'utf8');

test('Terms are a public, substantive, Recallly-specific legal page', () => {
  for (const heading of [
    'Acceptance of these Terms',
    'X connection and OAuth',
    'Bookmark import and synchronization',
    'AI-generated enrichment',
    'Third-party services',
    'Plans, trials, subscriptions, and billing',
    'Exports and account data',
    'Acceptable use',
    'Disclaimers',
    'Limitation of liability',
  ]) assert.match(termsView, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(termsView, /Terms of Service \| Recallly/);
  assert.match(termsView, /meta\[name="description"\]/);
  assert.doesNotMatch(termsView, /100% ownership|Row Level Security \(RLS\)/);
  assert.doesNotMatch(termsView, /14-day|14 day|\$12|Import Credits|credit pack/);
});

test('Landing footer exposes public legal routes', () => {
  assert.match(landing, /href="\/terms"/);
  assert.match(landing, /href="\/privacy"/);
});
