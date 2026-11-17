import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/api-client';
import { jsonResponse, renderWithProviders, staffUser } from '@/test/render';
import { LoginPage } from './LoginPage.tsx';

function renderLogin() {
  return renderWithProviders(<LoginPage />, {
    route: '/login',
    path: '/login',
    extraRoutes: <Route path="/staff/appointments" element={<p>Agenda da equipe</p>} />,
  });
}

async function submit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  it('logs in, stores the token and goes to the home of the user role', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse({ token: 'jwt', user: staffUser })));
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await submit('equipe@benevita.dev', 'equipe123');

    expect(await screen.findByText('Agenda da equipe')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe('jwt');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'equipe@benevita.dev', password: 'equipe123' }),
      }),
    );
  });

  it('shows the API error message when credentials are invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' } },
            401,
          ),
        ),
      ),
    );
    renderLogin();

    await submit('equipe@benevita.dev', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(tokenStorage.get()).toBeNull();
  });
});
