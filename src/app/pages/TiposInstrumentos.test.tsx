import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TiposInstrumentos from './TiposInstrumentos';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../hooks/useInstrumentos', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../hooks/useInstrumentos')>();
  return {
    ...mod,
    useInstrumentos: () => ({
      tiposInstrumentos: [],
      setTiposInstrumentos: vi.fn(),
      instrumentos: [],
    }),
  };
});

describe('TiposInstrumentos', () => {
  it('exibe e fecha o modal ao clicar em Novo Tipo e Cancelar', async () => {
    render(<TiposInstrumentos />);
    const user = userEvent.setup();

    const [novoTipoBtn] = screen.getAllByRole('button', { name: /novo tipo/i });
    await user.click(novoTipoBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/novo tipo de instrumento/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fecha o modal ao pressionar ESC', async () => {
    render(<TiposInstrumentos />);
    const user = userEvent.setup();

    const [novoTipoBtn] = screen.getAllByRole('button', { name: /novo tipo/i });
    await user.click(novoTipoBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
