// Entry point: build the app, start the listener, shut down gracefully.
import config from './config.js';
import { buildApp } from './app.js';
import { pool } from './db.js';

const fastify = await buildApp();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully`);
    await fastify.close();
    await pool.end();
    process.exit(0);
  });
}

try {
  await fastify.listen({ port: config.server.port, host: config.server.host });
  fastify.log.info(`Environment: ${config.env}`);
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
