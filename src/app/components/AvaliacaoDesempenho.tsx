import { useState, useEffect } from 'react';
import { Plus, Settings, Save, Trash2, AlertCircle, X, Calendar, TrendingUp, Eye, Edit2 } from 'lucide-react';
import { generateId, getFromStorage } from '../utils/helpers';
import { useLocalStorage } from '../hooks';
import { getNotaLabel, getNotaColor, getNotaIcon, getClassificacaoColor, getMetaStatusColor, calcularEstatisticasNotas, calcularPercentualAprovacao } from '../utils/rh-helpers';
import { capitalizarPrimeiraLetra, dataHojeISO, formatarDataPtBr } from '../utils/formatters';
import { Button } from './ui/button';

interface CompetenciaAvaliacao {
  competencia: string;
  nota: 1 | 2 | 3 | 4 | null; // 1=Não atende, 2=Abaixo, 3=Atende, 4=Supera
  justificativa: string; // Obrigatório quando nota = 1
}

interface MetaAvaliacao {
  meta: string;
  status: 'atingida' | 'parcial' | 'nao-atingida';
  percentual: number;
  observacao: string;
}

interface AvaliacaoDesempenho {
  id: string;
  dataAvaliacao: string;
  periodo: string;
  avaliador: string;
  competencias: CompetenciaAvaliacao[];
  metas: MetaAvaliacao[];
  pontosFortes: string;
  pontosMelhoria: string;
  planoDesenvolvimento: string;
  percentualAprovacao: number; // % de Atende + Supera nas competências
  classificacao: 'excelente' | 'bom' | 'regular' | 'insatisfatorio';
  observacaoFinal: string;
  dataCriacao: string;
}

type AvaliacaoDesempenhoFormData = {
  dataAvaliacao: string;
  periodo: string;
  avaliador: string;
  competencias: CompetenciaAvaliacao[];
  metas: MetaAvaliacao[];
  pontosFortes: string;
  pontosMelhoria: string;
  planoDesenvolvimento: string;
  classificacao: AvaliacaoDesempenho['classificacao'];
  observacaoFinal: string;
};

interface ConfiguracaoDesempenho {
  percentualMinimo: number; // % mínimo de Atende + Supera para aprovação
  competencias: string[];
}

interface AvaliacaoDesempenhoProps {
  colaboradorId: string;
  colaboradorNome: string;
  funcao: string;
}

const competenciasPadrao = [
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
];

