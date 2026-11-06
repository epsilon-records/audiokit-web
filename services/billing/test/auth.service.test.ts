import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, type UserRow } from '../src/services/auth.service.js';

const user: UserRow = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'ada@example.com',
  password_hash: '$2a$10$not-a-real-hash',
  name: 'Ada',
  company: null,
  status: 'active',
  email_verified_at: null,
  email_verification_token: 'verify-token',
  email_verification_expires_at: null,
  password_reset_token: 'reset-token',
  password_reset_expires_at: null,
  last_login_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test('sanitizeUser strips secrets and keeps the public fields', () => {
  const safe = AuthService.sanitizeUser(user);

  assert.equal(safe.id, user.id);
  assert.equal(safe.email, user.email);
  assert.equal(safe.name, 'Ada');
  assert.ok(!('password_hash' in safe));
  assert.ok(!('email_verification_token' in safe));
  assert.ok(!('password_reset_token' in safe));
});
