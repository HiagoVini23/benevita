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
// bcrypt only uses the first 72 bytes; a longer initial password would be silently truncated.
const PASSWORD_MAX_LENGTH = 72;

export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

const requiredText = (max = NAME_MAX_LENGTH) => z.string().trim().min(1).max(max);

/** A patient always gets a login: the clinic sets an initial password and hands it over. */
export const createPatientBodySchema = z.object({
  name: requiredText(),
  birthDate: z.iso.date(),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export const createExamTypeBodySchema = z.object({
  name: requiredText(80),
});

export const createProfessionalBodySchema = z.object({
  name: requiredText(),
  // Stored as one canonical text ("CRM-SP 123456"), so a CRM cannot be written two ways.
  crmNumber: z
    .string()
    .trim()
    .regex(/^\d{4,7}$/, 'O número do CRM deve ter de 4 a 7 dígitos.'),
  crmState: z.enum(BRAZILIAN_STATES),
  specialty: requiredText(80),
});

export type CreatePatientBody = z.infer<typeof createPatientBodySchema>;
export type CreateExamTypeBody = z.infer<typeof createExamTypeBodySchema>;
export type CreateProfessionalBody = z.infer<typeof createProfessionalBodySchema>;
