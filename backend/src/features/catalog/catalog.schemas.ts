import { z } from 'zod';

export const patientOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  birthDate: z.iso.date(),
});

export const examTypeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const professionalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  crm: z.string(),
  specialty: z.string(),
});
