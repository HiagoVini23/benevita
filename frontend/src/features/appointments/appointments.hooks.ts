import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  appointmentQueryKeys,
  appointmentsApi,
  type AppointmentFilters,
} from './appointments.api.ts';

export function useAppointments(filters: AppointmentFilters) {
  return useQuery({
    queryKey: appointmentQueryKeys.list(filters),
    queryFn: () => appointmentsApi.list(filters),
    // Keep showing the previous rows while a new filter loads instead of flashing skeletons.
    placeholderData: keepPreviousData,
    // The schedule changes as other staff book and cancel; refresh when the tab regains focus.
    refetchOnWindowFocus: true,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentQueryKeys.detail(id),
    queryFn: () => appointmentsApi.get(id),
  });
}

export function useAvailableSlots(date: string | undefined) {
  return useQuery({
    queryKey: appointmentQueryKeys.availableSlots(date ?? ''),
    queryFn: date === undefined ? skipToken : () => appointmentsApi.availableSlots(date),
  });
}

/** Any booking or cancellation changes lists and free slots, so every appointment query refreshes. */
function useInvalidateAppointments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: appointmentQueryKeys.all });
}

export function useCreateAppointment() {
  const invalidate = useInvalidateAppointments();
  return useMutation({ mutationFn: appointmentsApi.create, onSettled: invalidate });
}

export function useCancelAppointment() {
  const invalidate = useInvalidateAppointments();
  return useMutation({ mutationFn: appointmentsApi.cancel, onSettled: invalidate });
}
