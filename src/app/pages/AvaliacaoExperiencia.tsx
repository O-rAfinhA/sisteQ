import { useState, useEffect } from 'react';
import { formatarDataPtBr, capitalizarPrimeiraLetra } from '../utils/formatters';
import { getRequisitoStatusColor, getRequisitoStatusIcon, getParecerColor } from '../utils/rh-helpers';
import { generateId, getFromStorage } from '../utils/helpers';
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
  ClipboardCheck,
  Plus,
  AlertCircle,
  HelpCircle,
  Save
} from 'lucide-react';
import { Button } from '../components/ui/button';

// Interfaces
interface ItemAvaliacao {
  criterio: string;
  nota: 1 | 2 | 3 | 4 | null; // 1=Não atende, 2=Abaixo, 3=Atende, 4=Supera
  justificativa: string; // Obrigatório quando nota = 1
  status?: 'atende' | 'nao-atende' | 'parcial' | 'pendente'; // Retrocompatibilidade
  observacao?: string; // Retrocompatibilidade
}

interface AvaliacaoExperiencia {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  dataAvaliacao: string;
  periodo: string;
  avaliador: string;
  itens: ItemAvaliacao[];
  pontosForts: string;
  pontosMelhoria: string;
  parecer: 'aprovado' | 'reprovado' | 'prorrogado';
  observacaoFinal: string;
  percentualAprovacao?: number;
  dataCriacao: string;
}

interface Pergunta {
  id: string;
  pergunta: string;
  tipo: 'texto' | 'sim_nao' | 'escala';
  ordem: number;
}

interface ConfiguracaoExperiencia {
  percentualMinimo: number; // % mínimo de Atende + Supera para aprovação
  criterios: string[];
}

