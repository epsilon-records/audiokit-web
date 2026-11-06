// Type augmentation for the Fastify instance/request decorations this service adds.
import '@fastify/jwt';
import type { AuthContext } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest) => Promise<void>;
  }

  interface FastifyRequest {
    auth?: AuthContext;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}
