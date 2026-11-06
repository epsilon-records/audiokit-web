// Job submission, status and listing, behind API-key auth and quota checks.
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { ZodError } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { UsageService } from '../services/usage.service.js';
import { submitJobSchema, listJobsQuerySchema } from '../schemas/jobs.js';
import db, { query } from '../db.js';

function validationError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    error: 'invalid_request',
    message: 'Validation failed',
    details: error.issues,
  });
}

async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  const auth = await AuthService.authenticateApiKey(authHeader.slice('Bearer '.length));
  if (!auth) {
    return reply.status(401).send({ error: 'unauthorized', message: 'Invalid API key' });
  }

  request.auth = auth;
}

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  // Submit a job. Idempotent per user via `job_id`.
  fastify.post('/', { onRequest: authenticateApiKey }, async (request, reply) => {
    const parsed = submitJobSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const data = parsed.data;

    const { user, subscription, apiKey } = request.auth!;

    try {
      const existingJob = await db.findOne('jobs', {
        user_id: user.id,
        client_job_id: data.job_id,
      });
      if (existingJob) {
        return reply.status(200).send({
          provider_job_id: existingJob.provider_job_id,
          job_id: existingJob.client_job_id,
          status: existingJob.status,
          operation: existingJob.operation,
        });
      }

      const quotaCheck = await UsageService.checkQuota(user.id);

      if (!quotaCheck.allowed) {
        return reply.status(429).send({
          error: 'quota_exceeded',
          message: quotaCheck.message,
          usage: quotaCheck.usage,
          limit: quotaCheck.limit,
          tier: quotaCheck.tier,
        });
      }

      const providerJobId = randomUUID();
      await db.insertOne('jobs', {
        user_id: user.id,
        api_key_id: apiKey.id,
        provider_job_id: providerJobId,
        client_job_id: data.job_id,
        operation: data.operation,
        status: 'queued',
        input_url: data.input.url,
        input_sha256: data.input.sha256 ?? null,
        webhook_url: data.webhook?.url ?? null,
        tier: subscription.tier,
        counted_in_quota: true,
      });

      await UsageService.recordJob(user.id, data.operation);

      // Job forwarding to the AudioKit worker is not wired up yet (separate task).

      return reply.status(202).send({
        provider_job_id: providerJobId,
        job_id: data.job_id,
        status: 'queued',
        operation: data.operation,
        usage: {
          current: quotaCheck.usage + 1,
          limit: quotaCheck.limit,
          remaining: quotaCheck.remaining === null ? null : quotaCheck.remaining - 1,
          isOverage: quotaCheck.isOverage,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'internal_error', message: 'Failed to submit job' });
    }
  });

  // List this user's jobs, newest first.
  fastify.get('/', { onRequest: authenticateApiKey }, async (request, reply) => {
    const parsed = listJobsQuerySchema.safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error);
    const { limit, offset, status, operation } = parsed.data;
    const { user } = request.auth!;

    const params: unknown[] = [user.id];
    let sql = `SELECT provider_job_id, client_job_id, operation, status,
                      queued_at, started_at, completed_at, error_code
               FROM jobs
               WHERE user_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (operation) {
      params.push(operation);
      sql += ` AND operation = $${params.length}`;
    }
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;
    sql += ` ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const jobs = await query(sql, params);
    return reply.send({ jobs: jobs.rows });
  });

  // Get one job by provider id.
  fastify.get('/:provider_job_id', { onRequest: authenticateApiKey }, async (request, reply) => {
    const { provider_job_id } = request.params as { provider_job_id: string };
    const { user } = request.auth!;

    const job = await db.findOne('jobs', { provider_job_id, user_id: user.id });
    if (!job) {
      return reply.status(404).send({ error: 'not_found', message: 'Job not found' });
    }

    return reply.send({
      provider_job_id: job.provider_job_id,
      job_id: job.client_job_id,
      operation: job.operation,
      status: job.status,
      queued_at: job.queued_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      output_data: job.output_data,
      error_code: job.error_code,
      error_message: job.error_message,
    });
  });

  // Cancel a queued or running job.
  fastify.post(
    '/:provider_job_id/cancel',
    { onRequest: authenticateApiKey },
    async (request, reply) => {
      const { provider_job_id } = request.params as { provider_job_id: string };
      const { user } = request.auth!;

      const job = await db.findOne('jobs', { provider_job_id, user_id: user.id });
      if (!job) {
        return reply.status(404).send({ error: 'not_found', message: 'Job not found' });
      }
      if (!['queued', 'running'].includes(job.status)) {
        return reply.status(400).send({
          error: 'invalid_request',
          message: `Cannot cancel job with status: ${job.status}`,
        });
      }

      await db.updateOne('jobs', { id: job.id }, { status: 'canceled', completed_at: new Date() });

      return reply.send({
        provider_job_id: job.provider_job_id,
        job_id: job.client_job_id,
        status: 'canceled',
      });
    },
  );
};

export default jobsRoutes;
