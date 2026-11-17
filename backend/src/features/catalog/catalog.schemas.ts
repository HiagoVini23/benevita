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

const NAME_MAX_LENGTH = 120;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const requiredText = (max = NAME_MAX_LENGTH) => z.string().trim().min(1).max(max);

/** A patient always gets a login: the clinic sets an initial password and hands it over. */
export const createPatientBodySchema = z.object({
  name: requiredText(),
  birthDate: z.iso.date(),
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export const createExamTypeBodySchema = z.object({
  name: requiredText(80),
});

export const createProfessionalBodySchema = z.object({
  name: requiredText(),
  // Normalized (upper case, single spaces) so "crm-sp  123" and "CRM-SP 123" are the same CRM.
  crm: requiredText(30).transform((crm) => crm.toUpperCase().replace(/\s+/g, ' ')),
  specialty: requiredText(80),
});

export type CreatePatientBody = z.infer<typeof createPatientBodySchema>;
export type CreateExamTypeBody = z.infer<typeof createExamTypeBodySchema>;
export type CreateProfessionalBody = z.infer<typeof createProfessionalBodySchema>;