export function AvaliacaoDesempenhoComponent({ 
  colaboradorId, 
  colaboradorNome,
  funcao
}: AvaliacaoDesempenhoProps) {
  const [avaliacoes, setAvaliacoes] = useLocalStorage<AvaliacaoDesempenho[]>(`sisteq-avaliacao-desempenho-${colaboradorId}`, []);
  const [showNovaAvaliacao, setShowNovaAvaliacao] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoDesempenho | null>(null);
  const [listaColaboradores, setListaColaboradores] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfigCriterios, setShowConfigCriterios] = useState(false);

  // Configuração de Desempenho
  const [configuracaoDesempenho, setConfiguracaoDesempenho] = useLocalStorage<ConfiguracaoDesempenho>('sisteq-configuracao-desempenho', {
    percentualMinimo: 70,
    competencias: competenciasPadrao
  });

  // Form state
  const [formData, setFormData] = useState<AvaliacaoDesempenhoFormData>({
    dataAvaliacao: dataHojeISO(),
    periodo: 'semestral',
    avaliador: '',
    competencias: [] as CompetenciaAvaliacao[],
    metas: [] as MetaAvaliacao[],
    pontosFortes: '',
    pontosMelhoria: '',
    planoDesenvolvimento: '',
    classificacao: 'regular',
    observacaoFinal: ''
  });

  useEffect(() => {
    loadData();
  }, [colaboradorId]);

  useEffect(() => {
    // Atualizar competências do form quando configuração mudar
    if (!showNovaAvaliacao && !editingId) {
      setFormData(prev => ({
        ...prev,
        competencias: configuracaoDesempenho.competencias.map(competencia => ({
          competencia,
          nota: null,
          justificativa: ''
        }))
      }));
    }
  }, [configuracaoDesempenho.competencias]);

  const loadData = () => {
    const cols = getFromStorage<any[]>('sisteq-colaboradores', []);
    setListaColaboradores(cols.filter((c: any) => c.status === 'ativo').map((c: any) => c.nomeCompleto));
  };

  const saveConfiguracaoDesempenho = () => {
    if (configuracaoDesempenho.percentualMinimo < 0 || configuracaoDesempenho.percentualMinimo > 100) {
      alert('O percentual mínimo deve estar entre 0 e 100');
      return;
    }
    setShowConfigCriterios(false);
    alert('Configuração de aprovação salva com sucesso!');
  };

  const handleNovaAvaliacao = () => {
    setShowNovaAvaliacao(true);
    setEditingId(null);
    setFormData({
      dataAvaliacao: dataHojeISO(),
      periodo: 'semestral',
      avaliador: '',
      competencias: configuracaoDesempenho.competencias.map(competencia => ({
        competencia,
        nota: null,
        justificativa: ''
      })),
      metas: [],
      pontosFortes: '',
      pontosMelhoria: '',
      planoDesenvolvimento: '',
      classificacao: 'regular' as const,
      observacaoFinal: ''
    });
  };

  const handleEditAvaliacao = (avaliacao: AvaliacaoDesempenho) => {
    setShowNovaAvaliacao(true);
    setEditingId(avaliacao.id);
    setFormData({
      dataAvaliacao: avaliacao.dataAvaliacao,
      periodo: avaliacao.periodo,
      avaliador: avaliacao.avaliador,
      competencias: avaliacao.competencias,
      metas: avaliacao.metas,
      pontosFortes: avaliacao.pontosFortes,
      pontosMelhoria: avaliacao.pontosMelhoria,
      planoDesenvolvimento: avaliacao.planoDesenvolvimento,
      classificacao: avaliacao.classificacao,
      observacaoFinal: avaliacao.observacaoFinal
    });
  };

  const handleUpdateCompetencia = (index: number, field: 'nota' | 'justificativa', value: any) => {
    const newCompetencias = [...formData.competencias];
    newCompetencias[index] = {
      ...newCompetencias[index],
      [field]: value
    };

    // Se mudar nota e não for mais "Não atende", limpar justificativa
    if (field === 'nota' && value !== 1) {
      newCompetencias[index].justificativa = '';
    }

    setFormData({ ...formData, competencias: newCompetencias });
  };

  const handleAddMeta = () => {
    const novaMeta: MetaAvaliacao = {
      meta: '',
      status: 'nao-atingida',
      percentual: 0,
      observacao: ''
    };
    setFormData({ ...formData, metas: [...formData.metas, novaMeta] });
  };

  const handleUpdateMeta = (index: number, field: keyof MetaAvaliacao, value: any) => {
    const newMetas = [...formData.metas];
    newMetas[index] = {
      ...newMetas[index],
      [field]: value
    };
    setFormData({ ...formData, metas: newMetas });
  };

  const handleRemoveMeta = (index: number) => {
    const newMetas = formData.metas.filter((_, i) => i !== index);
    setFormData({ ...formData, metas: newMetas });
  };

  const handleSave = () => {
    if (!formData.avaliador) {
      alert('Selecione o avaliador');
      return;
    }

    // Validar que todas as competências foram avaliadas
    const naoAvaliadas = formData.competencias.filter(comp => comp.nota === null);
    if (naoAvaliadas.length > 0) {
      alert(`Existem ${naoAvaliadas.length} competência(s) não avaliada(s). Avalie todas as competências.`);
      return;
    }

    // Validar justificativas obrigatórias para "Não atende"
    const naoAtendesSemJustificativa = formData.competencias.filter(comp => comp.nota === 1 && !comp.justificativa.trim());
    if (naoAtendesSemJustificativa.length > 0) {
      alert('Todas as competências com "Não Atende" precisam de justificativa obrigatória!');
      return;
    }

    // Validar metas
    const metasInvalidas = formData.metas.filter(meta => !meta.meta.trim());
    if (metasInvalidas.length > 0) {
      alert('Todas as metas precisam ter descrição!');
      return;
    }

    // Calcular percentual de aprovação baseado nas competências
    const percentualAprovacao = calcularPercentualAprovacao(formData.competencias);

    // Determinar classificação automaticamente baseado no percentual
    let classificacaoCalculada: 'excelente' | 'bom' | 'regular' | 'insatisfatorio';
    if (percentualAprovacao >= 90) {
      classificacaoCalculada = 'excelente';
    } else if (percentualAprovacao >= 75) {
      classificacaoCalculada = 'bom';
    } else if (percentualAprovacao >= configuracaoDesempenho.percentualMinimo) {
      classificacaoCalculada = 'regular';
    } else {
      classificacaoCalculada = 'insatisfatorio';
    }

    if (editingId) {
      const updated = avaliacoes.map(a =>
        a.id === editingId
          ? { ...a, ...formData, percentualAprovacao, classificacao: classificacaoCalculada }
          : a
      );
      setAvaliacoes(updated);
      alert(`Avaliação atualizada! Percentual: ${percentualAprovacao}% - ${classificacaoCalculada.toUpperCase()}`);
    } else {
      const novaAvaliacao: AvaliacaoDesempenho = {
        id: generateId(),
        ...formData,
        percentualAprovacao,
        classificacao: classificacaoCalculada,
        dataCriacao: new Date().toISOString()
      };
      const updated = [...avaliacoes, novaAvaliacao];
      setAvaliacoes(updated);
      alert(`Avaliação salva! Percentual: ${percentualAprovacao}% - ${classificacaoCalculada.toUpperCase()}`);
    }

    setShowNovaAvaliacao(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir esta avaliação?')) {
      const updated = avaliacoes.filter(a => a.id !== id);
      setAvaliacoes(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botões */}
      {!showNovaAvaliacao && !avaliacaoSelecionada && (
        <div className="flex items-center justify-between gap-3">
          {/* Área de Conteúdo */}
          <div className="flex-1">
            {avaliacoes.length === 0 ? (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                <p className="text-sm text-gray-600 mb-3">Nenhuma avaliação de desempenho realizada</p>
                <button
                  onClick={handleNovaAvaliacao}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Iniciar Avaliação
                </button>
              </div>
            ) : (
              <button
                onClick={handleNovaAvaliacao}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Nova Avaliação
              </button>
            )}
          </div>

          {/* Botão de Configuração */}
          <button
            onClick={() => setShowConfigCriterios(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm shadow-md flex-shrink-0"
            title="Configurar Competências"
          >
            <Settings className="w-4 h-4" />
            Competências ({configuracaoDesempenho.percentualMinimo}% mín.)
          </button>
        </div>
      )}

      {/* Modal de Configuração */}
      {showConfigCriterios && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Configuração de Desempenho</h3>
            <p className="text-sm text-gray-600 mb-6">
              Defina o percentual mínimo de competências "Atende" + "Supera" e gerencie as competências avaliadas
            </p>
            
            <div className="space-y-6">
              <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
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
                      <strong>Classificação:</strong> ≥90% = Excelente | ≥75% = Bom | ≥{configuracaoDesempenho.percentualMinimo}% = Regular | {`<${configuracaoDesempenho.percentualMinimo}%`} = Insatisfatório
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-900">
                    Competências Avaliadas ({configuracaoDesempenho.competencias.length})
                  </label>
                  <button
                    onClick={() => {
                      const novaCompetencia = prompt('Nome da nova competência:');
                      if (novaCompetencia && novaCompetencia.trim()) {
                        setConfiguracaoDesempenho({
                          ...configuracaoDesempenho,
                          competencias: [...configuracaoDesempenho.competencias, novaCompetencia.trim()]
                        });
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {configuracaoDesempenho.competencias.map((competencia, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-full text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={competencia}
                        onChange={(e) => {
                          const newCompetencias = [...configuracaoDesempenho.competencias];
                          newCompetencias[idx] = e.target.value;
                          setConfiguracaoDesempenho({
                            ...configuracaoDesempenho,
                            competencias: newCompetencias
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (confirm(`Deseja remover "${competencia}"?`)) {
                            const newCompetencias = configuracaoDesempenho.competencias.filter((_, i) => i !== idx);
                            setConfiguracaoDesempenho({
                              ...configuracaoDesempenho,
                              competencias: newCompetencias
                            });
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowConfigCriterios(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveConfiguracaoDesempenho}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulário */}
      {showNovaAvaliacao && (
        <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
          <h4 className="text-gray-900 mb-4" style={{ fontWeight: 600 }}>
            {editingId ? 'Editar' : 'Nova'} Avaliação de Desempenho
          </h4>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Avaliação *</label>
                <input
                  type="date"
                  value={formData.dataAvaliacao}
                  onChange={(e) => setFormData({ ...formData, dataAvaliacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período *</label>
                <select
                  value={formData.periodo}
                  onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avaliador *</label>
                <select
                  value={formData.avaliador}
                  onChange={(e) => setFormData({ ...formData, avaliador: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {listaColaboradores.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900">Competências</h5>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    1=Não Atende
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    2=Abaixo
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    3=Atende
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    4=Supera
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {formData.competencias.map((comp, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${getNotaColor(comp.nota)}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotaIcon(comp.nota)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-3">{comp.competencia}</div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Avaliação *
                            </label>
                            <select
                              value={comp.nota || ''}
                              onChange={(e) => handleUpdateCompetencia(idx, 'nota', parseInt(e.target.value) || null)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="1">1 - Não Atende</option>
                              <option value="2">2 - Abaixo do Esperado</option>
                              <option value="3">3 - Atende</option>
                              <option value="4">4 - Supera</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Justificativa {comp.nota === 1 && <span className="text-red-600">*</span>}
                            </label>
                            <input
                              type="text"
                              value={comp.justificativa}
                              onChange={(e) => handleUpdateCompetencia(idx, 'justificativa', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 ${
                                comp.nota === 1 ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder={comp.nota === 1 ? 'Obrigatório para "Não Atende"' : 'Opcional...'}
                              required={comp.nota === 1}
                            />
                          </div>
                        </div>

                        {comp.nota === 1 && !comp.justificativa.trim() && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>Justificativa obrigatória para competências "Não Atende"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Estatísticas em tempo real */}
              {formData.competencias.some(c => c.nota !== null) && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-red-300">
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Total</div>
                      <div className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.competencias).total}</div>
                    </div>
                    <div>
                      <div className="text-xs text-red-600 mb-1">Não Atende</div>
                      <div className="text-lg text-red-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.competencias).naoAtende}</div>
                    </div>
                    <div>
                      <div className="text-xs text-yellow-600 mb-1">Abaixo</div>
                      <div className="text-lg text-yellow-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.competencias).abaixo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-600 mb-1">Atende</div>
                      <div className="text-lg text-green-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.competencias).atende}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600 mb-1">Supera</div>
                      <div className="text-lg text-blue-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.competencias).supera}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Percentual (Atende + Supera)</div>
                      <div className="text-2xl text-red-600" style={{ fontWeight: 700 }}>
                        {calcularPercentualAprovacao(formData.competencias)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {calcularPercentualAprovacao(formData.competencias) >= 90 
                          ? '🏆 Excelente' 
                          : calcularPercentualAprovacao(formData.competencias) >= 75
                          ? '✓ Bom'
                          : calcularPercentualAprovacao(formData.competencias) >= configuracaoDesempenho.percentualMinimo
                          ? '⚠ Regular'
                          : '✗ Insatisfatório'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900">Metas e Resultados (Opcional)</h5>
                <button
                  onClick={handleAddMeta}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Meta
                </button>
              </div>
              
              {formData.metas.length > 0 && (
                <div className="space-y-3">
                  {formData.metas.map((meta, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-2 ${getMetaStatusColor(meta.status)}`}>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Descrição da Meta *</label>
                          <input
                            type="text"
                            value={meta.meta}
                            onChange={(e) => handleUpdateMeta(idx, 'meta', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Descreva a meta..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={meta.status}
                              onChange={(e) => handleUpdateMeta(idx, 'status', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="atingida">Atingida</option>
                              <option value="parcial">Parcialmente Atingida</option>
                              <option value="nao-atingida">Não Atingida</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Percentual (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={meta.percentual}
                              onChange={(e) => handleUpdateMeta(idx, 'percentual', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Observação</label>
                            <input
                              type="text"
                              value={meta.observacao}
                              onChange={(e) => handleUpdateMeta(idx, 'observacao', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              placeholder="Opcional..."
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleRemoveMeta(idx)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remover Meta
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Análise Qualitativa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos Fortes</label>
                <textarea
                  value={formData.pontosFortes}
                  onChange={(e) => setFormData({ ...formData, pontosFortes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Descreva os pontos fortes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos de Melhoria</label>
                <textarea
                  value={formData.pontosMelhoria}
                  onChange={(e) => setFormData({ ...formData, pontosMelhoria: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Descreva os pontos de melhoria..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano de Desenvolvimento</label>
                <textarea
                  value={formData.planoDesenvolvimento}
                  onChange={(e) => setFormData({ ...formData, planoDesenvolvimento: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Descreva o plano de desenvolvimento..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação Final</label>
              <input
                type="text"
                value={formData.observacaoFinal}
                onChange={(e) => setFormData({ ...formData, observacaoFinal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Observações gerais..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-red-300">
            <button
              onClick={() => { setShowNovaAvaliacao(false); setEditingId(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Atualizar' : 'Salvar'} Avaliação
            </button>
          </div>
        </div>
      )}

      {/* Lista de Avaliações */}
      {!showNovaAvaliacao && !avaliacaoSelecionada && avaliacoes.length > 0 && (
        <div className="space-y-3">
          {avaliacoes.map((avaliacao) => {
            const stats = calcularEstatisticasNotas(avaliacao.competencias);
            return (
              <div key={avaliacao.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatarDataPtBr(avaliacao.dataAvaliacao)}
                        </div>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{avaliacao.periodo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getClassificacaoColor(avaliacao.classificacao)}`}>
                          {capitalizarPrimeiraLetra(avaliacao.classificacao)}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full">
                          <TrendingUp className="w-3 h-3 text-red-700" />
                          <span className="text-xs font-semibold text-red-700">{avaliacao.percentualAprovacao}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Avaliador: <span className="font-medium text-gray-900">{avaliacao.avaliador}</span>
                      </p>
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
                        onClick={() => handleEditAvaliacao(avaliacao)}
                        className="text-green-600 hover:bg-green-50"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(avaliacao.id)}
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
      )}

      {/* Visualização Detalhada */}
      {avaliacaoSelecionada && (
        <div className="bg-white rounded-lg border-2 border-red-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Detalhes da Avaliação de Desempenho</h4>
            <button
              onClick={() => setAvaliacaoSelecionada(null)}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
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
              <div>
                <p className="text-xs text-gray-600 mb-1">Percentual</p>
                <p className="text-lg text-red-600" style={{ fontWeight: 700 }}>{avaliacaoSelecionada.percentualAprovacao}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Classificação</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getClassificacaoColor(avaliacaoSelecionada.classificacao)}`}>
                  {capitalizarPrimeiraLetra(avaliacaoSelecionada.classificacao)}
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-3">Competências Avaliadas</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {avaliacaoSelecionada.competencias.map((comp, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-2 ${getNotaColor(comp.nota)}`}>
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {avaliacaoSelecionada.metas.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Metas e Resultados</h5>
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
                    <h6 className="font-medium text-gray-900 mb-2">Pontos Fortes</h6>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosFortes}</p>
                  </div>
                )}
                {avaliacaoSelecionada.pontosMelhoria && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h6 className="font-medium text-gray-900 mb-2">Pontos de Melhoria</h6>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosMelhoria}</p>
                  </div>
                )}
                {avaliacaoSelecionada.planoDesenvolvimento && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h6 className="font-medium text-gray-900 mb-2">Plano de Desenvolvimento</h6>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.planoDesenvolvimento}</p>
                  </div>
                )}
              </div>
            )}

            {avaliacaoSelecionada.observacaoFinal && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h6 className="font-medium text-gray-900 mb-2">Observação Final</h6>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.observacaoFinal}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setAvaliacaoSelecionada(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
