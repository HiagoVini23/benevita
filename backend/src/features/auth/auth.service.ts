import type { AuthUser } from '../../shared/auth/auth-user.ts';
import type { Database } from '../../shared/database/prisma.ts';
import { AppError } from '../../shared/errors/app-error.ts';
import type { LoginBody } from './auth.schemas.ts';
import { verifyPassword } from './password.ts';

export function createAuthService(db: Database) {
  return {
    async authenticate({ email, password }: LoginBody): Promise<AuthUser> {
      const user = await db.user.findUnique({
        where: { email },
        include: { patient: { select: { id: true } } },
      });

      // Same error for unknown e-mail and wrong password to avoid account enumeration.
      if (user === null || !(await verifyPassword(password, user.passwordHash))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
      }

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        patientId: user.patient?.id ?? null,
      };
    },
  };
}
