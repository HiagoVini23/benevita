import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StaffAppointment } from '@/features/appointments/appointments.api';
import { jsonResponse, mockApi, renderWithProviders, staffUser } from '@/test/render';
import type { StaffReport } from './reports.api.ts';
import { ReportPage } from './ReportPage.tsx';

const professional = {
  id: 'prof-1',
  name: 'Dra. Helena Marques',
  crm: 'CRM-SP 123456',
  specialty: 'Radiologia',
};

// An exam that already took place, so its report can be published.
const appointment: StaffAppointment = {
  id: 'appt-1',
  scheduledAt: '2026-11-10T13:00:00.000Z',
  status: 'SCHEDULED',
  canceledAt: null,
  patient: { id: 'patient-1', name: 'Ana Souza' },
  examType: { id: 'exam-1', name: 'Raio-X' },
  report: null,
};

const draft: StaffReport = {
  id: 'report-1',
  appointmentId: 'appt-1',
  title: 'Raio-X de tórax',
  body: 'Campos pulmonares livres.',
  status: 'DRAFT',
  professional,
  publishedAt: null,
  publishedBy: null,
  createdAt: '2026-11-17T14:00:00.000Z',
  updatedAt: '2026-11-17T14:00:00.000Z',
};

const published: StaffReport = {
  ...draft,
  status: 'PUBLISHED',
  publishedAt: '2026-11-17T15:00:00.000Z',
  publishedBy: { id: staffUser.id, name: 'Equipe Benevita' },
};

const notFound = () =>
  jsonResponse({ error: { code: 'REPORT_NOT_FOUND', message: 'Laudo não encontrado.' } }, 404);

function renderPage() {
  return renderWithProviders(<ReportPage />, {
    route: '/staff/appointments/appt-1/report',
    path: '/staff/appointments/:appointmentId/report',
    user: staffUser,
  });
}

