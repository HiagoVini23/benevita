import { useQuery } from '@tanstack/react-query';
import { patientPortalApi, patientPortalQueryKeys } from './patient-portal.api.ts';

export function useMyAppointments() {
  return useQuery({
    queryKey: patientPortalQueryKeys.appointments,
    queryFn: patientPortalApi.appointments,
    // A report may be published while the patient has the page open.
    refetchOnWindowFocus: true,
  });
}

export function usePublishedReport(appointmentId: string) {
  return useQuery({
    queryKey: patientPortalQueryKeys.report(appointmentId),
    queryFn: () => patientPortalApi.report(appointmentId),
  });
}
