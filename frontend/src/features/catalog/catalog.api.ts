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

export interface Professional {
  id: string;
  name: string;
  crm: string;
  specialty: string;
}

export interface NewPatientInput {
  name: string;
  /** Calendar date, `YYYY-MM-DD`. */
  birthDate: string;
  email: string;
  /** Initial password the clinic hands over to the patient. */
  password: string;
}

export type NewExamTypeInput = Pick<ExamType, 'name'>;
/** UF options for the CRM; mirrors the backend list (catalog.schemas.ts). */
export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

/** The API builds the canonical CRM text ("CRM-SP 123456") from number and state. */
export interface NewProfessionalInput {
  name: string;
  crmNumber: string;
  crmState: BrazilianState;
  specialty: string;
}

export const catalogQueryKeys = {
  patients: ['catalog', 'patients'] as const,
  examTypes: ['catalog', 'exam-types'] as const,
  professionals: ['catalog', 'professionals'] as const,
};

export const catalogApi = {
  patients: () => apiRequest<PatientOption[]>('/patients'),
  examTypes: () => apiRequest<ExamType[]>('/exam-types'),
  professionals: () => apiRequest<Professional[]>('/professionals'),
  createPatient: (input: NewPatientInput) =>
    apiRequest<PatientOption>('/patients', { method: 'POST', body: input }),
  createExamType: (input: NewExamTypeInput) =>
    apiRequest<ExamType>('/exam-types', { method: 'POST', body: input }),
  createProfessional: (input: NewProfessionalInput) =>
    apiRequest<Professional>('/professionals', { method: 'POST', body: input }),
};
