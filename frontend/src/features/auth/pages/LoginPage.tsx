import { useMutation } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { homePathFor, useAuth } from './auth-context.ts';

function redirectTarget(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    return typeof state.from === 'string' ? state.from : null;
  }
  return null;
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (loggedUser) => {
      const target = redirectTarget(location.state) ?? homePathFor(loggedUser.role);
      void navigate(target, { replace: true });
    },
  });

  if (user !== null && !loginMutation.isPending) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return (
    <main className="relative grid min-h-svh place-items-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <BrandLogo className="justify-center text-3xl [&_svg]:h-11" />
        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Agendamento de exames e acesso a laudos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                loginMutation.mutate({ email, password });
              }}
            >
              <FieldGroup>
                {loginMutation.isError && (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertDescription>{loginMutation.error.message}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="email">E-mail</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                    }}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                    }}
                    required
                  />
                </Field>
                <Button type="submit" disabled={loginMutation.isPending}>
                  {loginMutation.isPending && <Spinner />}
                  Entrar
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
