import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { requireRole } from '../../shared/auth/guards.ts';
import { examTypeSchema, patientOptionSchema, professionalSchema } from './catalog.schemas.ts';
import { createCatalogService } from './catalog.service.ts';

export const catalogRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (
  app,
  { deps },
  done,
) => {
  const catalogService = createCatalogService(deps.db);

  app.addHook('preHandler', requireRole('STAFF'));

  app.get('/patients', { schema: { response: { 200: z.array(patientOptionSchema) } } }, () =>
    catalogService.listPatients(),
  );

  app.get('/exam-types', { schema: { response: { 200: z.array(examTypeSchema) } } }, () =>
    catalogService.listExamTypes(),
  );

  app.get('/professionals', { schema: { response: { 200: z.array(professionalSchema) } } }, () =>
    catalogService.listProfessionals(),
  );

  done();
};
