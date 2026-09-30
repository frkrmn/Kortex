import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const legal = fs.readFileSync(new URL('./views/LegalViews.tsx', import.meta.url), 'utf8');
const privacy = legal.split('export const PrivacyView')[1];

test('Privacy Policy reflects implemented Recallly data flows', () => {
  for (const heading of [
    'Account and authentication information',
    'X-connected information',
    'Imported bookmarks and content',
    'AI processing',
    'Billing and payment information',
    'Technical data, cookies, and browser storage',
    'Service providers and sharing',
    'Retention',
    'Export, deletion, and controls',
    'Privacy choices and rights',
  ]) assert.match(privacy, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(privacy, /Privacy Policy \| Recallly/);
  assert.match(privacy, /meta\[name="description"\]/);
  assert.match(privacy, /href="\/terms"/);
  assert.doesNotMatch(privacy, /PostHog|Google Analytics|Sentry/);
  assert.match(privacy, /does not publish a fixed retention period/);
  assert.match(privacy, /does not promise a deletion timeline/);
  assert.doesNotMatch(privacy, /GDPR representative|DPO|CCPA|PCI-DSS/);
});

test('Terms and Privacy remain linked from the public legal surfaces', () => {
  const terms = legal.split('export const TermsView')[1].split('export const PrivacyView')[0];
  assert.match(terms, /href="\/privacy"/);
  assert.match(privacy, /href="\/terms"/);
});
