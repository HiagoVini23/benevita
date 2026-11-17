import type { FastifyRequest } from 'fastify';
import type { Role } from '../../generated/prisma/enums.ts';
import { AppError } from '../errors/app-error.ts';
import type { AuthUser } from './auth-user.ts';

export async function authenticate(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // Missing, malformed and expired tokens all map to the same 401 on purpose.
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Sessão inválida ou expirada. Faça login novamente.',
    );
  }
}

/** preHandler that authenticates the request and enforces one of the given roles. */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest): Promise<void> => {
    await authenticate(request);
    if (!roles.includes(request.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.');
    }
  };
}

/** Patient id of an authenticated PATIENT. Never trust a patient id sent by the client. */
export function getPatientId(user: AuthUser): string {
  if (user.role !== 'PATIENT' || user.patientId === null) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.');
  }
  return user.patientId;
}
