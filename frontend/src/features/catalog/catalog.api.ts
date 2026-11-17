import { apiRequest } from '@/lib/api-client';

/** Reference data managed by the seed; read-only in the app. */
export interface PatientOption {
  id: string;
  name: string;
  /** Calendar date, `YYYY-MM-DD`. */
  birthDate: string;
}

export interface ExamType {
  id: string;
  name: string;
}

export const catalogQueryKeys = {
  patients: ['catalog', 'patients'] as const,
  examTypes: ['catalog', 'exam-types'] as const,
};

export const catalogApi = {
  patients: () => apiRequest<PatientOption[]>('/patients'),
  examTypes: () => apiRequest<ExamType[]>('/exam-types'),
};
