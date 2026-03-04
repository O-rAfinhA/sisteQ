import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedUseStrategic } = vi.hoisted(() => ({
  mockedUseStrategic: vi.fn(),
}));

vi.mock('../context/StrategicContext', () => ({
  useStrategic: mockedUseStrategic,
}));

vi.mock('../components/ObjetivoDialog', () => ({
  ObjetivoDialog: () => null,
}));

vi.mock('../components/PlanoAcaoSelector', () => ({
  PlanoAcaoSelector: () => null,
}));

vi.mock('../components/PAEDetailsDialog', () => ({
  PAEDetailsDialog: () => null,
}));

beforeEach(() => {
  mockedUseStrategic.mockReset();
  try {
    localStorage.removeItem('sisteq-ai-sugestoes-direcionamento-v1');
  } catch {}
  mockedUseStrategic.mockReturnValue({
    dados: {
      direcionamento: {
        missao: '',
        visao: '',
        valores: [],
        politicaQualidade: '',
        politicaBsc: [],
        escopoCertificacao: '',
        exclusaoRequisito: '',
        objetivosBsc: [],
      },
      cenario: {
        historicoEmpresa: '',
        produtosServicos: '',
        regiaoAtuacao: '',
        canaisVenda: '',
        principaisClientes: [],
        principaisFornecedores: [],
        principaisConcorrentes: [],
      },
      swotItems: [],
      partesInteressadas: [],
      planosAcao: [],
      planosAcoes: [],
      riscos: [],
      processos: [],
    },
    updateDirecionamento: vi.fn(),
  });
});

