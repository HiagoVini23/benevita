import { z } from 'zod';
import { Role } from '../../generated/prisma/enums.ts';

export const loginBodySchema = z.object({
  // Trimmed and lower-cased before validation, exactly as when the account was created.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  // bcrypt only uses the first 72 bytes; a bound also avoids hashing huge payloads.
  password: z.string().min(1).max(128),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.enum(Role),
  patientId: z.uuid().nullable(),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});

export type LoginBody = z.infer<typeof loginBodySchema>;
