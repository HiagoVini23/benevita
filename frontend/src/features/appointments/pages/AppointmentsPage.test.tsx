import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { todayInClinic } from '@/lib/clinic-time';
import { jsonResponse, mockApi, renderWithProviders, staffUser } from '@/test/render';
import type { StaffAppointment } from './appointments.api.ts';
import { AppointmentsPage } from './AppointmentsPage.tsx';

const examType = { id: 'exam-1', name: 'Raio-X' };

function appointment(overrides: Partial<StaffAppointment>): StaffAppointment {
  return {
    id: 'appt-1',
    scheduledAt: '2026-11-17T13:00:00.000Z',
    status: 'SCHEDULED',
    canceledAt: null,
    patient: { id: 'patient-1', name: 'Ana Souza' },
    examType,
    report: null,
    ...overrides,
  };
}

const catalogRoutes = {
  'GET /api/patients': () =>
    jsonResponse([{ id: 'patient-1', name: 'Ana Souza', birthDate: '1988-03-14' }]),
  'GET /api/exam-types': () => jsonResponse([examType]),
};

function renderPage() {
  return renderWithProviders(<AppointmentsPage />, { user: staffUser });
}

describe('AppointmentsPage', () => {
  it("shows today's appointments in clinic time with status and report", async () => {
    const fetchMock = mockApi({
      ...catalogRoutes,
      'GET /api/appointments': () =>
        jsonResponse([
          appointment({ id: 'a1' }),
          appointment({
            id: 'a2',
            scheduledAt: '2026-11-17T14:30:00.000Z',
            patient: { id: 'patient-2', name: 'Bruno Lima' },
            report: { id: 'r1', status: 'PUBLISHED', publishedAt: '2026-11-17T18:00:00.000Z' },
          }),
          appointment({ id: 'a3', status: 'CANCELED', canceledAt: '2026-11-16T12:00:00.000Z' }),
        ]),
    });
    renderPage();

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3 appointments
    const [, scheduled, published, canceled] = rows.map((row) => within(row));
    if (!scheduled || !published || !canceled) throw new Error('Expected 3 appointment rows');

    expect(scheduled.getByText('10:00')).toBeInTheDocument();
    expect(published.getByText('11:30')).toBeInTheDocument();
    expect(published.getByText('Publicado')).toBeInTheDocument();
    expect(canceled.getByText('Cancelado')).toBeInTheDocument();

    // Published reports and canceled appointments cannot be canceled.
    expect(scheduled.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(published.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(canceled.queryByRole('button', { name: 'Cancelar' })).toBeNull();

    const listCall = fetchMock.mock.calls.find(([url]) => url.startsWith('/api/appointments'));
    expect(listCall?.[0]).toBe(`/api/appointments?date=${todayInClinic()}`);
  });

  it('shows an empty state when there are no appointments', async () => {
    mockApi({ ...catalogRoutes, 'GET /api/appointments': () => jsonResponse([]) });
    renderPage();

    expect(await screen.findByText('Nenhum agendamento encontrado')).toBeInTheDocument();
  });

  it('cancels an appointment after confirmation and refreshes the list', async () => {
    let canceled = false;
    const fetchMock = mockApi({
      ...catalogRoutes,
      'GET /api/appointments': () =>
        jsonResponse([
          canceled
            ? appointment({ status: 'CANCELED', canceledAt: '2026-11-16T12:00:00.000Z' })
            : appointment({}),
        ]),
      'POST /api/appointments/appt-1/cancel': () => {
        canceled = true;
        return jsonResponse(appointment({ status: 'CANCELED' }));
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar agendamento' }));

    expect(await screen.findByText('Cancelado')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/appointments/appt-1/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('asks for every field before creating an appointment', async () => {
    const fetchMock = mockApi({
      ...catalogRoutes,
      'GET /api/appointments': () => jsonResponse([]),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Novo agendamento' }));
    await user.click(await screen.findByRole('button', { name: 'Agendar' }));

    expect(
      await screen.findByText('Selecione o paciente, o exame, a data e o horário.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    });
  });
});
