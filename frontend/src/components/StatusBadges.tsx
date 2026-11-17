import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus, ReportStatus } from '@/lib/domain';

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return status === 'SCHEDULED' ? (
    <Badge variant="secondary">Agendado</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Cancelado
    </Badge>
  );
}

/** `null` means the appointment has no report yet. */
export function ReportStatusBadge({ status }: { status: ReportStatus | null }) {
  if (status === null) return <span className="text-sm text-muted-foreground">Sem laudo</span>;
  return status === 'PUBLISHED' ? (
    <Badge>Publicado</Badge>
  ) : (
    <Badge variant="outline">Rascunho</Badge>
  );
}
