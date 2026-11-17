import type { FastifyRequest } from 'fastify';
import type { Role } from '../../generated/prisma/enums.ts';
import { commonErrors } from '../errors/app-error.ts';
import type { AuthUser } from './auth-user.ts';

export async function authenticate(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // Missing, malformed and expired tokens all map to the same 401 on purpose.
    throw commonErrors.unauthenticated();
  }
}

/** preHandler that authenticates the request and enforces one of the given roles. */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest): Promise<void> => {
    await authenticate(request);
    if (!roles.includes(request.user.role)) throw commonErrors.forbidden();
  };
}

/** Patient id of an authenticated PATIENT. Never trust a patient id sent by the client. */
export function getPatientId(user: AuthUser): string {
  if (user.role !== 'PATIENT' || user.patientId === null) throw commonErrors.forbidden();
  return user.patientId;
}
