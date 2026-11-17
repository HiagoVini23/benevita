import { ArrowLeftIcon, CircleAlertIcon, FileXIcon } from 'lucide-react';
import { Navigate, useParams } from 'react-router';
import { ButtonLink } from '@/components/ButtonLink';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ReportDocument } from '@/components/ReportDocument';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { formatDateTime } from '@/lib/clinic-time';
import { usePublishedReport } from '@/features/patient-portal/patient-portal.hooks';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ReportUnavailable() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileXIcon />
        </EmptyMedia>
        <EmptyTitle>Laudo não disponível</EmptyTitle>
        <EmptyDescription>
          O laudo deste exame ainda não foi publicado pela clínica ou não está disponível para a sua
          conta.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function PatientReportPage() {
  const { appointmentId } = useParams();
  if (appointmentId === undefined) return <Navigate to="/patient/appointments" replace />;

  return (
    <div className="mx-auto max-w-4xl">
      <ButtonLink variant="ghost" size="sm" className="mb-4 -ml-2" to="/patient/appointments">
        <ArrowLeftIcon />
        Meus exames
      </ButtonLink>
      {/* A malformed id can never match: same answer as any unavailable report, no API call. */}
      {UUID_PATTERN.test(appointmentId) ? (
        <PublishedReportContent appointmentId={appointmentId} />
      ) : (
        <ReportUnavailable />
      )}
    </div>
  );
}

interface PublishedReportContentProps {
  appointmentId: string;
}

function PublishedReportContent({ appointmentId }: PublishedReportContentProps) {
  const report = usePublishedReport(appointmentId);

  if (report.isPending) return <Loading />;

  if (report.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>{report.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (report.data === null) return <ReportUnavailable />;

  return (
    <>
      <PageHeader
        title={report.data.appointment.examType.name}
        description={`Exame realizado em ${formatDateTime(report.data.appointment.scheduledAt)}`}
      />
      <ReportDocument
        title={report.data.title}
        body={report.data.body}
        professional={report.data.professional}
        footer={`Laudo publicado em ${formatDateTime(report.data.publishedAt)}.`}
      />
    </>
  );
}
