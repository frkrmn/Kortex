import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { configureDeploymentTrustProxy } from './trust-proxy';

test('trusts only the immediate Vercel proxy hop', () => {
  const app = express();
  configureDeploymentTrustProxy(app, '1');
  assert.equal(app.get('trust proxy'), 1);
  assert.notEqual(app.get('trust proxy'), true);
});

test('does not trust proxy headers in local or unknown deployments', () => {
  const app = express();
  configureDeploymentTrustProxy(app, undefined);
  assert.equal(app.get('trust proxy'), false);
});
