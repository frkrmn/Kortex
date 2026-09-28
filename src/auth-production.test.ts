import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const auth = readFileSync(new URL('./lib/auth/auth-context.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('./lib/store/demo-store.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('./lib/api.ts', import.meta.url), 'utf8');
const callback = readFileSync(new URL('./views/AuthCallbackView.tsx', import.meta.url), 'utf8');

test('private application waits for verified auth and remounts state per identity', () => {
  assert.match(app, /authState === 'initializing'/);
  assert.match(app, /Checking your session/);
  assert.match(app, /DemoStoreProvider key=\{user\?\.id \|\| 'demo'\}/);
  assert.match(auth, /resolveVerifiedSession/);
  assert.match(auth, /event === 'INITIAL_SESSION'/);
});

test('logout, auth events, and verified 401 handling clear local private state', () => {
  assert.match(auth, /scope: 'global'/);
  assert.match(auth, /scope: 'local'/);
  assert.match(auth, /event === 'SIGNED_OUT'/);
  assert.match(auth, /authGeneration\.current \+= 1/);
  assert.match(auth, /isCurrentAuthWork/);
  assert.match(api, /response\.status === 401/);
  assert.match(api, /getUser\(session\.access_token\)/);
  assert.match(store, /clearLegacyPrivateCache\(\)/);
  assert.match(store, /if \(!demoMode\) return;/);
});

test('callback errors are sanitized and no provider internals are rendered', () => {
  assert.match(callback, /sign-in link is invalid or expired/);
  assert.doesNotMatch(callback, /setErrorMsg\(error\.message\)/);
  assert.doesNotMatch(callback, /err\?\.message/);
});
