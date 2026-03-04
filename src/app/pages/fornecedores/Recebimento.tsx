import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  Plus, Search, Eye, Edit2, Trash2, X, Package,
  Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, DollarSign, User, Filter,
  Upload, Paperclip, Image as ImageIcon, Save,
  Link2, ShoppingCart
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MetricCard } from '../../components/ui/metric-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { formatarDataPtBr } from '../../utils/formatters';
import type {
  Recebimento,
  QualidadeRecebimento,
  TipoROF,
  GravidadeROF,
  AcaoImediataRecebimento,
  ROF,
  StatusROF
} from '../../types/fornecedor';

// ═══ Status configs locais (por design) ═══
const QUALIDADE_CONFIG: Record<QualidadeRecebimento, { label: string; bg: string; text: string; border: string }> = {
  'Aprovado': { label: 'Aprovado', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Aceito Condicional': { label: 'Aceito Condicional', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Rejeitado': { label: 'Rejeitado', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const PRAZO_CONFIG = {
  'No Prazo': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Atrasado': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function calcularPrazo(dataPrevista: string, dataRecebimento: string): 'No Prazo' | 'Atrasado' {
  if (!dataPrevista || !dataRecebimento) return 'No Prazo';
  return new Date(dataRecebimento) <= new Date(dataPrevista) ? 'No Prazo' : 'Atrasado';
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

// ═══ Helpers de formatação de moeda BR ═══
function formatarMoedaInput(valor: string): string {
  // Remove tudo exceto dígitos
  const apenasDigitos = valor.replace(/\D/g, '');
  if (!apenasDigitos) return '';
  // Converte para centavos e formata
  const centavos = parseInt(apenasDigitos, 10);
  const reais = centavos / 100;
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoedaBR(valorFormatado: string): number {
  if (!valorFormatado) return 0;
  // Remove pontos de milhar e troca vírgula decimal por ponto
  const limpo = valorFormatado.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

export function FornecedorRecebimento() {
  const {
    fornecedores, recebimentos, rofs, pedidos,
    addRecebimento, updateRecebimento, deleteRecebimento, updateROF, updatePedido
  } = useFornecedores();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ═══ Pedido vinculado (via query param ?pedidoId=xxx) ═══
  const pedidoIdParam = searchParams.get('pedidoId');
  const [pedidoVinculadoId, setPedidoVinculadoId] = useState<string | null>(null);

  // ═══ Estados da lista ═══
  const [filtros, setFiltros] = useState({
    busca: '',
    fornecedorId: '',
    periodoInicio: '',
    periodoFim: '',
    apenasAtrasados: false,
    apenasComROF: false,
    apenasComProblemaQualidade: false,
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  // ═══ Modal ═══
  const [modalAberto, setModalAberto] = useState(false);
  const [modalFechando, setModalFechando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const formInicial = {
    fornecedorId: '',
    fornecedorNome: '',
    pedidoCompra: '',
    notaFiscal: '',
    dataPrevista: '',
    dataRecebimento: new Date().toISOString().split('T')[0],
    valorTotal: '',
    qualidade: '' as QualidadeRecebimento | '',
    responsavel: '',
    observacoes: '',
    // ROF inline
    rofTipo: 'Produto/Serviço NC' as TipoROF,
    rofGravidade: 'Média' as GravidadeROF,
    rofDescricao: '',
    rofAcaoImediata: 'Comunicação Informal' as AcaoImediataRecebimento,
    rofResponsavel: '',
    rofEvidenciaNome: '',
    rofEvidenciaBase64: '',
    // Laudo
    laudoNome: '',
    laudoBase64: '',
  };
  const [form, setForm] = useState(formInicial);

  // ═══ Auto-abrir modal quando vindo de Pedido de Compras ═══
  useEffect(() => {
    if (pedidoIdParam && pedidos.length > 0) {
      const pedido = pedidos.find(p => p.id === pedidoIdParam);
      if (pedido && pedido.status === 'Em Aberto') {
        setPedidoVinculadoId(pedido.id);
        setForm({
          ...formInicial,
          fornecedorId: pedido.fornecedorId,
          fornecedorNome: pedido.fornecedorNome,
          pedidoCompra: `PC-${String(pedido.numero).padStart(5, '0')}`,
          dataPrevista: pedido.dataPrevistaEntrega,
          dataRecebimento: '',
          valorTotal: pedido.valorEstimado > 0
            ? pedido.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '',
          qualidade: '',
          responsavel: pedido.responsavel || '',
          observacoes: '',
          rofTipo: 'Produto/Serviço NC',
          rofGravidade: 'Média',
          rofDescricao: '',
          rofAcaoImediata: 'Comunicação Informal',
          rofResponsavel: '',
          rofEvidenciaNome: '',
          rofEvidenciaBase64: '',
          laudoNome: '',
          laudoBase64: '',
        });
        setModalAberto(true);
        // Limpar query param
        setSearchParams({}, { replace: true });
      }
    }
  }, [pedidoIdParam, pedidos]);

  // ═══ Filtragem (antes das métricas para que métricas reflitam os filtros) ═══
  const temFiltroAtivo = !!(filtros.busca || filtros.fornecedorId || filtros.periodoInicio || filtros.periodoFim || filtros.apenasAtrasados || filtros.apenasComROF || filtros.apenasComProblemaQualidade);

  const recebimentosFiltrados = useMemo(() => {
    return recebimentos
      .filter(r => {
        if (filtros.busca) {
          const b = filtros.busca.toLowerCase();
          if (
            !r.fornecedorNome.toLowerCase().includes(b) &&
            !r.pedidoCompra.toLowerCase().includes(b) &&
            !r.notaFiscal.toLowerCase().includes(b) &&
            !r.responsavel.toLowerCase().includes(b) &&
            !(r.rofNumero || '').toLowerCase().includes(b)
          ) return false;
        }
        if (filtros.fornecedorId && r.fornecedorId !== filtros.fornecedorId) return false;
        if (filtros.periodoInicio && r.dataRecebimento < filtros.periodoInicio) return false;
        if (filtros.periodoFim && r.dataRecebimento > filtros.periodoFim) return false;
        if (filtros.apenasAtrasados && calcularPrazo(r.dataPrevista, r.dataRecebimento) !== 'Atrasado') return false;
        if (filtros.apenasComROF && !r.rofId) return false;
        if (filtros.apenasComProblemaQualidade && r.qualidade === 'Aprovado') return false;
        return true;
      })
      .sort((a, b) => b.numero - a.numero);
  }, [recebimentos, filtros]);

  // ═══ Métricas (baseadas nos recebimentos filtrados) ═══
  const metricas = useMemo(() => {
    const base = recebimentosFiltrados;
    const total = base.length;
    const noPrazo = base.filter(r => calcularPrazo(r.dataPrevista, r.dataRecebimento) === 'No Prazo').length;
    const atrasados = total - noPrazo;
    const aprovados = base.filter(r => r.qualidade === 'Aprovado').length;
    const comROF = base.filter(r => r.rofId).length;
    const valorTotal = base.reduce((sum, r) => sum + r.valorTotal, 0);
    const taxaPontualidade = total > 0 ? Math.round((noPrazo / total) * 100) : 0;
    const taxaAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;
    return { total, noPrazo, atrasados, aprovados, comROF, valorTotal, taxaPontualidade, taxaAprovacao };
  }, [recebimentosFiltrados]);

  // Paginação
  const totalPaginas = Math.ceil(recebimentosFiltrados.length / itensPorPagina);
  const recebimentosPaginados = recebimentosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // ═══ Fornecedores filtrados para dropdown ═══
  const fornecedoresFiltrados = fornecedores.filter(f =>
    f.razaoSocial.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.nomeFantasia.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.cnpj.includes(buscaFornecedor)
  );

  // ═══ Helpers ═══
  const resetForm = useCallback(() => {
    setForm({
      fornecedorId: '',
      fornecedorNome: '',
      pedidoCompra: '',
      notaFiscal: '',
      dataPrevista: '',
      dataRecebimento: new Date().toISOString().split('T')[0],
      valorTotal: '',
      qualidade: '' as QualidadeRecebimento | '',
      responsavel: '',
      observacoes: '',
      rofTipo: 'Produto/Serviço NC' as TipoROF,
      rofGravidade: 'Média' as GravidadeROF,
      rofDescricao: '',
      rofAcaoImediata: 'Comunicação Informal' as AcaoImediataRecebimento,
      rofResponsavel: '',
      rofEvidenciaNome: '',
      rofEvidenciaBase64: '',
      laudoNome: '',
      laudoBase64: '',
    });
    setBuscaFornecedor('');
    setEditandoId(null);
    setDropdownAberto(false);
    setPedidoVinculadoId(null);
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
    setRofEditMode(false);
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

  const handleEditar = (r: Recebimento) => {
    setForm({
      fornecedorId: r.fornecedorId,
      fornecedorNome: r.fornecedorNome,
      pedidoCompra: r.pedidoCompra,
      notaFiscal: r.notaFiscal,
      dataPrevista: r.dataPrevista,
      dataRecebimento: r.dataRecebimento,
      valorTotal: r.valorTotal > 0 ? r.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      qualidade: r.qualidade,
      responsavel: r.responsavel,
      observacoes: r.observacoes || '',
      rofTipo: r.rofData?.tipo || 'Produto/Serviço NC',
      rofGravidade: r.rofData?.gravidade || 'Média',
      rofDescricao: r.rofData?.descricao || '',
      rofAcaoImediata: r.rofData?.acaoImediata || 'Comunicação Informal',
      rofResponsavel: r.rofData?.responsavel || '',
      rofEvidenciaNome: r.rofData?.evidenciaNome || '',
      rofEvidenciaBase64: r.rofData?.evidenciaBase64 || '',
      laudoNome: r.laudoNome || '',
      laudoBase64: r.laudoBase64 || '',
    });
    setEditandoId(r.id);
    setModalAberto(true);
  };

  const handleExcluir = (r: Recebimento) => {
    if (confirm(`Deseja excluir o recebimento #${String(r.numero).padStart(5, '0')}?`)) {
      deleteRecebimento(r.id);
      toast.success('Recebimento excluído com sucesso');
    }
  };

  const handleSalvar = () => {
    if (!form.fornecedorId) { toast.error('Selecione um fornecedor'); return; }
    if (!form.pedidoCompra) { toast.error('Informe o N. Pedido de Compra'); return; }
    if (!form.dataPrevista) { toast.error('Informe a data prevista'); return; }
    if (!form.dataRecebimento) { toast.error('Informe a data de recebimento'); return; }
    if (!form.valorTotal || parseMoedaBR(form.valorTotal) <= 0) { toast.error('Informe o valor total'); return; }
    if (!form.qualidade) { toast.error('Selecione a qualidade do recebimento'); return; }
    if (!form.responsavel) { toast.error('Informe o responsável'); return; }

    // ROF obrigatória se qualidade ≠ Aprovado
    const precisaROF = form.qualidade !== 'Aprovado';
    if (precisaROF) {
      if (!form.rofDescricao) { toast.error('Descrição obrigatória para ROF'); return; }
      if (!form.rofResponsavel) { toast.error('Responsável obrigatório para ROF'); return; }
    }

    const dados: any = {
      fornecedorId: form.fornecedorId,
      fornecedorNome: form.fornecedorNome,
      pedidoCompra: form.pedidoCompra,
      notaFiscal: form.notaFiscal,
      dataPrevista: form.dataPrevista,
      dataRecebimento: form.dataRecebimento,
      valorTotal: parseMoedaBR(form.valorTotal),
      qualidade: form.qualidade as QualidadeRecebimento,
      responsavel: form.responsavel,
      observacoes: form.observacoes,
      laudoNome: form.laudoNome || undefined,
      laudoBase64: form.laudoBase64 || undefined,
      rofData: precisaROF ? {
        tipo: form.rofTipo,
        gravidade: form.rofGravidade,
        descricao: form.rofDescricao,
        acaoImediata: form.rofAcaoImediata,
        responsavel: form.rofResponsavel,
        evidenciaNome: form.rofEvidenciaNome,
        evidenciaBase64: form.rofEvidenciaBase64,
      } : undefined,
    };

    // Adicionar vínculo com pedido se existir
    if (pedidoVinculadoId) {
      const pedido = pedidos.find(p => p.id === pedidoVinculadoId);
      if (pedido) {
        dados.pedidoCompraId = pedido.id;
        dados.pedidoCompraNumero = pedido.numero;
      }
    }

    if (editandoId) {
      updateRecebimento(editandoId, dados);
      toast.success('Recebimento atualizado com sucesso');
    } else {
      const novoRec = addRecebimento(dados);

      // Atualizar status do pedido vinculado para "Recebido"
      if (pedidoVinculadoId) {
        updatePedido(pedidoVinculadoId, {
          status: 'Recebido',
          recebimentoId: novoRec.id,
          recebimentoNumero: novoRec.numero,
        });
      }

      if (novoRec.rofNumero) {
        toast.success(`Recebimento criado com ROF ${novoRec.rofNumero} vinculada`);
      } else {
        toast.success('Recebimento registrado com sucesso');
      }
    }
    fecharModal();
  };

  // Prazo calculado em tempo real no form
  const prazoForm = form.dataPrevista && form.dataRecebimento
    ? calcularPrazo(form.dataPrevista, form.dataRecebimento)
    : null;

  // Recebimento visualizado
  const recVisualizando = visualizandoId ? recebimentos.find(r => r.id === visualizandoId) : null;
  const rofVinculada = recVisualizando?.rofId ? rofs.find(r => r.id === recVisualizando.rofId) : null;

  // ═══ ROF inline edit state ═══
  const [rofEditMode, setRofEditMode] = useState(false);
  const [rofEditForm, setRofEditForm] = useState({
    tipo: '' as TipoROF,
    gravidade: '' as GravidadeROF,
    descricao: '',
    acaoImediata: '',
    responsavel: '',
    status: '' as StatusROF,
  });

  const abrirDrawerComROF = (recId: string) => {
    setVisualizandoId(recId);
    setRofEditMode(false);
  };

  const iniciarEdicaoROF = (rof: ROF) => {
    setRofEditForm({
      tipo: rof.tipo,
      gravidade: rof.gravidade,
      descricao: rof.descricao,
      acaoImediata: rof.acaoImediata || '',
      responsavel: rof.responsavel,
      status: rof.status,
    });
    setRofEditMode(true);
  };

  const salvarEdicaoROF = () => {
    if (!rofVinculada) return;
    if (!rofEditForm.descricao) { toast.error('Descrição obrigatória'); return; }
    if (!rofEditForm.responsavel) { toast.error('Responsável obrigatório'); return; }
    updateROF(rofVinculada.id, {
      tipo: rofEditForm.tipo,
      gravidade: rofEditForm.gravidade,
      descricao: rofEditForm.descricao,
      acaoImediata: rofEditForm.acaoImediata,
      responsavel: rofEditForm.responsavel,
      status: rofEditForm.status,
    });
    setRofEditMode(false);
    toast.success('ROF atualizada com sucesso');
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Recebimento
          </h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Registre recebimentos, controle pontualidade e qualidade das entregas
          </p>
        </div>
        <Button onClick={handleNovo} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Recebimento
        </Button>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      {temFiltroAtivo && (
        <div className="flex items-center gap-2 -mb-4">
          <Filter className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-blue-600" style={{ fontWeight: 500 }}>
            Indicadores filtrados — exibindo {metricas.total} de {recebimentos.length} recebimento(s)
          </span>
        </div>
      )}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard label="Total de Recebimentos" value={metricas.total} icon={Package} variant="info" />
        <MetricCard
          label="Valor Total Recebido"
          value={formatarMoeda(metricas.valorTotal)}
          icon={DollarSign}
          variant="default"
        />
        <MetricCard
          label="Taxa de Pontualidade"
          value={`${metricas.taxaPontualidade}%`}
          icon={Clock}
          variant={metricas.taxaPontualidade >= 80 ? 'success' : metricas.taxaPontualidade >= 60 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Taxa de Aprovacao"
          value={`${metricas.taxaAprovacao}%`}
          icon={CheckCircle}
          variant={metricas.taxaAprovacao >= 80 ? 'success' : metricas.taxaAprovacao >= 60 ? 'warning' : 'danger'}
        />
        <MetricCard
          label="Com ROF Vinculada"
          value={metricas.comROF}
          icon={FileText}
          variant={metricas.comROF > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Filtros</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={filtros.busca}
              onChange={e => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              className="pl-10"
              placeholder="Buscar por fornecedor, pedido, NF ou ROF..."
            />
          </div>
          <select
            value={filtros.fornecedorId}
            onChange={e => setFiltros(prev => ({ ...prev, fornecedorId: e.target.value }))}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os fornecedores</option>
            {fornecedores.map(f => (
              <option key={f.id} value={f.id}>{f.razaoSocial}</option>
            ))}
          </select>
          <Input
            type="date"
            value={filtros.periodoInicio}
            onChange={e => setFiltros(prev => ({ ...prev, periodoInicio: e.target.value }))}
            placeholder="Data início"
          />
          <Input
            type="date"
            value={filtros.periodoFim}
            onChange={e => setFiltros(prev => ({ ...prev, periodoFim: e.target.value }))}
            placeholder="Data fim"
          />
        </div>
        <div className="flex items-center gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filtros.apenasAtrasados}
              onChange={e => setFiltros(prev => ({ ...prev, apenasAtrasados: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Apenas atrasados
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filtros.apenasComROF}
              onChange={e => setFiltros(prev => ({ ...prev, apenasComROF: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Apenas com ROF
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filtros.apenasComProblemaQualidade}
              onChange={e => setFiltros(prev => ({ ...prev, apenasComProblemaQualidade: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Apenas com problema de qualidade
          </label>
          {(filtros.busca || filtros.fornecedorId || filtros.periodoInicio || filtros.periodoFim || filtros.apenasAtrasados || filtros.apenasComROF || filtros.apenasComProblemaQualidade) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltros({ busca: '', fornecedorId: '', periodoInicio: '', periodoFim: '', apenasAtrasados: false, apenasComROF: false, apenasComProblemaQualidade: false })}
              className="text-gray-500 ml-auto"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ═══ TABELA ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {recebimentosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              {recebimentos.length === 0 ? 'Nenhum recebimento cadastrado' : 'Nenhum recebimento encontrado'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {recebimentos.length === 0 ? 'Registre o primeiro recebimento para acompanhar entregas' : 'Ajuste os filtros para encontrar recebimentos'}
            </p>
            {recebimentos.length === 0 && (
              <Button onClick={handleNovo}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Recebimento
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>N.</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Pedido / NF</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Data Receb.</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Qualidade</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>ROF</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Laudo</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Valor Total</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Responsavel</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recebimentosPaginados.map(rec => {
                    const prazo = calcularPrazo(rec.dataPrevista, rec.dataRecebimento);
                    const prazoStyle = PRAZO_CONFIG[prazo];
                    const qualidadeStyle = QUALIDADE_CONFIG[rec.qualidade];
                    const isRejeitado = rec.qualidade === 'Rejeitado';

                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-gray-50/50 transition-colors ${isRejeitado ? 'border-l-2 border-l-red-400' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-500" style={{ fontWeight: 500 }}>
                          #{String(rec.numero).padStart(5, '0')}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 truncate max-w-[200px]" style={{ fontWeight: 500 }}>{rec.fornecedorNome}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {rec.pedidoCompraId ? (
                            <button
                              onClick={() => navigate(`/fornecedores/pedidos?viewPedidoId=${rec.pedidoCompraId}`)}
                              className="text-sm text-blue-600 hover:underline"
                              style={{ fontWeight: 500 }}
                            >
                              {rec.pedidoCompra}
                            </button>
                          ) : (
                            <p className="text-sm text-gray-900">{rec.pedidoCompra}</p>
                          )}
                          <p className="text-xs text-gray-400">NF: {rec.notaFiscal || '—'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-gray-600">{formatarDataPtBr(rec.dataRecebimento)}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${prazoStyle.bg} ${prazoStyle.text} border ${prazoStyle.border} mt-0.5`} style={{ fontSize: '0.6875rem', fontWeight: 500 }}>
                            {prazo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${qualidadeStyle.bg} ${qualidadeStyle.text} border ${qualidadeStyle.border}`}>
                            {qualidadeStyle.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rec.rofNumero ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDrawerComROF(rec.id)}
                              className="h-6 px-2 text-xs text-amber-700 hover:underline"
                              title={`Ver ${rec.rofNumero}`}
                            >
                              {rec.rofNumero}
                            </Button>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rec.laudoNome ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVisualizandoId(rec.id)}
                              className="h-6 px-2 text-xs text-indigo-700 hover:underline"
                              title={rec.laudoNome}
                            >
                              <FileText className="w-3 h-3" />
                              Laudo
                            </Button>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 whitespace-nowrap" style={{ fontWeight: 500 }}>
                          {formatarMoeda(rec.valorTotal)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[120px]">
                          {rec.responsavel}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setVisualizandoId(rec.id)} title="Visualizar" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditar(rec)} title="Editar" className="h-8 w-8 p-0">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleExcluir(rec)} title="Excluir" className="h-8 w-8 p-0 text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Exibindo {((paginaAtual - 1) * itensPorPagina) + 1}-{Math.min(paginaAtual * itensPorPagina, recebimentosFiltrados.length)} de {recebimentosFiltrados.length}</span>
                <select
                  value={itensPorPagina}
                  onChange={e => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
                  className="border border-gray-200 rounded-lg py-1 px-2 text-xs"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} por pagina</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual(p => p - 1)}
                  className="text-sm"
                >
                  Anterior
                </Button>
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => i + 1).map(p => (
                  <Button
                    key={p}
                    variant={paginaAtual === p ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPaginaAtual(p)}
                    className={`h-8 w-8 p-0 text-sm ${paginaAtual === p ? 'bg-gray-900 text-white' : ''}`}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPaginaAtual(p => p + 1)}
                  className="text-sm"
                >
                  Proximo
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ MODAL: NOVO / EDITAR RECEBIMENTO ═══ */}
      {(modalAberto || modalFechando) && (
        <div
          className={`fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/50 overflow-y-auto ${modalFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModal}
        >
          <div
            className={`bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8 mx-4 ${modalFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-recebimento-modal-title"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 id="fornecedor-recebimento-modal-title" className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {editandoId ? 'Editar Recebimento' : 'Novo Recebimento'}
              </h2>
              <button onClick={() => { fecharModal(); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Banner de vínculo com Pedido */}
            {pedidoVinculadoId && (() => {
              const pedidoLinked = pedidos.find(p => p.id === pedidoVinculadoId);
              if (!pedidoLinked) return null;
              return (
                <div className="mx-6 mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-700" style={{ fontWeight: 500 }}>
                      Recebimento vinculado ao Pedido PC-{String(pedidoLinked.numero).padStart(5, '0')}
                    </p>
                    <p className="text-xs text-blue-500 truncate mt-0.5">
                      {pedidoLinked.fornecedorNome} &bull; Previsão: {formatarDataPtBr(pedidoLinked.dataPrevistaEntrega)}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Bloco A - Identificacao */}
              <div className="space-y-4">
                <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  <Package className="w-4 h-4 text-blue-600" />
                  Identificacao
                </h3>

                {/* Fornecedor dropdown com busca */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Fornecedor *</label>
                  {form.fornecedorId ? (
                    <div className={`flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 ${pedidoVinculadoId ? 'bg-gray-50' : ''}`}>
                      <span className={`text-sm ${pedidoVinculadoId ? 'text-gray-500' : 'text-gray-900'}`} style={{ fontWeight: 500 }}>{form.fornecedorNome}</span>
                      {!pedidoVinculadoId && (
                        <button onClick={() => { setForm(prev => ({ ...prev, fornecedorId: '', fornecedorNome: '' })); setBuscaFornecedor(''); }} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={buscaFornecedor}
                        onChange={e => { setBuscaFornecedor(e.target.value); setDropdownAberto(true); }}
                        onFocus={() => setDropdownAberto(true)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Buscar fornecedor..."
                      />
                      {dropdownAberto && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {fornecedoresFiltrados.length === 0 ? (
                            <p className="p-3 text-sm text-gray-400 text-center">Nenhum fornecedor encontrado</p>
                          ) : (
                            fornecedoresFiltrados.map(f => (
                              <button
                                key={f.id}
                                onClick={() => {
                                  setForm(prev => ({ ...prev, fornecedorId: f.id, fornecedorNome: f.razaoSocial }));
                                  setDropdownAberto(false);
                                  setBuscaFornecedor('');
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                              >
                                <p className="text-gray-900" style={{ fontWeight: 500 }}>{f.razaoSocial}</p>
                                <p className="text-xs text-gray-400">{f.cnpj} - {f.nomeFantasia}</p>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>
                      N. Pedido de Compra *
                      {pedidoVinculadoId && (
                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200" style={{ fontWeight: 500 }}>
                          <Link2 className="w-3 h-3" /> Vinculado
                        </span>
                      )}
                    </label>
                    <input type="text" value={form.pedidoCompra} onChange={e => !pedidoVinculadoId && setForm(prev => ({ ...prev, pedidoCompra: e.target.value }))}
                      readOnly={!!pedidoVinculadoId}
                      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${pedidoVinculadoId ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} placeholder="Ex: PC-2026-001" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>N. Nota Fiscal</label>
                    <input type="text" value={form.notaFiscal} onChange={e => setForm(prev => ({ ...prev, notaFiscal: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Ex: NF-12345" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Data Prevista de Entrega *</label>
                    <input type="date" value={form.dataPrevista} onChange={e => setForm(prev => ({ ...prev, dataPrevista: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Data de Recebimento *</label>
                    <input type="date" value={form.dataRecebimento} onChange={e => setForm(prev => ({ ...prev, dataRecebimento: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Valor Total (R$) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="text" value={form.valorTotal} onChange={e => setForm(prev => ({ ...prev, valorTotal: formatarMoedaInput(e.target.value) }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="0,00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Responsavel *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="text" value={form.responsavel} onChange={e => setForm(prev => ({ ...prev, responsavel: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Nome do responsável" />
                    </div>
                  </div>
                </div>

                {/* Status do prazo em tempo real */}
                {prazoForm && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${PRAZO_CONFIG[prazoForm].bg} ${PRAZO_CONFIG[prazoForm].border}`}>
                    {prazoForm === 'No Prazo' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                    <span className={`text-sm ${PRAZO_CONFIG[prazoForm].text}`} style={{ fontWeight: 500 }}>
                      Status do Prazo: {prazoForm}
                    </span>
                  </div>
                )}
              </div>

              {/* Bloco B - Qualidade */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Qualidade do Recebimento *
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {(['Aprovado', 'Aceito Condicional', 'Rejeitado'] as QualidadeRecebimento[]).map(q => {
                    const cfg = QUALIDADE_CONFIG[q];
                    const isSelected = form.qualidade === q;
                    return (
                      <button
                        key={q}
                        onClick={() => setForm(prev => ({ ...prev, qualidade: q }))}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ${q === 'Aprovado' ? 'ring-emerald-300' : q === 'Aceito Condicional' ? 'ring-amber-300' : 'ring-red-300'}`
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {q === 'Aprovado' && <CheckCircle className={`w-6 h-6 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />}
                        {q === 'Aceito Condicional' && <AlertTriangle className={`w-6 h-6 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`} />}
                        {q === 'Rejeitado' && <XCircle className={`w-6 h-6 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />}
                        <span className={`text-sm ${isSelected ? cfg.text : 'text-gray-600'}`} style={{ fontWeight: 600 }}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Bloco ROF inline */}
                {form.qualidade && form.qualidade !== 'Aprovado' && (
                  <div className="space-y-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-800" style={{ fontWeight: 600 }}>ROF obrigatoria para este recebimento</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Tipo *</label>
                        <select value={form.rofTipo} onChange={e => setForm(prev => ({ ...prev, rofTipo: e.target.value as TipoROF }))}
                          className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                          <option value="Documental">Documental</option>
                          <option value="Atendimento">Atendimento</option>
                          <option value="Produto/Serviço NC">Produto/Servico NC</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Gravidade *</label>
                        <select value={form.rofGravidade} onChange={e => setForm(prev => ({ ...prev, rofGravidade: e.target.value as GravidadeROF }))}
                          className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                          <option value="Baixa">Baixa</option>
                          <option value="Média">Media</option>
                          <option value="Alta">Alta</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Descricao da Ocorrencia *</label>
                      <textarea value={form.rofDescricao} onChange={e => setForm(prev => ({ ...prev, rofDescricao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" rows={3}
                        placeholder="Descreva detalhadamente a ocorrência..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Acao Imediata</label>
                        <select value={form.rofAcaoImediata} onChange={e => setForm(prev => ({ ...prev, rofAcaoImediata: e.target.value as AcaoImediataRecebimento }))}
                          className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                          <option value="Comunicação Informal">Comunicacao Informal</option>
                          <option value="Notificação Formal">Notificacao Formal</option>
                          <option value="Suspensão Temporária">Suspensao Temporaria</option>
                          <option value="Outra">Outra</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Responsavel ROF *</label>
                        <input type="text" value={form.rofResponsavel} onChange={e => setForm(prev => ({ ...prev, rofResponsavel: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="Responsável pelo tratamento" />
                      </div>
                    </div>

                    {/* Evidência (upload opcional) */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>
                        Evidencia <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      {form.rofEvidenciaNome ? (
                        <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            {form.rofEvidenciaBase64?.startsWith('data:image')
                              ? <ImageIcon className="w-4 h-4 text-blue-500" />
                              : <Paperclip className="w-4 h-4 text-blue-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{form.rofEvidenciaNome}</p>
                            {form.rofEvidenciaBase64 && (
                              <p className="text-xs text-gray-400">
                                {Math.round(form.rofEvidenciaBase64.length * 0.75 / 1024)} KB
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, rofEvidenciaNome: '', rofEvidenciaBase64: '' }))}
                            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            title="Remover arquivo"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 px-3 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors" style={{ fontWeight: 500 }}>
                              Clique para anexar evidencia
                            </p>
                            <p className="text-xs text-gray-400">PDF, imagem ou documento (max. 5MB)</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('Arquivo muito grande. Limite: 5MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setForm(prev => ({
                                  ...prev,
                                  rofEvidenciaNome: file.name,
                                  rofEvidenciaBase64: reader.result as string
                                }));
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Observacoes (opcional)</label>
                <textarea value={form.observacoes} onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" rows={2}
                  placeholder="Observações adicionais..." />
              </div>

              {/* Bloco C - Laudo de Recebimento */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  <FileText className="w-4 h-4 text-blue-600" />
                  Laudo de Recebimento <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                </h3>

                {form.laudoNome ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      {form.laudoBase64?.startsWith('data:image')
                        ? <ImageIcon className="w-4 h-4 text-indigo-500" />
                        : <FileText className="w-4 h-4 text-indigo-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{form.laudoNome}</p>
                      {form.laudoBase64 && (
                        <p className="text-xs text-gray-400">
                          {Math.round(form.laudoBase64.length * 0.75 / 1024)} KB
                        </p>
                      )}
                    </div>
                    {form.laudoBase64?.startsWith('data:image') && (
                      <img
                        src={form.laudoBase64}
                        alt="Preview do laudo"
                        className="w-10 h-10 rounded object-cover border border-gray-200 flex-shrink-0"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, laudoNome: '', laudoBase64: '' }))}
                      className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                      title="Remover laudo"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex items-center gap-3 px-3 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50/30'); }}
                    onDragLeave={e => { e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/30'); }}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/30');
                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Limite: 5MB'); return; }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm(prev => ({ ...prev, laudoNome: file.name, laudoBase64: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <Upload className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 group-hover:text-indigo-600 transition-colors" style={{ fontWeight: 500 }}>
                        Clique ou arraste para anexar o laudo
                      </p>
                      <p className="text-xs text-gray-400">PDF, imagem ou documento (max. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Limite: 5MB'); return; }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setForm(prev => ({ ...prev, laudoNome: file.name, laudoBase64: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { fecharModal(); }}>Cancelar</Button>
              <Button onClick={handleSalvar}>
                {editandoId ? 'Salvar Alteracoes' : 'Registrar Recebimento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DRAWER: VISUALIZAR RECEBIMENTO ═══ */}
      <Dialog open={!!recVisualizando} onOpenChange={v => { if (!v) fecharDrawer(); }}>
        <DialogContent className="w-full sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-0">
          {recVisualizando && (
            <>
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 pr-14">
                <DialogHeader className="gap-1">
                  <DialogTitle className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Recebimento #{String(recVisualizando.numero).padStart(5, '0')}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
              {/* Dados do recebimento */}
              <div className="space-y-3">
                <h3 className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Dados do Recebimento</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Fornecedor</p>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>{recVisualizando.fornecedorNome}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Responsavel</p>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>{recVisualizando.responsavel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pedido de Compra</p>
                    {recVisualizando.pedidoCompraId ? (
                      <button
                        onClick={() => {
                          setVisualizandoId(null);
                          navigate(`/fornecedores/pedidos?viewPedidoId=${recVisualizando.pedidoCompraId}`);
                        }}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        style={{ fontWeight: 500 }}
                      >
                        <Link2 className="w-3 h-3" />
                        {recVisualizando.pedidoCompra}
                      </button>
                    ) : (
                      <p className="text-gray-900" style={{ fontWeight: 500 }}>{recVisualizando.pedidoCompra}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500">Nota Fiscal</p>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>{recVisualizando.notaFiscal || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Data Prevista</p>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>{formatarDataPtBr(recVisualizando.dataPrevista)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Data Recebimento</p>
                    <p className="text-gray-900" style={{ fontWeight: 500 }}>{formatarDataPtBr(recVisualizando.dataRecebimento)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valor Total</p>
                    <p className="text-gray-900" style={{ fontWeight: 600 }}>{formatarMoeda(recVisualizando.valorTotal)}</p>
                  </div>
                </div>
              </div>

              {/* Prazo e Qualidade */}
              <div className="grid grid-cols-2 gap-4">
                {(() => {
                  const prazo = calcularPrazo(recVisualizando.dataPrevista, recVisualizando.dataRecebimento);
                  const prazoStyle = PRAZO_CONFIG[prazo];
                  return (
                    <div className={`p-4 rounded-xl border ${prazoStyle.bg} ${prazoStyle.border}`}>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Pontualidade</p>
                      <div className="flex items-center gap-2">
                        {prazo === 'No Prazo' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                        <span className={`text-sm ${prazoStyle.text}`} style={{ fontWeight: 600 }}>{prazo}</span>
                      </div>
                    </div>
                  );
                })()}
                <div className={`p-4 rounded-xl border ${QUALIDADE_CONFIG[recVisualizando.qualidade].bg} ${QUALIDADE_CONFIG[recVisualizando.qualidade].border}`}>
                  <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Qualidade</p>
                  <div className="flex items-center gap-2">
                    {recVisualizando.qualidade === 'Aprovado' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                    {recVisualizando.qualidade === 'Aceito Condicional' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                    {recVisualizando.qualidade === 'Rejeitado' && <XCircle className="w-5 h-5 text-red-600" />}
                    <span className={`text-sm ${QUALIDADE_CONFIG[recVisualizando.qualidade].text}`} style={{ fontWeight: 600 }}>
                      {recVisualizando.qualidade}
                    </span>
                  </div>
                </div>
              </div>

              {recVisualizando.observacoes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1" style={{ fontWeight: 500 }}>Observacoes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">{recVisualizando.observacoes}</p>
                </div>
              )}

              {/* Laudo de Recebimento */}
              {recVisualizando.laudoNome && (
                <div className="space-y-2">
                  <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Laudo de Recebimento
                  </h3>
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      {recVisualizando.laudoBase64?.startsWith('data:image')
                        ? <ImageIcon className="w-4 h-4 text-indigo-500" />
                        : <FileText className="w-4 h-4 text-indigo-500" />
                      }
                    </div>
                    <span className="text-sm text-gray-900 truncate flex-1" style={{ fontWeight: 500 }}>
                      {recVisualizando.laudoNome}
                    </span>
                    {recVisualizando.laudoBase64 && (
                      <>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {Math.round(recVisualizando.laudoBase64.length * 0.75 / 1024)} KB
                        </span>
                        <a
                          href={recVisualizando.laudoBase64}
                          download={recVisualizando.laudoNome}
                          className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex-shrink-0"
                          style={{ fontWeight: 500 }}
                        >
                          Baixar
                        </a>
                      </>
                    )}
                  </div>
                  {recVisualizando.laudoBase64?.startsWith('data:image') && (
                    <img
                      src={recVisualizando.laudoBase64}
                      alt="Laudo de recebimento"
                      className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                    />
                  )}
                </div>
              )}

              {/* ROF Vinculada — View / Edit Inline */}
              {rofVinculada && (
                <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-amber-800 flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      <FileText className="w-4 h-4" />
                      ROF Vinculada — {rofVinculada.numero}
                    </h3>
                    {!rofEditMode ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => iniciarEdicaoROF(rofVinculada)}
                        className="text-amber-700 gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRofEditMode(false)}
                          className="text-gray-500"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={salvarEdicaoROF}
                          className="gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Salvar
                        </Button>
                      </div>
                    )}
                  </div>

                  {!rofEditMode ? (
                    /* ── Modo Visualização ── */
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                            rofVinculada.status === 'Aberta' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            rofVinculada.status === 'Em Tratamento' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            rofVinculada.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}>
                            {rofVinculada.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500">Gravidade</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${
                            rofVinculada.gravidade === 'Alta' ? 'bg-red-50 text-red-700 border border-red-200' :
                            rofVinculada.gravidade === 'Média' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {rofVinculada.gravidade}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500">Tipo</p>
                          <p className="text-gray-900" style={{ fontWeight: 500 }}>{rofVinculada.tipo}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Responsavel</p>
                          <p className="text-gray-900" style={{ fontWeight: 500 }}>{rofVinculada.responsavel}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Data Abertura</p>
                          <p className="text-gray-900" style={{ fontWeight: 500 }}>{formatarDataPtBr(rofVinculada.dataAbertura)}</p>
                        </div>
                        {rofVinculada.acaoImediata && (
                          <div>
                            <p className="text-gray-500">Acao Imediata</p>
                            <p className="text-gray-900" style={{ fontWeight: 500 }}>{rofVinculada.acaoImediata}</p>
                          </div>
                        )}
                      </div>
                      {rofVinculada.descricao && (
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Descricao</p>
                          <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">{rofVinculada.descricao}</p>
                        </div>
                      )}
                      {/* Evidência anexada */}
                      {recVisualizando.rofData?.evidenciaNome && (
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Evidencia</p>
                          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                            <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>
                              {recVisualizando.rofData.evidenciaNome}
                            </span>
                            {recVisualizando.rofData.evidenciaBase64 && (
                              <a
                                href={recVisualizando.rofData.evidenciaBase64}
                                download={recVisualizando.rofData.evidenciaNome}
                                className="ml-auto text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                style={{ fontWeight: 500 }}
                              >
                                Baixar
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ── Modo Edição Inline ── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>Status</label>
                          <select value={rofEditForm.status} onChange={e => setRofEditForm(prev => ({ ...prev, status: e.target.value as StatusROF }))}
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white">
                            <option value="Aberta">Aberta</option>
                            <option value="Em Tratamento">Em Tratamento</option>
                            <option value="Concluída">Concluída</option>
                            <option value="Cancelada">Cancelada</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>Gravidade</label>
                          <select value={rofEditForm.gravidade} onChange={e => setRofEditForm(prev => ({ ...prev, gravidade: e.target.value as GravidadeROF }))}
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white">
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Media</option>
                            <option value="Alta">Alta</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>Tipo</label>
                          <select value={rofEditForm.tipo} onChange={e => setRofEditForm(prev => ({ ...prev, tipo: e.target.value as TipoROF }))}
                            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white">
                            <option value="Documental">Documental</option>
                            <option value="Atendimento">Atendimento</option>
                            <option value="Produto/Serviço NC">Produto/Servico NC</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>Responsavel *</label>
                          <input type="text" value={rofEditForm.responsavel} onChange={e => setRofEditForm(prev => ({ ...prev, responsavel: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                            placeholder="Responsável" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>Acao Imediata</label>
                        <input type="text" value={rofEditForm.acaoImediata} onChange={e => setRofEditForm(prev => ({ ...prev, acaoImediata: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                          placeholder="Ação imediata tomada" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>Descricao *</label>
                        <textarea value={rofEditForm.descricao} onChange={e => setRofEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white" rows={3}
                          placeholder="Descreva a ocorrência..." />
                      </div>
                    </div>
                  )}
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
