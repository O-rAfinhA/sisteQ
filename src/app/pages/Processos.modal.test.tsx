import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Processos from './Processos';

const navigateMock = vi.fn();

const { mockedUseStrategic } = vi.hoisted(() => ({
  mockedUseStrategic: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../context/StrategicContext', () => ({
  useStrategic: mockedUseStrategic,
}));

beforeEach(() => {
  navigateMock.mockReset();
  mockedUseStrategic.mockReset();

  vi.stubGlobal('crypto', {
    randomUUID: () => 'uuid-1',
  } as any);
});

describe('Processos (Novo Processo modal)', () => {
  it('abre modal ao clicar em Novo Processo e fecha ao cancelar com foco restaurado', async () => {
    mockedUseStrategic.mockReturnValue({
      dados: { processos: [] },
      deleteProcesso: vi.fn(),
      addProcesso: vi.fn(),
    });

    render(<Processos />);
    const user = userEvent.setup();

    const novoBtn = screen.getByRole('button', { name: /novo processo/i });
    await user.click(novoBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/novo processo/i)).toBeInTheDocument();

    const nomeInput = within(dialog).getByLabelText(/nome do processo/i);
    expect(nomeInput).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(novoBtn).toHaveFocus();
  });

  it('valida campos obrigatórios ao salvar', async () => {
    const addProcessoMock = vi.fn();
    mockedUseStrategic.mockReturnValue({
      dados: { processos: [] },
      deleteProcesso: vi.fn(),
      addProcesso: addProcessoMock,
    });

    render(<Processos />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /novo processo/i }));
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: /criar processo/i }));

    expect(within(dialog).getByText(/informe o nome do processo/i)).toBeInTheDocument();
    expect(addProcessoMock).not.toHaveBeenCalled();
  });

  it('cria processo e navega para detalhes ao salvar com dados válidos', async () => {
    const addProcessoMock = vi.fn();
    mockedUseStrategic.mockReturnValue({
      dados: { processos: [] },
      deleteProcesso: vi.fn(),
      addProcesso: addProcessoMock,
    });

    render(<Processos />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /novo processo/i }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText(/nome do processo/i), 'Gestão de Vendas');
    await user.type(within(dialog).getByLabelText(/departamento/i), 'Comercial');
    await user.click(within(dialog).getByRole('button', { name: /criar processo/i }));

    expect(addProcessoMock).toHaveBeenCalledTimes(1);
    const [payload] = addProcessoMock.mock.calls[0] as any;
    expect(payload.id).toBe('uuid-1');
    expect(payload.codigo).toBe('MP01');
    expect(payload.nome).toBe('Gestão de Vendas');
    expect(payload.departamento).toBe('Comercial');
    expect(navigateMock).toHaveBeenCalledWith('/processos/uuid-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