describe('Direcionamento Estratégico - Sugestão IA', () => {
  it('não chama a API quando não há contexto da empresa', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: DirecionamentoEstrategico } = await import('./DirecionamentoEstrategico');
    render(<DirecionamentoEstrategico />);

    const buttons = screen.getAllByRole('button', { name: /sugestão ia/i });
    fireEvent.click(buttons[0]);

    expect(fetchMock).not.toHaveBeenCalled();
  }, 15000);

  it('gera 3 sugestões e permite aplicar no campo', async () => {
    mockedUseStrategic.mockReturnValueOnce({
      dados: {
        direcionamento: {
          missao: '',
          visao: '',
          valores: [],
          politicaQualidade: '',
          politicaBsc: [],
          escopoCertificacao: '',
          exclusaoRequisito: '',
          objetivosBsc: [
            {
              id: '1',
              numeroObjetivo: 'OBJ1',
              perspectiva: 'clientes',
              descricao: 'Aumentar satisfação do cliente',
              indicadorProjeto: 'NPS',
              resultadoAtual: '50',
              meta: '70',
              prazoInicio: '2026-01-01',
              prazo: '2026-12-31',
            },
          ],
        },
        cenario: {
          historicoEmpresa: 'Empresa de tecnologia B2B',
          produtosServicos: 'Software de gestão',
          regiaoAtuacao: 'Brasil',
          canaisVenda: 'Inside sales',
          principaisClientes: [],
          principaisFornecedores: [],
          principaisConcorrentes: [],
        },
        swotItems: [],
        partesInteressadas: [],
        planosAcao: [],
        planosAcoes: [],
        riscos: [],
        processos: [],
      },
      updateDirecionamento: vi.fn(),
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: ['S1', 'S2', 'S3'] }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: DirecionamentoEstrategico } = await import('./DirecionamentoEstrategico');
    render(<DirecionamentoEstrategico />);

    const buttons = screen.getAllByRole('button', { name: /sugestão ia/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(String(url)).toBe('/api/ai/sugestao-direcionamento');
    const parsedBody = JSON.parse(init.body);
    expect(parsedBody.field).toBe('missao');
    expect(String(parsedBody.companyContext)).toMatch(/Empresa de tecnologia/i);

    await waitFor(() => {
      expect(screen.getByText('S1')).toBeInTheDocument();
      expect(screen.getByText('S2')).toBeInTheDocument();
      expect(screen.getByText('S3')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByRole('button', { name: /aplicar/i });
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/fornecer soluções inovadoras/i)).toHaveValue('S1');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /sugestão ia/i }).length).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText('S2')).not.toBeInTheDocument();
      expect(screen.queryByText('S3')).not.toBeInTheDocument();
    });
  });

  it('gera sugestões para Política da Qualidade e aplica no campo', async () => {
    mockedUseStrategic.mockReturnValueOnce({
      dados: {
        direcionamento: {
          missao: '',
          visao: '',
          valores: [],
          politicaQualidade: '',
          politicaBsc: [],
          escopoCertificacao: '',
          exclusaoRequisito: '',
          objetivosBsc: [],
        },
        cenario: {
          historicoEmpresa: 'Indústria metalúrgica de médio porte',
          produtosServicos: 'Componentes usinados',
          regiaoAtuacao: 'Sul do Brasil',
          canaisVenda: 'B2B',
          principaisClientes: [],
          principaisFornecedores: [],
          principaisConcorrentes: [],
        },
        swotItems: [],
        partesInteressadas: [],
        planosAcao: [],
        planosAcoes: [],
        riscos: [],
        processos: [],
      },
      updateDirecionamento: vi.fn(),
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: ['PQ1', 'PQ2', 'PQ3'] }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: DirecionamentoEstrategico } = await import('./DirecionamentoEstrategico');
    render(<DirecionamentoEstrategico />);

    const buttons = screen.getAllByRole('button', { name: /sugestão ia/i });
    fireEvent.click(buttons[3]);

    await waitFor(() => {
      expect(screen.getByText('PQ1')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByRole('button', { name: /aplicar/i });
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/nosso compromisso é fornecer/i)).toHaveValue('PQ1');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /sugestão ia/i }).length).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText('PQ2')).not.toBeInTheDocument();
      expect(screen.queryByText('PQ3')).not.toBeInTheDocument();
    });
  });

  it('mantém botão de IA em campo parcialmente preenchido', async () => {
    mockedUseStrategic.mockReturnValueOnce({
      dados: {
        direcionamento: {
          missao: 'Missão existente',
          visao: '',
          valores: [],
          politicaQualidade: '',
          politicaBsc: [],
          escopoCertificacao: '',
          exclusaoRequisito: '',
          objetivosBsc: [],
        },
        cenario: {
          historicoEmpresa: 'Empresa de serviços',
          produtosServicos: 'Consultoria',
          regiaoAtuacao: 'Brasil',
          canaisVenda: 'B2B',
          principaisClientes: [],
          principaisFornecedores: [],
          principaisConcorrentes: [],
        },
        swotItems: [],
        partesInteressadas: [],
        planosAcao: [],
        planosAcoes: [],
        riscos: [],
        processos: [],
      },
      updateDirecionamento: vi.fn(),
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: ['V1', 'V2', 'V3'] }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: DirecionamentoEstrategico } = await import('./DirecionamentoEstrategico');
    render(<DirecionamentoEstrategico />);

    const buttons = screen.getAllByRole('button', { name: /sugestão ia/i });
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [, init] = fetchMock.mock.calls[0] as any;
    const parsedBody = JSON.parse(init.body);
    expect(parsedBody.field).toBe('visao');
  });

  it('mantém botão de IA em campo totalmente preenchido', async () => {
    mockedUseStrategic.mockReturnValueOnce({
      dados: {
        direcionamento: {
          missao: 'Missão preenchida',
          visao: 'Visão preenchida',
          valores: [{ id: 'v1', valor: 'Integridade', explicacao: 'Agimos com transparência.' }],
          politicaQualidade: 'Política preenchida',
          politicaBsc: [],
          escopoCertificacao: '',
          exclusaoRequisito: '',
          objetivosBsc: [],
        },
        cenario: {
          historicoEmpresa: 'Indústria de médio porte',
          produtosServicos: 'Componentes',
          regiaoAtuacao: 'Sul',
          canaisVenda: 'B2B',
          principaisClientes: [],
          principaisFornecedores: [],
          principaisConcorrentes: [],
        },
        swotItems: [],
        partesInteressadas: [],
        planosAcao: [],
        planosAcoes: [],
        riscos: [],
        processos: [],
      },
      updateDirecionamento: vi.fn(),
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: ['PQ1', 'PQ2', 'PQ3'] }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: DirecionamentoEstrategico } = await import('./DirecionamentoEstrategico');
    render(<DirecionamentoEstrategico />);

    const buttons = screen.getAllByRole('button', { name: /sugestão ia/i });
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(buttons[3]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [, init] = fetchMock.mock.calls[0] as any;
    const parsedBody = JSON.parse(init.body);
    expect(parsedBody.field).toBe('politicaQualidade');
  });

  it('após aplicar sugestão em Valores limpa sugestões e mantém botão de IA', async () => {
    mockedUseStrategic.mockReturnValueOnce({
      dados: {
        direcionamento: {
          missao: '',
          visao: '',
          valores: [],
          politicaQualidade: '',
          politicaBsc: [],
          escopoCertificacao: '',
          exclusaoRequisito: '',
          objetivosBsc: [],
        },
        cenario: {
          historicoEmpresa: 'Empresa de serviços',
          produtosServicos: 'Consultoria',
          regiaoAtuacao: 'Brasil',
          canaisVenda: 'B2B',
          principaisClientes: [],
          principaisFornecedores: [],
          principaisConcorrentes: [],
        },
        swotItems: [],
        partesInteressadas: [],
        planosAcao: [],
        planosAcoes: [],
        riscos: [],
        processos: [],
      },
      updateDirecionamento: vi.fn(),
    });

    const valores1 = [
      '- Integridade: agimos com transparência.',
      '- Cliente: foco no valor entregue.',
      '- Qualidade: fazemos certo na primeira vez.',
      '- Segurança: prevenção em primeiro lugar.',
      '- Inovação: melhoria contínua.',
      '- Colaboração: trabalho em equipe.',
    ].join('\n');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: [valores1] }),
    }));
    vi.stubGlobal('fetch', fetchMock as any);

    const { default: DirecionamentoEstrategico } = await import('./DirecionamentoEstrategico');
    render(<DirecionamentoEstrategico />);

    const buttons = screen.getAllByRole('button', { name: /sugestão ia/i });
    fireEvent.click(buttons[2]);

    await waitFor(() => {
      expect(screen.getByText(/Integridade/i)).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByRole('button', { name: /aplicar/i });
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Integridade')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /sugestão ia/i }).length).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText(/- Integridade:/i)).not.toBeInTheDocument();
    });
  });
});
