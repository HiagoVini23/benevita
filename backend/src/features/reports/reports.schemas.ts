import { z } from 'zod';
import { ReportStatus } from '../../generated/prisma/enums.ts';
import { professionalSchema } from '../catalog/catalog.schemas.ts';

const TITLE_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 20_000;

export const reportParamsSchema = z.object({ id: z.uuid() });

export const saveDraftBodySchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX_LENGTH),
  body: z.string().trim().min(1).max(BODY_MAX_LENGTH),
  professionalId: z.uuid(),
});

export const staffReportSchema = z.object({
  id: z.uuid(),
  appointmentId: z.uuid(),
  title: z.string(),
  body: z.string(),
  status: z.enum(ReportStatus),
  professional: professionalSchema,
  publishedAt: z.date().nullable(),
  publishedBy: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SaveDraftBody = z.infer<typeof saveDraftBodySchema>;
