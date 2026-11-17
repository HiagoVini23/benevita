import { z } from 'zod';
import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import { examTypeSchema } from '../catalog/catalog.schemas.ts';

/** Only *published* reports count: a draft being written is never revealed. */
export const patientAppointmentSchema = z.object({
  id: z.uuid(),
  scheduledAt: z.date(),
  status: z.enum(AppointmentStatus),
  examType: examTypeSchema,
  hasPublishedReport: z.boolean(),
});

/** No internal ids of staff users. */
export const publishedReportSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  professional: z.object({ name: z.string(), crm: z.string(), specialty: z.string() }),
  publishedAt: z.date(),
  appointment: z.object({
    id: z.uuid(),
    scheduledAt: z.date(),
    examType: examTypeSchema,
  }),
});
