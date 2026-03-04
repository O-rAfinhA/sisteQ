import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DescricaoFuncoes } from './DescricaoFuncoes';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Descrição de Funções (modal Nova descrição)', () => {
  it('abre o modal e foca no campo de busca da função', async () => {
    render(<DescricaoFuncoes />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /nova descrição/i }));

    const dialog = screen.getByRole('dialog', { name: /nova descrição de função/i });
    expect(dialog).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/buscar função/i);
    await waitFor(() => expect(searchInput).toHaveFocus());
  });

  it('fecha o modal ao pressionar ESC', async () => {
    render(<DescricaoFuncoes />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /nova descrição/i }));
    expect(screen.getByRole('dialog', { name: /nova descrição de função/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /nova descrição de função/i })).not.toBeInTheDocument();
  });

  it('fecha o modal ao clicar no backdrop', async () => {
    render(<DescricaoFuncoes />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /nova descrição/i }));
    expect(screen.getByRole('dialog', { name: /nova descrição de função/i })).toBeInTheDocument();

    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement | null;
    expect(overlay).toBeTruthy();

    await user.click(overlay!);
    expect(screen.queryByRole('dialog', { name: /nova descrição de função/i })).not.toBeInTheDocument();
  });
});

