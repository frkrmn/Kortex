import assert from 'node:assert/strict';
import test from 'node:test';
import { isXSyncE2ETestUser } from './x-e2e-allowlist';

test('X E2E allowlist fails closed and accepts only explicit authenticated email matches', () => {
  const previous = process.env.X_E2E_TEST_USER_EMAILS;
  try {
    delete process.env.X_E2E_TEST_USER_EMAILS;
    assert.equal(isXSyncE2ETestUser({ email: 'allowed@example.test' }), false);

    process.env.X_E2E_TEST_USER_EMAILS = '*, all, true, development';
    assert.equal(isXSyncE2ETestUser({ email: 'allowed@example.test' }), false);

    process.env.X_E2E_TEST_USER_EMAILS = ' Allowed@Example.Test , second@example.test ';
    assert.equal(isXSyncE2ETestUser({ email: 'allowed@example.test' }), true);
    assert.equal(isXSyncE2ETestUser({ email: 'normal@example.test' }), false);
    assert.equal(isXSyncE2ETestUser({ email: null }), false);

    const spoofedClientInput = {
      body: { email: 'allowed@example.test', userId: 'allowed-user' },
      query: { email: 'allowed@example.test' },
      headers: { 'x-user-email': 'allowed@example.test' },
    };
    assert.ok(spoofedClientInput.body.email);
    assert.equal(isXSyncE2ETestUser({ email: 'normal@example.test' }), false);
  } finally {
    if (previous === undefined) delete process.env.X_E2E_TEST_USER_EMAILS;
    else process.env.X_E2E_TEST_USER_EMAILS = previous;
  }
});
