import { useState, useEffect } from 'react';
import { Plus, Settings, Save, Trash2, AlertCircle, X, Calendar, TrendingUp, Eye, Edit2 } from 'lucide-react';
import { generateId, getFromStorage } from '../utils/helpers';
import { useLocalStorage } from '../hooks';
import { getNotaLabel, getNotaColor, getNotaIcon, getParecerColor, calcularEstatisticasNotas, calcularPercentualAprovacao } from '../utils/rh-helpers';
import { capitalizarPrimeiraLetra, dataHojeISO, formatarDataPtBr } from '../utils/formatters';
import { Button } from './ui/button';

interface ItemAvaliacao {
  criterio: string;
  nota: 1 | 2 | 3 | 4 | null; // 1=Não atende, 2=Abaixo, 3=Atende, 4=Supera
  justificativa: string; // Obrigatório quando nota = 1
}

interface AvaliacaoExperiencia {
  id: string;
  dataAvaliacao: string;
  periodo: string;
  avaliador: string;
  itens: ItemAvaliacao[];
  pontosForts: string;
  pontosMelhoria: string;
  parecer: 'aprovado' | 'reprovado' | 'prorrogado';
  observacaoFinal: string;
  percentualAprovacao: number; // % de Atende + Supera
  dataCriacao: string;
}

type AvaliacaoExperienciaFormData = {
  dataAvaliacao: string;
  periodo: string;
  avaliador: string;
  itens: ItemAvaliacao[];
  pontosForts: string;
  pontosMelhoria: string;
  parecer: AvaliacaoExperiencia['parecer'];
  observacaoFinal: string;
};

interface ConfiguracaoExperiencia {
  percentualMinimo: number; // % mínimo de Atende + Supera para aprovação
  criterios: string[];
}

interface AvaliacaoExperienciaProps {
  colaboradorId: string;
  colaboradorNome: string;
  dataContratacao: string;
}

const criteriosPadrao = [
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
];

