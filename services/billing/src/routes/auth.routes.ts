// Authentication routes.
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodError } from 'zod';
import { AuthService } from '../services/auth.service.js';
import db from '../db.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../schemas/auth.js';

function validationError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    error: 'invalid_request',
    message: 'Validation failed',
    details: error.issues,
  });
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    try {
      const result = await AuthService.register(parsed.data);
      // The verification email is not wired up yet; the token stays server-side.
      const token = fastify.jwt.sign({ userId: result.user.id, email: result.user.email });
      return reply.send({
        user: result.user,
        subscription: result.subscription,
        apiKey: result.apiKey,
        token,
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'registration_failed',
        message: (error as Error).message,
      });
    }
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    try {
      const user = await AuthService.login(parsed.data);
      const token = fastify.jwt.sign({ userId: user.id, email: user.email });
      return reply.send({ user, token });
    } catch (error) {
      return reply.status(401).send({
        error: 'authentication_failed',
        message: (error as Error).message,
      });
    }
  });

  fastify.post('/verify-email', async (request, reply) => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    try {
      const user = await AuthService.verifyEmail(parsed.data.token);
      return reply.send({ success: true, user });
    } catch (error) {
      return reply.status(400).send({
        error: 'verification_failed',
        message: (error as Error).message,
      });
    }
  });

  fastify.post('/request-password-reset', async (request, reply) => {
    const parsed = requestPasswordResetSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    try {
      // Always reports success so the endpoint does not reveal registered emails.
      await AuthService.requestPasswordReset(parsed.data.email);
      return reply.send({ success: true });
    } catch {
      return reply.send({ success: true });
    }
  });

  fastify.post('/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);

    try {
      const user = await AuthService.resetPassword(parsed.data.token, parsed.data.password);
      return reply.send({ success: true, user });
    } catch (error) {
      return reply.status(400).send({
        error: 'reset_failed',
        message: (error as Error).message,
      });
    }
  });

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const user = await db.findOne('users', { id: request.user.userId });
    if (!user) {
      return reply.status(404).send({ error: 'user_not_found', message: 'User not found' });
    }
    return reply.send({ user: AuthService.sanitizeUser(user) });
  });
};

export default authRoutes;
