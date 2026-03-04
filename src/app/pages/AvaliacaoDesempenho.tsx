import { formatarDataPtBr, capitalizarPrimeiraLetra } from '../utils/formatters';
import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import {
  List,
  Settings,
  Search,
  Calendar,
  User,
  Eye,
  Edit2,
  Trash2,
  X,
  Plus,
  AlertCircle,
  Save,
  Target,
  TrendingUp
} from 'lucide-react';
import { getClassificacaoColor, getNotaLabel, getNotaColor, getNotaIcon, getMetaStatusColor, calcularEstatisticasNotas } from '../utils/rh-helpers';
import { getFromStorage } from '../utils/helpers';
import { Button } from '../components/ui/button';

// Interfaces
interface CompetenciaAvaliacao {
  competencia: string;
  nota: 1 | 2 | 3 | 4 | null; // 1=Não atende, 2=Abaixo, 3=Atende, 4=Supera
  justificativa: string; // Obrigatório quando nota = 1
  observacao?: string; // Retrocompatibilidade
}

interface MetaAvaliacao {
  meta: string;
  status: 'atingida' | 'parcial' | 'nao-atingida';
  percentual: number;
  observacao: string;
}

interface AvaliacaoDesempenho {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  funcao: string;
  dataAvaliacao: string;
  periodo: string;
  avaliador: string;
  competencias: CompetenciaAvaliacao[];
  metas: MetaAvaliacao[];
  pontosFortes: string;
  pontosMelhoria: string;
  planoDesenvolvimento: string;
  percentualAprovacao?: number;
  notaFinal?: number; // Retrocompatibilidade
  classificacao: 'excelente' | 'bom' | 'regular' | 'insatisfatorio';
  observacaoFinal: string;
  dataCriacao: string;
}

interface ConfiguracaoDesempenho {
  percentualMinimo: number; // % mínimo de Atende + Supera para aprovação
  competencias: string[];
}

