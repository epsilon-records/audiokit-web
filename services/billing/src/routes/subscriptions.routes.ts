// Subscription routes (JWT auth).
//
// Stripe is the approved payment vendor (decision 0014) but is intentionally
// not wired into this service yet. Upgrade/portal endpoints land in that task;
// until then this exposes the read-only view of the current subscription.
import type { FastifyPluginAsync } from 'fastify';
import db from '../db.js';

const subscriptionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/current', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const subscription = await db.findOne('subscriptions', {
      user_id: request.user.userId,
      status: 'active',
    });
    if (!subscription) {
      return reply.status(404).send({ error: 'not_found', message: 'No active subscription found' });
    }

    const plan = await db.findOne('subscription_plans', { tier: subscription.tier });
    return reply.send({ subscription, plan });
  });
};

export default subscriptionsRoutes;
