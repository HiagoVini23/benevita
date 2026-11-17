import { z } from 'zod';
import { AppointmentStatus } from '../../generated/prisma/enums.ts';
import { examTypeSchema } from '../catalog/catalog.schemas.ts';

/**
 * The patient's view of an appointment. Only says whether a *published* report exists: drafts are
 * invisible to patients, so the response never reveals whether one is being written.
 */
export const patientAppointmentSchema = z.object({
  id: z.uuid(),
  scheduledAt: z.date(),
  status: z.enum(AppointmentStatus),
  examType: examTypeSchema,
  hasPublishedReport: z.boolean(),
});

/** A published report as the patient reads it: no internal ids of staff users. */
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
