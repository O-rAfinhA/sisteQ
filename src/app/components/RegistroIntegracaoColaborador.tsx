import { generateId, getFromStorage } from '../utils/helpers';
import { formatarDataPtBr, dataHojeISO } from '../utils/formatters';
import { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks';
import { Plus, ChevronDown, ChevronUp, Layers, Save, UserCircle, Calendar, Trash2, CheckCircle2, FileText, X } from 'lucide-react';
import { Button } from './ui/button';

interface RegistroIntegracaoColaboradorProps {
  colaboradorId: string;
  colaboradorNome: string;
  departamentoColaborador: string;
}

interface ItemFichaIntegracao {
  id: string;
  ordem: string;
  descricao: string;
  orientacoes?: string;
}

interface SetorFichaIntegracao {
  id: string;
  ordem: number;
  titulo: string;
  itens: ItemFichaIntegracao[];
}

interface FichaIntegracao {
  id: string;
  nome: string;
  descricao: string;
  setores: SetorFichaIntegracao[];
  dataCriacao: string;
  dataAtualizacao: string;
}

interface ItemIntegracao {
  id: string;
  item: string;
  orientacoes: string;
}

interface RegistroOrientacao {
  id: string;
  fichaId?: string;
  fichaNome?: string;
  departamento: string;
  processo: string;
  itensOrientados: string[];
  orientador: string;
  dataOrientacao: string;
  observacoes?: string;
}

export function RegistroIntegracaoColaborador({ 
  colaboradorId, 
  colaboradorNome, 
  departamentoColaborador 
}: RegistroIntegracaoColaboradorProps) {
  const [registros, setRegistros] = useLocalStorage<RegistroOrientacao[]>(`sisteq-registros-integracao-${colaboradorId}`, []);
  const [showNovoRegistro, setShowNovoRegistro] = useState(false);
  
  // Estados NOVOS - Fichas de Integração
  const [fichasDisponiveis, setFichasDisponiveis] = useLocalStorage<FichaIntegracao[]>('sisteq-fichas-integracao', []);
  const [fichaSelecionada, setFichaSelecionada] = useState<FichaIntegracao | null>(null);
  const [setoresExpandidos, setSetoresExpandidos] = useState<{ [key: string]: boolean }>({});
  
  // Estados antigos (mantidos para compatibilidade)
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemIntegracao[]>([]);
  const [listaColaboradores, setListaColaboradores] = useState<string[]>([]);
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  const [listaProcessos, setListaProcessos] = useState<string[]>([]);

  // Form
  const [formData, setFormData] = useState({
    fichaId: '',
    departamento: departamentoColaborador || '',
    processo: '',
    itensOrientados: [] as string[],
    orientador: '',
    dataOrientacao: dataHojeISO(),
    observacoes: ''
  });

  useEffect(() => {
    loadData();
  }, [colaboradorId, departamentoColaborador]);

  const loadData = () => {
    // Carregar itens de integração disponíveis (sistema antigo - compatibilidade)
    const integracoes = getFromStorage<any[]>('sisteq-integracao-colaboradores', []);
    const integracaoDept = integracoes.find((i: any) => 
      i.departamento.toLowerCase().trim() === departamentoColaborador.toLowerCase().trim()
    );
    if (integracaoDept) {
      setItensDisponiveis(integracaoDept.itens || []);
    }

    // Carregar colaboradores
    const cols = getFromStorage<any[]>('sisteq-colaboradores', []);
    setListaColaboradores(cols.filter((c: any) => c.status === 'ativo').map((c: any) => c.nomeCompleto));

    // Carregar departamentos
    const depts = getFromStorage<any[]>('departamentos', []);
    setListaDepartamentos(depts.filter((d: any) => d.ativo).map((d: any) => d.nome));

    // Carregar processos
    const procs = getFromStorage<any[]>('sisteq-processos', []);
    setListaProcessos(procs.map((p: any) => p.nome));
  };

  // NOVO - Manipular seleção de ficha
  const handleSelecionarFicha = (fichaId: string) => {
    const ficha = fichasDisponiveis.find(f => f.id === fichaId);
    setFichaSelecionada(ficha || null);
    setFormData({
      ...formData,
      fichaId: fichaId,
      itensOrientados: []
    });

    // Auto-expandir todos os setores
    if (ficha) {
      const expandidos: { [key: string]: boolean } = {};
      ficha.setores.forEach(setor => {
        expandidos[setor.id] = true;
      });
      setSetoresExpandidos(expandidos);
    }
  };

  const handleToggleItem = (itemId: string) => {
    const isSelected = formData.itensOrientados.includes(itemId);
    if (isSelected) {
      setFormData({
        ...formData,
        itensOrientados: formData.itensOrientados.filter(id => id !== itemId)
      });
    } else {
      setFormData({
        ...formData,
        itensOrientados: [...formData.itensOrientados, itemId]
      });
    }
  };

  const toggleSetor = (setorId: string) => {
    setSetoresExpandidos(prev => ({
      ...prev,
      [setorId]: !prev[setorId]
    }));
  };

  const handleSaveRegistro = () => {
    if (!formData.orientador || !formData.dataOrientacao) {
      alert('Preencha os campos obrigatórios: Orientador e Data');
      return;
    }

    if (formData.itensOrientados.length === 0) {
      alert('Selecione pelo menos um item orientado');
      return;
    }

    const novoRegistro: RegistroOrientacao = {
      id: generateId(),
      fichaId: formData.fichaId || undefined,
      fichaNome: fichaSelecionada?.nome || undefined,
      departamento: formData.departamento,
      processo: formData.processo,
      itensOrientados: formData.itensOrientados,
      orientador: formData.orientador,
      dataOrientacao: formData.dataOrientacao,
      observacoes: formData.observacoes
    };

    const updated = [...registros, novoRegistro];
    setRegistros(updated);

    setFormData({
      fichaId: '',
      departamento: departamentoColaborador || '',
      processo: '',
      itensOrientados: [],
      orientador: '',
      dataOrientacao: dataHojeISO(),
      observacoes: ''
    });
    setFichaSelecionada(null);
    setShowNovoRegistro(false);
    alert('Registro de integração salvo com sucesso!');
  };

  const handleDeleteRegistro = (id: string) => {
    if (confirm('Deseja realmente excluir este registro de integração?')) {
      const updated = registros.filter(r => r.id !== id);
      setRegistros(updated);
    }
  };

  const getItemNome = (itemId: string) => {
    // Tentar buscar na ficha selecionada primeiro
    if (fichaSelecionada) {
      for (const setor of fichaSelecionada.setores) {
        const item = setor.itens.find(i => i.id === itemId);
        if (item) {
          return `${item.ordem} - ${item.descricao}`;
        }
      }
    }

    // Fallback: buscar nos itens antigos
    const item = itensDisponiveis.find(i => i.id === itemId);
    return item ? item.item : 'Item não encontrado';
  };

  const getItemNomeFromRegistro = (reg: RegistroOrientacao, itemId: string) => {
    // Se o registro tem fichaId, buscar na ficha correspondente
    if (reg.fichaId) {
      const ficha = fichasDisponiveis.find(f => f.id === reg.fichaId);
      if (ficha) {
        for (const setor of ficha.setores) {
          const item = setor.itens.find(i => i.id === itemId);
          if (item) {
            return `${item.ordem} - ${item.descricao}`;
          }
        }
      }
    }

    // Fallback
    const item = itensDisponiveis.find(i => i.id === itemId);
    return item ? item.item : 'Item não encontrado';
  };

  // Agrupar registros por ficha ou departamento/processo
  const registrosAgrupados = registros.reduce((acc, reg) => {
    const key = reg.fichaNome || reg.processo || reg.departamento || 'Outros';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(reg);
    return acc;
  }, {} as Record<string, RegistroOrientacao[]>);

  return (
    <div className="space-y-4">
      {/* Botão Adicionar Registro */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Registre as orientações de integração realizadas com o colaborador
        </p>
        <Button
          onClick={() => setShowNovoRegistro(!showNovoRegistro)}
          className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </Button>
      </div>

      {/* Formulário de Novo Registro */}
      {showNovoRegistro && (
        <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
          <h4 className="font-semibold text-gray-900 mb-4">Novo Registro de Integração</h4>
          
          <div className="space-y-4">
            {/* NOVO - Seletor de Ficha de Integração */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ficha de Integração *
              </label>
              <select
                value={formData.fichaId}
                onChange={(e) => handleSelecionarFicha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Selecione a ficha...</option>
                {fichasDisponiveis.map((ficha) => (
                  <option key={ficha.id} value={ficha.id}>
                    {ficha.nome} ({ficha.setores.reduce((total, setor) => total + setor.itens.length, 0)} itens)
                  </option>
                ))}
              </select>
              {fichasDisponiveis.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Nenhuma ficha configurada. Configure em "Integração de Colaboradores → Fichas de Integração"
                </p>
              )}
            </div>

            {/* Departamento ou Processo (Opcional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento (Opcional)
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione o departamento...</option>
                  {listaDepartamentos.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Processo (Opcional)
                </label>
                <select
                  value={formData.processo}
                  onChange={(e) => setFormData({ ...formData, processo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {listaProcessos.map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Orientador e Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orientador/Responsável *
                </label>
                <select
                  value={formData.orientador}
                  onChange={(e) => setFormData({ ...formData, orientador: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {listaColaboradores.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Integração *
                </label>
                <input
                  type="date"
                  value={formData.dataOrientacao}
                  onChange={(e) => setFormData({ ...formData, dataOrientacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* NOVO - Itens da Ficha Selecionada (Agrupados por Setor) */}
            {fichaSelecionada && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Itens Orientados * ({formData.itensOrientados.length} selecionado(s))
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white">
                  {fichaSelecionada.setores.map((setor) => (
                    <div key={setor.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Cabeçalho do Setor */}
                      <div
                        onClick={() => toggleSetor(setor.id)}
                        className="bg-blue-50 p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {setoresExpandidos[setor.id] ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-semibold">
                              {setor.ordem}
                            </span>
                            <span className="font-semibold text-gray-900 text-sm">{setor.titulo}</span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {setor.itens.filter(item => formData.itensOrientados.includes(item.id)).length}/{setor.itens.length}
                          </span>
                        </div>
                      </div>

                      {/* Itens do Setor */}
                      {setoresExpandidos[setor.id] && (
                        <div className="p-3 space-y-2">
                          {setor.itens.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-green-300 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={formData.itensOrientados.includes(item.id)}
                                onChange={() => handleToggleItem(item.id)}
                                className="mt-1 w-4 h-4 text-green-600 border-gray-200 rounded focus:ring-green-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">
                                  <span className="text-blue-600 font-semibold">{item.ordem}</span> - {item.descricao}
                                </div>
                                {item.orientacoes && (
                                  <div className="text-xs text-gray-600 mt-1">{item.orientacoes}</div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem se nenhuma ficha selecionada */}
            {!fichaSelecionada && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Selecione uma Ficha de Integração</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Escolha uma ficha acima para visualizar e marcar os itens que foram orientados ao colaborador.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Observações gerais sobre a integração..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-green-300">
            <button
              onClick={() => {
                setShowNovoRegistro(false);
                setFichaSelecionada(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleSaveRegistro}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar Registro
            </button>
          </div>
        </div>
      )}

      {/* Lista de Registros Agrupados */}
      {Object.keys(registrosAgrupados).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(registrosAgrupados as Record<string, RegistroOrientacao[]>).map(([key, regs]) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-green-600 p-4 text-white rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  <h4 className="font-semibold">{key}</h4>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {regs.length} registro(s)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {regs.map((reg) => (
                  <div key={reg.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{reg.orientador}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatarDataPtBr(reg.dataOrientacao)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {reg.itensOrientados.length} item(ns) orientado(s)
                          </p>
                          {reg.fichaNome && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                              <Layers className="w-3 h-3" />
                              {reg.fichaNome}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRegistro(reg.id)}
                        className="text-red-600 hover:bg-red-50"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Itens Orientados */}
                    <div className="ml-13 space-y-2">
                      {reg.itensOrientados.map((itemId, idx) => (
                        <div key={itemId} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{getItemNomeFromRegistro(reg, itemId)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Observações */}
                    {reg.observacoes && (
                      <div className="ml-13 mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{reg.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 mb-2">Nenhum registro de integração encontrado</p>
          <p className="text-sm text-gray-500">
            Clique em "Novo Registro" para começar a registrar as orientações realizadas
          </p>
        </div>
      )}
    </div>
  );
}
