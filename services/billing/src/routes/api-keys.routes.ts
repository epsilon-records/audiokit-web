// API key management (JWT auth). Full keys are shown only at creation.
import type { FastifyPluginAsync } from 'fastify';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '../utils/crypto.js';
import { createApiKeySchema } from '../schemas/api-keys.js';
import db from '../db.js';

const apiKeysRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const keys = await db.findMany('api_keys', { user_id: request.user.userId });

    const sanitized = keys.map((key) => ({
      id: key.id,
      name: key.name,
      key_prefix: key.key_prefix,
      tier: key.tier,
      is_active: key.is_active,
      last_used_at: key.last_used_at,
      created_at: key.created_at,
      expires_at: key.expires_at,
    }));

    return reply.send({ api_keys: sanitized });
  });

  fastify.post('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const parsed = createApiKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_request',
        message: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const userId = request.user.userId;
    const subscription = await db.findOne('subscriptions', { user_id: userId, status: 'active' });
    if (!subscription) {
      return reply.status(400).send({ error: 'no_subscription', message: 'No active subscription found' });
    }

    const apiKey = generateApiKey();
    const newKey = await db.insertOne('api_keys', {
      user_id: userId,
      name: parsed.data.name,
      key_prefix: getApiKeyPrefix(apiKey),
      key_hash: hashApiKey(apiKey),
      tier: subscription.tier,
      is_active: true,
    });

    return reply.send({
      id: newKey.id,
      name: newKey.name,
      api_key: apiKey,
      key_prefix: getApiKeyPrefix(apiKey),
      tier: newKey.tier,
      created_at: newKey.created_at,
      warning: 'Save this key now. You will not be able to see it again.',
    });
  });

  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const key = await db.findOne('api_keys', { id, user_id: request.user.userId });
    if (!key) {
      return reply.status(404).send({ error: 'not_found', message: 'API key not found' });
    }

    await db.updateOne(
      'api_keys',
      { id },
      { is_active: false, revoked_at: new Date(), revoked_reason: 'Revoked by user' },
    );

    return reply.send({ success: true });
  });
};

export default apiKeysRoutes;
