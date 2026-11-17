import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { healthRoutes } from './features/health/health.routes.ts';
import { errorHandler, type ErrorResponse } from './shared/errors/error-handler.ts';

export interface BuildAppOptions {
  logger?: boolean;
}

export function buildApp({ logger = false }: BuildAppOptions = {}) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
    } satisfies ErrorResponse),
  );

  void app.register(healthRoutes, { prefix: '/api' });

  return app;
}

export type App = ReturnType<typeof buildApp>;
