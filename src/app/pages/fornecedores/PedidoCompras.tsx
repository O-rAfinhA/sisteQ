import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, Search, Eye, Edit2, Trash2, X, Package,
  ShoppingCart, Clock, CheckCircle, XCircle,
  DollarSign, User, Calendar,
  ArrowRight, Link2
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MetricCard } from '../../components/ui/metric-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { formatarDataPtBr } from '../../utils/formatters';
import type { PedidoCompra, StatusPedido, ItemPedido } from '../../types/fornecedor';

// ═══ Status configs locais (por design) ═══
const STATUS_CONFIG: Record<StatusPedido, { label: string; bg: string; text: string; border: string }> = {
  'Em Aberto': { label: 'Em Aberto', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Recebido': { label: 'Recebido', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Cancelado': { label: 'Cancelado', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

// ═══ Unidades de medida comuns ═══
const UNIDADES_MEDIDA = [
  'un', 'pç', 'cx', 'kg', 'g', 't', 'L', 'mL', 'm', 'cm', 'mm',
  'm²', 'm³', 'par', 'jg', 'rl', 'fl', 'sc', 'pct', 'bd', 'ct', 'tb', 'sv', 'hr',
];

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarMoedaInput(valor: string): string {
  const apenasDigitos = valor.replace(/\D/g, '');
  if (!apenasDigitos) return '';
  const centavos = parseInt(apenasDigitos, 10);
  const reais = centavos / 100;
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoedaBR(valorFormatado: string): number {
  if (!valorFormatado) return 0;
  const limpo = valorFormatado.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

function formatarQtdInput(valor: string): string {
  // Permite digitar números com vírgula como decimal
  return valor.replace(/[^0-9,]/g, '');
}

function parseQtd(valor: string): number {
  if (!valor) return 0;
  return parseFloat(valor.replace(',', '.')) || 0;
}

const gerarIdItem = () => `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

function isPedidoAtrasado(p: { status: StatusPedido; dataPrevistaEntrega: string }): boolean {
  if (p.status !== 'Em Aberto' || !p.dataPrevistaEntrega) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return new Date(p.dataPrevistaEntrega) < hoje;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

const itemVazio: Omit<ItemPedido, 'id'> = {
  nome: '',
  unidade: 'un',
  quantidade: 0,
  valorUnitario: 0,
};

export function PedidoCompras() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    fornecedores, pedidos, recebimentos,
    addPedido, updatePedido, deletePedido
  } = useFornecedores();

  // ═══ Estados da lista ═══
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | ''>('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // ═══ Modal ═══
  const [modalAberto, setModalAberto] = useState(false);
  const [modalFechando, setModalFechando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  // ═══ Drawer de visualização ═══
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);

  // ═══ Form state ═══
  const formInicial = {
    fornecedorId: '',
    fornecedorNome: '',
    dataPedido: new Date().toISOString().split('T')[0],
    dataPrevistaEntrega: '',
    valorEstimadoManual: '',  // valor digitado manualmente
    tipo: '',
    descricao: '',
    responsavel: '',
    observacoes: '',
  };
  const [form, setForm] = useState(formInicial);

  // ═══ Itens estruturados ═══
  const [itensForm, setItensForm] = useState<ItemPedido[]>([]);
  // Campos do item sendo adicionado (inline)
  const [novoItem, setNovoItem] = useState<{
    nome: string;
    unidade: string;
    quantidade: string;
    valorUnitario: string;
  }>({ nome: '', unidade: 'un', quantidade: '', valorUnitario: '' });

  // ═══ Controle de valor: soma dos itens vs manual ═══
  const somaItens = useMemo(() => {
    return itensForm.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);
  }, [itensForm]);

  const temItensComValor = itensForm.some(item => item.valorUnitario > 0);

  // Quando itens com valor existem, atualizar o valor estimado automaticamente
  useEffect(() => {
    if (temItensComValor && somaItens > 0) {
      setForm(f => ({
        ...f,
        valorEstimadoManual: somaItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }));
    }
  }, [somaItens, temItensComValor]);

  // ═══ Auto-abrir drawer quando vindo de outra página via ?viewPedidoId= ═══
  useEffect(() => {
    const viewId = searchParams.get('viewPedidoId');
    if (viewId && pedidos.length > 0) {
      const pedido = pedidos.find(p => p.id === viewId);
      if (pedido) {
        setVisualizandoId(viewId);
      }
      // Limpar o param para não reabrir ao navegar
      searchParams.delete('viewPedidoId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, pedidos]);

  // ═══ Filtragem ═══
  const pedidosFiltrados = useMemo(() => {
    return pedidos
      .filter(p => {
        if (busca) {
          const b = busca.toLowerCase();
          if (
            !p.fornecedorNome.toLowerCase().includes(b) &&
            !p.descricao.toLowerCase().includes(b) &&
            !p.responsavel.toLowerCase().includes(b) &&
            !String(p.numero).padStart(5, '0').includes(b)
          ) return false;
        }
        if (filtroStatus && p.status !== filtroStatus) return false;
        if (filtroFornecedor && p.fornecedorId !== filtroFornecedor) return false;
        return true;
      })
      .sort((a, b) => b.numero - a.numero);
  }, [pedidos, busca, filtroStatus, filtroFornecedor]);

  // ═══ Métricas ═══
  const metricas = useMemo(() => {
    const total = pedidos.length;
    const emAberto = pedidos.filter(p => p.status === 'Em Aberto').length;
    const recebidos = pedidos.filter(p => p.status === 'Recebido').length;
    const cancelados = pedidos.filter(p => p.status === 'Cancelado').length;
    const valorTotal = pedidos
      .filter(p => p.status !== 'Cancelado')
      .reduce((sum, p) => sum + p.valorEstimado, 0);
    return { total, emAberto, recebidos, cancelados, valorTotal };
  }, [pedidos]);

  // Paginação
  const totalPaginas = Math.ceil(pedidosFiltrados.length / itensPorPagina);
  const pedidosPaginados = pedidosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // ═══ Fornecedores filtrados para dropdown ═══
  const fornecedoresHomologados = fornecedores.filter(f =>
    f.status === 'Homologado' || f.status === 'Homologado com Restrição'
  );
  const fornecedoresFiltrados = fornecedoresHomologados.filter(f =>
    f.razaoSocial.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.nomeFantasia.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.cnpj.includes(buscaFornecedor)
  );

  // ═══ Helpers ═══
  const resetForm = useCallback(() => {
    setForm({
      fornecedorId: '',
      fornecedorNome: '',
      dataPedido: new Date().toISOString().split('T')[0],
      dataPrevistaEntrega: '',
      valorEstimadoManual: '',
      tipo: '',
      descricao: '',
      responsavel: '',
      observacoes: '',
    });
    setItensForm([]);
    setNovoItem({ nome: '', unidade: 'un', quantidade: '', valorUnitario: '' });
    setBuscaFornecedor('');
    setEditandoId(null);
    setDropdownAberto(false);
  }, []);

  const fecharModal = useCallback(() => {
    if (modalFechando) return;
    setModalFechando(true);
    setTimeout(() => {
      setModalAberto(false);
      setModalFechando(false);
      resetForm();
    }, 200);
  }, [modalFechando, resetForm]);

  const fecharDrawer = useCallback(() => {
    setVisualizandoId(null);
  }, []);

  useEffect(() => {
    if (!modalAberto && !visualizandoId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (visualizandoId) {
        fecharDrawer();
        return;
      }
      if (modalAberto) {
        fecharModal();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fecharDrawer, fecharModal, modalAberto, visualizandoId]);

  const handleNovo = () => {
    resetForm();
    setModalAberto(true);
  };

  const handleEditar = (p: PedidoCompra) => {
    setForm({
      fornecedorId: p.fornecedorId,
      fornecedorNome: p.fornecedorNome,
      dataPedido: p.dataPedido,
      dataPrevistaEntrega: p.dataPrevistaEntrega,
      valorEstimadoManual: p.valorEstimado > 0 ? p.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      tipo: p.tipo || '',
      descricao: p.descricao,
      responsavel: p.responsavel,
      observacoes: p.observacoes || '',
    });
    setItensForm(p.itens || []);
    setNovoItem({ nome: '', unidade: 'un', quantidade: '', valorUnitario: '' });
    setEditandoId(p.id);
    setModalAberto(true);
  };

  const handleExcluir = (p: PedidoCompra) => {
    if (p.recebimentoId) {
      toast.error('Pedido vinculado a recebimento. Nao e possivel excluir.');
      return;
    }
    if (confirm(`Deseja excluir o pedido PC-${String(p.numero).padStart(5, '0')}?`)) {
      deletePedido(p.id);
      toast.success('Pedido excluido com sucesso');
    }
  };

  const handleCancelar = (p: PedidoCompra) => {
    if (confirm(`Deseja cancelar o pedido PC-${String(p.numero).padStart(5, '0')}?`)) {
      updatePedido(p.id, { status: 'Cancelado' });
      toast.success('Pedido cancelado');
    }
  };

  const handleReceberMaterial = (p: PedidoCompra) => {
    navigate(`/fornecedores/recebimento?pedidoId=${p.id}`);
  };

  // ═══ Item handlers ═══
  const handleAdicionarItem = () => {
    if (!novoItem.nome.trim()) {
      toast.error('Informe o nome do item');
      return;
    }
    const qtd = parseQtd(novoItem.quantidade);
    if (qtd <= 0) {
      toast.error('Informe a quantidade');
      return;
    }
    const valorUnit = parseMoedaBR(novoItem.valorUnitario);
    const item: ItemPedido = {
      id: gerarIdItem(),
      nome: novoItem.nome.trim(),
      unidade: novoItem.unidade,
      quantidade: qtd,
      valorUnitario: valorUnit,
    };
    setItensForm(prev => [...prev, item]);
    setNovoItem({ nome: '', unidade: novoItem.unidade, quantidade: '', valorUnitario: '' });
  };

  const handleRemoverItem = (id: string) => {
    setItensForm(prev => prev.filter(i => i.id !== id));
  };

  const handleSalvar = () => {
    if (!form.fornecedorId) { toast.error('Selecione um fornecedor'); return; }
    if (!form.dataPedido) { toast.error('Informe a data do pedido'); return; }
    if (!form.dataPrevistaEntrega) { toast.error('Informe a data prevista de entrega'); return; }

    const valorFinal = parseMoedaBR(form.valorEstimadoManual);
    if (valorFinal <= 0) { toast.error('Informe o valor estimado'); return; }
    if (!form.descricao.trim()) { toast.error('Informe a descricao do pedido'); return; }
    if (!form.responsavel.trim()) { toast.error('Informe o responsavel'); return; }

    const dados: any = {
      fornecedorId: form.fornecedorId,
      fornecedorNome: form.fornecedorNome,
      dataPedido: form.dataPedido,
      dataPrevistaEntrega: form.dataPrevistaEntrega,
      valorEstimado: valorFinal,
      tipo: form.tipo || undefined,
      descricao: form.descricao,
      itens: itensForm.length > 0 ? itensForm : undefined,
      responsavel: form.responsavel,
      observacoes: form.observacoes || undefined,
      status: 'Em Aberto' as StatusPedido,
    };

    if (editandoId) {
      const pedidoExistente = pedidos.find(p => p.id === editandoId);
      updatePedido(editandoId, { ...dados, status: pedidoExistente?.status || 'Em Aberto' });
      toast.success('Pedido atualizado com sucesso');
    } else {
      addPedido(dados);
      toast.success('Pedido de compra criado com sucesso');
    }
    fecharModal();
  };

  // Pedido visualizado
  const pedidoVisualizando = visualizandoId ? pedidos.find(p => p.id === visualizandoId) : null;
  const recebimentoVinculado = pedidoVisualizando?.recebimentoId
    ? recebimentos.find(r => r.id === pedidoVisualizando.recebimentoId) : null;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Pedido de Compras
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie pedidos de compras e acompanhe o fluxo de recebimento
          </p>
        </div>
        <Button onClick={handleNovo} variant="black" className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Button>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard label="Total de Pedidos" value={metricas.total} icon={ShoppingCart} variant="default" />
        <MetricCard label="Em Aberto" value={metricas.emAberto} icon={Clock} variant="warning" />
        <MetricCard label="Recebidos" value={metricas.recebidos} icon={CheckCircle} variant="success" />
        <MetricCard label="Cancelados" value={metricas.cancelados} icon={XCircle} variant="default" />
        <MetricCard label="Valor Total" value={formatarMoeda(metricas.valorTotal)} icon={DollarSign} variant="info" />
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por fornecedor, descricao, responsavel..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPaginaAtual(1); }}
              className="pl-10"
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none"
            value={filtroStatus}
            onChange={e => { setFiltroStatus(e.target.value as StatusPedido | ''); setPaginaAtual(1); }}
          >
            <option value="">Todos os status</option>
            <option value="Em Aberto">Em Aberto</option>
            <option value="Recebido">Recebido</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none"
            value={filtroFornecedor}
            onChange={e => { setFiltroFornecedor(e.target.value); setPaginaAtual(1); }}
          >
            <option value="">Todos os fornecedores</option>
            {fornecedores.map(f => (
              <option key={f.id} value={f.id}>{f.razaoSocial}</option>
            ))}
          </select>
          {(busca || filtroStatus || filtroFornecedor) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroFornecedor(''); setPaginaAtual(1); }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ═══ TABELA ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="py-3 px-4 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>N. Pedido</th>
                <th className="py-3 px-4 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
                <th className="py-3 px-4 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Itens</th>
                <th className="py-3 px-4 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Data Pedido</th>
                <th className="py-3 px-4 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Previsao</th>
                <th className="py-3 px-4 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Valor Estimado</th>
                <th className="py-3 px-4 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                <th className="py-3 px-4 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Recebimento</th>
                <th className="py-3 px-4 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pedidosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">
                      {busca || filtroStatus || filtroFornecedor
                        ? 'Nenhum pedido encontrado com os filtros aplicados'
                        : 'Nenhum pedido de compra registrado'
                      }
                    </p>
                  </td>
                </tr>
              ) : pedidosPaginados.map(p => {
                const statusCfg = STATUS_CONFIG[p.status];
                const recVinculado = p.recebimentoId
                  ? recebimentos.find(r => r.id === p.recebimentoId) : null;
                const qtdItens = p.itens?.length || 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900 font-mono" style={{ fontWeight: 500 }}>
                        PC-{String(p.numero).padStart(5, '0')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{p.fornecedorNome}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.descricao}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {qtdItens > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200" style={{ fontWeight: 500 }}>
                          {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-gray-600">{formatarDataPtBr(p.dataPedido)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-gray-600">{formatarDataPtBr(p.dataPrevistaEntrega)}</span>
                        {isPedidoAtrasado(p) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 mt-0.5" style={{ fontSize: '0.6875rem', fontWeight: 500 }}>
                            Atrasado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-900 font-mono">{formatarMoeda(p.valorEstimado)}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`} style={{ fontWeight: 500 }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {recVinculado ? (
                        <button
                          onClick={() => navigate(`/fornecedores/recebimento?highlight=${recVinculado.id}`)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                          style={{ fontWeight: 500 }}
                        >
                          <Link2 className="w-3 h-3" />
                          #{String(recVinculado.numero).padStart(5, '0')}
                        </button>
                      ) : p.status === 'Em Aberto' ? (
                        <Button
                          variant="black"
                          size="sm"
                          onClick={() => handleReceberMaterial(p)}
                          className="gap-1.5 text-xs"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Receber
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVisualizandoId(p.id)}
                          title="Visualizar"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {p.status === 'Em Aberto' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditar(p)}
                            title="Editar"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {p.status !== 'Recebido' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => p.status === 'Em Aberto' ? handleCancelar(p) : handleExcluir(p)}
                            title={p.status === 'Em Aberto' ? 'Cancelar' : 'Excluir'}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            {p.status === 'Em Aberto' ? <XCircle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {pedidosFiltrados.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Exibir</span>
              <select
                className="px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                value={itensPorPagina}
                onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
              >
                {ITEMS_PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                de {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm" disabled={paginaAtual <= 1}
                onClick={() => setPaginaAtual(p => p - 1)}
                className="text-xs h-8 px-3"
              >Anterior</Button>
              {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                const page = paginaAtual <= 3 ? i + 1 : paginaAtual + i - 2;
                if (page < 1 || page > totalPaginas) return null;
                return (
                  <Button
                    key={page} variant={page === paginaAtual ? 'default' : 'ghost'}
                    size="sm" className="text-xs h-8 w-8 p-0"
                    onClick={() => setPaginaAtual(page)}
                  >{page}</Button>
                );
              })}
              <Button
                variant="ghost" size="sm" disabled={paginaAtual >= totalPaginas}
                onClick={() => setPaginaAtual(p => p + 1)}
                className="text-xs h-8 px-3"
              >Proximo</Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL CRIAR/EDITAR ═══ */}
      {(modalAberto || modalFechando) && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-start justify-center pt-[3vh] z-50 overflow-y-auto pb-10 ${modalFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModal}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 ${modalFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-pedidos-modal-title"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 id="fornecedor-pedidos-modal-title" className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {editandoId ? 'Editar Pedido de Compra' : 'Novo Pedido de Compra'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { fecharModal(); }}
                className="h-8 w-8 text-gray-500"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              {/* Fornecedor dropdown */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Fornecedor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Buscar fornecedor..."
                    value={form.fornecedorNome || buscaFornecedor}
                    onChange={e => {
                      setBuscaFornecedor(e.target.value);
                      if (form.fornecedorId) setForm(f => ({ ...f, fornecedorId: '', fornecedorNome: '' }));
                      setDropdownAberto(true);
                    }}
                    onFocus={() => setDropdownAberto(true)}
                  />
                  {dropdownAberto && !form.fornecedorId && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {fornecedoresFiltrados.length === 0 ? (
                        <div className="p-3 text-sm text-gray-400 text-center">Nenhum fornecedor homologado encontrado</div>
                      ) : fornecedoresFiltrados.map(f => (
                        <button
                          key={f.id}
                          className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              fornecedorId: f.id,
                              fornecedorNome: f.razaoSocial,
                              tipo: f.tipo[0] || ''
                            }));
                            setBuscaFornecedor('');
                            setDropdownAberto(false);
                          }}
                        >
                          <p className="text-gray-900" style={{ fontWeight: 500 }}>{f.razaoSocial}</p>
                          <p className="text-xs text-gray-400">{f.cnpj} - {f.nomeFantasia}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Data do Pedido <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.dataPedido}
                    onChange={e => setForm(f => ({ ...f, dataPedido: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Previsao de Entrega <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.dataPrevistaEntrega}
                    onChange={e => setForm(f => ({ ...f, dataPrevistaEntrega: e.target.value }))}
                  />
                </div>
              </div>

              {/* Descricao */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Descricao <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none resize-none"
                  rows={2}
                  placeholder="Descreva o pedido de compra..."
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>

              {/* ═══ SEÇÃO DE ITENS ═══ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-700" style={{ fontWeight: 500 }}>
                    Itens do Pedido
                  </label>
                  <span className="text-xs text-gray-400">
                    {itensForm.length} {itensForm.length === 1 ? 'item' : 'itens'} adicionado{itensForm.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Lista de itens adicionados */}
                {itensForm.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/80">
                          <th className="py-2 px-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Item</th>
                          <th className="py-2 px-3 text-center text-xs text-gray-500 w-[72px]" style={{ fontWeight: 500 }}>Unid.</th>
                          <th className="py-2 px-3 text-center text-xs text-gray-500 w-[72px]" style={{ fontWeight: 500 }}>Qtd.</th>
                          <th className="py-2 px-3 text-right text-xs text-gray-500 w-[110px]" style={{ fontWeight: 500 }}>Vl. Unit.</th>
                          <th className="py-2 px-3 text-right text-xs text-gray-500 w-[110px]" style={{ fontWeight: 500 }}>Subtotal</th>
                          <th className="py-2 px-3 w-[40px]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {itensForm.map(item => {
                          const subtotal = item.quantidade * item.valorUnitario;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 text-sm text-gray-900">{item.nome}</td>
                              <td className="py-2 px-3 text-xs text-gray-500 text-center">{item.unidade}</td>
                              <td className="py-2 px-3 text-sm text-gray-900 text-center">
                                {item.quantidade % 1 === 0 ? item.quantidade : item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-mono">
                                {item.valorUnitario > 0 ? formatarMoeda(item.valorUnitario) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-mono" style={{ fontWeight: 500 }}>
                                {subtotal > 0 ? formatarMoeda(subtotal) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoverItem(item.id)}
                                  className="h-7 w-7 text-red-600"
                                  title="Remover item"
                                  aria-label="Remover item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {temItensComValor && (
                        <tfoot>
                          <tr className="bg-gray-50/80 border-t border-gray-200">
                            <td colSpan={4} className="py-2.5 px-3 text-right text-xs text-gray-500" style={{ fontWeight: 600 }}>
                              Soma dos Itens:
                            </td>
                            <td className="py-2.5 px-3 text-right text-sm font-mono text-gray-900" style={{ fontWeight: 600 }}>
                              {formatarMoeda(somaItens)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {/* Formulario inline para adicionar item */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Adicionar item</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    {/* Nome do Item - ocupa mais espaco */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none"
                        placeholder="Nome do item"
                        value={novoItem.nome}
                        onChange={e => setNovoItem(prev => ({ ...prev, nome: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdicionarItem(); }}
                      />
                    </div>
                    {/* Unidade */}
                    <div className="col-span-2">
                      <select
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none"
                        value={novoItem.unidade}
                        onChange={e => setNovoItem(prev => ({ ...prev, unidade: e.target.value }))}
                      >
                        {UNIDADES_MEDIDA.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    {/* Quantidade */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none text-center"
                        placeholder="Qtd."
                        value={novoItem.quantidade}
                        onChange={e => setNovoItem(prev => ({ ...prev, quantidade: formatarQtdInput(e.target.value) }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdicionarItem(); }}
                      />
                    </div>
                    {/* Valor unitario */}
                    <div className="col-span-3">
                      <input
                        type="text"
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none text-right"
                        placeholder="Valor unit. (R$)"
                        value={novoItem.valorUnitario}
                        onChange={e => setNovoItem(prev => ({ ...prev, valorUnitario: formatarMoedaInput(e.target.value) }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdicionarItem(); }}
                      />
                    </div>
                    {/* Botao adicionar */}
                    <div className="col-span-1 flex items-stretch">
                      <Button
                        variant="black"
                        size="icon"
                        onClick={handleAdicionarItem}
                        className="w-full h-full"
                        title="Adicionar item"
                        aria-label="Adicionar item"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    O valor unitario e opcional. Se preenchido, o valor total do pedido sera calculado automaticamente pela soma dos itens.
                    Se nao preenchido, informe o valor total manualmente abaixo.
                  </p>
                </div>
              </div>

              {/* Valor Estimado Total */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Valor Total Estimado (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="0,00"
                    value={form.valorEstimadoManual}
                    onChange={e => setForm(f => ({ ...f, valorEstimadoManual: formatarMoedaInput(e.target.value) }))}
                    className={temItensComValor ? 'bg-gray-50 text-gray-500' : ''}
                    readOnly={temItensComValor}
                  />
                  {temItensComValor && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" style={{ fontWeight: 500 }}>
                      Soma dos itens
                    </span>
                  )}
                </div>
                {!temItensComValor && itensForm.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Itens sem valor unitario. Informe o valor total manualmente.
                  </p>
                )}
              </div>

              {/* Responsavel e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Responsavel <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Nome do responsavel"
                    value={form.responsavel}
                    onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                    Tipo
                  </label>
                  <Input
                    placeholder="Ex: Materia-Prima, Servico..."
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Observacoes */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Observacoes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none resize-none"
                  rows={2}
                  placeholder="Observacoes adicionais (opcional)..."
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => { fecharModal(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar} variant={editandoId ? "black" : "default"} className="gap-2">
                {editandoId ? 'Salvar Alteracoes' : 'Criar Pedido'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DRAWER DE VISUALIZACAO ═══ */}
      <Dialog open={!!pedidoVisualizando} onOpenChange={v => { if (!v) fecharDrawer(); }}>
        <DialogContent className="w-full sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-0">
          {pedidoVisualizando && (
            <>
              <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 pr-14">
                <DialogHeader className="gap-1">
                  <DialogTitle className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Pedido PC-{String(pedidoVisualizando.numero).padStart(5, '0')}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
              {/* ═══ PAINEL RESUMO ═══ */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs ${STATUS_CONFIG[pedidoVisualizando.status].bg} ${STATUS_CONFIG[pedidoVisualizando.status].text} ${STATUS_CONFIG[pedidoVisualizando.status].border}`} style={{ fontWeight: 500 }}>
                    {STATUS_CONFIG[pedidoVisualizando.status].label}
                  </span>
                  <span className="text-xs text-gray-400">
                    Criado em {formatarDataPtBr(pedidoVisualizando.dataCriacao)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fornecedor</p>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{pedidoVisualizando.fornecedorNome}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Valor Estimado</p>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{formatarMoeda(pedidoVisualizando.valorEstimado)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Previsao de Entrega</p>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{formatarDataPtBr(pedidoVisualizando.dataPrevistaEntrega)}</p>
                      {isPedidoAtrasado(pedidoVisualizando) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200 mt-0.5" style={{ fontSize: '0.6875rem', fontWeight: 500 }}>
                          Atrasado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Responsavel</p>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{pedidoVisualizando.responsavel}</p>
                    </div>
                  </div>
                </div>

                {/* Recebimento vinculado */}
                {recebimentoVinculado && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-gray-500">Recebimento vinculado:</span>
                      <button
                        onClick={() => {
                          setVisualizandoId(null);
                          navigate(`/fornecedores/recebimento?highlight=${recebimentoVinculado.id}`);
                        }}
                        className="text-xs text-emerald-700 hover:underline"
                        style={{ fontWeight: 500 }}
                      >
                        #{String(recebimentoVinculado.numero).padStart(5, '0')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Botao Receber Material */}
                {pedidoVisualizando.status === 'Em Aberto' && !recebimentoVinculado && (
                  <div className="pt-3 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        setVisualizandoId(null);
                        handleReceberMaterial(pedidoVisualizando);
                      }}
                      variant="black"
                      className="w-full gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Receber Material
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Descricao */}
              <div>
                <h3 className="text-sm text-gray-500 mb-2" style={{ fontWeight: 500 }}>Descricao</h3>
                <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  {pedidoVisualizando.descricao}
                </p>
              </div>

              {/* Itens Estruturados */}
              {pedidoVisualizando.itens && Array.isArray(pedidoVisualizando.itens) && pedidoVisualizando.itens.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-2" style={{ fontWeight: 500 }}>
                    Itens do Pedido ({pedidoVisualizando.itens.length})
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/80">
                          <th className="py-2 px-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Item</th>
                          <th className="py-2 px-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Unid.</th>
                          <th className="py-2 px-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Qtd.</th>
                          <th className="py-2 px-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Vl. Unit.</th>
                          <th className="py-2 px-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pedidoVisualizando.itens.map((item: ItemPedido) => {
                          const subtotal = item.quantidade * item.valorUnitario;
                          return (
                            <tr key={item.id}>
                              <td className="py-2 px-3 text-sm text-gray-900">{item.nome}</td>
                              <td className="py-2 px-3 text-xs text-gray-500 text-center">{item.unidade}</td>
                              <td className="py-2 px-3 text-sm text-gray-900 text-center">
                                {item.quantidade % 1 === 0 ? item.quantidade : item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-mono">
                                {item.valorUnitario > 0 ? formatarMoeda(item.valorUnitario) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="py-2 px-3 text-sm text-right font-mono" style={{ fontWeight: 500 }}>
                                {subtotal > 0 ? formatarMoeda(subtotal) : <span className="text-gray-300">-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {pedidoVisualizando.itens.some((i: ItemPedido) => i.valorUnitario > 0) && (
                        <tfoot>
                          <tr className="bg-gray-50/80 border-t border-gray-200">
                            <td colSpan={4} className="py-2.5 px-3 text-right text-xs text-gray-500" style={{ fontWeight: 600 }}>
                              Soma dos Itens:
                            </td>
                            <td className="py-2.5 px-3 text-right text-sm font-mono text-gray-900" style={{ fontWeight: 600 }}>
                              {formatarMoeda(pedidoVisualizando.itens.reduce((acc: number, i: ItemPedido) => acc + (i.quantidade * i.valorUnitario), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* Detalhes */}
              <div>
                <h3 className="text-sm text-gray-500 mb-3" style={{ fontWeight: 500 }}>Detalhes</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-500">Data do Pedido</span>
                    <span className="text-sm text-gray-900">{formatarDataPtBr(pedidoVisualizando.dataPedido)}</span>
                  </div>
                  {pedidoVisualizando.tipo && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-xs text-gray-500">Tipo</span>
                      <span className="text-sm text-gray-900">{pedidoVisualizando.tipo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observacoes */}
              {pedidoVisualizando.observacoes && (
                <div>
                  <h3 className="text-sm text-gray-500 mb-2" style={{ fontWeight: 500 }}>Observacoes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    {pedidoVisualizando.observacoes}
                  </p>
                </div>
              )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
