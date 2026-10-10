import assert from 'node:assert/strict';
import test from 'node:test';
import { isThemePreference, readThemePreference, resolveTheme, THEME_STORAGE_KEY } from './theme';

test('defaults to Light and accepts only supported persisted preferences', () => {
  assert.equal(readThemePreference({ getItem: () => null }), 'light');
  assert.equal(readThemePreference({ getItem: key => key === THEME_STORAGE_KEY ? 'dark' : null }), 'dark');
  assert.equal(readThemePreference({ getItem: () => 'unsupported' }), 'light');
  assert.equal(isThemePreference('system'), true);
  assert.equal(isThemePreference('auto'), false);
});

test('Light and Dark remain explicit while System follows the OS', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('system', true), 'dark');
});
