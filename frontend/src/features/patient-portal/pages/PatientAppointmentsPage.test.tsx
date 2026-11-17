import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PatientAppointment } from '@/features/patient-portal/patient-portal.api';
import { jsonResponse, mockApi, patientUser, renderWithProviders } from '@/test/render';
import { PatientAppointmentsPage } from './PatientAppointmentsPage.tsx';

// Monday 2026-11-16, 09:00 in São Paulo.
const NOW = new Date('2026-11-16T12:00:00.000Z');
const PAST_ID = '01a1e793-0000-7000-8000-000000000003';

const appointments: PatientAppointment[] = [
  {
    id: '01a1e793-0000-7000-8000-000000000001',
    scheduledAt: '2026-11-18T13:00:00.000Z',
    status: 'SCHEDULED',
    examType: { id: 'exam-2', name: 'Ultrassom' },
    hasPublishedReport: false,
  },
  {
    id: '01a1e793-0000-7000-8000-000000000002',
    scheduledAt: '2026-11-17T13:00:00.000Z',
    status: 'CANCELED',
    examType: { id: 'exam-3', name: 'Tomografia' },
    hasPublishedReport: false,
  },
  {
    id: PAST_ID,
    scheduledAt: '2026-11-10T13:00:00.000Z',
    status: 'SCHEDULED',
    examType: { id: 'exam-1', name: 'Raio-X' },
    hasPublishedReport: true,
  },
];

describe('PatientAppointmentsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('separates upcoming exams from history and links only published reports', async () => {
    mockApi({ 'GET /api/me/appointments': () => jsonResponse(appointments) });
    renderWithProviders(<PatientAppointmentsPage />, { user: patientUser });

    const upcoming = within(await screen.findByRole('region', { name: 'Próximos exames' }));
    expect(upcoming.getByText('Ultrassom')).toBeInTheDocument();
    expect(upcoming.getByText('Agendado')).toBeInTheDocument();
    expect(upcoming.getByText('Laudo ainda não disponível')).toBeInTheDocument();

    const history = within(screen.getByRole('region', { name: 'Exames anteriores e cancelados' }));
    expect(history.getByText('Tomografia')).toBeInTheDocument();
    expect(history.getByText('Cancelado')).toBeInTheDocument();
    // A past exam is not presented as still scheduled.
    expect(history.queryByText('Agendado')).toBeNull();
    expect(history.getByRole('link', { name: 'Ver laudo' })).toHaveAttribute(
      'href',
      `/patient/appointments/${PAST_ID}/report`,
    );
    expect(screen.getAllByRole('link', { name: 'Ver laudo' })).toHaveLength(1);
  });

  it('shows an empty state when the patient has no exams', async () => {
    mockApi({ 'GET /api/me/appointments': () => jsonResponse([]) });
    renderWithProviders(<PatientAppointmentsPage />, { user: patientUser });

    expect(await screen.findByText('Nenhum exame encontrado')).toBeInTheDocument();
  });

  it('shows the API error when the list cannot be loaded', async () => {
    mockApi({
      'GET /api/me/appointments': () =>
        jsonResponse({ error: { code: 'FORBIDDEN', message: 'Acesso negado.' } }, 403),
    });
    renderWithProviders(<PatientAppointmentsPage />, { user: patientUser });

    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado.');
  });
});
