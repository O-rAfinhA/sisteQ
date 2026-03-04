import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, BookMarked, Users, Calendar, Building, CheckCircle2, XCircle, Clock, Eye, Search } from 'lucide-react';
import { ModularSidebar } from '../components/ModularSidebar';
import { getModuleById } from '../config/modules';
import { generateId, getFromStorage } from '../utils/helpers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatarDataPtBr } from '../utils/formatters';
import { Colaborador } from '../types/config';

interface PlanoQualificacao {
  id: string;
  numeroPQ: string;
  nome: string;
  motivo: string;
  tipo: string;
  instituicao: string;
  previsaoData: string;
  status: string;
  dataConclusao: string;
  prazoAvaliacaoEficacia: string;
  necessitaAvaliacaoEficacia: boolean;
  eficaz: boolean | null;
  evidencia: string;
  dataAvaliacao: string;
  avaliadorNome: string;
  pessoas: string[]; // IDs dos colaboradores
  pessoasExternas: string[]; // Nomes digitados manualmente
  dataCriacao: string;
}

const MOTIVOS = [
  'Backup de Função',
  'NC em processo',
  'Obrigatoriedade Legal',
  'Processo Ineficiente',
  'Indicador fora de Meta',
  'Integração de Colaborador',
  'Mudança de Função',
  'Qualificação MQ'
];

const TIPOS = [
  'Qualificação Interno',
  'Treinamento Externo',
  'Palestra',
  'Reunião'
];

const STATUS_OPTIONS = [
  'Planejado',
  'Em Andamento',
  'Concluído',
  'Cancelado',
  'Aguardando Avaliação'
];

const STATUS_COLORS: { [key: string]: string } = {
  'Planejado': 'bg-gray-100 text-gray-700',
  'Em Andamento': 'bg-blue-100 text-blue-700',
  'Concluído': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
  'Aguardando Avaliação': 'bg-yellow-100 text-yellow-700'
};

