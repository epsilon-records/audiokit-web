// Configuration, read once at startup from the environment.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, '..', '.env') });

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  server: {
    port: intFromEnv('PORT', 3000),
    host: process.env.HOST ?? '0.0.0.0',
  },

  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/audiokit',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  urls: {
    api: process.env.API_BASE_URL ?? 'http://localhost:3000',
    web: process.env.WEB_BASE_URL ?? 'http://localhost:8000',
    console: process.env.CONSOLE_BASE_URL ?? 'http://localhost:3001',
  },

  security: {
    bcryptRounds: intFromEnv('BCRYPT_ROUNDS', 10),
    apiKeyLength: intFromEnv('API_KEY_LENGTH', 32),
  },

  rateLimit: {
    max: intFromEnv('RATE_LIMIT_MAX', 100),
    window: intFromEnv('RATE_LIMIT_WINDOW', 60_000),
  },

  audiokit: {
    workerUrl: process.env.AUDIOKIT_WORKER_URL ?? 'http://localhost:4000',
    internalSecret: process.env.AUDIOKIT_INTERNAL_SECRET,
  },
};

// Fail fast on missing production config. Stripe/Resend are deliberately not
// required: they are not wired into this service yet (decision 0014).
if (config.isProd) {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-me')) {
    missing.push('JWT_SECRET');
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export type Config = typeof config;
export default config;
