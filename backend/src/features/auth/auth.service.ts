import type { AuthUser } from '../../shared/auth/auth-user.ts';
import type { Database } from '../../shared/database/prisma.ts';
import { AppError } from '../../shared/errors/app-error.ts';
import type { LoginBody } from './auth.schemas.ts';
import { unknownUserPasswordHash, verifyPassword } from './password.ts';

const authErrors = {
  invalidCredentials: () => new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.'),
};

export function createAuthService(db: Database) {
  return {
    async authenticate({ email, password }: LoginBody): Promise<AuthUser> {
      const user = await db.user.findUnique({
        where: { email },
        include: { patient: { select: { id: true } } },
      });

      // Same error and the same bcrypt cost for unknown e-mail and wrong password,
      // so neither the message nor the response time reveals which accounts exist.
      const passwordHash = user?.passwordHash ?? (await unknownUserPasswordHash());
      const isPasswordValid = await verifyPassword(password, passwordHash);
      if (user === null || !isPasswordValid) {
        throw authErrors.invalidCredentials();
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
