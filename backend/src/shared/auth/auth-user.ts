import '@fastify/jwt';
import type { Role } from '../../generated/prisma/enums.ts';

/** Identity carried in the JWT. `patientId` is set only for PATIENT users. */
export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  patientId: string | null;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}
