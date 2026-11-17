import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { getPatientId, requireRole } from '../../shared/auth/guards.ts';
import {
  patientAppointmentParamsSchema,
  patientAppointmentSchema,
  publishedReportSchema,
} from './patient-portal.schemas.ts';
import { createPatientPortalService } from './patient-portal.service.ts';

/** Patient-only routes under `/me`: the patient is always the one in the token. */
export const patientPortalRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (
  app,
  { deps },
  done,
) => {
  const patientPortalService = createPatientPortalService(deps);

  app.addHook('preHandler', requireRole('PATIENT'));

  app.get(
    '/me/appointments',
    { schema: { response: { 200: z.array(patientAppointmentSchema) } } },
    (request) => patientPortalService.listAppointments(getPatientId(request.user)),
  );

  app.get(
    '/me/appointments/:id/report',
    {
      schema: {
        params: patientAppointmentParamsSchema,
        response: { 200: publishedReportSchema },
      },
    },
    (request) =>
      patientPortalService.getPublishedReport(getPatientId(request.user), request.params.id),
  );

  done();
};
