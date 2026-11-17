import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { requireRole } from '../../shared/auth/guards.ts';
import { idParamsSchema } from '../../shared/http/schemas.ts';
import { saveDraftBodySchema, staffReportSchema } from './reports.schemas.ts';
import { createReportsService } from './reports.service.ts';

export const reportsRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (
  app,
  { deps },
  done,
) => {
  const reportsService = createReportsService(deps);

  app.addHook('preHandler', requireRole('STAFF'));

  app.get(
    '/appointments/:id/report',
    { schema: { params: idParamsSchema, response: { 200: staffReportSchema } } },
    (request) => reportsService.get(request.params.id),
  );

  app.put(
    '/appointments/:id/report',
    {
      schema: {
        params: idParamsSchema,
        body: saveDraftBodySchema,
        response: { 200: staffReportSchema },
      },
    },
    (request) => reportsService.saveDraft(request.params.id, request.body, request.user),
  );

  app.post(
    '/appointments/:id/report/publish',
    { schema: { params: idParamsSchema, response: { 200: staffReportSchema } } },
    (request) => reportsService.publish(request.params.id, request.user),
  );

  done();
};
