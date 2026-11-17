import { CalendarXIcon, CircleAlertIcon, FileTextIcon } from 'lucide-react';
import { ButtonLink } from '@/components/ButtonLink';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { AppointmentStatusBadge } from '@/components/StatusBadges';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { formatDate, formatTime } from '@/lib/clinic-time';
import type { PatientAppointment } from './patient-portal.api.ts';
import { useMyAppointments } from './usePatientPortal.ts';

function timeOf(appointment: PatientAppointment): number {
  return new Date(appointment.scheduledAt).getTime();
}

interface ReportActionProps {
  appointment: PatientAppointment;
}

function ReportAction({ appointment }: ReportActionProps) {
  if (appointment.hasPublishedReport) {
    return (
      <ButtonLink variant="outline" size="sm" to={`/patient/appointments/${appointment.id}/report`}>
        <FileTextIcon />
        Ver laudo
      </ButtonLink>
    );
  }
  if (appointment.status === 'CANCELED') return null;
  return <span className="text-sm text-muted-foreground">Laudo ainda não disponível</span>;
}

interface AppointmentListProps {
  title: string;
  items: PatientAppointment[];
  /**
   * The system has no "performed" status, so a past exam is still SCHEDULED. In the history
   * only cancellations get a badge; showing "Agendado" for a past exam would be misleading.
   */
  showScheduledBadge: boolean;
}

function AppointmentList({ title, items, showScheduledBadge }: AppointmentListProps) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-3" aria-label={title}>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <Card className="p-0">
        <ul className="divide-y">
          {items.map((appointment) => (
            <li
              key={appointment.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
            >
              <div className="w-28 tabular-nums">
                <p className="font-semibold">{formatDate(appointment.scheduledAt)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(appointment.scheduledAt)}
                </p>
              </div>
              <p className="min-w-40 flex-1 font-medium">{appointment.examType.name}</p>
              {(showScheduledBadge || appointment.status === 'CANCELED') && (
                <AppointmentStatusBadge status={appointment.status} />
              )}
              <div className="flex w-full justify-end sm:w-48">
                <ReportAction appointment={appointment} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

interface AppointmentsSectionsProps {
  appointments: PatientAppointment[];
  /** When the list was fetched: a stable "now" that keeps rendering pure and moves on refetch. */
  fetchedAt: number;
}

function AppointmentsSections({ appointments, fetchedAt }: AppointmentsSectionsProps) {
  const isUpcoming = (appointment: PatientAppointment) =>
    appointment.status === 'SCHEDULED' && timeOf(appointment) > fetchedAt;
  const upcoming = appointments.filter(isUpcoming).sort((a, b) => timeOf(a) - timeOf(b));
  const history = appointments
    .filter((appointment) => !isUpcoming(appointment))
    .sort((a, b) => timeOf(b) - timeOf(a));

  return (
    <div className="grid gap-8">
      <AppointmentList title="Próximos exames" items={upcoming} showScheduledBadge />
      <AppointmentList
        title="Exames anteriores e cancelados"
        items={history}
        showScheduledBadge={false}
      />
    </div>
  );
}

export function PatientAppointmentsPage() {
  const appointments = useMyAppointments();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Meus exames"
        description="Seus agendamentos e laudos, em horário de Brasília."
      />

      {appointments.isPending && <Loading />}

      {appointments.isError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{appointments.error.message}</AlertDescription>
        </Alert>
      )}

      {appointments.isSuccess && appointments.data.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarXIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum exame encontrado</EmptyTitle>
            <EmptyDescription>
              Quando a clínica agendar um exame, ele aparecerá aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {appointments.isSuccess && appointments.data.length > 0 && (
        <AppointmentsSections
          appointments={appointments.data}
          fetchedAt={appointments.dataUpdatedAt}
        />
      )}
    </div>
  );
}
