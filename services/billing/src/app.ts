// Fastify application wiring. Kept separate from the listener so tests can
// build the app and use `app.inject()` without opening a port.
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import config from './config.js';
import { pool } from './db.js';
import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import usageRoutes from './routes/usage.routes.js';
import apiKeysRoutes from './routes/api-keys.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const logger: FastifyServerOptions['logger'] = config.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
        },
      }
    : true;

  const fastify = Fastify({ logger });

  await fastify.register(cors, {
    origin: [config.urls.web, config.urls.console],
    credentials: true,
  });

  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
  });

  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
  });

  // JWT auth hook, shared by the user-facing routes. Requests without a valid
  // token throw a 401 that the error handler below renders.
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify();
  });

  fastify.get('/health', async (_request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(503).send({ status: 'error', message: 'database unavailable' });
    }
  });

  fastify.get('/', async () => ({
    name: 'AudioKit billing service',
    version: '0.1.0',
    docs: `${config.urls.web}/docs/`,
  }));

  await fastify.register(authRoutes, { prefix: '/v1/auth' });
  await fastify.register(jobsRoutes, { prefix: '/v1/jobs' });
  await fastify.register(usageRoutes, { prefix: '/v1/usage' });
  await fastify.register(apiKeysRoutes, { prefix: '/v1/api-keys' });
  await fastify.register(subscriptionsRoutes, { prefix: '/v1/subscriptions' });
  await fastify.register(webhooksRoutes, { prefix: '/webhooks' });

  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    fastify.log.error(error);

    if (error.statusCode === 401) {
      return reply.status(401).send({
        error: 'unauthorized',
        message: 'Invalid or missing authentication token',
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: 'invalid_request',
        message: 'Validation failed',
        details: error.validation,
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'rate_limit_exceeded',
        message: 'Too many requests, please try again later',
      });
    }

    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: error.code ?? 'internal_error',
      message: config.isProd ? 'An error occurred' : error.message,
    });
  });

  return fastify;
}

export default buildApp;
