import type { ExamType } from '@/features/catalog/catalog.api';
import { ApiError, apiRequest } from '@/lib/api-client';
import type { AppointmentStatus } from '@/lib/domain';

export interface PatientAppointment {
  id: string;
  /** ISO UTC instant. */
  scheduledAt: string;
  status: AppointmentStatus;
  examType: ExamType;
  /** Drafts never count: the patient only learns about published reports. */
  hasPublishedReport: boolean;
}

export interface PublishedReport {
  id: string;
  title: string;
  body: string;
  professional: { name: string; crm: string; specialty: string };
  publishedAt: string;
  appointment: { id: string; scheduledAt: string; examType: ExamType };
}

export const patientPortalQueryKeys = {
  appointments: ['me', 'appointments'] as const,
  report: (appointmentId: string) => ['me', 'reports', appointmentId] as const,
};

export const patientPortalApi = {
  appointments: () => apiRequest<PatientAppointment[]>('/me/appointments'),
  /** The published report, or `null` when it is not available to this patient. */
  async report(appointmentId: string): Promise<PublishedReport | null> {
    try {
      return await apiRequest<PublishedReport>(
        `/me/appointments/${encodeURIComponent(appointmentId)}/report`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === 'REPORT_NOT_FOUND') return null;
      throw error;
    }
  },
};
