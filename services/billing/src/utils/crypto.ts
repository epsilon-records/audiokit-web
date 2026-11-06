// Cryptographic helpers for passwords, API keys and signatures.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import config from '../config.js';

/** Generate a secure random API key: `ak_<base64url>`. */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(config.security.apiKeyLength);
  return `ak_${randomBytes.toString('base64url')}`;
}

/** Hash an API key for storage (SHA-256, hex). */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** First characters of a key, safe to show in listings. */
export function getApiKeyPrefix(key: string): string {
  return key.substring(0, 10);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.security.bcryptRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Random hex token for email verification / password reset. */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateHmacSignature(secret: string, payload: unknown): string {
  return crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');
}

/** Constant-time HMAC verification; returns false on any mismatch. */
export function verifyHmacSignature(secret: string, payload: unknown, signature: string): boolean {
  const expected = generateHmacSignature(secret, payload);
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length) return false;
  return crypto.timingSafeEqual(provided, wanted);
}

export default {
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
  hashPassword,
  comparePassword,
  generateToken,
  generateHmacSignature,
  verifyHmacSignature,
};
