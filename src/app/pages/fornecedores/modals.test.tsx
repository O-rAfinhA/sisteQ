import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedUseFornecedores } = vi.hoisted(() => ({
  mockedUseFornecedores: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/',
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('../../hooks/useFornecedores', () => ({
  useFornecedores: mockedUseFornecedores,
}));

function createBaseMock() {
  return {
    fornecedores: [],
    rofs: [],
    avaliacoes: [],
    recebimentos: [],
    pedidos: [],
    configuracao: {
      periodicidadePadraoCritico: 'Semestral',
      periodicidadePadraoNaoCritico: 'Anual',
      permitirAvaliacaoPersonalizada: true,
      notaMinimaAceitavel: 3,
      tiposFornecedor: [],
      metaAvaliacaoPorTipo: {},
      documentosPorTipo: {},
      criteriosHomologacao: [],
      habilitarPedidoCompras: true,
    },
    addFornecedor: vi.fn(),
    updateFornecedor: vi.fn(),
    deleteFornecedor: vi.fn(),
    addROF: vi.fn(),
    updateROF: vi.fn(),
    deleteROF: vi.fn(),
    addAvaliacao: vi.fn(),
    updateAvaliacao: vi.fn(),
    deleteAvaliacao: vi.fn(),
    addRecebimento: vi.fn(),
    updateRecebimento: vi.fn(),
    deleteRecebimento: vi.fn(),
    addPedido: vi.fn(),
    updatePedido: vi.fn(),
    deletePedido: vi.fn(),
    updateConfiguracao: vi.fn(),
  } as any;
}

beforeEach(() => {
  vi.useRealTimers();
  mockedUseFornecedores.mockReset();
  mockedUseFornecedores.mockReturnValue(createBaseMock());
});

describe('Fornecedores modais', () => {
  it('fecha modal de Avaliações ao clicar no backdrop', async () => {
    const { FornecedorAvaliacoes } = await import('./Avaliacoes');
    render(<FornecedorAvaliacoes />);

    fireEvent.click(screen.getByRole('button', { name: /nova avaliação/i }));

    const dialog = await screen.findByRole('dialog', { name: /nova avaliação/i });
    fireEvent.click(dialog.parentElement!);

    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: 3000 });
  }, 15000);

  it('fecha modal de Pedido de Compras ao clicar no backdrop', async () => {
    const { PedidoCompras } = await import('./PedidoCompras');
    render(<PedidoCompras />);

    fireEvent.click(screen.getByRole('button', { name: /novo pedido/i }));

    const dialog = await screen.findByRole('dialog', { name: /novo pedido de compra/i });
    fireEvent.click(dialog.parentElement!);

    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: 3000 });
  }, 15000);

  it('fecha drawer de Pedido de Compras ao clicar no backdrop', async () => {
    mockedUseFornecedores.mockReturnValue({
      ...createBaseMock(),
      fornecedores: [
        {
          id: 'f1',
          razaoSocial: 'Fornecedor 1',
          nomeFantasia: 'Fornecedor 1',
          cnpj: '00.000.000/0001-00',
          endereco: '',
          cidade: '',
          estado: '',
          cep: '',
          telefone: '',
          email: '',
          tipo: [],
          departamentoVinculado: '',
          criticidade: 'Não Crítico',
          status: 'Homologado',
          avaliacoes: [],
          periodicidadeAvaliacao: 'Anual',
          rofs: [],
          dataCadastro: new Date().toISOString(),
          dataUltimaAtualizacao: new Date().toISOString(),
          ativo: true,
        },
      ],
      pedidos: [
        {
          id: 'p1',
          numero: 1,
          fornecedorId: 'f1',
          fornecedorNome: 'Fornecedor 1',
          dataPedido: '2026-02-01',
          dataPrevistaEntrega: '2026-02-10',
          valorEstimado: 100,
          descricao: 'Compra teste',
          responsavel: 'Responsável',
          status: 'Em Aberto',
          dataCriacao: '2026-02-01',
        },
      ],
    } as any);

    const { PedidoCompras } = await import('./PedidoCompras');
    render(<PedidoCompras />);

    const linha = screen.getByText('PC-00001').closest('tr');
    expect(linha).not.toBeNull();
    fireEvent.click(within(linha!).getByTitle('Visualizar'));

    const dialog = await screen.findByRole('dialog', { name: /pedido pc-/i });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: 3000 });
  });

  it('fecha drawer de Recebimento com ESC', async () => {
    mockedUseFornecedores.mockReturnValue({
      ...createBaseMock(),
      fornecedores: [
        {
          id: 'f1',
          razaoSocial: 'Fornecedor 1',
          nomeFantasia: 'Fornecedor 1',
          cnpj: '00.000.000/0001-00',
          endereco: '',
          cidade: '',
          estado: '',
          cep: '',
          telefone: '',
          email: '',
          tipo: [],
          departamentoVinculado: '',
          criticidade: 'Não Crítico',
          status: 'Homologado',
          avaliacoes: [],
          periodicidadeAvaliacao: 'Anual',
          rofs: [],
          dataCadastro: new Date().toISOString(),
          dataUltimaAtualizacao: new Date().toISOString(),
          ativo: true,
        },
      ],
      recebimentos: [
        {
          id: 'r1',
          numero: 1,
          fornecedorId: 'f1',
          fornecedorNome: 'Fornecedor 1',
          pedidoCompra: 'PC-00001',
          notaFiscal: 'NF-1',
          dataPrevista: '2026-02-10',
          dataRecebimento: '2026-02-11',
          valorTotal: 100,
          qualidade: 'Aprovado',
          responsavel: 'Responsável',
          dataCriacao: '2026-02-11',
        },
      ],
    } as any);

    const { FornecedorRecebimento } = await import('./Recebimento');
    render(<FornecedorRecebimento />);

    const linha = screen.getByText('PC-00001').closest('tr');
    expect(linha).not.toBeNull();
    fireEvent.click(within(linha!).getByTitle('Visualizar'));

    const dialog = await screen.findByRole('dialog', { name: /recebimento #/i });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(dialog).not.toBeInTheDocument(), { timeout: 3000 });
  });
});
