import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime } from '@/lib/clinic-time';
import type { StaffAppointment } from '@/features/appointments/appointments.api';
import { useCancelAppointment } from '@/features/appointments/appointments.hooks';

export function CancelAppointmentButton({ appointment }: { appointment: StaffAppointment }) {
  const [open, setOpen] = useState(false);
  const cancelMutation = useCancelAppointment();

  const confirm = () => {
    cancelMutation.mutate(appointment.id, {
      onSuccess: () => {
        toast.success('Agendamento cancelado. O horário está livre novamente.');
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setOpen(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="text-destructive" />}
      >
        Cancelar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {appointment.examType.name} de {appointment.patient.name} em{' '}
            {formatDateTime(appointment.scheduledAt)}. O horário ficará livre para outro
            agendamento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending && <Spinner />}
            Cancelar agendamento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
