import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Indicador, TipoIndicador, PeriodicidadeIndicador, TipoConsolidacao, TendenciaIndicador } from '../../types/kpi';
import { useProcessos } from '../../hooks/useProcessos';
import { getFromStorage } from '../../utils/helpers';

interface Departamento {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  ativo: boolean;
  dataCadastro: string;
}

interface ModalKPIProps {
  open: boolean;
  onClose: () => void;
  indicador: Indicador | null;
  onSave: (data: Partial<Indicador>) => void;
  indicadoresExistentes: Indicador[];
}

export function ModalKPI({ open, onClose, indicador, onSave, indicadoresExistentes }: ModalKPIProps) {
  const { processos } = useProcessos();
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [formData, setFormData] = useState<Partial<Indicador>>({
    nome: '',
    codigo: '',
    departamento: '',
    processoId: '',
    processoNome: '',
    responsavel: '',
    unidadeMedida: '',
    periodicidade: 'Mensal',
    tipoConsolidacao: 'Média',
    formulaCalculo: '',
    fonteDados: '',
    tipoIndicador: 'Sem Definição',
    meta: undefined,
    limiteMinimo: undefined,
    limiteMaximo: undefined,
    tendencia: 'Crescente',
    historicoResultados: [],
    analiseCritica: '',
    observacoes: '',
    ativo: true,
  });

  // Carregar departamentos cadastrados do localStorage
  useEffect(() => {
    const deps = getFromStorage<Departamento[]>('departamentos', []);
    setDepartamentos(deps.filter(d => d.ativo));
  }, []);

  // Gerar código automático ao abrir para novo indicador
  useEffect(() => {
    if (indicador) {
      setFormData(indicador);
    } else if (open) {
      // Gerar novo código automático
      const lista = indicadoresExistentes;
      
      // Encontrar o maior número
      const maxNum = lista.reduce((max: number, ind: Indicador) => {
        if (ind.codigo && ind.codigo.startsWith('KPI')) {
          const num = parseInt(ind.codigo.substring(3));
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      const novoCodigo = `KPI${String(maxNum + 1).padStart(3, '0')}`;
      
      setFormData({
        nome: '',
        codigo: novoCodigo,
        departamento: '',
        processoId: '',
        processoNome: '',
        responsavel: '',
        unidadeMedida: '',
        periodicidade: 'Mensal',
        tipoConsolidacao: 'Média',
        formulaCalculo: '',
        fonteDados: '',
        tipoIndicador: 'Sem Definição',
        meta: undefined,
        limiteMinimo: undefined,
        limiteMaximo: undefined,
        tendencia: 'Crescente',
        historicoResultados: [],
        analiseCritica: '',
        observacoes: '',
        ativo: true,
      });
    }
  }, [indicador, open, indicadoresExistentes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleProcessoChange = (processoId: string) => {
    const processo = processos.find(p => p.id === processoId);
    setFormData({
      ...formData,
      processoId,
      processoNome: (processo as any)?.nome || processo?.setor || '',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {indicador ? 'Editar Indicador' : 'Novo Indicador'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Bloco 1 - Identificação */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Identificação
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Indicador *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Taxa de Satisfação do Cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: IND-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Indicador *
                </label>
                <select
                  required
                  value={formData.tipoIndicador}
                  onChange={(e) => setFormData({ ...formData, tipoIndicador: e.target.value as TipoIndicador })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="Sem Definição">Sem Definição</option>
                  <option value="Estratégico">Estratégico</option>
                  <option value="Tático">Tático</option>
                  <option value="Operacional">Operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                {departamentos.length === 0 ? (
                  <div className="space-y-2">
                    <select
                      disabled
                      className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
                    >
                      <option value="">Nenhum departamento cadastrado</option>
                    </select>
                    <p className="text-xs text-amber-600">
                      Cadastre departamentos no módulo de Configurações primeiro
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(depto => (
                      <option key={depto.id} value={depto.nome}>
                        {depto.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Processo Vinculado
                </label>
                <select
                  value={formData.processoId || ''}
                  onChange={(e) => handleProcessoChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {processos.map(processo => (
                    <option key={processo.id} value={processo.id}>
                      {processo.codigo} - {(processo as any).nome || processo.setor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável *
                </label>
                <input
                  type="text"
                  required
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Nome do responsável"
                />
              </div>
            </div>
          </div>

          {/* Bloco 2 - Estrutura Técnica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Estrutura Técnica
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade de Medida *
                </label>
                <input
                  type="text"
                  required
                  value={formData.unidadeMedida}
                  onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: %, R$, unidades"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periodicidade *
                </label>
                <select
                  required
                  value={formData.periodicidade}
                  onChange={(e) => setFormData({ ...formData, periodicidade: e.target.value as PeriodicidadeIndicador })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="Mensal">Mensal</option>
                  <option value="Bimestral">Bimestral</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Consolidação Anual *
                </label>
                <select
                  required
                  value={formData.tipoConsolidacao}
                  onChange={(e) => setFormData({ ...formData, tipoConsolidacao: e.target.value as TipoConsolidacao })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="Média">Média</option>
                  <option value="Somatório">Somatório</option>
                  <option value="Último Valor">Último Valor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonte de Dados *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fonteDados}
                  onChange={(e) => setFormData({ ...formData, fonteDados: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Sistema ERP, Planilha Excel"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Cálculo *
                </label>
                <textarea
                  required
                  value={formData.formulaCalculo}
                  onChange={(e) => setFormData({ ...formData, formulaCalculo: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Descreva como o indicador é calculado"
                />
              </div>
            </div>
          </div>

          {/* Bloco 3 - Meta e Critério */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Meta e Critério
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta
                </label>
                <input
                  type="text"
                  value={formData.meta !== undefined ? String(formData.meta) : ''}
                  onChange={(e) => {
                    const valor = e.target.value.replace(',', '.');
                    setFormData({ ...formData, meta: valor ? parseFloat(valor) : undefined });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: 95 ou 95.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite Inferior</label>
                <input
                  type="text"
                  value={formData.limiteMinimo !== undefined ? String(formData.limiteMinimo) : ''}
                  onChange={(e) => {
                    const valor = e.target.value.replace(',', '.');
                    setFormData({ ...formData, limiteMinimo: valor ? parseFloat(valor) : undefined });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: 90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite Superior</label>
                <input
                  type="text"
                  value={formData.limiteMaximo !== undefined ? String(formData.limiteMaximo) : ''}
                  onChange={(e) => {
                    const valor = e.target.value.replace(',', '.');
                    setFormData({ ...formData, limiteMaximo: valor ? parseFloat(valor) : undefined });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Ex: 100"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tendência Esperada *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tendencia"
                      value="Crescente"
                      checked={formData.tendencia === 'Crescente'}
                      onChange={(e) => setFormData({ ...formData, tendencia: e.target.value as TendenciaIndicador })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Crescente (quanto maior, melhor)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tendencia"
                      value="Decrescente"
                      checked={formData.tendencia === 'Decrescente'}
                      onChange={(e) => setFormData({ ...formData, tendencia: e.target.value as TendenciaIndicador })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Decrescente (quanto menor, melhor)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tendencia"
                      value="Estável"
                      checked={formData.tendencia === 'Estável'}
                      onChange={(e) => setFormData({ ...formData, tendencia: e.target.value as TendenciaIndicador })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Estável (manter na faixa)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco 4 - Observações */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Observações
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações Gerais
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Adicione observações relevantes sobre este indicador"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit} variant={indicador ? "black" : "default"} className="gap-2">
            <Save className="w-4 h-4" />
            {indicador ? 'Salvar Alterações' : 'Criar Indicador'}
          </Button>
        </div>
      </div>
    </div>
  );
}
