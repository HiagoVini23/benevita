import { useState } from 'react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/FormDialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { maskBrazilianDate, parseBrazilianDate, todayInClinic } from '@/lib/clinic-time';
import type { NewPatientInput, PatientOption } from './catalog.api.ts';
import { reportRegistrationError } from './registration-error.ts';
import { useCreatePatient } from './useCatalog.ts';

// Mirrors the backend rule (catalog.schemas.ts); the API validates it anyway.
const PASSWORD_MIN_LENGTH = 8;
const EMPTY: NewPatientInput = { name: '', birthDate: '', email: '', password: '' };
const OLDEST_BIRTH_DATE = '1900-01-01';

/** Message only once the date is fully typed, so the field does not complain mid-typing. */
function describeBirthDateError(text: string, calendarDate: string | null): string | null {
  if (text.length < 10) return null;
  if (calendarDate === null) return 'Data inválida. Use o formato dd/mm/aaaa.';
  if (calendarDate > todayInClinic()) return 'A data de nascimento não pode estar no futuro.';
  if (calendarDate < OLDEST_BIRTH_DATE) return 'Confira o ano de nascimento.';
  return null;
}

export function NewPatientDialog({ onCreated }: { onCreated: (patient: PatientOption) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [invalidField, setInvalidField] = useState<'email' | 'birthDate' | null>(null);
  const createPatient = useCreatePatient();

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setInvalidField(null);
    createPatient.reset();
  };
  const update = (field: keyof NewPatientInput) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === invalidField) setInvalidField(null);
  };
  // The field shows dd/mm/aaaa; the API receives the calendar date as aaaa-mm-dd.
  const birthDate = parseBrazilianDate(form.birthDate);
  const birthDateError = describeBirthDateError(form.birthDate, birthDate);
  const input: NewPatientInput = {
    ...form,
    name: form.name.trim(),
    email: form.email.trim(),
    birthDate: birthDate ?? '',
  };
  const canSubmit =
    input.name !== '' &&
    birthDate !== null &&
    birthDateError === null &&
    input.email.includes('@') &&
    input.password.length >= PASSWORD_MIN_LENGTH;

  return (
    <FormDialog
      triggerLabel="Novo paciente"
      title="Novo paciente"
      description="O paciente recebe acesso ao portal com o e-mail e a senha inicial informados."
      submitLabel="Cadastrar paciente"
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setOpen(true);
        else close();
      }}
      canSubmit={canSubmit}
      isPending={createPatient.isPending}
      onSubmit={() => {
        createPatient.mutate(input, {
          onError: (error) => {
            setInvalidField(
              reportRegistrationError<'email' | 'birthDate'>(error, {
                EMAIL_TAKEN: 'email',
                BIRTH_DATE_IN_FUTURE: 'birthDate',
              }),
            );
          },
          onSuccess: (patient) => {
            toast.success(`${patient.name} cadastrado(a). Informe o e-mail e a senha inicial.`);
            onCreated(patient);
            close();
          },
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="new-patient-name">Nome completo</FieldLabel>
        <Input
          id="new-patient-name"
          required
          maxLength={120}
          value={form.name}
          onChange={(event) => {
            update('name')(event.target.value);
          }}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-patient-birth-date">Data de nascimento</FieldLabel>
        <Input
          id="new-patient-birth-date"
          required
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          aria-invalid={birthDateError !== null || invalidField === 'birthDate'}
          aria-describedby={birthDateError === null ? undefined : 'new-patient-birth-date-error'}
          value={form.birthDate}
          onChange={(event) => {
            update('birthDate')(maskBrazilianDate(event.target.value));
          }}
        />
        {birthDateError !== null && (
          <FieldError id="new-patient-birth-date-error">{birthDateError}</FieldError>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="new-patient-email">E-mail</FieldLabel>
        <Input
          id="new-patient-email"
          type="email"
          aria-invalid={invalidField === 'email'}
          required
          autoComplete="off"
          value={form.email}
          onChange={(event) => {
            update('email')(event.target.value);
          }}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="new-patient-password">Senha inicial</FieldLabel>
        <Input
          id="new-patient-password"
          type="text"
          required
          autoComplete="off"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={72}
          value={form.password}
          onChange={(event) => {
            update('password')(event.target.value);
          }}
        />
        <FieldDescription>
          Mínimo de {PASSWORD_MIN_LENGTH} caracteres. Informe ao paciente para o primeiro acesso.
        </FieldDescription>
      </Field>
    </FormDialog>
  );
}