describe('ReportPage', () => {
  it('creates a draft with title, professional and text', async () => {
    let saved: StaffReport | null = null;
    const fetchMock = mockApi({
      'GET /api/appointments/appt-1': () => jsonResponse(appointment),
      'GET /api/professionals': () => jsonResponse([professional]),
      'GET /api/appointments/appt-1/report': () =>
        saved === null ? notFound() : jsonResponse(saved),
      'PUT /api/appointments/appt-1/report': () => {
        saved = draft;
        return jsonResponse(draft);
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Título'), 'Raio-X de tórax');
    await user.click(screen.getByLabelText('Profissional responsável'));
    await user.click(await screen.findByRole('option', { name: /Dra. Helena Marques/ }));
    await user.type(screen.getByLabelText('Texto do laudo'), 'Campos pulmonares livres.');
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/appointments/appt-1/report',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            title: 'Raio-X de tórax',
            body: 'Campos pulmonares livres.',
            professionalId: 'prof-1',
          }),
        }),
      );
    });
    expect(await screen.findByText(/Rascunho salvo em/)).toBeInTheDocument();
  });

  it('publishes the draft after confirmation and switches to read-only', async () => {
    let current = draft;
    const fetchMock = mockApi({
      'GET /api/appointments/appt-1': () => jsonResponse(appointment),
      'GET /api/professionals': () => jsonResponse([professional]),
      'GET /api/appointments/appt-1/report': () => jsonResponse(current),
      'POST /api/appointments/appt-1/report/publish': () => {
        current = published;
        return jsonResponse(published);
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Publicar laudo' }));

    expect(await screen.findByRole('heading', { name: 'Laudo publicado' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Texto do laudo')).toBeNull();
    // Unchanged draft: published as is, without saving again.
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('shows a published report as read-only with publication date and author', async () => {
    mockApi({
      'GET /api/appointments/appt-1': () =>
        jsonResponse({ ...appointment, report: { id: 'report-1', status: 'PUBLISHED' } }),
      'GET /api/appointments/appt-1/report': () => jsonResponse(published),
    });
    renderPage();

    expect(await screen.findByText('Campos pulmonares livres.')).toBeInTheDocument();
    expect(
      screen.getByText(/Publicado em 17\/11\/2026 às 12:00 por Equipe Benevita/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull();
  });

  it('does not offer an editor for a canceled appointment', async () => {
    mockApi({
      'GET /api/appointments/appt-1': () =>
        jsonResponse({
          ...appointment,
          status: 'CANCELED',
          canceledAt: '2026-11-16T12:00:00.000Z',
        }),
      'GET /api/appointments/appt-1/report': notFound,
    });
    renderPage();

    expect(await screen.findByText('Agendamento cancelado')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('saves unsaved edits before publishing them', async () => {
    let current = draft;
    const calls: string[] = [];
    mockApi({
      'GET /api/appointments/appt-1': () => jsonResponse(appointment),
      'GET /api/professionals': () => jsonResponse([professional]),
      'GET /api/appointments/appt-1/report': () => jsonResponse(current),
      'PUT /api/appointments/appt-1/report': ({ body }) => {
        calls.push(`PUT ${JSON.stringify(body)}`);
        current = { ...draft, body: 'Texto revisado.' };
        return jsonResponse(current);
      },
      'POST /api/appointments/appt-1/report/publish': () => {
        calls.push('PUBLISH');
        current = { ...published, body: 'Texto revisado.' };
        return jsonResponse(current);
      },
    });
    const user = userEvent.setup();
    renderPage();

    const textArea = await screen.findByLabelText('Texto do laudo');
    await user.clear(textArea);
    await user.type(textArea, 'Texto revisado.  ');
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Publicar laudo' }));

    expect(await screen.findByRole('heading', { name: 'Laudo publicado' })).toBeInTheDocument();
    expect(calls).toEqual([
      `PUT ${JSON.stringify({ title: draft.title, body: 'Texto revisado.', professionalId: 'prof-1' })}`,
      'PUBLISH',
    ]);
  });

  it('publishes a brand-new report in one go (save, then publish)', async () => {
    let current: StaffReport | null = null;
    mockApi({
      'GET /api/appointments/appt-1': () => jsonResponse(appointment),
      'GET /api/professionals': () => jsonResponse([professional]),
      'GET /api/appointments/appt-1/report': () =>
        current === null ? notFound() : jsonResponse(current),
      'PUT /api/appointments/appt-1/report': () => {
        current = draft;
        return jsonResponse(draft);
      },
      'POST /api/appointments/appt-1/report/publish': () => {
        current = published;
        return jsonResponse(published);
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Título'), draft.title);
    await user.click(screen.getByLabelText('Profissional responsável'));
    await user.click(await screen.findByRole('option', { name: /Dra. Helena Marques/ }));
    await user.type(screen.getByLabelText('Texto do laudo'), draft.body);
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Publicar laudo' }));

    expect(await screen.findByRole('heading', { name: 'Laudo publicado' })).toBeInTheDocument();
  });

  it('keeps the editor and shows why publishing failed', async () => {
    mockApi({
      'GET /api/appointments/appt-1': () => jsonResponse(appointment),
      'GET /api/professionals': () => jsonResponse([professional]),
      'GET /api/appointments/appt-1/report': () => jsonResponse(draft),
      'POST /api/appointments/appt-1/report/publish': () =>
        jsonResponse(
          {
            error: {
              code: 'APPOINTMENT_CANCELED',
              message: 'Agendamentos cancelados não podem receber laudo.',
            },
          },
          409,
        ),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Publicar laudo' }));

    expect(
      await screen.findByText('Agendamentos cancelados não podem receber laudo.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Texto do laudo')).toHaveValue(draft.body);
  });

  it('allows a draft but not publishing before the exam takes place', async () => {
    mockApi({
      'GET /api/appointments/appt-1': () =>
        jsonResponse({ ...appointment, scheduledAt: '2099-01-05T13:00:00.000Z' }),
      'GET /api/professionals': () => jsonResponse([professional]),
      'GET /api/appointments/appt-1/report': () => jsonResponse(draft),
    });
    renderPage();

    expect(
      await screen.findByText(/A publicação fica disponível a partir de 05\/01\/2099/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
    expect(screen.getByLabelText('Texto do laudo')).toBeEnabled();
  });
});
