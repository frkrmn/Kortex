import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRedirectPath } from './redirect';

test('allows only known internal Recallly destinations', () => {
  assert.equal(sanitizeRedirectPath('/bookmarks/owned-id?view=reader'), '/bookmarks/owned-id?view=reader');
  assert.equal(sanitizeRedirectPath('%2Fsettings%3Ftab%3Dsources'), '/settings?tab=sources');
  assert.equal(sanitizeRedirectPath('/demo/bookmarks/demo-1'), '/demo/bookmarks/demo-1');
});

test('blocks external, protocol-relative, executable, API, malformed, and auth-loop destinations', () => {
  const blocked = [
    'https://attacker.example', '//attacker.example', '\\\\attacker.example',
    'javascript:alert(1)', 'data:text/html,hello', '/api/bookmarks',
    '/login', '/auth/callback', '/%2F%2Fattacker.example', '%252Fsettings',
    '/settings\\@attacker.example', '/settings%00', 'not-a-route',
  ];
  for (const destination of blocked) {
    assert.equal(sanitizeRedirectPath(destination, '/dashboard'), '/dashboard', destination);
  }
});
