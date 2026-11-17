import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, setUnauthorizedHandler, tokenStorage } from '@/lib/api-client';
import { authApi, authQueryKeys, type LoginCredentials } from '@/features/auth/auth.api';
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/auth.context';

const MAX_SESSION_CHECK_RETRIES = 2;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(tokenStorage.get);

  const meQuery = useQuery({
    queryKey: authQueryKeys.me,
    queryFn: authApi.me,
    enabled: token !== null,
    staleTime: Infinity,
    // A 401 means the token is invalid (handled by logout); anything else may be transient.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) &&
      failureCount < MAX_SESSION_CHECK_RETRIES,
  });

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await authApi.login(credentials);
      tokenStorage.set(response.token);
      queryClient.setQueryData(authQueryKeys.me, response.user);
      setToken(response.token);
      return response.user;
    },
    [queryClient],
  );

  const { refetch } = meQuery;
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo<AuthContextValue>(() => {
    const user = token === null ? null : (meQuery.data ?? null);
    let status: AuthStatus;
    if (token === null) status = 'anonymous';
    else if (user !== null) status = 'authenticated';
    else if (meQuery.isError) status = 'error';
    else status = 'loading';

    return { user, status, login, logout, retry };
  }, [token, meQuery.data, meQuery.isError, login, logout, retry]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
