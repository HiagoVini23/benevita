import { Spinner } from '@/components/ui/spinner';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-16 text-muted-foreground"
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
