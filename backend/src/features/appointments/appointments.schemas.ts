import { z } from 'zod';
import { AppointmentStatus, ReportStatus } from '../../generated/prisma/enums.ts';
import { examTypeSchema } from '../catalog/catalog.schemas.ts';

export const appointmentIdParamsSchema = z.object({ id: z.uuid() });

export const listAppointmentsQuerySchema = z.object({
  date: z.iso.date().optional(),
  patientId: z.uuid().optional(),
});

export const availableSlotsQuerySchema = z.object({
  date: z.iso.date(),
});

export const createAppointmentBodySchema = z.object({
  patientId: z.uuid(),
  examTypeId: z.uuid(),
  scheduledAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
});

export const staffAppointmentSchema = z.object({
  id: z.uuid(),
  scheduledAt: z.date(),
  status: z.enum(AppointmentStatus),
  canceledAt: z.date().nullable(),
  patient: z.object({ id: z.uuid(), name: z.string() }),
  examType: examTypeSchema,
  report: z
    .object({ id: z.uuid(), status: z.enum(ReportStatus), publishedAt: z.date().nullable() })
    .nullable(),
});

export const availableSlotsResponseSchema = z.object({
  date: z.iso.date(),
  slots: z.array(z.date()),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>;
