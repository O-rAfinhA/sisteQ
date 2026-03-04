import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Colaboradores } from './Colaboradores';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Colaboradores (modal Novo/Editar)', () => {
  it('abre o modal ao clicar em Novo Colaborador e foca no nome', async () => {
    render(<Colaboradores />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /novo colaborador/i }));

    const dialog = screen.getByRole('dialog', { name: /novo colaborador/i });
    const nomeInput = within(dialog).getByLabelText(/nome completo/i);
    expect(nomeInput).toHaveFocus();
  });

  it('mantém o modal aberto e exibe validação ao tentar salvar vazio', async () => {
    render(<Colaboradores />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /novo colaborador/i }));
    const dialog = screen.getByRole('dialog', { name: /novo colaborador/i });

    await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));

    expect(screen.getByRole('dialog', { name: /novo colaborador/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/nome completo é obrigatório/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/data de contratação é obrigatória/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/função é obrigatória/i)).toBeInTheDocument();
  });

  it('fecha o modal ao pressionar ESC', async () => {
    render(<Colaboradores />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /novo colaborador/i }));
    expect(screen.getByRole('dialog', { name: /novo colaborador/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /novo colaborador/i })).not.toBeInTheDocument();
  });
});

