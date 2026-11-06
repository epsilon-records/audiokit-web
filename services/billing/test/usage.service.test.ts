import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateQuota } from '../src/services/usage.service.js';

test('free tier under quota is allowed with the remainder', () => {
  const result = evaluateQuota('free', 100, 40);
  assert.deepEqual(result, {
    allowed: true,
    tier: 'free',
    usage: 40,
    limit: 100,
    remaining: 60,
    isOverage: false,
    overageCount: 0,
  });
});

test('free tier at the quota is rejected with an upgrade message', () => {
  const result = evaluateQuota('free', 100, 100);
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.equal(result.isOverage, true);
  assert.match(result.message ?? '', /upgrade/i);
});

test('free tier over quota stays rejected', () => {
  assert.equal(evaluateQuota('free', 100, 150).allowed, false);
});

test('pro tier allows overages and counts them', () => {
  const under = evaluateQuota('pro', 10_000, 9_999);
  assert.equal(under.allowed, true);
  assert.equal(under.isOverage, false);
  assert.equal(under.overageCount, 0);

  const over = evaluateQuota('pro', 10_000, 10_050);
  assert.equal(over.allowed, true);
  assert.equal(over.isOverage, true);
  assert.equal(over.overageCount, 50);
  assert.equal(over.remaining, 0);
});

test('unlimited quota (enterprise) has no limit and never overages', () => {
  const result = evaluateQuota('enterprise', -1, 1_000_000);
  assert.deepEqual(result, {
    allowed: true,
    tier: 'enterprise',
    usage: 1_000_000,
    limit: null,
    remaining: null,
    isOverage: false,
  });
});
