import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InstrumentosPadroes } from './Padroes';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../hooks/useInstrumentos', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../hooks/useInstrumentos')>();
  return {
    ...mod,
    useInstrumentos: () => ({
      padroes: [],
      setPadroes: vi.fn(),
      instrumentos: [],
    }),
  };
});

describe('InstrumentosPadroes', () => {
  it('exibe e fecha o modal ao clicar em Novo Padrão e Cancelar', async () => {
    render(<InstrumentosPadroes />);
    const user = userEvent.setup();

    const [novoPadraoBtn] = screen.getAllByRole('button', { name: /novo padrão/i });
    await user.click(novoPadraoBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/novo padrão de referência/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mantém o modal aberto e exibe validações ao tentar salvar vazio', async () => {
    render(<InstrumentosPadroes />);
    const user = userEvent.setup();

    const [novoPadraoBtn] = screen.getAllByRole('button', { name: /novo padrão/i });
    await user.click(novoPadraoBtn);
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: /salvar/i }));
    expect(within(dialog).getByText(/informe o código do padrão/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/informe a descrição/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/informe o nº do certificado/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/informe a validade/i)).toBeInTheDocument();
  });
});