export function AvaliacaoExperiencia() {
  const [activeTab, setActiveTab] = useState<'lista' | 'configuracao'>('lista');
  const [todasAvaliacoes, setTodasAvaliacoes] = useState<AvaliacaoExperiencia[]>([]);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoExperiencia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Configuração
  const [configuracaoExperiencia, setConfiguracaoExperiencia] = useState<ConfiguracaoExperiencia>({
    percentualMinimo: 70,
    criterios: [
      'Assiduidade e Pontualidade',
      'Qualidade do Trabalho',
      'Produtividade',
      'Conhecimento Técnico',
      'Relacionamento Interpessoal',
      'Capacidade de Aprendizagem',
      'Iniciativa e Proatividade',
      'Cumprimento de Prazos',
      'Organização',
      'Trabalho em Equipe'
    ]
  });

  // Perguntas adicionais (antigo sistema)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [showPerguntaForm, setShowPerguntaForm] = useState(false);
  const [verificarDescricao, setVerificarDescricao] = useState(true);
  const [perguntaForm, setPerguntaForm] = useState<Omit<Pergunta, 'id' | 'ordem'>>({
    pergunta: '',
    tipo: 'texto'
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

    const allAvaliacoes: AvaliacaoExperiencia[] = [];

    colaboradores.forEach((colaborador: any) => {
      const avaliacoes = getFromStorage<any[]>(`sisteq-avaliacao-experiencia-${colaborador.id}`, []);
      if (avaliacoes.length > 0) {
        avaliacoes.forEach((avaliacao: any) => {
          allAvaliacoes.push({
            ...avaliacao,
            colaboradorId: colaborador.id,
            colaboradorNome: colaborador.nomeCompleto
          });
        });
      }
    });

    allAvaliacoes.sort((a, b) => new Date(b.dataAvaliacao).getTime() - new Date(a.dataAvaliacao).getTime());
    setTodasAvaliacoes(allAvaliacoes);
  };

  const loadConfiguracao = () => {
    const config = getFromStorage<ConfiguracaoExperiencia | null>('sisteq-config-avaliacao-experiencia', null);
    if (config) {
      setConfiguracaoExperiencia(config);
    }
  };

  const handleDelete = (avaliacao: AvaliacaoExperiencia) => {
    if (confirm(`Deseja realmente excluir a avaliação de "${avaliacao.colaboradorNome}"?`)) {
      const avaliacoes = getFromStorage<any[]>(`sisteq-avaliacao-experiencia-${avaliacao.colaboradorId}`, []);
      if (avaliacoes.length > 0) {
        const updated = avaliacoes.filter((a: any) => a.id !== avaliacao.id);
        localStorage.setItem(`sisteq-avaliacao-experiencia-${avaliacao.colaboradorId}`, JSON.stringify(updated));
        loadAllAvaliacoes();
      }
    }
  };

  // Configuração - Funções
  const handleSaveConfiguracao = () => {
    if (configuracaoExperiencia.percentualMinimo < 0 || configuracaoExperiencia.percentualMinimo > 100) {
      alert('O percentual mínimo deve estar entre 0 e 100');
      return;
    }

    localStorage.setItem('sisteq-configuracao-experiencia', JSON.stringify(configuracaoExperiencia));
    alert('Configuração salva com sucesso!');
  };

  const addCriterio = () => {
    const novoCriterio = prompt('Nome do novo critério:');
    if (novoCriterio && novoCriterio.trim()) {
      setConfiguracaoExperiencia({
        ...configuracaoExperiencia,
        criterios: [...configuracaoExperiencia.criterios, novoCriterio.trim()]
      });
    }
  };

  const removeCriterio = (index: number) => {
    if (confirm(`Deseja remover "${configuracaoExperiencia.criterios[index]}"?`)) {
      const newCriterios = configuracaoExperiencia.criterios.filter((_, i) => i !== index);
      setConfiguracaoExperiencia({
        ...configuracaoExperiencia,
        criterios: newCriterios
      });
    }
  };

  const updateCriterio = (index: number, value: string) => {
    const newCriterios = [...configuracaoExperiencia.criterios];
    newCriterios[index] = value;
    setConfiguracaoExperiencia({
      ...configuracaoExperiencia,
      criterios: newCriterios
    });
  };

  const addPergunta = () => {
    if (!perguntaForm.pergunta.trim()) {
      alert('Por favor, preencha a pergunta');
      return;
    }

    const novaPergunta: Pergunta = {
      id: generateId(),
      pergunta: perguntaForm.pergunta,
      tipo: perguntaForm.tipo,
      ordem: perguntas.length + 1
    };

    setPerguntas([...perguntas, novaPergunta]);
    setPerguntaForm({ pergunta: '', tipo: 'texto' });
    setShowPerguntaForm(false);
  };

  const removePergunta = (id: string) => {
    if (confirm('Deseja realmente remover esta pergunta?')) {
      const updated = perguntas.filter(p => p.id !== id).map((p, index) => ({
        ...p,
        ordem: index + 1
      }));
      setPerguntas(updated);
    }
  };

  const movePergunta = (index: number, direction: 'up' | 'down') => {
    const newPerguntas = [...perguntas];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newPerguntas.length) return;
    
    [newPerguntas[index], newPerguntas[targetIndex]] = [newPerguntas[targetIndex], newPerguntas[index]];
    
    const reordered = newPerguntas.map((p, i) => ({
      ...p,
      ordem: i + 1
    }));
    
    setPerguntas(reordered);
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'texto': return 'Resposta em Texto';
      case 'sim_nao': return 'Sim/Não';
      case 'escala': return 'Escala 1-5';
      default: return tipo;
    }
  };

  const filteredAvaliacoes = todasAvaliacoes.filter(av => {
    const matchSearch = av.colaboradorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       av.avaliador.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchData = true;
    if (filtroDataInicio && filtroDataFim) {
      const dataAvaliacao = new Date(av.dataAvaliacao);
      const dataInicio = new Date(filtroDataInicio);
      const dataFim = new Date(filtroDataFim);
      matchData = dataAvaliacao >= dataInicio && dataAvaliacao <= dataFim;
    }
    
    return matchSearch && matchData;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Avaliações de Contrato de Experiência
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Gerencie as avaliações e configure os critérios de avaliação
        </p>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('lista')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'lista'
                ? 'text-orange-600 border-b-2 border-orange-600'
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
                ? 'text-orange-600 border-b-2 border-orange-600'
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
          {/* Busca */}
          {todasAvaliacoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por colaborador ou avaliador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
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
                  {filteredAvaliacoes.map((avaliacao) => (
                    <div key={`${avaliacao.colaboradorId}-${avaliacao.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <User className="w-5 h-5 text-orange-600" />
                              <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>{avaliacao.colaboradorNome}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getParecerColor(avaliacao.parecer)}`}>
                                {capitalizarPrimeiraLetra(avaliacao.parecer)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
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

                        <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">
                              Atende: {avaliacao.itens.filter(i => i.status === 'atende').length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">
                              Parcial: {avaliacao.itens.filter(i => i.status === 'parcial').length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">
                              Não Atende: {avaliacao.itens.filter(i => i.status === 'nao-atende').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-orange-50 rounded-lg border border-orange-200 p-12 text-center">
                  <ClipboardCheck className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {searchTerm ? 'Nenhuma avaliação encontrada' : 'Nenhuma avaliação realizada'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'Tente buscar com outros termos'
                      : 'As avaliações de experiência são criadas no cadastro de cada colaborador'
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
                <h2 className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Detalhes da Avaliação</h2>
                <button
                  onClick={() => setAvaliacaoSelecionada(null)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Colaborador</p>
                    <p className="font-medium text-gray-900">{avaliacaoSelecionada.colaboradorNome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Data da Avaliação</p>
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
                  <span className="text-sm font-medium text-gray-700">Parecer Final:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getParecerColor(avaliacaoSelecionada.parecer)}`}>
                    {capitalizarPrimeiraLetra(avaliacaoSelecionada.parecer)}
                  </span>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>Critérios Avaliados</h3>
                  <div className="space-y-2">
                    {avaliacaoSelecionada.itens.map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${getRequisitoStatusColor(item.status)}`}>
                        <div className="flex items-start gap-2">
                          {getRequisitoStatusIcon(item.status)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.criterio}</div>
                            {item.observacao && (
                              <p className="text-xs text-gray-600 mt-1">{item.observacao}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(avaliacaoSelecionada.pontosForts || avaliacaoSelecionada.pontosMelhoria) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {avaliacaoSelecionada.pontosForts && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-gray-900 mb-2">Pontos Fortes</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosForts}</p>
                      </div>
                    )}
                    {avaliacaoSelecionada.pontosMelhoria && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-gray-900 mb-2">Pontos de Melhoria</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosMelhoria}</p>
                      </div>
                    )}
                  </div>
                )}

                {avaliacaoSelecionada.observacaoFinal && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Percentual Mínimo para Aprovação (Atende + Supera)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={configuracaoExperiencia.percentualMinimo}
                  onChange={(e) => setConfiguracaoExperiencia({
                    ...configuracaoExperiencia,
                    percentualMinimo: parseInt(e.target.value) || 0
                  })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-lg font-semibold text-center"
                />
                <span className="text-2xl font-bold text-orange-600">%</span>
              </div>
            </div>
          </div>

          {/* Critérios */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-orange-600" />
                <h2 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Critérios de Avaliação</h2>
              </div>
              <button
                onClick={addCriterio}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar Critério
              </button>
            </div>

            {configuracaoExperiencia.criterios.length > 0 ? (
              <div className="space-y-2">
                {configuracaoExperiencia.criterios.map((criterio, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-orange-600 text-white rounded-full text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={criterio}
                      onChange={(e) => updateCriterio(idx, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeCriterio(idx)}
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
                Nenhum critério configurado. Clique em "Adicionar Critério" para começar.
              </p>
            )}
          </div>

          {/* Legenda do Sistema de Notas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Sistema de Avaliação</h3>
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
                  <strong>Importante:</strong> Quando um critério receber nota "1 - Não Atende", 
                  será obrigatório preencher uma justificativa detalhada explicando os motivos.
                </div>
              </div>
            </div>
          </div>

          {/* Configurações Gerais */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Configurações Gerais</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={verificarDescricao}
                onChange={(e) => setVerificarDescricao(e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-200 rounded focus:ring-orange-500"
              />
              <span className="text-gray-700">
                Incluir verificação dos requisitos da Descrição de Função na avaliação
              </span>
            </label>
          </div>

          {/* Perguntas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-orange-600" />
                <h2 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Perguntas da Avaliação</h2>
              </div>
              <button
                onClick={() => setShowPerguntaForm(!showPerguntaForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar Pergunta
              </button>
            </div>

            {showPerguntaForm && (
              <div className="bg-orange-50 rounded-lg p-4 mb-4 border border-orange-200">
                <div className="space-y-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pergunta *</label>
                    <textarea
                      value={perguntaForm.pergunta}
                      onChange={(e) => setPerguntaForm({ ...perguntaForm, pergunta: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="Digite a pergunta..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Resposta *</label>
                    <select
                      value={perguntaForm.tipo}
                      onChange={(e) => setPerguntaForm({ ...perguntaForm, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="texto">Resposta em Texto</option>
                      <option value="sim_nao">Sim/Não</option>
                      <option value="escala">Escala de 1 a 5</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addPergunta}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowPerguntaForm(false)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {perguntas.length > 0 ? (
              <div className="space-y-3">
                {perguntas.map((pergunta, index) => (
                  <div key={pergunta.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-orange-600 text-white rounded-full text-sm font-semibold">
                          {pergunta.ordem}
                        </span>
                        <div className="flex-1">
                          <p className="text-gray-900 mb-1">{pergunta.pergunta}</p>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {getTipoLabel(pergunta.tipo)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={() => movePergunta(index, 'up')}
                          disabled={index === 0}
                          className={`p-1.5 rounded transition-colors ${
                            index === 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Mover para cima"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePergunta(index, 'down')}
                          disabled={index === perguntas.length - 1}
                          className={`p-1.5 rounded transition-colors ${
                            index === perguntas.length - 1
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removePergunta(pergunta.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">
                Nenhuma pergunta adicionada. Clique em "Adicionar Pergunta" para começar.
              </p>
            )}
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveConfiguracao}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              Salvar Configuração
            </Button>
          </div>

          {/* Preview */}
          {configuracaoExperiencia.criterios.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Preview da Avaliação</h3>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Total de Critérios:</span>
                    <span className="text-lg text-orange-600" style={{ fontWeight: 700 }}>{configuracaoExperiencia.criterios.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Percentual Mínimo (Atende + Supera):</span>
                    <span className="text-lg text-orange-600" style={{ fontWeight: 700 }}>{configuracaoExperiencia.percentualMinimo}%</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h4 className="text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>Critérios que serão avaliados:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {configuracaoExperiencia.criterios.map((criterio, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <span>{criterio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {perguntas.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>Perguntas Adicionais</h3>
              <div className="space-y-4">
                {verificarDescricao && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-medium">
                      ✓ Verificação dos requisitos da Descrição de Função será incluída
                    </p>
                  </div>
                )}
                {perguntas.map((pergunta) => (
                  <div key={pergunta.id} className="bg-white rounded-xl p-4 border border-gray-200">
                    <p className="text-gray-900 mb-2">
                      <span className="font-medium">{pergunta.ordem}.</span> {pergunta.pergunta}
                    </p>
                    <div className="text-sm text-gray-500 italic">
                      Tipo de resposta: {getTipoLabel(pergunta.tipo)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}