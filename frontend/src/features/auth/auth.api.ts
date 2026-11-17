import { apiRequest } from '@/lib/api-client';

export type Role = 'STAFF' | 'PATIENT';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  patientId: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authQueryKeys = {
  me: ['auth', 'me'] as const,
};

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: credentials }),
  me: () => apiRequest<AuthUser>('/auth/me'),
};
