// Stripe webhooks.
//
// Stripe is the approved vendor but its integration is a separate task; this
// route is deliberately not live. Returning 501 (rather than a fake 200) means
// Stripe retries are not silently swallowed once the endpoint is configured.
import type { FastifyPluginAsync } from 'fastify';

const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/stripe', async (_request, reply) => {
    return reply.status(501).send({
      error: 'not_implemented',
      message: 'Stripe webhooks are not wired up yet.',
    });
  });
};

export default webhooksRoutes;
