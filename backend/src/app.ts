import fastifyJwt from '@fastify/jwt';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { authRoutes } from './features/auth/auth.routes.ts';
import { catalogRoutes } from './features/catalog/catalog.routes.ts';
import { healthRoutes } from './features/health/health.routes.ts';
import type { AppDependencies } from './shared/app-dependencies.ts';
import { errorHandler, notFoundHandler } from './shared/errors/error-handler.ts';

export interface BuildAppOptions {
  logger?: boolean;
}

export function buildApp(deps: AppDependencies, { logger = false }: BuildAppOptions = {}) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  void app.register(fastifyJwt, {
    secret: deps.env.JWT_SECRET,
    sign: { expiresIn: deps.env.JWT_EXPIRES_IN },
  });

  void app.register(healthRoutes, { prefix: '/api' });
  void app.register(authRoutes, { prefix: '/api', deps });
  void app.register(catalogRoutes, { prefix: '/api', deps });

  return app;
}

export type App = ReturnType<typeof buildApp>;
