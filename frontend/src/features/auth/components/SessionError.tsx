import { CircleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from './auth-context.ts';

export function SessionError() {
  const { retry, logout } = useAuth();

  return (
    <div className="mx-auto grid max-w-md gap-4 px-4 py-16">
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Não foi possível verificar sua sessão</AlertTitle>
        <AlertDescription>
          O servidor não respondeu. Verifique sua conexão e tente novamente.
        </AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={retry}>Tentar novamente</Button>
        <Button variant="ghost" onClick={logout}>
          Sair
        </Button>
      </div>
    </div>
  );
}
