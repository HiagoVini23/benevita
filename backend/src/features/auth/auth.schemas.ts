import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.enum(['STAFF', 'PATIENT']),
  patientId: z.uuid().nullable(),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});

export type LoginBody = z.infer<typeof loginBodySchema>;
