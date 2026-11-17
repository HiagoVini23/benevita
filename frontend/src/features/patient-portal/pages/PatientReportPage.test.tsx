import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PublishedReport } from '@/features/patient-portal/patient-portal.api';
import { jsonResponse, mockApi, patientUser, renderWithProviders } from '@/test/render';
import { PatientReportPage } from './PatientReportPage.tsx';

const PAST_ID = '01a1e793-0000-7000-8000-000000000003';
const OTHER_ID = '01a1e793-0000-7000-8000-000000000004';
const xRay = { id: 'exam-1', name: 'Raio-X' };

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

describe('PatientReportPage', () => {
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
