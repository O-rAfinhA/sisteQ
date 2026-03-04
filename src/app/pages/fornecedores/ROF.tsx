import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, X, FileText, Eye, Edit2, Trash2, Search,
  Filter, AlertTriangle, Clock, CheckCircle, XCircle,
  ClipboardList, Target, ArrowRight
} from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { TipoROF, GravidadeROF, StatusROF, ROF } from '../../types/fornecedor';
import { useNavigate } from 'react-router';
import { formatarDataPtBr } from '../../utils/formatters';

export function FornecedorROF() {
  const { fornecedores, rofs, addROF, updateROF, deleteROF } = useFornecedores();
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [modalFechando, setModalFechando] = useState(false);
  const [modalVisualizacao, setModalVisualizacao] = useState(false);
  const [modalVisualizacaoFechando, setModalVisualizacaoFechando] = useState(false);
  const [rofEditando, setRofEditando] = useState<string | null>(null);
  const [buscaFornecedor, setBuscaFornecedor] = useState('');

  // ═══ Filtros ═══
  const [filtros, setFiltros] = useState({
    busca: '',
    status: '' as StatusROF | '',
    gravidade: '' as GravidadeROF | '',
    tipo: '' as TipoROF | ''
  });

  const [formData, setFormData] = useState({
    fornecedorId: '',
    tipo: 'Documental' as TipoROF,
    gravidade: 'Média' as GravidadeROF,
    descricao: '',
    acaoImediata: '',
    responsavel: '',
    status: 'Aberta' as StatusROF
  });

  const [dadosVisualizacao, setDadosVisualizacao] = useState<ROF | null>(null);

  // ═══ Métricas ═══
  const metricas = useMemo(() => {
    const abertas = rofs.filter(r => r.status === 'Aberta').length;
    const emTratamento = rofs.filter(r => r.status === 'Em Tratamento').length;
    const concluidas = rofs.filter(r => r.status === 'Concluída').length;
    const canceladas = rofs.filter(r => r.status === 'Cancelada').length;
    const altaGravidade = rofs.filter(r => r.gravidade === 'Alta' && (r.status === 'Aberta' || r.status === 'Em Tratamento')).length;
    return { abertas, emTratamento, concluidas, canceladas, altaGravidade, total: rofs.length };
  }, [rofs]);

  // ═══ Filtragem ═══
  const rofsFiltrados = useMemo(() => {
    return rofs.filter(r => {
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        if (
          !r.numero.toLowerCase().includes(busca) &&
          !r.fornecedorNome.toLowerCase().includes(busca) &&
          !r.descricao.toLowerCase().includes(busca)
        ) return false;
      }
      if (filtros.status && r.status !== filtros.status) return false;
      if (filtros.gravidade && r.gravidade !== filtros.gravidade) return false;
      if (filtros.tipo && r.tipo !== filtros.tipo) return false;
      return true;
    });
  }, [rofs, filtros]);

  const fornecedoresFiltrados = fornecedores.filter(f =>
    f.razaoSocial.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.nomeFantasia.toLowerCase().includes(buscaFornecedor.toLowerCase()) ||
    f.cnpj.includes(buscaFornecedor)
  );

  const resetForm = useCallback(() => {
    setFormData({
      fornecedorId: '',
      tipo: 'Documental',
      gravidade: 'Média',
      descricao: '',
      acaoImediata: '',
      responsavel: '',
      status: 'Aberta'
    });
    setBuscaFornecedor('');
    setRofEditando(null);
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

  const handleVisualizar = (rof: ROF) => {
    setDadosVisualizacao(rof);
    setModalVisualizacao(true);
  };

  const handleEditar = (rof: ROF) => {
    setFormData({
      fornecedorId: rof.fornecedorId,
      tipo: rof.tipo,
      gravidade: rof.gravidade,
      descricao: rof.descricao,
      acaoImediata: rof.acaoImediata || '',
      responsavel: rof.responsavel,
      status: rof.status
    });
    setBuscaFornecedor('');
    setRofEditando(rof.id);
    setModalAberto(true);
  };

  const handleExcluir = (rof: ROF) => {
    if (confirm(`Tem certeza que deseja excluir a ROF ${rof.numero}?`)) {
      deleteROF(rof.id);
      toast.success('ROF excluída com sucesso');
    }
  };

  const handleSalvar = () => {
    if (!formData.fornecedorId || !formData.descricao || !formData.responsavel) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const fornecedor = fornecedores.find(f => f.id === formData.fornecedorId);
    if (!fornecedor) return;

    if (rofEditando) {
      updateROF(rofEditando, {
        ...formData,
        fornecedorNome: fornecedor.razaoSocial
      });
      toast.success('ROF atualizada com sucesso');
    } else {
      addROF({
        ...formData,
        fornecedorNome: fornecedor.razaoSocial
      });
      toast.success('ROF registrada com sucesso');
    }

    fecharModalCadastro();
  };

  // Ação rápida: avançar status
  const handleAvancarStatus = (rof: ROF) => {
    const proximoStatus: Record<string, StatusROF> = {
      'Aberta': 'Em Tratamento',
      'Em Tratamento': 'Concluída'
    };
    const novoStatus = proximoStatus[rof.status];
    if (!novoStatus) return;

    updateROF(rof.id, {
      status: novoStatus,
      dataFechamento: novoStatus === 'Concluída' ? new Date().toISOString() : undefined
    });
    toast.success(`ROF ${rof.numero} movida para "${novoStatus}"`);
  };

  const getGravidadeColor = (gravidade: GravidadeROF) => {
    switch (gravidade) {
      case 'Alta': return 'bg-red-50 text-red-700 border-red-200';
      case 'Média': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Baixa': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusColor = (status: StatusROF) => {
    switch (status) {
      case 'Aberta': return 'bg-red-50 text-red-700 border-red-200';
      case 'Em Tratamento': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Concluída': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelada': return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const limparFiltros = () => setFiltros({ busca: '', status: '', gravidade: '', tipo: '' });
  const filtrosAtivos = Object.values(filtros).filter(v => v !== '').length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            ROF — Registro de Ocorrência
          </h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie não conformidades de fornecedores
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2 flex-shrink-0 ml-8">
          <Plus className="w-4 h-4" />
          Nova ROF
        </Button>
      </div>

      {/* ═══ CARDS DE MÉTRICAS ═══ */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Abertas', value: metricas.abertas, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle, iconColor: 'text-red-500' },
          { label: 'Em Tratamento', value: metricas.emTratamento, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, iconColor: 'text-amber-500' },
          { label: 'Concluídas', value: metricas.concluidas, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, iconColor: 'text-emerald-500' },
          { label: 'Canceladas', value: metricas.canceladas, color: 'text-gray-500', bg: 'bg-gray-50', icon: XCircle, iconColor: 'text-gray-400' },
          { label: 'Alta Gravidade', value: metricas.altaGravidade, color: metricas.altaGravidade > 0 ? 'text-red-600' : 'text-gray-400', bg: metricas.altaGravidade > 0 ? 'bg-red-50' : 'bg-gray-50', icon: Target, iconColor: metricas.altaGravidade > 0 ? 'text-red-500' : 'text-gray-400' }
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 ${m.bg} rounded-lg flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 ${m.iconColor}`} />
              </div>
              <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>{m.label}</span>
            </div>
            <p className={m.color} style={{ fontSize: '1.5rem', fontWeight: 600 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm" style={{ fontWeight: 500 }}>Filtros</span>
            <span className="text-xs">{filtrosAtivos > 0 ? `${filtrosAtivos} ativo(s)` : ''} • {rofsFiltrados.length} ROF(s)</span>
          </div>
          {filtrosAtivos > 0 && (
            <Button onClick={limparFiltros} variant="ghost" size="sm" className="text-xs text-gray-400">
              <X className="w-3 h-3 mr-1" /> Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filtros.busca}
              onChange={e => setFiltros(p => ({ ...p, busca: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Buscar nº, fornecedor..."
            />
          </div>
          <select
            value={filtros.status}
            onChange={e => setFiltros(p => ({ ...p, status: e.target.value as StatusROF | '' }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os Status</option>
            <option value="Aberta">Aberta</option>
            <option value="Em Tratamento">Em Tratamento</option>
            <option value="Concluída">Concluída</option>
            <option value="Cancelada">Cancelada</option>
          </select>
          <select
            value={filtros.gravidade}
            onChange={e => setFiltros(p => ({ ...p, gravidade: e.target.value as GravidadeROF | '' }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todas Gravidades</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
          <select
            value={filtros.tipo}
            onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value as TipoROF | '' }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Todos os Tipos</option>
            <option value="Documental">Documental</option>
            <option value="Atendimento">Atendimento</option>
            <option value="Produto/Serviço NC">Produto/Serviço NC</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      {/* ═══ TABELA ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {rofsFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {filtrosAtivos > 0 ? 'Nenhuma ROF encontrada com os filtros aplicados' : 'Nenhuma ROF registrada ainda'}
            </p>
            {filtrosAtivos === 0 && (
              <Button onClick={handleNovo} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Registrar Primeira ROF
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/60 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Nº</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Gravidade</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Data</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>PA</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rofsFiltrados.map(rof => (
                <tr key={rof.id} className={`border-b border-gray-100 hover:bg-gray-50 ${rof.gravidade === 'Alta' && (rof.status === 'Aberta' || rof.status === 'Em Tratamento') ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{rof.numero}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{rof.fornecedorNome}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-700">{rof.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={`${getGravidadeColor(rof.gravidade)} border text-xs`}>{rof.gravidade}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    {formatarDataPtBr(rof.dataAbertura)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={`${getStatusColor(rof.status)} border text-xs`}>{rof.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rof.planoAcaoNumero ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200" style={{ fontWeight: 500 }}>
                        <FileText className="w-3 h-3" />
                        {rof.planoAcaoNumero}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVisualizar(rof)}
                        className="h-8 w-8 p-0 text-blue-600"
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditar(rof)}
                        className="h-8 w-8 p-0 text-gray-600"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {(rof.status === 'Aberta' || rof.status === 'Em Tratamento') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAvancarStatus(rof)}
                          className="h-8 w-8 p-0 text-emerald-600"
                          title={`Avançar para ${rof.status === 'Aberta' ? 'Em Tratamento' : 'Concluída'}`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluir(rof)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ═══ MODAL DE CADASTRO/EDIÇÃO ═══ */}
      {(modalAberto || modalFechando) && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${modalFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModalCadastro}
        >
          <div
            className={`bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto ${modalFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-rof-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
              <h2 id="fornecedor-rof-modal-title" className="text-xl text-gray-900" style={{ fontWeight: 700 }}>
                {rofEditando ? 'Editar ROF' : 'Nova ROF'}
              </h2>
              <button onClick={() => { fecharModalCadastro(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Fornecedor *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={buscaFornecedor}
                    onChange={e => setBuscaFornecedor(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Busque o fornecedor..."
                  />
                  <Search className="absolute right-3 top-3 w-4 h-4 text-gray-500" />
                </div>
                <select
                  value={formData.fornecedorId}
                  onChange={e => setFormData(prev => ({ ...prev, fornecedorId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mt-2"
                >
                  <option value="">Selecione...</option>
                  {fornecedoresFiltrados.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoROF }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Documental">Documental</option>
                    <option value="Atendimento">Atendimento</option>
                    <option value="Produto/Serviço NC">Produto/Serviço NC</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Gravidade *</label>
                  <select
                    value={formData.gravidade}
                    onChange={e => setFormData(prev => ({ ...prev, gravidade: e.target.value as GravidadeROF }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Status *</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as StatusROF }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Aberta">Aberta</option>
                  <option value="Em Tratamento">Em Tratamento</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Descrição *</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-24"
                  placeholder="Descreva a ocorrência..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Ação Imediata Tomada</label>
                <textarea
                  value={formData.acaoImediata}
                  onChange={e => setFormData(prev => ({ ...prev, acaoImediata: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none h-20"
                  placeholder="Descreva a ação tomada..."
                />
              </div>

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
            </div>

            <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-xl sticky bottom-0">
              <Button
                onClick={() => { fecharModalCadastro(); }}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleSalvar} className="flex-1">
                {rofEditando ? 'Atualizar' : 'Salvar ROF'}
              </Button>
              {!rofEditando && (
                <Button
                  onClick={() => {
                    handleSalvar();
                    navigate('/acoes-corretivas/plano-acao');
                  }}
                  variant="outline"
                  className="flex items-center gap-2 px-4"
                >
                  <FileText className="w-4 h-4" />
                  Abrir PA
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DE VISUALIZAÇÃO ═══ */}
      {(modalVisualizacao || modalVisualizacaoFechando) && dadosVisualizacao && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 ${modalVisualizacaoFechando ? 'animate-out fade-out-0' : 'animate-in fade-in-0'} duration-200`}
          onClick={fecharModalVisualizacao}
        >
          <div
            className={`bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto ${modalVisualizacaoFechando ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95'} duration-200`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fornecedor-rof-visualizacao-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 id="fornecedor-rof-visualizacao-modal-title" className="text-xl text-gray-900" style={{ fontWeight: 700 }}>ROF {dadosVisualizacao.numero}</h2>
                  <Badge className={`${getStatusColor(dadosVisualizacao.status)} border text-xs`}>
                    {dadosVisualizacao.status}
                  </Badge>
                  <Badge className={`${getGravidadeColor(dadosVisualizacao.gravidade)} border text-xs`}>
                    {dadosVisualizacao.gravidade}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">Visualização de Registro de Ocorrência</p>
              </div>
              <button onClick={() => fecharModalVisualizacao()} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Fornecedor</label>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{dadosVisualizacao.fornecedorNome}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Data de Abertura</label>
                  <p className="text-sm text-gray-900">{formatarDataPtBr(dadosVisualizacao.dataAbertura)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Tipo</label>
                  <p className="text-sm text-gray-900">{dadosVisualizacao.tipo}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Gravidade</label>
                  <Badge className={`${getGravidadeColor(dadosVisualizacao.gravidade)} border text-xs`}>
                    {dadosVisualizacao.gravidade}
                  </Badge>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Status</label>
                  <Badge className={`${getStatusColor(dadosVisualizacao.status)} border text-xs`}>
                    {dadosVisualizacao.status}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Responsável</label>
                <p className="text-sm text-gray-900">{dadosVisualizacao.responsavel}</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Descrição</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{dadosVisualizacao.descricao}</p>
                </div>
              </div>

              {dadosVisualizacao.acaoImediata && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Ação Imediata Tomada</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{dadosVisualizacao.acaoImediata}</p>
                  </div>
                </div>
              )}

              {dadosVisualizacao.planoAcaoNumero && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Plano de Ação Vinculado</label>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700" style={{ fontWeight: 600 }}>{dadosVisualizacao.planoAcaoNumero}</span>
                  </div>
                </div>
              )}

              {dadosVisualizacao.dataFechamento && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Data de Fechamento</label>
                  <p className="text-sm text-gray-900">{formatarDataPtBr(dadosVisualizacao.dataFechamento)}</p>
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
                  const rof = dadosVisualizacao;
                  fecharModalVisualizacao();
                  setTimeout(() => {
                    handleEditar(rof);
                  }, 200);
                }}
                variant="outline"
                className="flex-1 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </Button>
              {(dadosVisualizacao.status === 'Aberta' || dadosVisualizacao.status === 'Em Tratamento') && (
                <Button
                  onClick={() => {
                    const rof = dadosVisualizacao;
                    fecharModalVisualizacao();
                    setTimeout(() => {
                      handleAvancarStatus(rof);
                    }, 200);
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  {dadosVisualizacao.status === 'Aberta' ? 'Em Tratamento' : 'Concluir'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
