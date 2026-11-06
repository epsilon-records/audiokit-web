// Smoke tests for the HTTP surface that do not need a database.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db.js';

after(async () => {
  await pool.end();
});

test('serves service info at the root', async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({ method: 'GET', url: '/' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.name, 'AudioKit billing service');
    assert.equal(typeof body.version, 'string');
  } finally {
    await app.close();
  }
});

test('protected routes reject unauthenticated requests', async () => {
  const app = await buildApp();
  try {
    for (const url of ['/v1/usage/current', '/v1/api-keys', '/v1/subscriptions/current', '/v1/auth/me']) {
      const response = await app.inject({ method: 'GET', url });
      assert.equal(response.statusCode, 401, `${url} should require auth`);
    }
  } finally {
    await app.close();
  }
});

test('job submission requires an API key', async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/jobs',
      payload: { job_id: 'x', operation: 'analyze', input: { url: 'https://example.com/a.wav' } },
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('the Stripe webhook route is explicitly not implemented yet', async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({ method: 'POST', url: '/webhooks/stripe', payload: {} });
    assert.equal(response.statusCode, 501);
  } finally {
    await app.close();
  }
});