export function AvaliacaoDesempenho() {
  const [activeTab, setActiveTab] = useState<'lista' | 'configuracao'>('lista');
  const [todasAvaliacoes, setTodasAvaliacoes] = useState<AvaliacaoDesempenho[]>([]);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoDesempenho | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Configuração
  const [configuracaoDesempenho, setConfiguracaoDesempenho] = useState<ConfiguracaoDesempenho>({
    percentualMinimo: 70,
    competencias: [
      'Qualidade do Trabalho',
      'Produtividade',
      'Conhecimento Técnico',
      'Inovação e Criatividade',
      'Liderança',
      'Trabalho em Equipe',
      'Comunicação',
      'Resolução de Problemas',
      'Gestão do Tempo',
      'Comprometimento'
    ]
  });

  useEffect(() => {
    loadAllAvaliacoes();
    loadConfiguracao();
  }, []);

  const loadAllAvaliacoes = () => {
    const colaboradores = getFromStorage<any[]>('sisteq-colaboradores', []);
    if (colaboradores.length === 0) {
      setTodasAvaliacoes([]);
      return;
    }

    const allAvaliacoes: AvaliacaoDesempenho[] = [];

    colaboradores.forEach((colaborador: any) => {
      const avaliacoes = getFromStorage<any[]>(`sisteq-avaliacao-desempenho-${colaborador.id}`, []);
      if (avaliacoes.length > 0) {
        avaliacoes.forEach((avaliacao: any) => {
          allAvaliacoes.push({
            ...avaliacao,
            colaboradorId: colaborador.id,
            colaboradorNome: colaborador.nomeCompleto,
            funcao: colaborador.funcao || 'Não informado'
          });
        });
      }
    });

    allAvaliacoes.sort((a, b) => new Date(b.dataAvaliacao).getTime() - new Date(a.dataAvaliacao).getTime());
    setTodasAvaliacoes(allAvaliacoes);
  };

  const loadConfiguracao = () => {
    const config = getFromStorage<ConfiguracaoDesempenho | null>('sisteq-configuracao-desempenho', null);
    if (config) {
      setConfiguracaoDesempenho(config);
    }
  };

  const handleDelete = (avaliacao: AvaliacaoDesempenho) => {
    if (confirm(`Deseja realmente excluir a avaliação de "${avaliacao.colaboradorNome}"?`)) {
      const avaliacoes = getFromStorage<any[]>(`sisteq-avaliacao-desempenho-${avaliacao.colaboradorId}`, []);
      if (avaliacoes.length > 0) {
        const updated = avaliacoes.filter((a: any) => a.id !== avaliacao.id);
        localStorage.setItem(`sisteq-avaliacao-desempenho-${avaliacao.colaboradorId}`, JSON.stringify(updated));
        loadAllAvaliacoes();
      }
    }
  };

  // Configuração - Funções
  const handleSaveConfiguracao = () => {
    if (configuracaoDesempenho.percentualMinimo < 0 || configuracaoDesempenho.percentualMinimo > 100) {
      alert('O percentual mínimo deve estar entre 0 e 100');
      return;
    }

    localStorage.setItem('sisteq-configuracao-desempenho', JSON.stringify(configuracaoDesempenho));
    alert('Configuração salva com sucesso!');
  };

  const addCompetencia = () => {
    const novaComp = prompt('Nome da nova competência:');
    if (novaComp && novaComp.trim()) {
      setConfiguracaoDesempenho({
        ...configuracaoDesempenho,
        competencias: [...configuracaoDesempenho.competencias, novaComp.trim()]
      });
    }
  };

  const removeCompetencia = (index: number) => {
    if (confirm(`Deseja remover "${configuracaoDesempenho.competencias[index]}"?`)) {
      const newCompetencias = configuracaoDesempenho.competencias.filter((_, i) => i !== index);
      setConfiguracaoDesempenho({
        ...configuracaoDesempenho,
        competencias: newCompetencias
      });
    }
  };

  const updateCompetencia = (index: number, value: string) => {
    const newCompetencias = [...configuracaoDesempenho.competencias];
    newCompetencias[index] = value;
    setConfiguracaoDesempenho({
      ...configuracaoDesempenho,
      competencias: newCompetencias
    });
  };

  const filteredAvaliacoes = todasAvaliacoes.filter(av => {
    const matchSearch = av.colaboradorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       av.avaliador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       av.funcao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchClassificacao = !filtroClassificacao || av.classificacao === filtroClassificacao;
    
    let matchData = true;
    if (filtroDataInicio && filtroDataFim) {
      const dataAvaliacao = new Date(av.dataAvaliacao);
      const dataInicio = new Date(filtroDataInicio);
      const dataFim = new Date(filtroDataFim);
      matchData = dataAvaliacao >= dataInicio && dataAvaliacao <= dataFim;
    }
    
    return matchSearch && matchClassificacao && matchData;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Avaliações de Desempenho
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Gerencie as avaliações e configure as competências avaliadas
        </p>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('lista')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'lista'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-5 h-5" />
            Lista de Avaliações
          </button>
          <button
            onClick={() => setActiveTab('configuracao')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'configuracao'
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configuração
          </button>
        </div>
      </div>

      {/* Conteúdo - Lista */}
      {activeTab === 'lista' && (
        <>
          {/* Busca e Filtros */}
          {todasAvaliacoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por colaborador, avaliador ou função..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filtroClassificacao}
                  onChange={(e) => setFiltroClassificacao(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Todas as Classificações</option>
                  <option value="excelente">Excelente</option>
                  <option value="bom">Bom</option>
                  <option value="regular">Regular</option>
                  <option value="insatisfatorio">Insatisfatório</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      placeholder="Data inicial"
                      className="pl-9"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={filtroDataFim}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      placeholder="Data final"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista */}
          {!avaliacaoSelecionada && (
            <>
              {filteredAvaliacoes.length > 0 ? (
                <div className="space-y-4">
                  {filteredAvaliacoes.map((avaliacao) => {
                    const stats = calcularEstatisticasNotas(avaliacao.competencias);
                    return (
                      <div key={`${avaliacao.colaboradorId}-${avaliacao.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <User className="w-5 h-5 text-red-600" />
                                <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{avaliacao.colaboradorNome}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getClassificacaoColor(avaliacao.classificacao)}`}>
                                  {capitalizarPrimeiraLetra(avaliacao.classificacao)}
                                </span>
                                {avaliacao.percentualAprovacao !== undefined && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full">
                                    <TrendingUp className="w-3 h-3 text-red-700" />
                                    <span className="text-xs font-semibold text-red-700">{avaliacao.percentualAprovacao}%</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{avaliacao.funcao}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatarDataPtBr(avaliacao.dataAvaliacao)}
                                </div>
                                <span>•</span>
                                <span>Período: {avaliacao.periodo}</span>
                                <span>•</span>
                                <span>Avaliador: {avaliacao.avaliador}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAvaliacaoSelecionada(avaliacao)}
                                className="text-blue-600 hover:bg-blue-50"
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.location.href = `/recursos-humanos/colaboradores`}
                                className="text-green-600 hover:bg-green-50"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(avaliacao)}
                                className="text-red-600 hover:bg-red-50"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 pt-3 border-t border-gray-200 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              <span className="text-gray-600">Não Atende: {stats.naoAtende}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                              <span className="text-gray-600">Abaixo: {stats.abaixo}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="text-gray-600">Atende: {stats.atende}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span className="text-gray-600">Supera: {stats.supera}</span>
                            </div>
                            {avaliacao.metas.length > 0 && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-600">Metas: {avaliacao.metas.length}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-red-50 rounded-lg border border-red-200 p-12 text-center">
                  <Target className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {searchTerm || filtroClassificacao ? 'Nenhuma avaliação encontrada' : 'Nenhuma avaliação realizada'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || filtroClassificacao
                      ? 'Tente buscar com outros termos ou filtros'
                      : 'As avaliações de desempenho são criadas no cadastro de cada colaborador'
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {/* Modal de Visualização */}
          {avaliacaoSelecionada && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Detalhes da Avaliação de Desempenho</h2>
                <button
                  onClick={() => setAvaliacaoSelecionada(null)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Colaborador</p>
                    <p className="font-medium text-gray-900">{avaliacaoSelecionada.colaboradorNome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Função</p>
                    <p className="font-medium text-gray-900">{avaliacaoSelecionada.funcao}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Data</p>
                    <p className="font-medium text-gray-900">{formatarDataPtBr(avaliacaoSelecionada.dataAvaliacao)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Período</p>
                    <p className="font-medium text-gray-900">{avaliacaoSelecionada.periodo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Avaliador</p>
                    <p className="font-medium text-gray-900">{avaliacaoSelecionada.avaliador}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Classificação:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getClassificacaoColor(avaliacaoSelecionada.classificacao)}`}>
                    {capitalizarPrimeiraLetra(avaliacaoSelecionada.classificacao)}
                  </span>
                  {avaliacaoSelecionada.percentualAprovacao !== undefined && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-sm font-medium text-gray-700">Percentual:</span>
                      <span className="text-lg text-red-600" style={{ fontWeight: 700 }}>{avaliacaoSelecionada.percentualAprovacao}%</span>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>Competências Avaliadas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {avaliacaoSelecionada.competencias.map((comp, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${getNotaColor(comp.nota)}`}>
                        <div className="flex items-start gap-2">
                          {getNotaIcon(comp.nota)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{comp.competencia}</span>
                              <span className="text-sm" style={{ fontWeight: 700 }}>{getNotaLabel(comp.nota)}</span>
                            </div>
                            {comp.justificativa && (
                              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                                <strong>Justificativa:</strong> {comp.justificativa}
                              </div>
                            )}
                            {comp.observacao && !comp.justificativa && (
                              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                                <strong>Observação:</strong> {comp.observacao}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {avaliacaoSelecionada.metas.length > 0 && (
                  <div>
                    <h3 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>Metas e Resultados</h3>
                    <div className="space-y-2">
                      {avaliacaoSelecionada.metas.map((meta, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${getMetaStatusColor(meta.status)}`}>
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-sm flex-1">{meta.meta}</span>
                            <span className="text-sm ml-2" style={{ fontWeight: 700 }}>{meta.percentual}%</span>
                          </div>
                          {meta.observacao && (
                            <p className="text-xs text-gray-600 mt-1">{meta.observacao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(avaliacaoSelecionada.pontosFortes || avaliacaoSelecionada.pontosMelhoria || avaliacaoSelecionada.planoDesenvolvimento) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {avaliacaoSelecionada.pontosFortes && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-gray-900 mb-2">Pontos Fortes</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosFortes}</p>
                      </div>
                    )}
                    {avaliacaoSelecionada.pontosMelhoria && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-gray-900 mb-2">Pontos de Melhoria</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosMelhoria}</p>
                      </div>
                    )}
                    {avaliacaoSelecionada.planoDesenvolvimento && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-gray-900 mb-2">Plano de Desenvolvimento</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.planoDesenvolvimento}</p>
                      </div>
                    )}
                  </div>
                )}

                {avaliacaoSelecionada.observacaoFinal && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-gray-900 mb-2">Observação Final</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.observacaoFinal}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setAvaliacaoSelecionada(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => window.location.href = `/recursos-humanos/colaboradores`}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar no Colaborador
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Conteúdo - Configuração */}
      {activeTab === 'configuracao' && (
        <div className="space-y-6">
          {/* Percentual Mínimo */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Critério de Aprovação</h3>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Percentual Mínimo para Desempenho Satisfatório (Atende + Supera)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={configuracaoDesempenho.percentualMinimo}
                  onChange={(e) => setConfiguracaoDesempenho({
                    ...configuracaoDesempenho,
                    percentualMinimo: parseInt(e.target.value) || 0
                  })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-lg font-semibold text-center"
                />
                <span className="text-2xl font-bold text-red-600">%</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    <strong>Classificação Automática:</strong> ≥90% = Excelente | ≥75% = Bom | ≥{configuracaoDesempenho.percentualMinimo}% = Regular | {`<${configuracaoDesempenho.percentualMinimo}%`} = Insatisfatório
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Competências */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                <h2 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Competências Avaliadas</h2>
              </div>
              <button
                onClick={addCompetencia}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar Competência
              </button>
            </div>

            {configuracaoDesempenho.competencias.length > 0 ? (
              <div className="space-y-2">
                {configuracaoDesempenho.competencias.map((competencia, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={competencia}
                      onChange={(e) => updateCompetencia(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeCompetencia(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">
                Nenhuma competência configurada. Clique em "Adicionar Competência" para começar.
              </p>
            )}
          </div>

          {/* Legenda do Sistema de Notas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Sistema de Classificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-full font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium text-gray-900">Não Atende</div>
                  <div className="text-xs text-gray-600">Justificativa obrigatória</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-yellow-600 text-white rounded-full font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium text-gray-900">Abaixo do Esperado</div>
                  <div className="text-xs text-gray-600">Necessita melhoria</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-full font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium text-gray-900">Atende</div>
                  <div className="text-xs text-gray-600">Desempenho esperado</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold">
                  4
                </div>
                <div>
                  <div className="font-medium text-gray-900">Supera</div>
                  <div className="text-xs text-gray-600">Excepcional</div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Importante:</strong> Quando uma competência receber nota "1 - Não Atende", 
                  será obrigatório preencher uma justificativa detalhada explicando os motivos.
                </div>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveConfiguracao}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              Salvar Configuração
            </button>
          </div>

          {/* Preview */}
          {configuracaoDesempenho.competencias.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Preview da Avaliação</h3>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Total de Competências:</span>
                    <span className="text-lg text-red-600" style={{ fontWeight: 700 }}>{configuracaoDesempenho.competencias.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Percentual Mínimo (Atende + Supera):</span>
                    <span className="text-lg text-red-600" style={{ fontWeight: 700 }}>{configuracaoDesempenho.percentualMinimo}%</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>Competências que serão avaliadas:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {configuracaoDesempenho.competencias.map((comp, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <span>{comp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}