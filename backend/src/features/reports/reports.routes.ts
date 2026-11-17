import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { requireRole } from '../../shared/auth/guards.ts';
import { reportParamsSchema, saveDraftBodySchema, staffReportSchema } from './reports.schemas.ts';
import { createReportsService } from './reports.service.ts';

/** Staff side of reports, nested under the appointment that owns them (one report each). */
export const reportsRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (
  app,
  { deps },
  done,
) => {
  const reportsService = createReportsService(deps);

  app.addHook('preHandler', requireRole('STAFF'));

  app.get(
    '/appointments/:id/report',
    { schema: { params: reportParamsSchema, response: { 200: staffReportSchema } } },
    (request) => reportsService.get(request.params.id),
  );

  app.put(
    '/appointments/:id/report',
    {
      schema: {
        params: reportParamsSchema,
        body: saveDraftBodySchema,
        response: { 200: staffReportSchema },
      },
    },
    (request) => reportsService.saveDraft(request.params.id, request.body, request.user),
  );

  app.post(
    '/appointments/:id/report/publish',
    { schema: { params: reportParamsSchema, response: { 200: staffReportSchema } } },
    (request) => reportsService.publish(request.params.id, request.user),
  );

  done();
};
