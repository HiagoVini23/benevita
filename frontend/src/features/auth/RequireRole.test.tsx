import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/api-client';
import { jsonResponse, patientUser, renderWithProviders, staffUser } from '@/test/render';
import { RequireRole } from './RequireRole.tsx';

function StaffArea() {
  return (
    <Routes>
      <Route element={<RequireRole role="STAFF" />}>
        <Route path="/staff/appointments" element={<p>Área da equipe</p>} />
      </Route>
      <Route path="/login" element={<p>Tela de login</p>} />
      <Route path="/patient/appointments" element={<p>Área do paciente</p>} />
    </Routes>
  );
}

describe('RequireRole', () => {
  it('renders the page for a user with the required role', () => {
    renderWithProviders(<StaffArea />, { route: '/staff/appointments', user: staffUser });

    expect(screen.getByText('Área da equipe')).toBeInTheDocument();
  });

  it('redirects anonymous users to the login page', () => {
    renderWithProviders(<StaffArea />, { route: '/staff/appointments' });

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('keeps the session and offers a retry when the server is unavailable', async () => {
    tokenStorage.set('valid-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno.' } }, 500),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<StaffArea />, { route: '/staff/appointments' });

    expect(await screen.findByText('Não foi possível verificar sua sessão')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe('valid-token');

    fetchMock.mockResolvedValue(jsonResponse(staffUser));
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Área da equipe')).toBeInTheDocument();
  });

  it('redirects users with another role to their own home', () => {
    renderWithProviders(<StaffArea />, { route: '/staff/appointments', user: patientUser });

    expect(screen.getByText('Área do paciente')).toBeInTheDocument();
  });
});
