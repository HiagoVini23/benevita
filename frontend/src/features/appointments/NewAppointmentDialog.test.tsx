import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockApi, renderWithProviders, staffUser } from '@/test/render';
import { NewAppointmentDialog } from './NewAppointmentDialog.tsx';

// Monday 2026-11-16, 09:00 in São Paulo. Only Date is faked so user-event timers keep working.
const NOW = new Date('2026-11-16T12:00:00.000Z');
const TUESDAY_10H = '2026-11-17T13:00:00.000Z';
const TUESDAY_10H30 = '2026-11-17T13:30:00.000Z';

const catalogRoutes = {
  'GET /api/patients': () =>
    jsonResponse([
      { id: 'patient-1', name: 'Ana Souza', birthDate: '1988-03-14' },
      { id: 'patient-2', name: 'Bruno Lima', birthDate: '1975-09-02' },
    ]),
  'GET /api/exam-types': () => jsonResponse([{ id: 'exam-1', name: 'Raio-X' }]),
};

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Novo agendamento' }));

  await user.type(await screen.findByLabelText('Paciente'), 'Ana');
  await user.click(await screen.findByRole('option', { name: 'Ana Souza' }));

  await user.click(screen.getByLabelText('Exame'));
  await user.click(await screen.findByRole('option', { name: 'Raio-X' }));

  await user.click(screen.getByLabelText('Data'));
  await user.click(await screen.findByRole('button', { name: /17 de novembro/i }));

  await user.click(screen.getByLabelText('Horário'));
  await user.click(await screen.findByRole('option', { name: '10:00' }));
}

describe('NewAppointmentDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('books the chosen patient, exam and free slot', async () => {
    const fetchMock = mockApi({
      ...catalogRoutes,
      'GET /api/appointments/available-slots': () =>
        jsonResponse({ date: '2026-11-17', slots: [TUESDAY_10H, TUESDAY_10H30] }),
      'POST /api/appointments': ({ body }) => jsonResponse({ ...(body as object), id: 'new' }, 201),
    });
    const user = userEvent.setup();
    renderWithProviders(<NewAppointmentDialog />, { user: staffUser });

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Agendar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[1]?.body).toBe(
      JSON.stringify({
        patientId: 'patient-1',
        examTypeId: 'exam-1',
        scheduledAt: TUESDAY_10H,
      }),
    );
    expect(fetchMock.mock.calls.some(([url]) => url.includes('date=2026-11-17'))).toBe(true);
  });

  it('explains when the slot was just taken and drops it from the selection', async () => {
    let taken = false;
    mockApi({
      ...catalogRoutes,
      'GET /api/appointments/available-slots': () =>
        jsonResponse({
          date: '2026-11-17',
          slots: taken ? [TUESDAY_10H30] : [TUESDAY_10H, TUESDAY_10H30],
        }),
      'POST /api/appointments': () => {
        taken = true;
        return jsonResponse(
          { error: { code: 'SLOT_TAKEN', message: 'Este horário já está ocupado.' } },
          409,
        );
      },
    });
    const user = userEvent.setup();
    renderWithProviders(<NewAppointmentDialog />, { user: staffUser });

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Agendar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este horário já está ocupado.');
    await waitFor(() => {
      expect(screen.getByLabelText('Horário')).toHaveTextContent('Selecione');
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
