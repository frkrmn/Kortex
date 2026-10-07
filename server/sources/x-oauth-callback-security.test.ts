import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonForScript } from './x-live';

test('X OAuth callback JSON cannot terminate its inline script element', () => {
  for (const payload of [
    '</script><script>window.__grm127_test=1</script>',
    '</ScRiPt><script>window.__grm127_test=1</script>',
  ]) {
    const serialized = jsonForScript({ type: 'X_AUTH_ERROR', error: payload });
    assert.equal(serialized.includes('<'), false);
    assert.equal(serialized.includes('\\u003c/script>'), true);
    assert.doesNotMatch(serialized, /<\/script>/i);
  }

  assert.deepEqual(JSON.parse(jsonForScript({ type: 'X_AUTH_ERROR', error: 'access_denied' })), {
    type: 'X_AUTH_ERROR', error: 'access_denied',
  });
});
