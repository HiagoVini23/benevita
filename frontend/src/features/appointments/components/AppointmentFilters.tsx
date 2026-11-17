import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppointmentFilters as Filters } from './appointments.api.ts';
import { DatePicker } from './DatePicker.tsx';
import { PatientCombobox } from './PatientCombobox.tsx';

interface AppointmentFiltersProps {
  value: Filters;
  isToday: boolean;
  onDateChange: (date: string | undefined) => void;
  onTodayClick: () => void;
  onPatientChange: (patientId: string | undefined) => void;
}

export function AppointmentFilters({
  value,
  isToday,
  onDateChange,
  onTodayClick,
  onPatientChange,
}: AppointmentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros">
      <DatePicker
        id="filter-date"
        aria-label="Filtrar por data"
        value={value.date}
        onChange={onDateChange}
        placeholder="Todas as datas"
        className="w-44"
      />
      {value.date !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mostrar todas as datas"
          onClick={() => {
            onDateChange(undefined);
          }}
        >
          <XIcon />
        </Button>
      )}
      {!isToday && (
        <Button variant="ghost" onClick={onTodayClick}>
          Hoje
        </Button>
      )}
      <PatientCombobox
        id="filter-patient"
        aria-label="Filtrar por paciente"
        value={value.patientId}
        onChange={onPatientChange}
        placeholder="Todos os pacientes"
        className="w-64"
      />
    </div>
  );
}
