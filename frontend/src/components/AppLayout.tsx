import { LogOutIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { homePathFor, useAuth } from '@/features/auth/auth-context';
import { BrandLogo } from './BrandLogo.tsx';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to={user === null ? '/' : homePathFor(user.role)} aria-label="Página inicial">
            <BrandLogo className="text-lg" />
          </Link>
          {user !== null && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-sm leading-tight sm:block">
                <p className="font-medium">{user.name}</p>
                <p className="text-muted-foreground">
                  {user.role === 'STAFF' ? 'Equipe da clínica' : 'Paciente'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOutIcon />
                Sair
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
