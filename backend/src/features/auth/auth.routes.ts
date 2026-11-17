import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { authenticate } from '../../shared/auth/guards.ts';
import { authUserSchema, loginBodySchema, loginResponseSchema } from './auth.schemas.ts';
import { createAuthService } from './auth.service.ts';

export const authRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (app, { deps }, done) => {
  const authService = createAuthService(deps.db);

  app.post(
    '/auth/login',
    { schema: { body: loginBodySchema, response: { 200: loginResponseSchema } } },
    async (request) => {
      const user = await authService.authenticate(request.body);
      return { token: app.jwt.sign(user), user };
    },
  );

  app.get(
    '/auth/me',
    { preHandler: authenticate, schema: { response: { 200: authUserSchema } } },
    (request) => request.user,
  );

  done();
};
