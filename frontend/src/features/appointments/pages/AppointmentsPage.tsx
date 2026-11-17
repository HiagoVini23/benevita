import { CalendarXIcon, CircleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatients } from '@/features/catalog/catalog.hooks';
import { formatCalendarDateLong, todayInClinic } from '@/lib/clinic-time';
import { cn } from '@/lib/utils';
import { AppointmentFilters } from '@/features/appointments/components/AppointmentFilters';
import type { AppointmentFilters as Filters } from '@/features/appointments/appointments.api';
import { AppointmentsTable } from '@/features/appointments/components/AppointmentsTable';
import { NewAppointmentDialog } from '@/features/appointments/components/NewAppointmentDialog';
import { useAppointments } from '@/features/appointments/appointments.hooks';

const LOADING_ROWS = 4;

/**
 * `today` follows the clinic's current day, so a page left open overnight moves to the new
 * day on its next render (e.g. the refetch when the tab regains focus) instead of showing
 * yesterday.
 */
type DateSelection = { kind: 'today' } | { kind: 'day'; date: string } | { kind: 'all' };

function resolveDate(selection: DateSelection, today: string): string | undefined {
  if (selection.kind === 'today') return today;
  return selection.kind === 'day' ? selection.date : undefined;
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function AppointmentsPage() {
  const [dateSelection, setDateSelection] = useState<DateSelection>({ kind: 'today' });
  const [patientId, setPatientId] = useState<string>();
  const { data: patients } = usePatients();

  const today = todayInClinic();
  const filters: Filters = {
    date: resolveDate(dateSelection, today),
    patientId,
  };
  const appointments = useAppointments(filters);

  const dayLabel =
    filters.date === undefined
      ? 'Todas as datas'
      : filters.date === today
        ? 'Hoje'
        : capitalize(formatCalendarDateLong(filters.date));
  const patientName = patients?.find((patient) => patient.id === patientId)?.name;
  const description = [dayLabel, patientName].filter(Boolean).join(' · ');

  return (
    <>
      <PageHeader
        title="Agendamentos"
        description={`${description}, em horário de Brasília.`}
        actions={<NewAppointmentDialog />}
      />
      <div className="grid gap-4">
        <AppointmentFilters
          value={filters}
          isToday={filters.date === today}
          onDateChange={(date) => {
            if (date === undefined) setDateSelection({ kind: 'all' });
            else setDateSelection(date === today ? { kind: 'today' } : { kind: 'day', date });
          }}
          onTodayClick={() => {
            setDateSelection({ kind: 'today' });
          }}
          onPatientChange={setPatientId}
        />

        {appointments.isPending && (
          <Card className="gap-3 p-4" aria-busy="true" aria-label="Carregando agendamentos">
            {Array.from({ length: LOADING_ROWS }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </Card>
        )}

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
              <EmptyTitle>Nenhum agendamento encontrado</EmptyTitle>
              <EmptyDescription>Ajuste os filtros ou crie um novo agendamento.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {appointments.isSuccess && appointments.data.length > 0 && (
          <Card
            className={cn(
              'overflow-hidden p-0 transition-opacity',
              appointments.isPlaceholderData && 'opacity-60',
            )}
            aria-busy={appointments.isPlaceholderData}
          >
            <AppointmentsTable appointments={appointments.data} />
          </Card>
        )}
      </div>
    </>
  );
}
