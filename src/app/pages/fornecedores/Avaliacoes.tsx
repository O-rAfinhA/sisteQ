import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Star, TrendingUp, CheckCircle, Clock, Filter, Search, X, Award, Calendar, ChevronUp, ChevronDown, Eye, Edit2, Trash2 } from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { MetricCard } from '../../components/ui/metric-card';
import { toast } from 'sonner';
import { Avaliacao, PeriodicidadeAvaliacao } from '../../types/fornecedor';
import { formatarDataPtBr, dataHojeISO } from '../../utils/formatters';
import { getFornecedorStatusColor } from '../../utils/fornecedor-helpers';

export function FornecedorAvaliacoes() {
  const { fornecedores, avaliacoes, addAvaliacao, updateAvaliacao, deleteAvaliacao } = useFornecedores();
  const [modalAberto, setModalAberto] = useState(false);
  const [modalFechando, setModalFechando] = useState(false);
  const [modalVisualizacao, setModalVisualizacao] = useState(false);
  const [modalVisualizacaoFechando, setModalVisualizacaoFechando] = useState(false);
  const [avaliacaoEditando, setAvaliacaoEditando] = useState<string | null>(null);
  const [dadosVisualizacao, setDadosVisualizacao] = useState<Avaliacao | null>(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [buscaFornecedor, setBuscaFornecedor] = useState('');
  const [mostrarListaFornecedores, setMostrarListaFornecedores] = useState(false);
  const [mostrarDropdownStatus, setMostrarDropdownStatus] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filtros, setFiltros] = useState({
    busca: '',
    criticidade: '',
    status: '',
    notaMin: '',
    notaMax: '',
    periodoInicio: '',
    periodoFim: '',
    comAvaliacao: ''
  });

  const [formData, setFormData] = useState({
    periodicidade: 'Anual' as PeriodicidadeAvaliacao,
    diasPersonalizados: 0,
    qualidade: 3,
    prazo: 3,
    atendimento: 3,
    conformidadeDocumental: 3,
    observacao: '',
    responsavel: '',
    dataAvaliacao: dataHojeISO()
  });

  const fornecedoresFiltrados = fornecedores.filter(f => {
    // Filtro de busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const matchBusca = 
        f.razaoSocial.toLowerCase().includes(busca) ||
        f.nomeFantasia.toLowerCase().includes(busca) ||
        f.cnpj.includes(busca);
      if (!matchBusca) return false;
    }

    // Filtro de criticidade
    if (filtros.criticidade && f.criticidade !== filtros.criticidade) return false;
    
    // Filtro de status
    if (filtros.status && f.status !== filtros.status) return false;

    // Filtro de nota mínima
    if (filtros.notaMin && f.notaMedia !== undefined) {
      if (f.notaMedia < parseFloat(filtros.notaMin)) return false;
    }

    // Filtro de nota máxima
    if (filtros.notaMax && f.notaMedia !== undefined) {
      if (f.notaMedia > parseFloat(filtros.notaMax)) return false;
    }

    // Filtro de período de última avaliação
    const ultimaAvaliacao = f.avaliacoes[f.avaliacoes.length - 1];
    if (filtros.periodoInicio && ultimaAvaliacao) {
      const dataAvaliacao = new Date(ultimaAvaliacao.data);
      const dataInicio = new Date(filtros.periodoInicio);
      if (dataAvaliacao < dataInicio) return false;
    }

    if (filtros.periodoFim && ultimaAvaliacao) {
      const dataAvaliacao = new Date(ultimaAvaliacao.data);
      const dataFim = new Date(filtros.periodoFim);
      if (dataAvaliacao > dataFim) return false;
    }

    // Filtro de fornecedores com/sem avaliação
    if (filtros.comAvaliacao === 'com' && f.avaliacoes.length === 0) return false;
    if (filtros.comAvaliacao === 'sem' && f.avaliacoes.length > 0) return false;

    return true;
  });

  const fornecedoresBusca = fornecedores.filter(f =>
    f.razaoSocial.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.nomeFantasia.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.cnpj.includes(buscaFornecedor)
  );

  const resetForm = useCallback(() => {
    setFormData({
      periodicidade: 'Anual',
      diasPersonalizados: 0,
      qualidade: 3,
      prazo: 3,
      atendimento: 3,
      conformidadeDocumental: 3,
      observacao: '',
      responsavel: '',
      dataAvaliacao: dataHojeISO()
    });
    setFornecedorSelecionado('');
    setBuscaFornecedor('');
    setAvaliacaoEditando(null);
  }, []);

  const fecharModalCadastro = useCallback(() => {
    if (modalFechando) return;
    setModalFechando(true);
    setTimeout(() => {
      setModalAberto(false);
      setModalFechando(false);
      resetForm();
    }, 200);
  }, [modalFechando, resetForm]);

  const fecharModalVisualizacao = useCallback(() => {
    if (modalVisualizacaoFechando) return;
    setModalVisualizacaoFechando(true);
    setTimeout(() => {
      setModalVisualizacao(false);
      setModalVisualizacaoFechando(false);
      setDadosVisualizacao(null);
    }, 200);
  }, [modalVisualizacaoFechando]);

  useEffect(() => {
    if (!modalAberto && !modalVisualizacao) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalVisualizacao) {
        fecharModalVisualizacao();
        return;
      }
      if (modalAberto) {
        fecharModalCadastro();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fecharModalCadastro, fecharModalVisualizacao, modalAberto, modalVisualizacao]);

  const handleNovo = () => {
    resetForm();
    setModalAberto(true);
  };

  const handleAbrirModal = (fornecedorId: string) => {
    resetForm();
    setFornecedorSelecionado(fornecedorId);
    setModalAberto(true);
  };

  const handleVisualizar = (avaliacao: Avaliacao) => {
    setDadosVisualizacao(avaliacao);
    setModalVisualizacao(true);
  };

  const handleEditar = (avaliacao: Avaliacao) => {
    setFormData({
      periodicidade: 'Anual',
      diasPersonalizados: 0,
      qualidade: avaliacao.criterios.qualidade,
      prazo: avaliacao.criterios.prazo,
      atendimento: avaliacao.criterios.atendimento,
      conformidadeDocumental: avaliacao.criterios.conformidadeDocumental,
      observacao: avaliacao.observacao || '',
      responsavel: avaliacao.responsavel,
      dataAvaliacao: avaliacao.data.split('T')[0]
    });
    setFornecedorSelecionado(avaliacao.fornecedorId);
    setBuscaFornecedor('');
    setAvaliacaoEditando(avaliacao.id);
    setModalAberto(true);
  };

  const handleExcluir = (avaliacao: Avaliacao) => {
    if (confirm(`Tem certeza que deseja excluir esta avaliação de ${avaliacao.fornecedorNome}?`)) {
      deleteAvaliacao(avaliacao.id);
      toast.success('Avaliação excluída com sucesso');
    }
  };

  const handleSalvar = () => {
    if (!fornecedorSelecionado) {
      toast.error('Selecione um fornecedor');
      return;
    }

    const fornecedor = fornecedores.find(f => f.id === fornecedorSelecionado);
    if (!fornecedor) return;

    if (!formData.responsavel) {
      toast.error('Preencha o responsável');
      return;
    }

    if (!formData.dataAvaliacao) {
      toast.error('Selecione a data da avaliação');
      return;
    }

    if (avaliacaoEditando) {
      updateAvaliacao(avaliacaoEditando, {
        responsavel: formData.responsavel,
        criterios: {
          qualidade: formData.qualidade,
          prazo: formData.prazo,
          atendimento: formData.atendimento,
          conformidadeDocumental: formData.conformidadeDocumental
        },
        observacao: formData.observacao
      });
      toast.success('Avaliação atualizada com sucesso');
    } else {
      addAvaliacao({
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.razaoSocial,
        data: new Date(formData.dataAvaliacao).toISOString(),
        responsavel: formData.responsavel,
        criterios: {
          qualidade: formData.qualidade,
          prazo: formData.prazo,
          atendimento: formData.atendimento,
          conformidadeDocumental: formData.conformidadeDocumental
        },
        observacao: formData.observacao
      });
      toast.success('Avaliação registrada com sucesso');
    }

    fecharModalCadastro();
  };

  const notaFinal =
    (formData.qualidade + formData.prazo + formData.atendimento + formData.conformidadeDocumental) / 4;

  const toggleRow = (fornecedorId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(fornecedorId)) {
      newExpanded.delete(fornecedorId);
    } else {
      newExpanded.add(fornecedorId);
    }
    setExpandedRows(newExpanded);
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      criticidade: '',
      status: '',
      notaMin: '',
      notaMax: '',
      periodoInicio: '',
      periodoFim: '',
      comAvaliacao: ''
    });
  };

  const filtrosAtivos = Object.values(filtros).filter(v => v !== '').length;

  // Estatísticas para o mini dashboard
  const totalAvaliacoes = avaliacoes.length;
  const fornecedoresAvaliados = new Set(avaliacoes.map(a => a.fornecedorId)).size;
  const notaMediaGeral = avaliacoes.length > 0 
    ? avaliacoes.reduce((acc, a) => acc + a.notaFinal, 0) / avaliacoes.length 
    : 0;
  
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const avaliacoesNoMes = avaliacoes.filter(a => {
    const dataAvaliacao = new Date(a.data);
    return dataAvaliacao.getMonth() === mesAtual && dataAvaliacao.getFullYear() === anoAtual;
  }).length;

  const fornecedoresComAvaliacao = fornecedores.filter(f => f.avaliacoes.length > 0).length;
  const fornecedoresSemAvaliacao = fornecedores.length - fornecedoresComAvaliacao;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Avaliações de Fornecedores
          </h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie e acompanhe as avaliações periódicas
          </p>
        </div>
        <Button
          onClick={handleNovo}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Plus className="w-4 h-4" />
          Nova Avaliação
        </Button>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total de Avaliações"
          value={totalAvaliacoes}
          icon={Star}
          variant="info"
          trendLabel={`${fornecedoresAvaliados} fornecedores avaliados`}
          trend="neutral"
        />
        <MetricCard
          label="Nota Média Geral"
          value={notaMediaGeral.toFixed(1)}
          icon={TrendingUp}
          variant="purple"
          trendLabel="Média de todas as avaliações"
          trend="neutral"
        />
        <MetricCard
          label="Avaliações Este Mês"
          value={avaliacoesNoMes}
          icon={CheckCircle}
          variant="success"
          trendLabel={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          trend="neutral"
        />
        <MetricCard
          label="Pendentes"
          value={fornecedoresSemAvaliacao}
          icon={Clock}
          variant="warning"
          trendLabel="Fornecedores sem avaliação"
          trend="neutral"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm" style={{ fontWeight: 500 }}>Filtros</span>
            <span className="text-xs text-gray-400">
              {filtrosAtivos > 0 ? `${filtrosAtivos} ativo(s)` : ''} • {fornecedoresFiltrados.length} encontrado(s)
            </span>
          </div>
          {filtrosAtivos > 0 && (
            <Button
              onClick={limparFiltros}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Linha 1: Busca e Avaliação */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filtros.busca}
              onChange={e => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Buscar por fornecedor ou CNPJ..."
            />
          </div>

          <select
            value={filtros.criticidade}
            onChange={e => setFiltros(prev => ({ ...prev, criticidade: e.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todas as Criticidades</option>
            <option value="Crítico">Crítico</option>
            <option value="Não Crítico">Não Crítico</option>
          </select>

          <select
            value={filtros.status}
            onChange={e => setFiltros(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os Status</option>
            <option value="Homologado">Homologado</option>
            <option value="Bloqueado">Bloqueado</option>
            <option value="Em Homologação">Em Homologação</option>
          </select>
        </div>

        {/* Linha 2: Notas e Período */}
        <div className="grid grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-400" />
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={filtros.notaMin}
              onChange={e => setFiltros(prev => ({ ...prev, notaMin: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Nota mín."
            />
          </div>

          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-400" />
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={filtros.notaMax}
              onChange={e => setFiltros(prev => ({ ...prev, notaMax: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Nota máx."
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filtros.periodoInicio}
              onChange={e => setFiltros(prev => ({ ...prev, periodoInicio: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Data início"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filtros.periodoFim}
              onChange={e => setFiltros(prev => ({ ...prev, periodoFim: e.target.value }))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Data fim"
            />
          </div>

          <select
            value={filtros.comAvaliacao}
            onChange={e => setFiltros(prev => ({ ...prev, comAvaliacao: e.target.value }))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="com">Com Avaliação</option>
            <option value="sem">Sem Avaliação</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50/60 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 w-10" style={{ fontWeight: 500 }}></th>
              <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Criticidade</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Última Avaliação</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Próxima Avaliação</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Nota Média</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedoresFiltrados.flatMap(fornecedor => {
              const ultimaAvaliacao = fornecedor.avaliacoes[fornecedor.avaliacoes.length - 1];
              const isExpanded = expandedRows.has(fornecedor.id);
              const avaliacoesFornecedor = avaliacoes.filter(a => a.fornecedorId === fornecedor.id);

              const rows = [
                <tr key={fornecedor.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {avaliacoesFornecedor.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(fornecedor.id)}
                        className="h-7 w-7"
                        aria-label={isExpanded ? 'Recolher avaliações' : 'Expandir avaliações'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{fornecedor.razaoSocial}</p>
                      <p className="text-xs text-gray-400">{fornecedor.nomeFantasia}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      className={`${
                        fornecedor.criticidade === 'Crítico'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      } border text-xs`}
                    >
                      {fornecedor.criticidade}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    {ultimaAvaliacao ? formatarDataPtBr(ultimaAvaliacao.data) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    {fornecedor.proximaAvaliacao ? formatarDataPtBr(fornecedor.proximaAvaliacao) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className={`${
                        (fornecedor.notaMedia || 0) >= 4 ? 'text-emerald-600' : (fornecedor.notaMedia || 0) >= 3 ? 'text-amber-600' : fornecedor.notaMedia !== undefined ? 'text-red-600' : 'text-gray-400'
                      }`} style={{ fontWeight: 600 }}>{fornecedor.notaMedia?.toFixed(1) || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      className={getFornecedorStatusColor(fornecedor.status)}
                    >
                      {fornecedor.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      onClick={() => handleAbrirModal(fornecedor.id)}
                      size="sm"
                      className="px-4 text-xs"
                    >
                      Avaliar
                    </Button>
                  </td>
                </tr>
              ];

              // Adicionar linha expandida se necessário
              if (isExpanded && avaliacoesFornecedor.length > 0) {
                rows.push(
                  <tr key={`${fornecedor.id}-expanded`}>
                    <td colSpan={8} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-3">
                        <p className="text-xs text-gray-600 mb-3" style={{ fontWeight: 500 }}>Histórico de Avaliações</p>
                        {avaliacoesFornecedor.map(avaliacao => (
                          <div key={avaliacao.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex-1 grid grid-cols-6 gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Data</p>
                                <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                                  {formatarDataPtBr(avaliacao.data)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Qualidade</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm ${avaliacao.criterios.qualidade >= 4 ? 'bg-emerald-50 text-emerald-700' : avaliacao.criterios.qualidade >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`} style={{ fontWeight: 600 }}>{avaliacao.criterios.qualidade}</span>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Prazo</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm ${avaliacao.criterios.prazo >= 4 ? 'bg-emerald-50 text-emerald-700' : avaliacao.criterios.prazo >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`} style={{ fontWeight: 600 }}>{avaliacao.criterios.prazo}</span>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Atendimento</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm ${avaliacao.criterios.atendimento >= 4 ? 'bg-emerald-50 text-emerald-700' : avaliacao.criterios.atendimento >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`} style={{ fontWeight: 600 }}>{avaliacao.criterios.atendimento}</span>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Conformidade</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm ${avaliacao.criterios.conformidadeDocumental >= 4 ? 'bg-emerald-50 text-emerald-700' : avaliacao.criterios.conformidadeDocumental >= 3 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`} style={{ fontWeight: 600 }}>{avaliacao.criterios.conformidadeDocumental}</span>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Nota Final</p>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <span className={`text-sm ${avaliacao.notaFinal >= 4 ? 'text-emerald-600' : avaliacao.notaFinal >= 3 ? 'text-amber-600' : 'text-red-600'}`} style={{ fontWeight: 600 }}>{avaliacao.notaFinal.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVisualizar(avaliacao)}
                                className="h-9 w-9 text-primary"
                                title="Visualizar"
                                aria-label="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditar(avaliacao)}
                                className="h-9 w-9 text-gray-700"
                                title="Editar"
                                aria-label="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExcluir(avaliacao)}
                                className="h-9 w-9 text-red-700"
                                title="Excluir"
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              }

              return rows;
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro/Edição */}
      {(modalAberto || modalFechando) && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${modalFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModalCadastro}
        >
          <div
            className={`bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto ${modalFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-avaliacao-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 id="fornecedor-avaliacao-modal-title" className="text-xl text-gray-900" style={{ fontWeight: 700 }}>
                {avaliacaoEditando ? 'Editar Avaliação' : 'Nova Avaliação'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { fecharModalCadastro(); }} aria-label="Fechar" className="h-9 w-9">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Seleção de Fornecedor */}
              {!avaliacaoEditando && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Fornecedor *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={buscaFornecedor}
                      onChange={e => {
                        setBuscaFornecedor(e.target.value);
                        setMostrarListaFornecedores(true);
                      }}
                      onFocus={() => setMostrarListaFornecedores(true)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Busque o fornecedor..."
                    />
                    <Search className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                    
                    {/* Lista Dropdown de Fornecedores */}
                    {mostrarListaFornecedores && fornecedoresBusca.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {fornecedoresBusca.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setFornecedorSelecionado(f.id);
                              setBuscaFornecedor(f.razaoSocial);
                              setMostrarListaFornecedores(false);
                            }}
                                className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-gray-100 last:border-b-0 ${
                                  fornecedorSelecionado === f.id ? 'bg-accent' : ''
                            }`}
                          >
                            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{f.razaoSocial}</p>
                            <p className="text-xs text-gray-600">{f.nomeFantasia}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Mensagem quando não encontra resultados */}
                    {mostrarListaFornecedores && buscaFornecedor && fornecedoresBusca.length === 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        <p className="text-sm text-gray-600 text-center">Nenhum fornecedor encontrado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {fornecedorSelecionado && (
                <>
                  {avaliacaoEditando && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-900" style={{ fontWeight: 600 }}>
                        {fornecedores.find(f => f.id === fornecedorSelecionado)?.razaoSocial}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Responsável *</label>
                    <input
                      type="text"
                      value={formData.responsavel}
                      onChange={e => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Nome do responsável"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Data da Avaliação *</label>
                    <input
                      type="date"
                      value={formData.dataAvaliacao}
                      onChange={e => setFormData(prev => ({ ...prev, dataAvaliacao: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-gray-900" style={{ fontWeight: 600 }}>Critérios de Avaliação (1 a 5)</h3>

                    {(['qualidade', 'prazo', 'atendimento', 'conformidadeDocumental'] as const).map(criterio => {
                      const labels = {
                        qualidade: 'Qualidade',
                        prazo: 'Prazo',
                        atendimento: 'Atendimento',
                        conformidadeDocumental: 'Conformidade Documental'
                      };

                      return (
                        <div key={criterio}>
                          <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>{labels[criterio]}</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(nota => (
                              <button
                                key={nota}
                                onClick={() => setFormData(prev => ({ ...prev, [criterio]: nota }))}
                                className={`flex-1 py-3 rounded-lg font-bold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                                  formData[criterio] === nota
                                    ? nota >= 4
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : nota >= 3
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {nota}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`border rounded-lg p-4 ${
                    notaFinal >= 4 ? 'bg-emerald-50 border-emerald-200' : notaFinal >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <p className="text-sm text-gray-600 mb-1">Nota Final Automática</p>
                    <p className={`text-3xl ${
                      notaFinal >= 4 ? 'text-emerald-600' : notaFinal >= 3 ? 'text-amber-600' : 'text-red-600'
                    }`} style={{ fontWeight: 700 }}>{notaFinal.toFixed(1)}</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Observação</label>
                    <textarea
                      value={formData.observacao}
                      onChange={e => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-24"
                      placeholder="Observações adicionais..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <Button
                onClick={() => { fecharModalCadastro(); }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleSalvar} className="flex-1">
                {avaliacaoEditando ? 'Atualizar' : 'Salvar Avaliação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {(modalVisualizacao || modalVisualizacaoFechando) && dadosVisualizacao && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 ${modalVisualizacaoFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModalVisualizacao}
        >
          <div
            className={`bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto ${modalVisualizacaoFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-avaliacao-visualizacao-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0">
              <div>
                <h2 id="fornecedor-avaliacao-visualizacao-modal-title" className="text-xl text-gray-900" style={{ fontWeight: 700 }}>Detalhes da Avaliação</h2>
                <p className="text-xs text-gray-600 mt-1">{dadosVisualizacao.fornecedorNome}</p>
              </div>
              <button onClick={() => fecharModalVisualizacao()} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Data da Avaliação</label>
                  <p className="text-sm text-gray-900">{formatarDataPtBr(dadosVisualizacao.data)}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Responsável</label>
                  <p className="text-sm text-gray-900">{dadosVisualizacao.responsavel}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-3" style={{ fontWeight: 500 }}>Critérios Avaliados</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Qualidade</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{dadosVisualizacao.criterios.qualidade}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Prazo</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{dadosVisualizacao.criterios.prazo}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Atendimento</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{dadosVisualizacao.criterios.atendimento}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Conformidade Documental</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{dadosVisualizacao.criterios.conformidadeDocumental}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-1" style={{ fontWeight: 600 }}>Nota Final</p>
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-blue-600 fill-blue-600" />
                  <p className="text-4xl text-blue-600" style={{ fontWeight: 700 }}>{dadosVisualizacao.notaFinal.toFixed(1)}</p>
                </div>
              </div>

              {dadosVisualizacao.observacao && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Observações</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{dadosVisualizacao.observacao}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-xl sticky bottom-0">
              <Button
                onClick={() => fecharModalVisualizacao()}
                variant="secondary"
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  const avaliacao = dadosVisualizacao;
                  fecharModalVisualizacao();
                  setTimeout(() => {
                    handleEditar(avaliacao);
                  }, 200);
                }}
                className="flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
