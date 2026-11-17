import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import type { PatientOption } from '@/features/catalog/catalog.api';
import { usePatients } from '@/features/catalog/catalog.hooks';

interface PatientComboboxProps {
  id?: string;
  /** Accessible name when there is no visible label (e.g. a filter). */
  'aria-label'?: string;
  value: string | undefined;
  onChange: (patientId: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function PatientCombobox({
  id,
  'aria-label': ariaLabel,
  value,
  onChange,
  placeholder = 'Buscar paciente',
  className,
}: PatientComboboxProps) {
  const { data: patients = [] } = usePatients();
  const selected = patients.find((patient) => patient.id === value) ?? null;

  return (
    <Combobox
      items={patients}
      value={selected}
      onValueChange={(patient: PatientOption | null) => {
        onChange(patient?.id);
      }}
      itemToStringLabel={(patient: PatientOption) => patient.name}
      isItemEqualToValue={(a: PatientOption, b: PatientOption) => a.id === b.id}
    >
      <ComboboxInput
        id={id}
        aria-label={ariaLabel}
        placeholder={placeholder}
        showClear
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum paciente encontrado.</ComboboxEmpty>
        <ComboboxList>
          {(patient: PatientOption) => (
            <ComboboxItem key={patient.id} value={patient}>
              {patient.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
