// Usage and quota routes (JWT auth).
import type { FastifyPluginAsync } from 'fastify';
import { UsageService } from '../services/usage.service.js';

const usageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/current', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const usage = await UsageService.getCurrentUsage(request.user.userId);
    if (!usage) {
      return reply.status(404).send({ error: 'not_found', message: 'No active subscription found' });
    }
    return reply.send(usage);
  });

  fastify.get('/history', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    const parsedLimit = Number.parseInt(limit ?? '12', 10);
    const history = await UsageService.getUsageHistory(
      request.user.userId,
      Number.isNaN(parsedLimit) ? 12 : Math.min(Math.max(parsedLimit, 1), 100),
    );
    return reply.send({ history });
  });

  fastify.get('/quota', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const quota = await UsageService.checkQuota(request.user.userId);
    return reply.send(quota);
  });
};

export default usageRoutes;
