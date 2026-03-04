import { 
  Users, 
  AlertTriangle, 
  Clock, 
  Ban, 
  FileX, 
  FileWarning,
  ClipboardList,
  TrendingUp,
  ChevronRight,
  CalendarClock,
  ShieldAlert,
  FileCheck2,
  Lock,
  Package,
  CheckCircle,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  Timer,
  ArrowRight,
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Button } from '../../components/ui/button';
import { MetricCard } from '../../components/ui/metric-card';
import { useNavigate } from 'react-router';
import { getFornecedorStatusColor, getCriticidadeColor } from '../../utils/fornecedor-helpers';
import { useMemo, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Filter, X } from 'lucide-react';
import { formatarDataPtBr } from '../../utils/formatters';

export function FornecedoresDashboard() {
  const { fornecedores, recebimentos, pedidos, configuracao, getEstatisticas } = useFornecedores();
  const navigate = useNavigate();
  const stats = getEstatisticas();

  // ═══ Filtros de recebimento no dashboard ═══
  const [recFiltros, setRecFiltros] = useState({
    fornecedorId: '',
    periodoInicio: '',
    periodoFim: '',
  });
  const temRecFiltro = !!(recFiltros.fornecedorId || recFiltros.periodoInicio || recFiltros.periodoFim);

  const recebimentosFiltrados = useMemo(() => {
    return recebimentos.filter(r => {
      if (recFiltros.fornecedorId && r.fornecedorId !== recFiltros.fornecedorId) return false;
      if (recFiltros.periodoInicio && r.dataRecebimento < recFiltros.periodoInicio) return false;
      if (recFiltros.periodoFim && r.dataRecebimento > recFiltros.periodoFim) return false;
      return true;
    });
  }, [recebimentos, recFiltros]);

  // Estatísticas de recebimento (baseadas nos filtrados)
  const recebimentoStats = useMemo(() => {
    const base = recebimentosFiltrados;
    const total = base.length;
    const noPrazo = base.filter(r => {
      if (!r.dataPrevista || !r.dataRecebimento) return true;
      return new Date(r.dataRecebimento) <= new Date(r.dataPrevista);
    }).length;
    const atrasados = total - noPrazo;
    const aprovados = base.filter(r => r.qualidade === 'Aprovado').length;
    const rejeitados = base.filter(r => r.qualidade === 'Rejeitado').length;
    const valorTotalRecebido = base.reduce((sum, r) => sum + (r.valorTotal || 0), 0);
    const taxaPontualidade = total > 0 ? Math.round((noPrazo / total) * 100) : 0;
    const taxaAprovacao = total > 0 ? Math.round((aprovados / total) * 100) : 0;
    return { total, noPrazo, atrasados, aprovados, rejeitados, valorTotalRecebido, taxaPontualidade, taxaAprovacao };
  }, [recebimentosFiltrados]);

  // Estatísticas de bloqueios
  const bloqueioStats = fornecedores.reduce((acc, f) => {
    if (f.historicoBloqueios && f.historicoBloqueios.length > 0) {
      acc.fornecedoresComHistorico++;
      acc.totalBloqueios += f.historicoBloqueios.filter(r => r.acao === 'Bloqueio').length;
      acc.totalDesbloqueios += f.historicoBloqueios.filter(r => r.acao === 'Desbloqueio').length;
    }
    return acc;
  }, { fornecedoresComHistorico: 0, totalBloqueios: 0, totalDesbloqueios: 0 });

  const top5 = [...fornecedores]
    .filter(f => f.notaMedia !== undefined)
    .sort((a, b) => (b.notaMedia || 0) - (a.notaMedia || 0))
    .slice(0, 5);

  // ═══ Estatísticas de Pedido de Compras ═══
  const pedidoHabilitado = configuracao.habilitarPedidoCompras;
  const hoje = new Date().toISOString().split('T')[0];

  const pedidoStats = useMemo(() => {
    if (!pedidoHabilitado) return null;

    const total = pedidos.length;
    const emAberto = pedidos.filter(p => p.status === 'Em Aberto');
    const recebidos = pedidos.filter(p => p.status === 'Recebido');
    const cancelados = pedidos.filter(p => p.status === 'Cancelado');

    const valorEmAberto = emAberto.reduce((sum, p) => sum + p.valorEstimado, 0);
    const valorRecebido = recebidos.reduce((sum, p) => sum + p.valorEstimado, 0);

    // Pedidos atrasados: status "Em Aberto" com dataPrevistaEntrega < hoje
    const atrasados = emAberto.filter(p => p.dataPrevistaEntrega < hoje);

    // Lead time: para pedidos com recebimento vinculado
    const pedidosComRecebimento = pedidos.filter(p => p.status === 'Recebido' && p.recebimentoId);
    const leadTimes: { pedido: typeof pedidos[0]; recebimento: typeof recebimentos[0]; dias: number }[] = [];

    pedidosComRecebimento.forEach(p => {
      const rec = recebimentos.find(r => r.id === p.recebimentoId);
      if (rec && rec.dataRecebimento && p.dataPedido) {
        const dataPedido = new Date(p.dataPedido);
        const dataRec = new Date(rec.dataRecebimento);
        const diffMs = dataRec.getTime() - dataPedido.getTime();
        const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
        leadTimes.push({ pedido: p, recebimento: rec, dias });
      }
    });

    const leadTimeMedia = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((sum, lt) => sum + lt.dias, 0) / leadTimes.length)
      : 0;
    const leadTimeMin = leadTimes.length > 0
      ? Math.min(...leadTimes.map(lt => lt.dias))
      : 0;
    const leadTimeMax = leadTimes.length > 0
      ? Math.max(...leadTimes.map(lt => lt.dias))
      : 0;

    // Lead time por fornecedor (top 5 mais lentos)
    const leadTimePorFornecedor: Record<string, { nome: string; total: number; count: number }> = {};
    leadTimes.forEach(lt => {
      const fId = lt.pedido.fornecedorId;
      if (!leadTimePorFornecedor[fId]) {
        leadTimePorFornecedor[fId] = { nome: lt.pedido.fornecedorNome, total: 0, count: 0 };
      }
      leadTimePorFornecedor[fId].total += lt.dias;
      leadTimePorFornecedor[fId].count++;
    });
    const leadTimeRanking = Object.entries(leadTimePorFornecedor)
      .map(([id, data]) => ({ id, nome: data.nome, media: Math.round(data.total / data.count), count: data.count }))
      .sort((a, b) => b.media - a.media)
      .slice(0, 5);

    // Últimos 5 lead times
    const ultimosLeadTimes = [...leadTimes]
      .sort((a, b) => new Date(b.recebimento.dataRecebimento).getTime() - new Date(a.recebimento.dataRecebimento).getTime())
      .slice(0, 5);

    // Pontualidade pedidos: recebidos no prazo vs atrasados
    const recebidosNoPrazo = pedidosComRecebimento.filter(p => {
      const rec = recebimentos.find(r => r.id === p.recebimentoId);
      if (!rec) return true;
      return rec.dataRecebimento <= p.dataPrevistaEntrega;
    }).length;
    const taxaPontualidadePedidos = pedidosComRecebimento.length > 0
      ? Math.round((recebidosNoPrazo / pedidosComRecebimento.length) * 100)
      : 0;

    return {
      total,
      emAberto: emAberto.length,
      recebidos: recebidos.length,
      cancelados: cancelados.length,
      valorEmAberto,
      valorRecebido,
      atrasados,
      leadTimeMedia,
      leadTimeMin,
      leadTimeMax,
      leadTimes,
      leadTimeRanking,
      ultimosLeadTimes,
      taxaPontualidadePedidos,
      pedidosComRecebimentoCount: pedidosComRecebimento.length,
    };
  }, [pedidos, recebimentos, pedidoHabilitado, hoje]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="mb-8">
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Dashboard de Fornecedores
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Visão geral do desempenho e alertas do módulo
        </p>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total de Fornecedores"
          value={stats.total}
          icon={Users}
          variant="info"
        />
        <MetricCard
          label="Críticos"
          value={stats.criticos}
          icon={AlertTriangle}
          variant="danger"
        />
        <MetricCard
          label="Em Homologação"
          value={stats.emHomologacao}
          icon={Clock}
          variant="default"
        />
        <MetricCard
          label="Bloqueados"
          value={stats.bloqueados}
          icon={Ban}
          variant="danger"
        />
      </div>

      {/* ═══ ALERTAS ═══ */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldAlert className="w-4 h-4 text-gray-400" />
          <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            Painel de Alertas
          </h3>
          <span className="text-xs text-gray-400">Situações que requerem atenção</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Avaliações Vencidas */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.avaliacoesVencidas > 0 
                ? 'border-red-200 hover:border-red-300 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/cadastro?alerta=aval-vencida')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.avaliacoesVencidas > 0 ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <FileX className={`w-4 h-4 ${stats.avaliacoesVencidas > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Avaliações Vencidas</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={stats.avaliacoesVencidas > 0 ? 'text-red-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {stats.avaliacoesVencidas}
                  </p>
                  {stats.avaliacoesVencidas > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 500 }}>
                      Urgente
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Avaliações Próximas de Vencer */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.avaliacoesProximas > 0 
                ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/cadastro?alerta=aval-proxima')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.avaliacoesProximas > 0 ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                    <Clock className={`w-4 h-4 ${stats.avaliacoesProximas > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Aval. a Vencer</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={stats.avaliacoesProximas > 0 ? 'text-amber-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {stats.avaliacoesProximas}
                  </p>
                  {stats.avaliacoesProximas > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-600 border border-amber-200" style={{ fontWeight: 500 }}>
                      30 dias
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Avaliações Pendentes */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.avaliacoesPendentes > 0 
                ? 'border-gray-300 hover:border-gray-400 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/cadastro?alerta=aval-pendente')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.avaliacoesPendentes > 0 ? 'bg-blue-50' : 'bg-gray-50'
                  }`}>
                    <CalendarClock className={`w-4 h-4 ${stats.avaliacoesPendentes > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Aval. Pendentes</p>
                </div>
                <p className={stats.avaliacoesPendentes > 0 ? 'text-blue-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {stats.avaliacoesPendentes}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Documentos Vencidos */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.fornecedoresComDocsVencidos > 0 
                ? 'border-red-200 hover:border-red-300 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/cadastro?alerta=docs-vencidos')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.fornecedoresComDocsVencidos > 0 ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <FileWarning className={`w-4 h-4 ${stats.fornecedoresComDocsVencidos > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Docs. Vencidos</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={stats.fornecedoresComDocsVencidos > 0 ? 'text-red-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {stats.fornecedoresComDocsVencidos}
                  </p>
                  {stats.fornecedoresComDocsVencidos > 0 && (
                    <span className="text-xs text-gray-400">
                      fornecedor(es) • {stats.documentosVencidos} doc(s)
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Documentos Pendentes */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.fornecedoresComDocsPendentes > 0 
                ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/cadastro?alerta=docs-pendentes')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.fornecedoresComDocsPendentes > 0 ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                    <FileCheck2 className={`w-4 h-4 ${stats.fornecedoresComDocsPendentes > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Docs. Pendentes</p>
                </div>
                <p className={stats.fornecedoresComDocsPendentes > 0 ? 'text-amber-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {stats.fornecedoresComDocsPendentes}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* ROFs Abertas */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.rofsAbertas > 0 
                ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/rof')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.rofsAbertas > 0 ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                    <ClipboardList className={`w-4 h-4 ${stats.rofsAbertas > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>ROFs Abertas</p>
                </div>
                <p className={stats.rofsAbertas > 0 ? 'text-amber-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {stats.rofsAbertas}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Bloqueios Registrados */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              stats.bloqueados > 0 
                ? 'border-red-200 hover:border-red-300 hover:shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/cadastro?alerta=bloqueados')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    stats.bloqueados > 0 ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <Lock className={`w-4 h-4 ${stats.bloqueados > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Bloqueios</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={stats.bloqueados > 0 ? 'text-red-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {stats.bloqueados}
                  </p>
                  {bloqueioStats.totalBloqueios > 0 && (
                    <span className="text-xs text-gray-400">
                      {bloqueioStats.totalBloqueios} bloq. / {bloqueioStats.totalDesbloqueios} desb.
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RECEBIMENTO — Pontualidade e Qualidade ═══ */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              Recebimento
            </h3>
            <span className="text-xs text-gray-400">Pontualidade e qualidade das entregas</span>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            className="text-gray-500 text-sm gap-1"
            onClick={() => navigate('/fornecedores/recebimento')}
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Filtros do recebimento */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs" style={{ fontWeight: 500 }}>Filtrar</span>
          </div>
          <select
            value={recFiltros.fornecedorId}
            onChange={e => setRecFiltros(prev => ({ ...prev, fornecedorId: e.target.value }))}
            className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os fornecedores</option>
            {fornecedores.map(f => (
              <option key={f.id} value={f.id}>{f.razaoSocial}</option>
            ))}
          </select>
          <Input
            type="date"
            value={recFiltros.periodoInicio}
            onChange={e => setRecFiltros(prev => ({ ...prev, periodoInicio: e.target.value }))}
            className="w-36 py-1.5 text-sm"
            placeholder="Data início"
          />
          <Input
            type="date"
            value={recFiltros.periodoFim}
            onChange={e => setRecFiltros(prev => ({ ...prev, periodoFim: e.target.value }))}
            className="w-36 py-1.5 text-sm"
            placeholder="Data fim"
          />
          {temRecFiltro && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecFiltros({ fornecedorId: '', periodoInicio: '', periodoFim: '' })}
                className="text-gray-500 gap-1 text-xs"
              >
                <X className="w-3 h-3" />
                Limpar
              </Button>
              <span className="text-xs text-blue-600 ml-auto" style={{ fontWeight: 500 }}>
                {recebimentoStats.total} de {recebimentos.length} recebimento(s)
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Total de Recebimentos */}
          <div 
            className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
            onClick={() => navigate('/fornecedores/recebimento')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                    <Package className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Recebimentos</p>
                </div>
                <p className="text-blue-600" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {recebimentoStats.total}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Valor Total Recebido */}
          <div 
            className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
            onClick={() => navigate('/fornecedores/recebimento')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Valor Recebido</p>
                </div>
                <p className="text-emerald-600 truncate" style={{ fontSize: '1.25rem', fontWeight: 600 }} title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebimentoStats.valorTotalRecebido)}>
                  {recebimentoStats.valorTotalRecebido > 0
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recebimentoStats.valorTotalRecebido)
                    : '—'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Taxa de Pontualidade */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              recebimentoStats.atrasados > 0
                ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/recebimento')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    recebimentoStats.taxaPontualidade >= 80 ? 'bg-emerald-50' : recebimentoStats.taxaPontualidade >= 60 ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    <Clock className={`w-4 h-4 ${
                      recebimentoStats.taxaPontualidade >= 80 ? 'text-emerald-500' : recebimentoStats.taxaPontualidade >= 60 ? 'text-amber-500' : 'text-red-500'
                    }`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Pontualidade</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={
                    recebimentoStats.total === 0 ? 'text-gray-400' :
                    recebimentoStats.taxaPontualidade >= 80 ? 'text-emerald-600' : recebimentoStats.taxaPontualidade >= 60 ? 'text-amber-600' : 'text-red-600'
                  } style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {recebimentoStats.total > 0 ? `${recebimentoStats.taxaPontualidade}%` : '—'}
                  </p>
                  {recebimentoStats.atrasados > 0 && (
                    <span className="text-xs text-gray-400">{recebimentoStats.atrasados} atrasado(s)</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Taxa de Aprovação */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              recebimentoStats.rejeitados > 0
                ? 'border-red-200 hover:border-red-300 hover:shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/recebimento')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    recebimentoStats.taxaAprovacao >= 80 ? 'bg-emerald-50' : recebimentoStats.taxaAprovacao >= 60 ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    <CheckCircle className={`w-4 h-4 ${
                      recebimentoStats.taxaAprovacao >= 80 ? 'text-emerald-500' : recebimentoStats.taxaAprovacao >= 60 ? 'text-amber-500' : 'text-red-500'
                    }`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Qualidade</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className={
                    recebimentoStats.total === 0 ? 'text-gray-400' :
                    recebimentoStats.taxaAprovacao >= 80 ? 'text-emerald-600' : recebimentoStats.taxaAprovacao >= 60 ? 'text-amber-600' : 'text-red-600'
                  } style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {recebimentoStats.total > 0 ? `${recebimentoStats.taxaAprovacao}%` : '—'}
                  </p>
                  {recebimentoStats.rejeitados > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 500 }}>
                      {recebimentoStats.rejeitados} rejeitado(s)
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          {/* Recebimentos com Problema */}
          <div 
            className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
              (recebimentoStats.atrasados + recebimentoStats.rejeitados) > 0
                ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => navigate('/fornecedores/recebimento')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    (recebimentoStats.atrasados + recebimentoStats.rejeitados) > 0 ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      (recebimentoStats.atrasados + recebimentoStats.rejeitados) > 0 ? 'text-amber-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Com Problemas</p>
                </div>
                <p className={(recebimentoStats.atrasados + recebimentoStats.rejeitados) > 0 ? 'text-amber-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {recebimentoStats.atrasados + recebimentoStats.rejeitados}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PEDIDO DE COMPRAS — Indicadores, Lead Time e Alertas de Atraso ═══ */}
      {pedidoHabilitado && pedidoStats && (
        <>
          {/* Banner de Pedidos Atrasados */}
          {pedidoStats.atrasados.length > 0 && (
            <div className="mt-6 bg-red-50 rounded-xl border border-red-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm text-red-900" style={{ fontWeight: 600 }}>
                      {pedidoStats.atrasados.length} pedido{pedidoStats.atrasados.length !== 1 ? 's' : ''} com entrega atrasada
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-700 gap-1 text-xs"
                      onClick={() => navigate('/fornecedores/pedidos')}
                    >
                      Ver pedidos
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {pedidoStats.atrasados.slice(0, 5).map(p => {
                      const diasAtraso = Math.round(
                        (new Date(hoje).getTime() - new Date(p.dataPrevistaEntrega).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div key={p.id} className="flex items-center gap-3 text-sm">
                          <span className="text-red-800 font-mono" style={{ fontWeight: 500 }}>
                            PC-{String(p.numero).padStart(5, '0')}
                          </span>
                          <span className="text-red-700 truncate flex-1">{p.fornecedorNome}</span>
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200 flex-shrink-0" style={{ fontWeight: 500 }}>
                            {diasAtraso} dia{diasAtraso !== 1 ? 's' : ''} atrasado
                          </span>
                          <span className="text-xs text-red-500 flex-shrink-0">
                            previsto: {formatarDataPtBr(p.dataPrevistaEntrega)}
                          </span>
                        </div>
                      );
                    })}
                    {pedidoStats.atrasados.length > 5 && (
                      <p className="text-xs text-red-500 mt-1">
                        e mais {pedidoStats.atrasados.length - 5} pedido(s) atrasado(s)...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Indicadores de Pedido de Compras */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                  Pedido de Compras
                </h3>
                <span className="text-xs text-gray-400">Visão geral de pedidos e lead time</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 text-sm gap-1"
                onClick={() => navigate('/fornecedores/pedidos')}
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Metric cards de pedidos */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {/* Total de Pedidos */}
              <div
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => navigate('/fornecedores/pedidos')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Total</p>
                    </div>
                    <p className="text-blue-600" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                      {pedidoStats.total}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/* Em Aberto */}
              <div
                className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
                  pedidoStats.emAberto > 0
                    ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => navigate('/fornecedores/pedidos')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pedidoStats.emAberto > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        <Clock className={`w-4 h-4 ${pedidoStats.emAberto > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                      </div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Em Aberto</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className={pedidoStats.emAberto > 0 ? 'text-amber-600' : 'text-gray-400'} style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                        {pedidoStats.emAberto}
                      </p>
                      {pedidoStats.atrasados.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 500 }}>
                          {pedidoStats.atrasados.length} atrasado{pedidoStats.atrasados.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/* Recebidos */}
              <div
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => navigate('/fornecedores/pedidos')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Recebidos</p>
                    </div>
                    <p className="text-emerald-600" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                      {pedidoStats.recebidos}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/* Valor em Aberto */}
              <div
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => navigate('/fornecedores/pedidos')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Vl. em Aberto</p>
                    </div>
                    <p className="text-blue-600 truncate" style={{ fontSize: '1.25rem', fontWeight: 600 }} title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedidoStats.valorEmAberto)}>
                      {pedidoStats.valorEmAberto > 0
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedidoStats.valorEmAberto)
                        : '—'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/* Pontualidade Pedidos */}
              <div
                className={`bg-white rounded-xl p-5 border transition-all cursor-pointer ${
                  pedidoStats.pedidosComRecebimentoCount > 0 && pedidoStats.taxaPontualidadePedidos < 80
                    ? 'border-amber-200 hover:border-amber-300 hover:shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => navigate('/fornecedores/pedidos')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        pedidoStats.pedidosComRecebimentoCount === 0 ? 'bg-gray-50' :
                        pedidoStats.taxaPontualidadePedidos >= 80 ? 'bg-emerald-50' : pedidoStats.taxaPontualidadePedidos >= 60 ? 'bg-amber-50' : 'bg-red-50'
                      }`}>
                        <Timer className={`w-4 h-4 ${
                          pedidoStats.pedidosComRecebimentoCount === 0 ? 'text-gray-400' :
                          pedidoStats.taxaPontualidadePedidos >= 80 ? 'text-emerald-500' : pedidoStats.taxaPontualidadePedidos >= 60 ? 'text-amber-500' : 'text-red-500'
                        }`} />
                      </div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Pontualidade</p>
                    </div>
                    <p className={
                      pedidoStats.pedidosComRecebimentoCount === 0 ? 'text-gray-400' :
                      pedidoStats.taxaPontualidadePedidos >= 80 ? 'text-emerald-600' : pedidoStats.taxaPontualidadePedidos >= 60 ? 'text-amber-600' : 'text-red-600'
                    } style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                      {pedidoStats.pedidosComRecebimentoCount > 0 ? `${pedidoStats.taxaPontualidadePedidos}%` : '—'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>

            {/* Lead Time Report */}
            <div className="grid grid-cols-2 gap-6">
              {/* Lead Time Resumo */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Lead Time — Resumo</h4>
                  <span className="text-xs text-gray-400 ml-auto">{pedidoStats.leadTimes.length} registro(s)</span>
                </div>

                {pedidoStats.leadTimes.length === 0 ? (
                  <div className="text-center py-6">
                    <Timer className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Nenhum pedido com recebimento concluído para calcular lead time</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                        <p className="text-xs text-gray-500 mb-1">Média</p>
                        <p className="text-blue-600" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pedidoStats.leadTimeMedia}</p>
                        <p className="text-xs text-gray-400">dias</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                        <p className="text-xs text-gray-500 mb-1">Mínimo</p>
                        <p className="text-emerald-600" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pedidoStats.leadTimeMin}</p>
                        <p className="text-xs text-gray-400">dias</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                        <p className="text-xs text-gray-500 mb-1">Máximo</p>
                        <p className="text-amber-600" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pedidoStats.leadTimeMax}</p>
                        <p className="text-xs text-gray-400">dias</p>
                      </div>
                    </div>

                    {/* Últimos 5 recebimentos com lead time */}
                    <div className="space-y-0">
                      <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Últimos recebimentos</p>
                      {pedidoStats.ultimosLeadTimes.map(lt => {
                        const corLT = lt.dias <= pedidoStats.leadTimeMedia
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                          : lt.dias <= pedidoStats.leadTimeMedia * 1.5
                          ? 'text-amber-600 bg-amber-50 border-amber-200'
                          : 'text-red-600 bg-red-50 border-red-200';
                        return (
                          <div key={lt.pedido.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
                            <span className="text-xs text-gray-500 font-mono" style={{ fontWeight: 500 }}>
                              PC-{String(lt.pedido.numero).padStart(5, '0')}
                            </span>
                            <span className="text-xs text-gray-600 truncate flex-1">{lt.pedido.fornecedorNome}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${corLT}`} style={{ fontWeight: 500 }}>
                              {lt.dias}d
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Lead Time por Fornecedor */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Lead Time — Por Fornecedor</h4>
                  <span className="text-xs text-gray-400 ml-auto">Maiores prazos médios</span>
                </div>

                {pedidoStats.leadTimeRanking.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Sem dados de lead time por fornecedor</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pedidoStats.leadTimeRanking.map((item, idx) => {
                      const maxMedia = pedidoStats.leadTimeRanking[0]?.media || 1;
                      const barWidth = Math.max((item.media / maxMedia) * 100, 8);
                      const corBarra = item.media <= pedidoStats.leadTimeMedia
                        ? 'bg-emerald-400'
                        : item.media <= pedidoStats.leadTimeMedia * 1.5
                        ? 'bg-amber-400'
                        : 'bg-red-400';
                      return (
                        <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>#{idx + 1}</span>
                              <span className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{item.nome}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-gray-400">{item.count} pedido(s)</span>
                              <span className="text-sm text-gray-900 font-mono" style={{ fontWeight: 600 }}>{item.media}d</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${corBarra}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ RANKING TOP 5 ═══ */}
      <div className="mt-10 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              Ranking — Top 5
            </h3>
            <span className="text-xs text-gray-400">Melhores fornecedores por nota média</span>
          </div>
          <Button 
            variant="ghost"
            size="sm"
            className="text-gray-500 text-sm gap-1"
            onClick={() => navigate('/fornecedores/ranking')}
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {top5.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhum fornecedor avaliado ainda</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>#</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Criticidade</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Última Nota</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {top5.map((fornecedor, idx) => (
                  <tr 
                    key={fornecedor.id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-amber-600' : 'bg-gray-900'
                      }`}>
                        <span className="text-white text-xs" style={{ fontWeight: 600 }}>{idx + 1}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{fornecedor.razaoSocial}</p>
                        <p className="text-xs text-gray-400">{fornecedor.nomeFantasia}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${getCriticidadeColor(fornecedor.criticidade)}`} style={{ fontWeight: 500 }}>
                        {fornecedor.criticidade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`${
                          (fornecedor.notaMedia || 0) >= 4 ? 'text-emerald-600' : (fornecedor.notaMedia || 0) >= 3 ? 'text-amber-600' : 'text-red-600'
                        }`} style={{ fontSize: '1rem', fontWeight: 600 }}>
                          {fornecedor.notaMedia?.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">/ 5.0</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${getFornecedorStatusColor(fornecedor.status)}`} style={{ fontWeight: 500 }}>
                        {fornecedor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
