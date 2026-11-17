import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { FeaturePluginOptions } from '../../shared/app-dependencies.ts';
import { requireRole } from '../../shared/auth/guards.ts';
import { idParamsSchema } from '../../shared/http/schemas.ts';
import {
  availableSlotsQuerySchema,
  availableSlotsResponseSchema,
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  staffAppointmentSchema,
} from './appointments.schemas.ts';
import { createAppointmentsService } from './appointments.service.ts';

export const appointmentsRoutes: FastifyPluginCallbackZod<FeaturePluginOptions> = (
  app,
  { deps },
  done,
) => {
  const appointmentsService = createAppointmentsService(deps);

  app.addHook('preHandler', requireRole('STAFF'));

  app.get(
    '/appointments',
    {
      schema: {
        querystring: listAppointmentsQuerySchema,
        response: { 200: z.array(staffAppointmentSchema) },
      },
    },
    (request) => appointmentsService.list(request.query),
  );

  app.get(
    '/appointments/available-slots',
    {
      schema: {
        querystring: availableSlotsQuerySchema,
        response: { 200: availableSlotsResponseSchema },
      },
    },
    (request) => appointmentsService.availableSlots(request.query.date),
  );

  app.post(
    '/appointments',
    {
      schema: { body: createAppointmentBodySchema, response: { 201: staffAppointmentSchema } },
    },
    async (request, reply) => {
      const appointment = await appointmentsService.create(request.body);
      return reply.status(201).send(appointment);
    },
  );

  app.get(
    '/appointments/:id',
    { schema: { params: idParamsSchema, response: { 200: staffAppointmentSchema } } },
    (request) => appointmentsService.getById(request.params.id),
  );

  app.post(
    '/appointments/:id/cancel',
    { schema: { params: idParamsSchema, response: { 200: staffAppointmentSchema } } },
    (request) => appointmentsService.cancel(request.params.id),
  );

  done();
};
