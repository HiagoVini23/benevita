import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus, StaffAppointment } from './appointments.api.ts';

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return status === 'SCHEDULED' ? (
    <Badge variant="secondary">Agendado</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Cancelado
    </Badge>
  );
}

export function ReportStatusBadge({ report }: { report: StaffAppointment['report'] }) {
  if (report === null) return <span className="text-sm text-muted-foreground">Sem laudo</span>;
  return report.status === 'PUBLISHED' ? (
    <Badge>Publicado</Badge>
  ) : (
    <Badge variant="outline">Rascunho</Badge>
  );
}
