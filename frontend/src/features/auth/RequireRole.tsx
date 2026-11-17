import { Navigate, Outlet, useLocation } from 'react-router';
import { Loading } from '@/components/Loading';
import type { Role } from './auth.api.ts';
import { homePathFor, useAuth } from './auth-context.ts';
import { SessionError } from './SessionError.tsx';

/**
 * Route guard for UX only: it decides which screens to show. Authorization is enforced by the
 * backend on every request.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <SessionError />;
  if (user === null) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;

  return <Outlet />;
}

export function HomeRedirect() {
  const { user, status } = useAuth();

  if (status === 'loading') return <Loading />;
  if (status === 'error') return <SessionError />;
  return <Navigate to={user === null ? '/login' : homePathFor(user.role)} replace />;
}
