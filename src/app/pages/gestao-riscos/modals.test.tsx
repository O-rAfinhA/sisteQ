import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedUseStrategic, mockedSetSearchParams, mockedSearchParams } = vi.hoisted(() => ({
  mockedUseStrategic: vi.fn(),
  mockedSetSearchParams: vi.fn(),
  mockedSearchParams: {
    current: new URLSearchParams(),
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [mockedSearchParams.current, mockedSetSearchParams],
}));

vi.mock('../../context/StrategicContext', () => ({
  useStrategic: mockedUseStrategic,
}));

function createBaseMock() {
  return {
    dados: {
      riscos: [
        {
          id: 'r1',
          codigo: 'RSC-001',
          departamento: 'TI',
          processo: 'Infraestrutura',
          descricaoRisco: 'Falha no servidor',
          controlesExistentes: [],
          impactoInicial: 2,
          probabilidadeInicial: 2,
          classificacaoInicial: 4,
          nivelInicial: 'Médio',
          status: 'Aceitar',
          ultimaRevisao: '2026-02-01',
          dataCriacao: '2026-02-01',
          revisaoAtual: 'R1',
          historicoRevisoes: [
            {
              numeroRevisao: 'R1',
              data: '2026-02-01',
              impacto: 2,
              probabilidade: 2,
              classificacao: 4,
              nivel: 'Médio',
            },
          ],
        },
      ],
    },
    addPlanoAcoes: vi.fn(),
    addRisco: vi.fn(),
    updateRisco: vi.fn(),
    deleteRisco: vi.fn(),
  } as any;
}

async function renderRegistroComEdicaoAberta() {
  mockedSearchParams.current = new URLSearchParams({ editarRisco: 'r1' });
  const { GestaoRiscos } = await import('../GestaoRiscos');
  render(<GestaoRiscos />);
  await waitFor(() => {
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content).toBeTruthy();
  });
  return document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
}

describe('Gestão de Riscos modais', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockedUseStrategic.mockReset();
    mockedSetSearchParams.mockReset();
    mockedSearchParams.current = new URLSearchParams();
    mockedUseStrategic.mockReturnValue(createBaseMock());
  });

  it('fecha modal ao clicar no botão X', async () => {
    const dialog = await renderRegistroComEdicaoAberta();
    mockedSetSearchParams.mockClear();

    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));

    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'), { timeout: 3000 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(dialog).toHaveAttribute('data-state', 'closed');
    expect(mockedSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
  }, 15000);

  it('fecha modal ao clicar em Cancelar', async () => {
    const dialog = await renderRegistroComEdicaoAberta();
    mockedSetSearchParams.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'), { timeout: 3000 });
    expect(mockedSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
  });

  it('fecha modal ao clicar no backdrop', async () => {
    const dialog = await renderRegistroComEdicaoAberta();
    mockedSetSearchParams.mockClear();

    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement;
    expect(overlay).toBeTruthy();
    fireEvent.pointerDown(overlay);

    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'), { timeout: 3000 });
    expect(mockedSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
  });

  it('fecha modal ao pressionar ESC', async () => {
    const dialog = await renderRegistroComEdicaoAberta();
    mockedSetSearchParams.mockClear();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(dialog).toHaveAttribute('data-state', 'closed'), { timeout: 3000 });
    expect(mockedSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
  });
});
