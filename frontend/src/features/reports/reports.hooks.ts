import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentQueryKeys } from '@/features/appointments/appointments.api';
import { reportQueryKeys, reportsApi, type SaveDraftInput } from './reports.api.ts';

export function useReport(appointmentId: string) {
  return useQuery({
    queryKey: reportQueryKeys.detail(appointmentId),
    queryFn: () => reportsApi.get(appointmentId),
  });
}

/** A report change also changes the appointment rows (report badge, cancel availability). */
function useInvalidateReport(appointmentId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.detail(appointmentId) }),
      queryClient.invalidateQueries({ queryKey: appointmentQueryKeys.all }),
    ]);
}

export function useSaveDraft(appointmentId: string) {
  const invalidate = useInvalidateReport(appointmentId);
  return useMutation({
    mutationFn: (input: SaveDraftInput) => reportsApi.saveDraft(appointmentId, input),
    onSettled: invalidate,
  });
}

export function usePublishReport(appointmentId: string) {
  const invalidate = useInvalidateReport(appointmentId);
  return useMutation({
    mutationFn: () => reportsApi.publish(appointmentId),
    onSettled: invalidate,
  });
}
