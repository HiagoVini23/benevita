import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { requireRole } from '../../shared/auth/guards.ts';
import {
  createExamTypeBodySchema,
  createPatientBodySchema,
  createProfessionalBodySchema,
  examTypeSchema,
  patientOptionSchema,
  professionalSchema,
} from './catalog.schemas.ts';
import { createCatalogService } from './catalog.service.ts';

export const catalogRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (
  app,
  { deps },
  done,
) => {
  const catalogService = createCatalogService(deps);

  app.addHook('preHandler', requireRole('STAFF'));

  app.get('/patients', { schema: { response: { 200: z.array(patientOptionSchema) } } }, () =>
    catalogService.listPatients(),
  );

  app.post(
    '/patients',
    { schema: { body: createPatientBodySchema, response: { 201: patientOptionSchema } } },
    async (request, reply) =>
      reply.status(201).send(await catalogService.createPatient(request.body)),
  );

  app.get('/exam-types', { schema: { response: { 200: z.array(examTypeSchema) } } }, () =>
    catalogService.listExamTypes(),
  );

  app.post(
    '/exam-types',
    { schema: { body: createExamTypeBodySchema, response: { 201: examTypeSchema } } },
    async (request, reply) =>
      reply.status(201).send(await catalogService.createExamType(request.body)),
  );

  app.get('/professionals', { schema: { response: { 200: z.array(professionalSchema) } } }, () =>
    catalogService.listProfessionals(),
  );

  app.post(
    '/professionals',
    { schema: { body: createProfessionalBodySchema, response: { 201: professionalSchema } } },
    async (request, reply) =>
      reply.status(201).send(await catalogService.createProfessional(request.body)),
  );

  done();
};
