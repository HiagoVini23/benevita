import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { jsonResponse, mockApi, renderWithProviders, staffUser } from '@/test/render';
import { NewExamTypeDialog } from './NewExamTypeDialog.tsx';

describe('registration dialogs', () => {
  it('shows a duplicate as an error toast, keeps the modal and marks the field until edited', async () => {
    mockApi({
      'POST /api/exam-types': () =>
        jsonResponse(
          {
            error: {
              code: 'EXAM_TYPE_EXISTS',
              message: 'Já existe um tipo de exame com este nome.',
            },
          },
          409,
        ),
    });
    const user = userEvent.setup();
    renderWithProviders(<NewExamTypeDialog onCreated={() => undefined} />, { user: staffUser });

    await user.click(screen.getByRole('button', { name: 'Novo exame' }));
    const name = await screen.findByLabelText('Nome do exame');
    await user.type(name, 'tomografia');
    await user.click(screen.getByRole('button', { name: 'Cadastrar exame' }));

    expect(
      await screen.findByText('Já existe um tipo de exame com este nome.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(name).toHaveValue('tomografia');
    expect(name).toHaveAttribute('aria-invalid', 'true');

    await user.type(name, ' computadorizada');
    await waitFor(() => {
      expect(name).toHaveAttribute('aria-invalid', 'false');
    });
  });
});
