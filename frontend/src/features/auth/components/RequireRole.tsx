import { Navigate, Outlet, useLocation } from 'react-router';
import { Loading } from '@/components/Loading';
import type { Role } from '@/features/auth/auth.api';
import { homePathFor, useAuth } from '@/features/auth/auth.context';
import { SessionError } from './SessionError.tsx';

/** UX only: authorization is enforced by the backend. */
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
