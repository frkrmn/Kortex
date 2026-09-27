import assert from 'node:assert/strict';
import test from 'node:test';
import { SETTINGS_TABS, isCanonicalSettingsTab, resolveSettingsTab, settingsTabUrl } from './settings';

test('Settings exposes only production-backed tabs', () => {
  assert.deepEqual(SETTINGS_TABS.map(tab => tab.id), ['account', 'billing', 'sources', 'appearance', 'data']);
  assert.equal(SETTINGS_TABS.some(tab => ['automation', 'intelligence'].includes(tab.id)), false);
});

test('Settings deep links resolve aliases and fail closed to Account', () => {
  assert.equal(resolveSettingsTab('billing'), 'billing');
  assert.equal(resolveSettingsTab('subscription'), 'billing');
  assert.equal(resolveSettingsTab('sources'), 'sources');
  assert.equal(resolveSettingsTab('automation'), 'account');
  assert.equal(resolveSettingsTab('unknown'), 'account');
  assert.equal(resolveSettingsTab(null), 'account');
  assert.equal(isCanonicalSettingsTab('data'), true);
  assert.equal(isCanonicalSettingsTab('subscription'), false);
  assert.equal(settingsTabUrl('appearance'), '/settings?tab=appearance');
});
