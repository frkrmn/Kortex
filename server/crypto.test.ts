import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const fakeKey = 'fake-encryption-key-for-grm-128-testing-only';
const fakeSalt = 'fake-stable-salt-for-grm-128';
const fakeToken = 'fake-x-oauth-token';

function runtime(script: string, env: Record<string, string>) {
  return spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });
}

const encryptScript = `
  const { encryptToken } = await import('./server/crypto.ts');
  process.stdout.write(encryptToken(${JSON.stringify(fakeToken)}));
`;

test('stable encryption configuration survives independent runtime instances', () => {
  const first = runtime(encryptScript, { ENCRYPTION_KEY: fakeKey, ENCRYPTION_SALT: fakeSalt });
  assert.equal(first.status, 0);
  assert.match(first.stdout, /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);

  const second = runtime(`
    const { decryptToken } = await import('./server/crypto.ts');
    const result = decryptToken(process.env.FAKE_ENCRYPTED_PAYLOAD);
    process.stdout.write(result === ${JSON.stringify(fakeToken)} ? 'DECRYPTABLE' : 'INVALID');
  `, {
    ENCRYPTION_KEY: fakeKey,
    ENCRYPTION_SALT: fakeSalt,
    FAKE_ENCRYPTED_PAYLOAD: first.stdout,
  });

  assert.equal(second.status, 0);
  assert.equal(second.stdout, 'DECRYPTABLE');
});

test('different salt fails authenticated decryption without leaking test secrets', () => {
  const encrypted = runtime(encryptScript, { ENCRYPTION_KEY: fakeKey, ENCRYPTION_SALT: fakeSalt });
  assert.equal(encrypted.status, 0);

  const changed = runtime(`
    const { decryptToken } = await import('./server/crypto.ts');
    decryptToken(process.env.FAKE_ENCRYPTED_PAYLOAD);
  `, {
    ENCRYPTION_KEY: fakeKey,
    ENCRYPTION_SALT: 'different-fake-stable-salt',
    FAKE_ENCRYPTED_PAYLOAD: encrypted.stdout,
  });

  assert.notEqual(changed.status, 0);
  const diagnostics = `${changed.stdout}${changed.stderr}`;
  assert.equal(diagnostics.includes(fakeKey), false);
  assert.equal(diagnostics.includes(fakeSalt), false);
  assert.equal(diagnostics.includes(fakeToken), false);
});

test('missing stable salt fails closed for encryption and decryption', () => {
  const encrypted = runtime(encryptScript, { ENCRYPTION_KEY: fakeKey, ENCRYPTION_SALT: fakeSalt });
  assert.equal(encrypted.status, 0);

  for (const script of [
    encryptScript,
    `const { decryptToken } = await import('./server/crypto.ts'); decryptToken(process.env.FAKE_ENCRYPTED_PAYLOAD);`,
  ]) {
    const missing = runtime(script, {
      ENCRYPTION_KEY: fakeKey,
      FAKE_ENCRYPTED_PAYLOAD: encrypted.stdout,
    });
    assert.notEqual(missing.status, 0);
    const diagnostics = `${missing.stdout}${missing.stderr}`;
    assert.match(diagnostics, /ENCRYPTION_SALT must be a stable random value/);
    assert.equal(diagnostics.includes(fakeKey), false);
    assert.equal(diagnostics.includes(fakeToken), false);
  }
});

test('AES-GCM uses a fresh IV for each encryption', () => {
  const first = runtime(encryptScript, { ENCRYPTION_KEY: fakeKey, ENCRYPTION_SALT: fakeSalt });
  const second = runtime(encryptScript, { ENCRYPTION_KEY: fakeKey, ENCRYPTION_SALT: fakeSalt });
  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.notEqual(first.stdout, second.stdout);
  assert.notEqual(first.stdout.split(':')[0], second.stdout.split(':')[0]);
});
