import { ArrowLeftIcon, CircleAlertIcon, InfoIcon } from 'lucide-react';
import { Navigate, useParams } from 'react-router';
import { ButtonLink } from '@/components/ButtonLink';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ReportDocument } from '@/components/ReportDocument';
import { AppointmentStatusBadge, ReportStatusBadge } from '@/components/StatusBadges';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppointment } from '@/features/appointments/useAppointments';
import { formatDateTime } from '@/lib/clinic-time';
import { ReportEditor } from './ReportEditor.tsx';
import { useReport } from './useReport.ts';

function BackLink() {
  return (
    <ButtonLink variant="ghost" size="sm" className="mb-4 -ml-2" to="/staff/appointments">
      <ArrowLeftIcon />
      Agendamentos
    </ButtonLink>
  );
}

export function ReportPage() {
  const { appointmentId } = useParams();
  if (appointmentId === undefined) return <Navigate to="/staff/appointments" replace />;
  return <ReportPageContent appointmentId={appointmentId} />;
}

function ReportPageContent({ appointmentId }: { appointmentId: string }) {
  const appointment = useAppointment(appointmentId);
  const report = useReport(appointmentId);

  if (appointment.isPending || report.isPending) return <Loading />;

  // Only an initial failure replaces the page: a failed background refetch keeps the data (and
  // whatever is being typed in the editor) on screen.
  if (appointment.data === undefined || report.data === undefined) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            {appointment.error?.message ?? report.error?.message ?? 'Não foi possível carregar.'}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const currentAppointment = appointment.data;
  const currentReport = report.data;
  const isPublished = currentReport?.status === 'PUBLISHED';
  const isCanceled = currentAppointment.status === 'CANCELED';

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink />
      <PageHeader
        title={isPublished ? 'Laudo publicado' : 'Laudo'}
        description={`${currentAppointment.examType.name} · ${currentAppointment.patient.name} · ${formatDateTime(currentAppointment.scheduledAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <AppointmentStatusBadge status={currentAppointment.status} />
            <ReportStatusBadge status={currentReport?.status ?? null} />
          </div>
        }
      />

      {isPublished && (
        <ReportDocument
          title={currentReport.title}
          body={currentReport.body}
          professional={currentReport.professional}
          footer={
            currentReport.publishedAt === null
              ? undefined
              : `Publicado em ${formatDateTime(currentReport.publishedAt)}${
                  currentReport.publishedBy === null ? '' : ` por ${currentReport.publishedBy.name}`
                }. Laudos publicados não podem ser editados.`
          }
        />
      )}

      {!isPublished && isCanceled && (
        <div className="grid gap-4">
          <Alert>
            <InfoIcon />
            <AlertTitle>Agendamento cancelado</AlertTitle>
            <AlertDescription>
              Agendamentos cancelados não podem receber nem publicar laudo.
            </AlertDescription>
          </Alert>
          {currentReport !== null && (
            <ReportDocument
              title={currentReport.title}
              body={currentReport.body}
              professional={currentReport.professional}
              footer="Rascunho não publicado."
            />
          )}
        </div>
      )}

      {/* The editor keeps its own form state for the whole visit; it must not remount when the
          first save gives the report an id, or an in-flight publish would lose its feedback. */}
      {!isPublished && !isCanceled && (
        <ReportEditor appointmentId={appointmentId} draft={currentReport} />
      )}
    </div>
  );
}
