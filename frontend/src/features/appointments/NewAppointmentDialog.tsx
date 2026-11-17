import { CircleAlertIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useExamTypes } from '@/features/catalog/useCatalog';
import { formatDateTime, formatTime } from '@/lib/clinic-time';
import { BUSINESS_HOURS_LABEL, isBookableDate } from './booking-rules.ts';
import { DatePicker } from './DatePicker.tsx';
import { PatientCombobox } from './PatientCombobox.tsx';
import { useAvailableSlots, useCreateAppointment } from './useAppointments.ts';

export function NewAppointmentDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>();
  const [examTypeId, setExamTypeId] = useState<string | null>(null);
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const examTypes = useExamTypes();
  const availableSlots = useAvailableSlots(date);
  const createMutation = useCreateAppointment();

  const slotOptions = (availableSlots.data?.slots ?? []).map((value) => ({
    value,
    label: formatTime(value),
  }));
  const examTypeOptions = (examTypes.data ?? []).map(({ id, name }) => ({
    value: id,
    label: name,
  }));
  // A slot that left the free list (taken by someone else, or now in the past) is no longer a
  // valid choice, so it is dropped instead of being resubmitted.
  const selectedSlot = slotOptions.some((option) => option.value === slot) ? slot : null;

  const clearErrors = () => {
    setFormError(null);
    createMutation.reset();
  };

  const reset = () => {
    setPatientId(undefined);
    setExamTypeId(null);
    setDate(undefined);
    setSlot(null);
    clearErrors();
  };

  const submit = () => {
    if (patientId === undefined || examTypeId === null || selectedSlot === null) {
      setFormError('Selecione o paciente, o exame, a data e o horário.');
      return;
    }
    clearErrors();
    createMutation.mutate(
      { patientId, examTypeId, scheduledAt: selectedSlot },
      {
        onSuccess: (appointment) => {
          toast.success(`Exame agendado para ${formatDateTime(appointment.scheduledAt)}.`);
          setOpen(false);
          reset();
        },
      },
    );
  };

  const errorMessage =
    formError ??
    createMutation.error?.message ??
    examTypes.error?.message ??
    availableSlots.error?.message ??
    null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Novo agendamento
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>{BUSINESS_HOURS_LABEL}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FieldGroup>
            {errorMessage !== null && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="new-appointment-patient">Paciente</FieldLabel>
              <PatientCombobox
                id="new-appointment-patient"
                value={patientId}
                onChange={(nextPatientId) => {
                  setPatientId(nextPatientId);
                  clearErrors();
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-appointment-exam">Exame</FieldLabel>
              <Select
                items={examTypeOptions}
                value={examTypeId}
                onValueChange={(nextExamTypeId) => {
                  setExamTypeId(nextExamTypeId);
                  clearErrors();
                }}
              >
                <SelectTrigger id="new-appointment-exam" className="w-full">
                  <SelectValue placeholder="Selecione o tipo de exame" />
                </SelectTrigger>
                <SelectContent>
                  {examTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new-appointment-date">Data</FieldLabel>
                <DatePicker
                  id="new-appointment-date"
                  value={date}
                  onChange={(nextDate) => {
                    setDate(nextDate);
                    setSlot(null);
                    clearErrors();
                  }}
                  isDateDisabled={(calendarDate) => !isBookableDate(calendarDate)}
                  className="w-full"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-appointment-slot">Horário</FieldLabel>
                <Select
                  items={slotOptions}
                  value={selectedSlot}
                  onValueChange={(nextSlot) => {
                    setSlot(nextSlot);
                    // The select also reports null when the chosen slot leaves the free list after a failed
                    // booking; only a real choice should dismiss the error that explains why.
                    if (nextSlot !== null) clearErrors();
                  }}
                  disabled={date === undefined || slotOptions.length === 0}
                >
                  <SelectTrigger id="new-appointment-slot" className="w-full">
                    <SelectValue
                      placeholder={availableSlots.isFetching ? 'Carregando…' : 'Selecione'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {slotOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {date !== undefined && availableSlots.isSuccess && slotOptions.length === 0 && (
                  <FieldDescription>Nenhum horário livre neste dia.</FieldDescription>
                )}
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline" />}>Voltar</DialogClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Spinner />}
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
