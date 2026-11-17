import { createContext, useContext } from 'react';
import type { AuthUser, LoginCredentials, Role } from './auth.api.ts';

/**
 * - `loading`: a stored token is being checked against /auth/me.
 * - `error`: the check failed for a reason other than an invalid token (server down, network);
 *   the token is kept so the session can recover with `retry`.
 */
export type AuthStatus = 'anonymous' | 'loading' | 'authenticated' | 'error';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return context;
}

export function homePathFor(role: Role): string {
  return role === 'STAFF' ? '/staff/appointments' : '/patient/appointments';
}
