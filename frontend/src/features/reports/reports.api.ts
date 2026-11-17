import type { Professional } from '@/features/catalog/catalog.api';
import { ApiError, apiRequest } from '@/lib/api-client';
import type { ReportStatus } from '@/lib/domain';

export interface StaffReport {
  id: string;
  appointmentId: string;
  title: string;
  body: string;
  status: ReportStatus;
  professional: Professional;
  publishedAt: string | null;
  publishedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDraftInput {
  title: string;
  body: string;
  professionalId: string;
}

export const reportQueryKeys = {
  detail: (appointmentId: string) => ['reports', appointmentId] as const,
};

export const reportsApi = {
  /** The appointment's report, or `null` when none was created yet. */
  async get(appointmentId: string): Promise<StaffReport | null> {
    try {
      return await apiRequest<StaffReport>(
        `/appointments/${encodeURIComponent(appointmentId)}/report`,
      );
    } catch (error) {
      // Only a missing report means "not created yet"; a missing appointment is a real error.
      if (error instanceof ApiError && error.code === 'REPORT_NOT_FOUND') return null;
      throw error;
    }
  },
  saveDraft: (appointmentId: string, input: SaveDraftInput) =>
    apiRequest<StaffReport>(`/appointments/${encodeURIComponent(appointmentId)}/report`, {
      method: 'PUT',
      body: input,
    }),
  publish: (appointmentId: string) =>
    apiRequest<StaffReport>(`/appointments/${encodeURIComponent(appointmentId)}/report/publish`, {
      method: 'POST',
    }),
};
