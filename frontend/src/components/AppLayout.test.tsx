import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { describe, expect, it } from 'vitest';
import { tokenStorage } from '@/lib/api-client';
import { renderWithProviders, staffUser } from '@/test/render';
import { AppLayout } from './AppLayout.tsx';

function renderLayout() {
  return renderWithProviders(<AppLayout />, {
    route: '/staff/appointments',
    path: '/staff/appointments',
    user: staffUser,
    extraRoutes: <Route path="/login" element={<p>Tela de login</p>} />,
  });
}

describe('AppLayout', () => {
  it('switches between light and dark themes and remembers the choice', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('benevita.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('asks for confirmation before logging out', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByText('Sair do Benevita?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(tokenStorage.get()).toBe('test-token');

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    const dialog = within(await screen.findByRole('alertdialog'));
    await user.click(dialog.getByRole('button', { name: 'Sair' }));
    expect(tokenStorage.get()).toBeNull();
  });
});
