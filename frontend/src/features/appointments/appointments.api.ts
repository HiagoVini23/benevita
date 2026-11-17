import type { ExamType } from '@/features/catalog/catalog.api';
import { apiRequest } from '@/lib/api-client';

export type AppointmentStatus = 'SCHEDULED' | 'CANCELED';
export type ReportStatus = 'DRAFT' | 'PUBLISHED';

export interface StaffAppointment {
  id: string;
  /** ISO UTC instant: start of the 30-minute slot. */
  scheduledAt: string;
  status: AppointmentStatus;
  canceledAt: string | null;
  patient: { id: string; name: string };
  examType: ExamType;
  report: { id: string; status: ReportStatus; publishedAt: string | null } | null;
}

export interface AppointmentFilters {
  /** Clinic calendar day, `YYYY-MM-DD`. */
  date?: string | undefined;
  patientId?: string | undefined;
}

export interface CreateAppointmentInput {
  patientId: string;
  examTypeId: string;
  scheduledAt: string;
}

interface AvailableSlots {
  date: string;
  slots: string[];
}

export const appointmentQueryKeys = {
  all: ['appointments'] as const,
  list: (filters: AppointmentFilters) => ['appointments', 'list', filters] as const,
  availableSlots: (date: string) => ['appointments', 'available-slots', date] as const,
};

export const appointmentsApi = {
  list: ({ date, patientId }: AppointmentFilters) =>
    apiRequest<StaffAppointment[]>('/appointments', { query: { date, patientId } }),
  availableSlots: (date: string) =>
    apiRequest<AvailableSlots>('/appointments/available-slots', { query: { date } }),
  create: (input: CreateAppointmentInput) =>
    apiRequest<StaffAppointment>('/appointments', { method: 'POST', body: input }),
  cancel: (id: string) =>
    apiRequest<StaffAppointment>(`/appointments/${id}/cancel`, { method: 'POST' }),
};
