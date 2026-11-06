import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
  generateToken,
  generateHmacSignature,
  verifyHmacSignature,
} from '../src/utils/crypto.js';

test('generateApiKey returns prefixed, unique keys', () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.match(a, /^ak_[A-Za-z0-9_-]+$/);
  assert.match(b, /^ak_[A-Za-z0-9_-]+$/);
  assert.notEqual(a, b);
});

test('hashApiKey is deterministic SHA-256 and never the key itself', () => {
  const key = 'ak_example';
  assert.equal(hashApiKey(key), hashApiKey(key));
  assert.equal(hashApiKey(key).length, 64);
  assert.notEqual(hashApiKey(key), key);
});

test('getApiKeyPrefix returns the first ten characters', () => {
  assert.equal(getApiKeyPrefix('ak_abcdefghijklmno'), 'ak_abcdefg');
});

test('generateToken returns hex of the requested byte length', () => {
  assert.equal(generateToken(16).length, 32);
  assert.match(generateToken(), /^[0-9a-f]{64}$/);
  assert.notEqual(generateToken(), generateToken());
});

test('HMAC signatures verify, reject tampering, and reject wrong-length signatures', () => {
  const signature = generateHmacSignature('secret', { id: 1 });
  assert.equal(verifyHmacSignature('secret', { id: 1 }, signature), true);
  assert.equal(verifyHmacSignature('secret', { id: 2 }, signature), false);
  assert.equal(verifyHmacSignature('other-secret', { id: 1 }, signature), false);
  assert.equal(verifyHmacSignature('secret', { id: 1 }, 'not-a-real-signature'), false);
});
