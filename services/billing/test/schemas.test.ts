import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, loginSchema, resetPasswordSchema } from '../src/schemas/auth.js';
import { submitJobSchema, listJobsQuerySchema } from '../src/schemas/jobs.js';
import { createApiKeySchema } from '../src/schemas/api-keys.js';

test('registerSchema accepts a valid registration and rejects weak input', () => {
  const ok = registerSchema.safeParse({
    email: 'ada@example.com',
    password: 'password123',
    name: 'Ada',
  });
  assert.equal(ok.success, true);

  assert.equal(registerSchema.safeParse({ email: 'not-an-email', password: 'password123' }).success, false);
  assert.equal(registerSchema.safeParse({ email: 'ada@example.com', password: 'short' }).success, false);
});

test('loginSchema requires an email and any password', () => {
  assert.equal(loginSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'ada@example.com' }).success, false);
});

test('resetPasswordSchema enforces the same minimum length as registration', () => {
  assert.equal(resetPasswordSchema.safeParse({ token: 't', password: 'short' }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: 't', password: 'longenough' }).success, true);
});

test('submitJobSchema accepts a known operation and rejects unknown ones', () => {
  const base = {
    job_id: 'job-1',
    operation: 'analyze',
    input: { url: 'https://example.com/audio.wav' },
  };
  assert.equal(submitJobSchema.safeParse(base).success, true);
  assert.equal(submitJobSchema.safeParse({ ...base, operation: 'launch-missiles' }).success, false);
  assert.equal(
    submitJobSchema.safeParse({ ...base, input: { url: 'not-a-url' } }).success,
    false,
  );
});

test('listJobsQuerySchema defaults paging and coerces string query values', () => {
  const parsed = listJobsQuerySchema.parse({});
  assert.deepEqual(parsed, { limit: 50, offset: 0 });

  const coerced = listJobsQuerySchema.parse({ limit: '10', offset: '5', status: 'queued' });
  assert.equal(coerced.limit, 10);
  assert.equal(coerced.offset, 5);
  assert.equal(coerced.status, 'queued');

  assert.equal(listJobsQuerySchema.safeParse({ limit: '5000' }).success, false);
  assert.equal(listJobsQuerySchema.safeParse({ status: 'nope' }).success, false);
});

test('createApiKeySchema requires a non-empty name', () => {
  assert.equal(createApiKeySchema.safeParse({ name: 'Production' }).success, true);
  assert.equal(createApiKeySchema.safeParse({ name: '' }).success, false);
});
