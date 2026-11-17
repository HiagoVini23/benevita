import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, patientUser, renderWithProviders } from '@/test/render';
import type { PatientAppointment, PublishedReport } from './patient-portal.api.ts';
import { PatientAppointmentsPage } from './PatientAppointmentsPage.tsx';
import { PatientReportPage } from './PatientReportPage.tsx';

// Monday 2026-11-16, 09:00 in São Paulo.
const NOW = new Date('2026-11-16T12:00:00.000Z');
const xRay = { id: 'exam-1', name: 'Raio-X' };
const FUTURE_ID = '01a1e793-0000-7000-8000-000000000001';
const CANCELED_ID = '01a1e793-0000-7000-8000-000000000002';
const PAST_ID = '01a1e793-0000-7000-8000-000000000003';
const OTHER_ID = '01a1e793-0000-7000-8000-000000000004';

const appointments: PatientAppointment[] = [
  {
    id: FUTURE_ID,
    scheduledAt: '2026-11-18T13:00:00.000Z',
    status: 'SCHEDULED',
    examType: { id: 'exam-2', name: 'Ultrassom' },
    hasPublishedReport: false,
  },
  {
    id: CANCELED_ID,
    scheduledAt: '2026-11-17T13:00:00.000Z',
    status: 'CANCELED',
    examType: { id: 'exam-3', name: 'Tomografia' },
    hasPublishedReport: false,
  },
  {
    id: PAST_ID,
    scheduledAt: '2026-11-10T13:00:00.000Z',
    status: 'SCHEDULED',
    examType: xRay,
    hasPublishedReport: true,
  },
];

const report: PublishedReport = {
  id: 'report-1',
  title: 'Raio-X de tórax PA e perfil',
  body: 'Campos pulmonares livres.',
  professional: { name: 'Dra. Helena Marques', crm: 'CRM-SP 123456', specialty: 'Radiologia' },
  publishedAt: '2026-11-11T13:00:00.000Z',
  appointment: { id: PAST_ID, scheduledAt: '2026-11-10T13:00:00.000Z', examType: xRay },
};

function renderReport(appointmentId: string) {
  return renderWithProviders(<PatientReportPage />, {
    route: `/patient/appointments/${appointmentId}/report`,
    path: '/patient/appointments/:appointmentId/report',
    user: patientUser,
  });
}

describe('patient portal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Meus exames', () => {
    it('separates upcoming exams from history and links only published reports', async () => {
      mockApi({ 'GET /api/me/appointments': () => jsonResponse(appointments) });
      renderWithProviders(<PatientAppointmentsPage />, { user: patientUser });

      const upcoming = within(await screen.findByRole('region', { name: 'Próximos exames' }));
      expect(upcoming.getByText('Ultrassom')).toBeInTheDocument();
      expect(upcoming.getByText('Agendado')).toBeInTheDocument();
      expect(upcoming.getByText('Laudo ainda não disponível')).toBeInTheDocument();

      const history = within(
        screen.getByRole('region', { name: 'Exames anteriores e cancelados' }),
      );
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

  describe('report page', () => {
    it('shows a published report with the responsible professional and publication date', async () => {
      mockApi({ [`GET /api/me/appointments/${PAST_ID}/report`]: () => jsonResponse(report) });
      renderReport(PAST_ID);

      expect(
        await screen.findByRole('heading', { name: 'Raio-X de tórax PA e perfil' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Campos pulmonares livres.')).toBeInTheDocument();
      expect(
        screen.getByText(/Dra. Helena Marques · Radiologia · CRM-SP 123456/),
      ).toBeInTheDocument();
      expect(screen.getByText('Laudo publicado em 11/11/2026 às 10:00.')).toBeInTheDocument();
    });

    it('treats a report the API does not release as unavailable', async () => {
      mockApi({
        [`GET /api/me/appointments/${OTHER_ID}/report`]: () =>
          jsonResponse(
            { error: { code: 'REPORT_NOT_FOUND', message: 'Laudo não encontrado.' } },
            404,
          ),
      });
      renderReport(OTHER_ID);

      expect(await screen.findByText('Laudo não disponível')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/Laudo publicado em/)).toBeNull();
    });

    it('answers a malformed link as unavailable without calling the API', async () => {
      const fetchMock = mockApi({});
      renderReport('not-a-valid-id');

      expect(await screen.findByText('Laudo não disponível')).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