export default function PlanoQualificacao() {
  const [planos, setPlanos] = useState<PlanoQualificacao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingPlano, setViewingPlano] = useState<PlanoQualificacao | null>(null);
  const [modalFechando, setModalFechando] = useState(false);
  const [nomeExternoInput, setNomeExternoInput] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<string | null>(null);
  const [buscaNome, setBuscaNome] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [filtroColaboradores, setFiltroColaboradores] = useState(''); // Filtro para colaboradores no modal
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroEficacia, setFiltroEficacia] = useState('');
  const [formData, setFormData] = useState<Omit<PlanoQualificacao, 'id' | 'numeroPQ' | 'dataCriacao'>>({
    nome: '',
    motivo: MOTIVOS[0],
    tipo: TIPOS[0],
    instituicao: '',
    previsaoData: '',
    status: 'Planejado',
    dataConclusao: '',
    prazoAvaliacaoEficacia: '',
    necessitaAvaliacaoEficacia: true,
    eficaz: null,
    evidencia: '',
    dataAvaliacao: '',
    avaliadorNome: '',
    pessoas: [],
    pessoasExternas: []
  });

  // Carregar dados do localStorage
  useEffect(() => {
    setPlanos(getFromStorage<PlanoQualificacao[]>('planos-qualificacao', []));
    setColaboradores(getFromStorage<any[]>('sisteq-colaboradores', []));
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    if (planos.length > 0) {
      localStorage.setItem('planos-qualificacao', JSON.stringify(planos));
    }
  }, [planos]);

  const gerarNumeroPQ = (): string => {
    const maxNum = planos.reduce((max, p) => {
      // ✅ Proteção contra numeroPQ undefined ou inválido
      if (!p.numeroPQ || typeof p.numeroPQ !== 'string') {
        return max;
      }
      const num = parseInt(p.numeroPQ.replace('PQ', ''));
      return num > max ? num : max;
    }, 0);
    return `PQ${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      setPlanos(planos.map(p =>
        p.id === editingId
          ? { 
              ...p, 
              ...formData,
              // Preserva campos que não devem ser alterados
              id: p.id,
              numeroPQ: p.numeroPQ,
              dataCriacao: p.dataCriacao
            }
          : p
      ));
      setEditingId(null);
    } else {
      const novoPlano: PlanoQualificacao = {
        id: generateId(),
        numeroPQ: gerarNumeroPQ(),
        ...formData,
        dataCriacao: new Date().toISOString()
      };
      setPlanos([...planos, novoPlano]);
    }

    resetForm();
  };

  const handleEdit = (plano: PlanoQualificacao) => {
    setFormData({
      nome: plano.nome,
      motivo: plano.motivo,
      tipo: plano.tipo,
      instituicao: plano.instituicao,
      previsaoData: plano.previsaoData,
      status: plano.status,
      dataConclusao: plano.dataConclusao || '',
      prazoAvaliacaoEficacia: plano.prazoAvaliacaoEficacia || '',
      necessitaAvaliacaoEficacia: plano.necessitaAvaliacaoEficacia,
      eficaz: plano.eficaz,
      evidencia: plano.evidencia || '',
      dataAvaliacao: plano.dataAvaliacao || '',
      avaliadorNome: plano.avaliadorNome || '',
      pessoas: plano.pessoas || [],
      pessoasExternas: plano.pessoasExternas || []
    });
    setEditingId(plano.id);
    setViewingPlano(plano);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleView = (plano: PlanoQualificacao) => {
    setViewingPlano(plano);
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleNew = () => {
    resetForm();
    setEditingId(null);
    setIsEditMode(true);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano de qualificação?')) {
      setPlanos(planos.filter(p => p.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      motivo: MOTIVOS[0],
      tipo: TIPOS[0],
      instituicao: '',
      previsaoData: '',
      status: 'Planejado',
      dataConclusao: '',
      prazoAvaliacaoEficacia: '',
      necessitaAvaliacaoEficacia: true,
      eficaz: null,
      evidencia: '',
      dataAvaliacao: '',
      avaliadorNome: '',
      pessoas: [],
      pessoasExternas: []
    });
    setFiltroColaboradores(''); // Limpa o filtro de busca
    setShowModal(false);
    setIsEditMode(false);
    setEditingId(null);
    setViewingPlano(null);
    setNomeExternoInput('');
  };

  const fecharModal = () => {
    if (modalFechando) return;
    setModalFechando(true);
    window.setTimeout(() => {
      resetForm();
      setModalFechando(false);
    }, 200);
  };

  useEffect(() => {
    if (!showModal && !viewingPlano) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      fecharModal();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showModal, viewingPlano, modalFechando]);

  const togglePessoa = (pessoaId: string) => {
    setFormData(prev => {
      const pessoasArray = prev.pessoas || [];
      return {
        ...prev,
        pessoas: pessoasArray.includes(pessoaId)
          ? pessoasArray.filter(id => id !== pessoaId)
          : [...pessoasArray, pessoaId]
      };
    });
  };

  const getNomesColaboradores = (ids: string[]): string => {
    return ids
      .map(id => colaboradores.find(c => c.id === id)?.nomeCompleto || 'Desconhecido')
      .join(', ');
  };



  const filtrarPlanos = (planos: PlanoQualificacao[]): PlanoQualificacao[] => {
    return planos.filter(plano => {
      if (buscaNome && !plano.nome.toLowerCase().includes(buscaNome.toLowerCase())) {
        return false;
      }
      if (filtroMotivo && plano.motivo !== filtroMotivo) {
        return false;
      }
      if (filtroTipo && plano.tipo !== filtroTipo) {
        return false;
      }
      if (filtroStatus && plano.status !== filtroStatus) {
        return false;
      }
      if (filtroEficacia) {
        if (filtroEficacia === 'Eficaz' && plano.eficaz !== true) {
          return false;
        }
        if (filtroEficacia === 'Não Eficaz' && plano.eficaz !== false) {
          return false;
        }
        if (filtroEficacia === 'Pendente' && plano.eficaz !== null) {
          return false;
        }
      }
      return true;
    });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Plano de Qualificação
          </h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie treinamentos e qualificações dos colaboradores
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </Button>
      </div>

      {/* Lista de Planos */}
      <div className="bg-white rounded-xl border border-gray-200">
        {planos.length === 0 ? (
          <div className="p-12 text-center">
            <BookMarked className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">Nenhum plano de qualificação cadastrado</p>
          </div>
        ) : (
          <>
            {/* Mini Dashboard Clicável */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {/* Total */}
                <button
                  onClick={() => {
                    setFiltroStatus('');
                    setBuscaNome('');
                    setFiltroMotivo('');
                    setFiltroTipo('');
                    setFiltroEficacia('');
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    !filtroStatus && !buscaNome && !filtroMotivo && !filtroTipo && !filtroEficacia
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">Total</div>
                  <div className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{planos.length}</div>
                </button>

                {/* Planejado */}
                <button
                  onClick={() => setFiltroStatus(filtroStatus === 'Planejado' ? '' : 'Planejado')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    filtroStatus === 'Planejado'
                      ? 'border-gray-500 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">Planejado</div>
                  <div className="text-2xl text-gray-700" style={{ fontWeight: 700 }}>
                    {planos.filter(p => p.status === 'Planejado').length}
                  </div>
                </button>

                {/* Em Andamento */}
                <button
                  onClick={() => setFiltroStatus(filtroStatus === 'Em Andamento' ? '' : 'Em Andamento')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    filtroStatus === 'Em Andamento'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">Em Andamento</div>
                  <div className="text-2xl text-blue-600" style={{ fontWeight: 700 }}>
                    {planos.filter(p => p.status === 'Em Andamento').length}
                  </div>
                </button>

                {/* Concluído */}
                <button
                  onClick={() => setFiltroStatus(filtroStatus === 'Concluído' ? '' : 'Concluído')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    filtroStatus === 'Concluído'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">Concluído</div>
                  <div className="text-2xl text-green-600" style={{ fontWeight: 700 }}>
                    {planos.filter(p => p.status === 'Concluído').length}
                  </div>
                </button>

                {/* Aguardando Avaliação */}
                <button
                  onClick={() => setFiltroStatus(filtroStatus === 'Aguardando Avaliação' ? '' : 'Aguardando Avaliação')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    filtroStatus === 'Aguardando Avaliação'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">Aguard. Aval.</div>
                  <div className="text-2xl text-yellow-600" style={{ fontWeight: 700 }}>
                    {planos.filter(p => p.status === 'Aguardando Avaliação').length}
                  </div>
                </button>
              </div>

              {/* Filtros Adicionais */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Busca por Nome */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Buscar Nome
                  </label>
                  <input
                    type="text"
                    value={buscaNome}
                    onChange={(e) => setBuscaNome(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Digite o nome..."
                  />
                </div>

                {/* Filtro Motivo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <select
                    value={filtroMotivo}
                    onChange={(e) => setFiltroMotivo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Todos</option>
                    {MOTIVOS.map(motivo => (
                      <option key={motivo} value={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Tipo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Todos</option>
                    {TIPOS.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Eficácia */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Avaliação Eficácia
                  </label>
                  <select
                    value={filtroEficacia}
                    onChange={(e) => setFiltroEficacia(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="Eficaz">Eficaz</option>
                    <option value="Não Eficaz">Não Eficaz</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>

                {/* Botão Limpar Filtros */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setBuscaNome('');
                      setFiltroMotivo('');
                      setFiltroTipo('');
                      setFiltroStatus('');
                      setFiltroEficacia('');
                    }}
                    className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Contador de Resultados */}
              {(buscaNome || filtroMotivo || filtroTipo || filtroStatus || filtroEficacia) && (
                <div className="mt-4 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <span className="text-sm font-medium text-indigo-900">
                    Exibindo {filtrarPlanos(planos).length} de {planos.length} plano(s)
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-20" style={{ fontWeight: 500 }}>
                      PQ
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 min-w-[250px]" style={{ fontWeight: 500 }}>
                      Nome do Plano
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-36" style={{ fontWeight: 500 }}>
                      Instrutor
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-40" style={{ fontWeight: 500 }}>
                      Motivo / Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-48" style={{ fontWeight: 500 }}>
                      Pessoas
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-28" style={{ fontWeight: 500 }}>
                      Previsão
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-32" style={{ fontWeight: 500 }}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500 w-24" style={{ fontWeight: 500 }}>
                      Eficácia
                    </th>
                    <th className="px-4 py-3 text-right text-xs text-gray-500 w-24" style={{ fontWeight: 500 }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtrarPlanos(planos).map((plano) => (
                    <tr key={plano.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-indigo-600">
                          {plano.numeroPQ}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{plano.nome}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-700">{plano.instituicao || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-gray-900">{plano.motivo}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{plano.tipo}</div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="space-y-1">
                          <div className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-indigo-50 rounded-full">
                            <Users className="w-3 h-3 text-indigo-600" />
                            <span className="text-xs font-semibold text-indigo-700">{(plano.pessoas?.length || 0) + (plano.pessoasExternas?.length || 0)}</span>
                          </div>
                          {plano.pessoas && plano.pessoas.length > 0 && (
                            <div className="text-xs text-gray-600 line-clamp-2">
                              {getNomesColaboradores(plano.pessoas)}
                            </div>
                          )}
                          {plano.pessoasExternas && plano.pessoasExternas.length > 0 && (
                            <div className="text-xs text-indigo-600 line-clamp-1">
                              {plano.pessoasExternas.join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-700">
                          {formatarDataPtBr(plano.previsaoData) || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[plano.status] || 'bg-gray-100 text-gray-700'}`}>
                            {plano.status}
                          </span>
                          {plano.dataConclusao && (
                            <div className="text-xs text-gray-500">
                              {formatarDataPtBr(plano.dataConclusao) || '-'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {plano.necessitaAvaliacaoEficacia ? (
                          <div className="inline-flex items-center justify-center">
                            {plano.eficaz === true && (
                              <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full" title="Eficaz">
                                <CheckCircle2 className="w-4 h-4 text-green-700" />
                              </div>
                            )}
                            {plano.eficaz === false && (
                              <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full" title="Não Eficaz">
                                <XCircle className="w-4 h-4 text-red-700" />
                              </div>
                            )}
                            {plano.eficaz === null && (
                              <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full" title="Pendente">
                                <Clock className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(plano)}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(plano)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(plano.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de Visualização */}
      {viewingPlano && !isEditMode && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${modalFechando ? 'opacity-0' : 'opacity-100'}`}
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            fecharModal();
          }}
          onTouchStart={(e) => {
            if (e.target !== e.currentTarget) return;
            fecharModal();
          }}
        >
          <div className={`bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden transition-opacity duration-200 ${modalFechando ? 'opacity-0' : 'opacity-100'}`}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-mono" style={{ fontWeight: 500 }}>
                      {viewingPlano.numeroPQ}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-sm ${STATUS_COLORS[viewingPlano.status] || 'bg-gray-100 text-gray-700'}`} style={{ fontWeight: 500 }}>
                      {viewingPlano.status}
                    </span>
                  </div>
                  <h3 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>{viewingPlano.nome}</h3>
                  {viewingPlano.instituicao && (
                    <p className="text-indigo-100 mt-1">{viewingPlano.instituicao}</p>
                  )}
                </div>
                <button
                  onClick={fecharModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                {/* Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                      Motivo
                    </label>
                    <p className="text-base text-gray-900">{viewingPlano.motivo}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                      Tipo
                    </label>
                    <p className="text-base text-gray-900">{viewingPlano.tipo}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                      Previsão de Data
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900">{formatarDataPtBr(viewingPlano.previsaoData) || '-'}</p>
                    </div>
                  </div>
                  {viewingPlano.dataConclusao && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                        Data de Conclusão
                      </label>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <p className="text-base text-gray-900">{formatarDataPtBr(viewingPlano.dataConclusao) || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Colaboradores */}
                <div>
                  <label className="block text-xs text-gray-500 mb-3" style={{ fontWeight: 500 }}>
                    Colaboradores Envolvidos
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {viewingPlano.pessoas && viewingPlano.pessoas.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Colaboradores Internos:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {viewingPlano.pessoas.map(pessoaId => {
                            const colab = colaboradores.find(c => c.id === pessoaId);
                            return colab ? (
                              <span key={pessoaId} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {colab.nomeCompleto}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {viewingPlano.pessoasExternas && viewingPlano.pessoasExternas.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Pessoas Externas:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {viewingPlano.pessoasExternas.map((nome, index) => (
                            <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                              {nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!viewingPlano.pessoas || viewingPlano.pessoas.length === 0) && (!viewingPlano.pessoasExternas || viewingPlano.pessoasExternas.length === 0) && (
                      <p className="text-sm text-gray-500">Nenhum colaborador vinculado</p>
                    )}
                  </div>
                </div>

                {/* Avaliação de Eficácia */}
                {viewingPlano.necessitaAvaliacaoEficacia && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <h4 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      Avaliação de Eficácia
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                          Status da Avaliação
                        </label>
                        {viewingPlano.eficaz === true && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Eficaz
                          </span>
                        )}
                        {viewingPlano.eficaz === false && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            Não Eficaz
                          </span>
                        )}
                        {viewingPlano.eficaz === null && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            Pendente
                          </span>
                        )}
                      </div>
                      {viewingPlano.prazoAvaliacaoEficacia && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                            Prazo de Avaliação
                          </label>
                          <p className="text-sm text-gray-900">{formatarDataPtBr(viewingPlano.prazoAvaliacaoEficacia) || '-'}</p>
                        </div>
                      )}
                    </div>
                    {viewingPlano.evidencia && (
                      <div className="mt-4">
                        <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>
                          Evidência
                        </label>
                        <p className="text-sm text-gray-900 bg-white rounded-lg p-3 border border-indigo-200">
                          {viewingPlano.evidencia}
                        </p>
                      </div>
                    )}
                    {viewingPlano.eficaz !== null && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-300">
                        {viewingPlano.dataAvaliacao && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                              Data da Avaliação
                            </label>
                            <p className="text-sm text-gray-900">{formatarDataPtBr(viewingPlano.dataAvaliacao) || '-'}</p>
                          </div>
                        )}
                        {viewingPlano.avaliadorNome && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>
                              Avaliador
                            </label>
                            <p className="text-sm text-gray-900">{viewingPlano.avaliadorNome}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Data de Criação */}
                <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                  Criado em: {formatarDataPtBr(viewingPlano.dataCriacao) || '-'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
              <button
                onClick={() => handleEdit(viewingPlano!)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar Plano
              </button>
              <button
                onClick={fecharModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Criação */}
      {showModal && isEditMode && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${modalFechando ? 'opacity-0' : 'opacity-100'}`}
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            fecharModal();
          }}
          onTouchStart={(e) => {
            if (e.target !== e.currentTarget) return;
            fecharModal();
          }}
        >
          <div className={`bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden transition-opacity duration-200 ${modalFechando ? 'opacity-0' : 'opacity-100'}`}>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl text-gray-900" style={{ fontWeight: 600 }}>
                    {editingId ? 'Editar Plano de Qualificação' : 'Novo Plano de Qualificação'}
                  </h3>
                  {editingId && viewingPlano && (
                    <p className="text-gray-500 mt-1">{viewingPlano.numeroPQ}</p>
                  )}
                </div>
                <button
                  onClick={fecharModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body com Formulário */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Grid de 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome do Plano */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Plano *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ex: Treinamento em Segurança do Trabalho"
                    />
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo *
                    </label>
                    <select
                      required
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {MOTIVOS.map(motivo => (
                        <option key={motivo} value={motivo}>{motivo}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {TIPOS.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>

                  {/* Instituição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instituição/Instrutor
                    </label>
                    <input
                      type="text"
                      value={formData.instituicao}
                      onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Quem irá ministrar"
                    />
                  </div>

                  {/* Previsão de Data */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Previsão de Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.previsaoData}
                      onChange={(e) => setFormData({ ...formData, previsaoData: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => {
                        const novoStatus = e.target.value;
                        setFormData({ 
                          ...formData, 
                          status: novoStatus,
                          dataConclusao: novoStatus === 'Concluído' ? formData.dataConclusao : ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Data de Conclusão */}
                  {formData.status === 'Concluído' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Conclusão *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dataConclusao}
                        onChange={(e) => setFormData({ ...formData, dataConclusao: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Prazo de Avaliação */}
                  {formData.status === 'Concluído' && formData.necessitaAvaliacaoEficacia && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prazo de Avaliação de Eficácia *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.prazoAvaliacaoEficacia}
                        onChange={(e) => setFormData({ ...formData, prazoAvaliacaoEficacia: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Necessita Avaliação de Eficácia */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="necessitaAvaliacao"
                    checked={formData.necessitaAvaliacaoEficacia}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      necessitaAvaliacaoEficacia: e.target.checked,
                      prazoAvaliacaoEficacia: e.target.checked ? formData.prazoAvaliacaoEficacia : '',
                      eficaz: e.target.checked ? formData.eficaz : null,
                      evidencia: e.target.checked ? formData.evidencia : ''
                    })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                  <label htmlFor="necessitaAvaliacao" className="text-sm font-medium text-gray-700">
                    Necessita Avaliação de Eficácia?
                  </label>
                </div>

                {/* Campos de Avaliação de Eficácia */}
                {formData.status === 'Concluído' && formData.necessitaAvaliacaoEficacia && (
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-4">
                    <h3 className="text-gray-900 flex items-center gap-2" style={{ fontWeight: 600 }}>
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      Avaliação de Eficácia
                    </h3>

                    {/* Eficaz? */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Eficaz?
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="eficaz"
                            checked={formData.eficaz === true}
                            onChange={() => setFormData({ ...formData, eficaz: true })}
                            className="w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="eficaz"
                            checked={formData.eficaz === false}
                            onChange={() => setFormData({ ...formData, eficaz: false })}
                            className="w-4 h-4 text-red-600 focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-700">Não</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="eficaz"
                            checked={formData.eficaz === null}
                            onChange={() => setFormData({ ...formData, eficaz: null })}
                            className="w-4 h-4 text-gray-600 focus:ring-2 focus:ring-gray-500"
                          />
                          <span className="text-sm text-gray-700">Não avaliado</span>
                        </label>
                      </div>
                    </div>

                    {/* Evidência */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição da Evidência
                      </label>
                      <textarea
                        value={formData.evidencia}
                        onChange={(e) => setFormData({ ...formData, evidencia: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                        placeholder="Descreva as evidências da eficácia do treinamento..."
                      />
                    </div>

                    {/* Campos de registro da avaliação */}
                    {formData.eficaz !== null && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-indigo-300">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data da Avaliação
                          </label>
                          <input
                            type="date"
                            value={formData.dataAvaliacao}
                            onChange={(e) => setFormData({ ...formData, dataAvaliacao: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Avaliador
                          </label>
                          <input
                            type="text"
                            value={formData.avaliadorNome}
                            onChange={(e) => setFormData({ ...formData, avaliadorNome: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Nome do avaliador"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Seleção de Colaboradores */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colaboradores Envolvidos *
                  </label>
                  {colaboradores.length === 0 ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      Nenhum colaborador cadastrado. Cadastre colaboradores primeiro.
                    </div>
                  ) : (
                    <>
                      {/* Campo de Busca */}
                      <div className="mb-2 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          value={filtroColaboradores}
                          onChange={(e) => setFiltroColaboradores(e.target.value)}
                          placeholder="Buscar por nome, função ou departamento..."
                          className="pl-10"
                        />
                      </div>
                      
                      {/* Lista de Colaboradores */}
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                        {(() => {
                          const colaboradoresFiltrados = colaboradores.filter(colab => {
                            if (!filtroColaboradores) return true;
                            const termo = filtroColaboradores.toLowerCase();
                            return (
                              colab.nomeCompleto.toLowerCase().includes(termo) ||
                              colab.funcao.toLowerCase().includes(termo) ||
                              colab.departamento.toLowerCase().includes(termo)
                            );
                          });

                          if (colaboradoresFiltrados.length === 0) {
                            return (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                Nenhum colaborador encontrado para "{filtroColaboradores}"
                              </div>
                            );
                          }

                          return colaboradoresFiltrados.map(colab => (
                            <label
                              key={colab.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={formData.pessoas?.includes(colab.id) || false}
                                onChange={() => togglePessoa(colab.id)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{colab.nomeCompleto}</div>
                                <div className="text-xs text-gray-500">
                                  {colab.funcao} • {colab.departamento}
                                </div>
                              </div>
                            </label>
                          ));
                        })()}
                    </div>
                    </>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    {filtroColaboradores && colaboradores.length > 0 && (
                      <div className="text-gray-500">
                        {colaboradores.filter(colab => {
                          const termo = filtroColaboradores.toLowerCase();
                          return (
                            colab.nomeCompleto.toLowerCase().includes(termo) ||
                            colab.funcao.toLowerCase().includes(termo) ||
                            colab.departamento.toLowerCase().includes(termo)
                          );
                        }).length} resultado(s) encontrado(s)
                      </div>
                    )}
                    {formData.pessoas && formData.pessoas.length > 0 && (
                      <div className="text-indigo-600 font-medium">
                        {formData.pessoas.length} colaborador(es) selecionado(s)
                      </div>
                    )}
                  </div>
                </div>

                {/* Pessoas Externas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pessoas Externas
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={nomeExternoInput}
                      onChange={(e) => setNomeExternoInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (nomeExternoInput.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              pessoasExternas: [...prev.pessoasExternas, nomeExternoInput.trim()]
                            }));
                            setNomeExternoInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Digite o nome da pessoa externa"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (nomeExternoInput.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            pessoasExternas: [...prev.pessoasExternas, nomeExternoInput.trim()]
                          }));
                          setNomeExternoInput('');
                        }
                      }}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.pessoasExternas.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        {formData.pessoasExternas.length} pessoa(s) externa(s)
                      </div>
                      <div className="space-y-1">
                        {formData.pessoasExternas.map((nome, index) => (
                          <div key={index} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border border-gray-200">
                            <span className="text-xs text-gray-900">{nome}</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                pessoasExternas: prev.pessoasExternas.filter((_, i) => i !== index)
                              }))}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Remover"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button
                type="button"
                onClick={fecharModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className={`flex items-center gap-2 px-4 py-2 ${editingId ? 'bg-black hover:bg-[#333333]' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed`}
                disabled={(formData.pessoas?.length || 0) === 0 && (formData.pessoasExternas?.length || 0) === 0}
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Salvar Alterações' : 'Criar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