export function AvaliacaoExperienciaComponent({ 
  colaboradorId, 
  colaboradorNome,
  dataContratacao
}: AvaliacaoExperienciaProps) {
  const [avaliacoes, setAvaliacoes] = useLocalStorage<AvaliacaoExperiencia[]>(`sisteq-avaliacao-experiencia-${colaboradorId}`, []);
  const [showNovaAvaliacao, setShowNovaAvaliacao] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState<AvaliacaoExperiencia | null>(null);
  const [listaColaboradores, setListaColaboradores] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfigCriterios, setShowConfigCriterios] = useState(false);

  // Configuração de Aprovação
  const [configuracaoExperiencia, setConfiguracaoExperiencia] = useLocalStorage<ConfiguracaoExperiencia>('sisteq-configuracao-experiencia', {
    percentualMinimo: 70,
    criterios: criteriosPadrao
  });

  // Form state
  const [formData, setFormData] = useState<AvaliacaoExperienciaFormData>({
    dataAvaliacao: dataHojeISO(),
    periodo: '45-dias',
    avaliador: '',
    itens: [] as ItemAvaliacao[],
    pontosForts: '',
    pontosMelhoria: '',
    parecer: 'aprovado',
    observacaoFinal: ''
  });

  useEffect(() => {
    loadData();
  }, [colaboradorId]);

  useEffect(() => {
    // Atualizar itens do form quando configuração mudar
    if (!showNovaAvaliacao && !editingId) {
      setFormData(prev => ({
        ...prev,
        itens: configuracaoExperiencia.criterios.map(criterio => ({
          criterio,
          nota: null,
          justificativa: ''
        }))
      }));
    }
  }, [configuracaoExperiencia.criterios]);

  const loadData = () => {
    const cols = getFromStorage<any[]>('sisteq-colaboradores', []);
    setListaColaboradores(cols.filter((c: any) => c.status === 'ativo').map((c: any) => c.nomeCompleto));
  };

  const saveConfiguracaoExperiencia = () => {
    if (configuracaoExperiencia.percentualMinimo < 0 || configuracaoExperiencia.percentualMinimo > 100) {
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
      periodo: '45-dias',
      avaliador: '',
      itens: configuracaoExperiencia.criterios.map(criterio => ({
        criterio,
        nota: null,
        justificativa: ''
      })),
      pontosForts: '',
      pontosMelhoria: '',
      parecer: 'aprovado' as const,
      observacaoFinal: ''
    });
  };

  const handleEditAvaliacao = (avaliacao: AvaliacaoExperiencia) => {
    setShowNovaAvaliacao(true);
    setEditingId(avaliacao.id);
    setFormData({
      dataAvaliacao: avaliacao.dataAvaliacao,
      periodo: avaliacao.periodo,
      avaliador: avaliacao.avaliador,
      itens: avaliacao.itens,
      pontosForts: avaliacao.pontosForts,
      pontosMelhoria: avaliacao.pontosMelhoria,
      parecer: avaliacao.parecer,
      observacaoFinal: avaliacao.observacaoFinal
    });
  };

  const handleUpdateItem = (index: number, field: 'nota' | 'justificativa', value: any) => {
    const newItens = [...formData.itens];
    newItens[index] = {
      ...newItens[index],
      [field]: value
    };

    // Se mudar nota e não for mais "Não atende", limpar justificativa
    if (field === 'nota' && value !== 1) {
      newItens[index].justificativa = '';
    }

    setFormData({ ...formData, itens: newItens });
  };

  const handleSave = () => {
    if (!formData.avaliador) {
      alert('Selecione o avaliador');
      return;
    }

    // Validar que todos os itens foram avaliados
    const naoAvaliados = formData.itens.filter(item => item.nota === null);
    if (naoAvaliados.length > 0) {
      alert(`Existem ${naoAvaliados.length} critério(s) não avaliado(s). Avalie todos os critérios.`);
      return;
    }

    // Validar justificativas obrigatórias para "Não atende"
    const naoAtendesSemJustificativa = formData.itens.filter(item => item.nota === 1 && !item.justificativa.trim());
    if (naoAtendesSemJustificativa.length > 0) {
      alert('Todos os critérios com "Não Atende" precisam de justificativa obrigatória!');
      return;
    }

    // Calcular percentual de aprovação
    const percentualAprovacao = calcularPercentualAprovacao(formData.itens);

    // Determinar parecer automaticamente baseado no percentual
    let parecerCalculado: 'aprovado' | 'reprovado' | 'prorrogado' = formData.parecer;
    if (percentualAprovacao >= configuracaoExperiencia.percentualMinimo) {
      parecerCalculado = 'aprovado';
    } else {
      // Permitir escolha entre reprovado ou prorrogado se não atingir mínimo
      if (formData.parecer === 'aprovado') {
        parecerCalculado = 'prorrogado';
      }
    }

    if (editingId) {
      const updated = avaliacoes.map(a =>
        a.id === editingId
          ? { ...a, ...formData, percentualAprovacao, parecer: parecerCalculado }
          : a
      );
      setAvaliacoes(updated);
      alert(`Avaliação atualizada! Percentual: ${percentualAprovacao}%`);
    } else {
      const novaAvaliacao: AvaliacaoExperiencia = {
        id: generateId(),
        ...formData,
        percentualAprovacao,
        parecer: parecerCalculado,
        dataCriacao: new Date().toISOString()
      };
      const updated = [...avaliacoes, novaAvaliacao];
      setAvaliacoes(updated);
      alert(`Avaliação salva! Percentual: ${percentualAprovacao}%`);
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
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
                <p className="text-sm text-gray-600 mb-3">Nenhuma avaliação de experiência realizada</p>
                <button
                  onClick={handleNovaAvaliacao}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  Iniciar Avaliação
                </button>
              </div>
            ) : (
              <button
                onClick={handleNovaAvaliacao}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
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
            title="Configurar Critérios de Aprovação"
          >
            <Settings className="w-4 h-4" />
            Critérios ({configuracaoExperiencia.percentualMinimo}% mín.)
          </button>
        </div>
      )}

      {/* Modal de Configuração */}
      {showConfigCriterios && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuração de Aprovação</h3>
            <p className="text-sm text-gray-600 mb-6">
              Defina o percentual mínimo de critérios "Atende" + "Supera" para aprovação
            </p>
            
            <div className="space-y-6">
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
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
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <strong>Exemplo:</strong> Com {configuracaoExperiencia.percentualMinimo}%, o colaborador precisa ter pelo menos{' '}
                      {configuracaoExperiencia.percentualMinimo}% de critérios "Atende" ou "Supera" para ser aprovado.
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Os outros {100 - configuracaoExperiencia.percentualMinimo}% podem ser "Abaixo do Esperado" ou "Não Atende"
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-900">
                    Critérios de Avaliação ({configuracaoExperiencia.criterios.length})
                  </label>
                  <button
                    onClick={() => {
                      const novoCriterio = prompt('Nome do novo critério:');
                      if (novoCriterio && novoCriterio.trim()) {
                        setConfiguracaoExperiencia({
                          ...configuracaoExperiencia,
                          criterios: [...configuracaoExperiencia.criterios, novoCriterio.trim()]
                        });
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {configuracaoExperiencia.criterios.map((criterio, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-orange-600 text-white rounded-full text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={criterio}
                        onChange={(e) => {
                          const newCriterios = [...configuracaoExperiencia.criterios];
                          newCriterios[idx] = e.target.value;
                          setConfiguracaoExperiencia({
                            ...configuracaoExperiencia,
                            criterios: newCriterios
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (confirm(`Deseja remover "${criterio}"?`)) {
                            const newCriterios = configuracaoExperiencia.criterios.filter((_, i) => i !== idx);
                            setConfiguracaoExperiencia({
                              ...configuracaoExperiencia,
                              criterios: newCriterios
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
                onClick={saveConfiguracaoExperiencia}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
        <div className="bg-orange-50 rounded-lg p-6 border-2 border-orange-200">
          <h4 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Editar' : 'Nova'} Avaliação de Contrato de Experiência
          </h4>
          
          <div className="space-y-4">
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
                  <option value="45-dias">45 dias</option>
                  <option value="90-dias">90 dias</option>
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
                <h5 className="font-medium text-gray-900">Critérios de Avaliação</h5>
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
                {formData.itens.map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${getNotaColor(item.nota)}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotaIcon(item.nota)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 mb-3">{item.criterio}</div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Avaliação *
                            </label>
                            <select
                              value={item.nota || ''}
                              onChange={(e) => handleUpdateItem(idx, 'nota', parseInt(e.target.value) || null)}
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
                              Justificativa {item.nota === 1 && <span className="text-red-600">*</span>}
                            </label>
                            <input
                              type="text"
                              value={item.justificativa}
                              onChange={(e) => handleUpdateItem(idx, 'justificativa', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 ${
                                item.nota === 1 ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder={item.nota === 1 ? 'Obrigatório para "Não Atende"' : 'Opcional...'}
                              required={item.nota === 1}
                            />
                          </div>
                        </div>

                        {item.nota === 1 && !item.justificativa.trim() && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>Justificativa obrigatória para critérios "Não Atende"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Estatísticas em tempo real */}
              {formData.itens.some(i => i.nota !== null) && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-orange-300">
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Total</div>
                      <div className="text-lg text-gray-900" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.itens).total}</div>
                    </div>
                    <div>
                      <div className="text-xs text-red-600 mb-1">Não Atende</div>
                      <div className="text-lg text-red-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.itens).naoAtende}</div>
                    </div>
                    <div>
                      <div className="text-xs text-yellow-600 mb-1">Abaixo</div>
                      <div className="text-lg text-yellow-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.itens).abaixo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-green-600 mb-1">Atende</div>
                      <div className="text-lg text-green-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.itens).atende}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600 mb-1">Supera</div>
                      <div className="text-lg text-blue-700" style={{ fontWeight: 700 }}>{calcularEstatisticasNotas(formData.itens).supera}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Percentual (Atende + Supera)</div>
                      <div className="text-2xl text-orange-600" style={{ fontWeight: 700 }}>
                        {calcularPercentualAprovacao(formData.itens)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {calcularPercentualAprovacao(formData.itens) >= configuracaoExperiencia.percentualMinimo 
                          ? `✓ Atingiu o mínimo de ${configuracaoExperiencia.percentualMinimo}%` 
                          : `✗ Não atingiu o mínimo de ${configuracaoExperiencia.percentualMinimo}%`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos Fortes</label>
                <textarea
                  value={formData.pontosForts}
                  onChange={(e) => setFormData({ ...formData, pontosForts: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Descreva os pontos fortes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontos de Melhoria</label>
                <textarea
                  value={formData.pontosMelhoria}
                  onChange={(e) => setFormData({ ...formData, pontosMelhoria: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Descreva os pontos de melhoria..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parecer Final *</label>
                <select
                  value={formData.parecer}
                  onChange={(e) => setFormData({ ...formData, parecer: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="prorrogado">Prorrogado</option>
                </select>
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
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-orange-300">
            <button
              onClick={() => { setShowNovaAvaliacao(false); setEditingId(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
            const stats = calcularEstatisticasNotas(avaliacao.itens);
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getParecerColor(avaliacao.parecer)}`}>
                          {capitalizarPrimeiraLetra(avaliacao.parecer)}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full">
                          <TrendingUp className="w-3 h-3 text-orange-700" />
                          <span className="text-xs font-semibold text-orange-700">{avaliacao.percentualAprovacao}%</span>
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualização Detalhada */}
      {avaliacaoSelecionada && (
        <div className="bg-white rounded-lg border-2 border-orange-300 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-gray-900">Detalhes da Avaliação de Experiência</h4>
            <button
              onClick={() => setAvaliacaoSelecionada(null)}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
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
                <p className="text-lg text-orange-600" style={{ fontWeight: 700 }}>{avaliacaoSelecionada.percentualAprovacao}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Parecer</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getParecerColor(avaliacaoSelecionada.parecer)}`}>
                  {capitalizarPrimeiraLetra(avaliacaoSelecionada.parecer)}
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-3">Critérios Avaliados</h5>
              <div className="space-y-2">
                {avaliacaoSelecionada.itens.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-2 ${getNotaColor(item.nota)}`}>
                    <div className="flex items-start gap-2">
                      {getNotaIcon(item.nota)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{item.criterio}</span>
                          <span className="text-sm" style={{ fontWeight: 700 }}>{getNotaLabel(item.nota)}</span>
                        </div>
                        {item.justificativa && (
                          <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                            <strong>Justificativa:</strong> {item.justificativa}
                          </div>
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
                    <h6 className="font-medium text-gray-900 mb-2">Pontos Fortes</h6>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosForts}</p>
                  </div>
                )}
                {avaliacaoSelecionada.pontosMelhoria && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h6 className="font-medium text-gray-900 mb-2">Pontos de Melhoria</h6>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{avaliacaoSelecionada.pontosMelhoria}</p>
                  </div>
                )}
              </div>
            )}

            {avaliacaoSelecionada.observacaoFinal && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
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
