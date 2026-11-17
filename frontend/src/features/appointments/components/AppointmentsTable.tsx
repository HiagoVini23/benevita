import { FileTextIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ButtonLink } from '@/components/ButtonLink';
import { AppointmentStatusBadge, ReportStatusBadge } from '@/components/StatusBadges';
import { formatDate, formatTime } from '@/lib/clinic-time';
import type { StaffAppointment } from './appointments.api.ts';
import { CancelAppointmentButton } from './CancelAppointmentButton.tsx';

function canCancel(appointment: StaffAppointment): boolean {
  return appointment.status === 'SCHEDULED' && appointment.report?.status !== 'PUBLISHED';
}

/**
 * Published reports are read-only, drafts are edited, and a report can only be created while the
 * appointment is active. A canceled appointment cannot receive a report (L5), and a draft left on
 * one is not offered for editing.
 */
function reportAction(appointment: StaffAppointment): string | null {
  if (appointment.report?.status === 'PUBLISHED') return 'Ver laudo';
  if (appointment.status === 'CANCELED') return null;
  return appointment.report === null ? 'Cadastrar laudo' : 'Editar laudo';
}

export function AppointmentsTable({ appointments }: { appointments: StaffAppointment[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Horário</TableHead>
          <TableHead>Paciente</TableHead>
          <TableHead>Exame</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead>Laudo</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appointment) => {
          const reportLabel = reportAction(appointment);
          return (
            <TableRow
              key={appointment.id}
              className={appointment.status === 'CANCELED' ? 'text-muted-foreground' : undefined}
            >
              <TableCell>
                <span className="block font-semibold tabular-nums">
                  {formatTime(appointment.scheduledAt)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(appointment.scheduledAt)}
                </span>
              </TableCell>
              <TableCell className="font-medium">{appointment.patient.name}</TableCell>
              <TableCell>{appointment.examType.name}</TableCell>
              <TableCell>
                <AppointmentStatusBadge status={appointment.status} />
              </TableCell>
              <TableCell>
                <ReportStatusBadge status={appointment.report?.status ?? null} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {reportLabel !== null && (
                    <ButtonLink
                      variant="outline"
                      size="sm"
                      to={`/staff/appointments/${appointment.id}/report`}
                    >
                      <FileTextIcon />
                      {reportLabel}
                    </ButtonLink>
                  )}
                  {canCancel(appointment) && <CancelAppointmentButton appointment={appointment} />}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
