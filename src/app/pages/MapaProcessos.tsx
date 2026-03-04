import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Edit2, X, Check, Map, Layers, Eye, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useStrategic } from '../context/StrategicContext';
import { AtividadeProcesso } from '../types/strategic';
import { generateId } from '../utils/helpers';
import { useLocalStorage } from '../hooks';
import { MetricCard } from '../components/ui/metric-card';

export interface ProcessoMapeamento {
  id: string;
  numero: number;
  codigoMP?: string; // MP01, MP02, etc - atribuído quando gerar o mapa
  setor: string;
  atividades: string[]; // até 7 atividades (ou mais se necessário)
  mapaGerado?: boolean; // flag para indicar se já foi gerado
}

const STORAGE_KEY = 'sisteq-processos-mapeamento';
const NUM_ATIVIDADES = 10;

export default function MapaProcessos() {
  const { addProcesso } = useStrategic();
  const navigate = useNavigate();
  const [processos, setProcessos] = useLocalStorage<ProcessoMapeamento[]>(STORAGE_KEY, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<ProcessoMapeamento | null>(null);

  // Adicionar novo processo
  const adicionarProcesso = () => {
    const novoProcesso: ProcessoMapeamento = {
      id: generateId('proc-'),
      numero: processos.length + 1,
      setor: '',
      atividades: Array(NUM_ATIVIDADES).fill(''),
      mapaGerado: false
    };
    
    const novosProcessos = [...processos, novoProcesso];
    setProcessos(novosProcessos);
    setEditingId(novoProcesso.id);
    setEditingData(novoProcesso);
    toast.success('Processo adicionado');
  };

  // Remover processo
  const removerProcesso = (id: string) => {
    const processo = processos.find(p => p.id === id);
    
    if (processo?.mapaGerado) {
      toast.error('Não é possível remover um processo com mapa já gerado');
      return;
    }

    if (!confirm('Deseja realmente remover este processo?')) return;
    
    const novosProcessos = processos
      .filter(p => p.id !== id)
      .map((p, index) => ({ ...p, numero: index + 1 }));
    
    setProcessos(novosProcessos);
    toast.success('Processo removido');
  };

  // Iniciar edição
  const iniciarEdicao = (processo: ProcessoMapeamento) => {
    if (processo.mapaGerado) {
      toast.warning('Este processo já tem mapa gerado. As alterações não afetarão o mapa.');
    }
    setEditingId(processo.id);
    setEditingData({ ...processo });
  };

  // Cancelar edição
  const cancelarEdicao = () => {
    if (editingData && editingData.setor === '' && editingData.atividades.every(a => a === '')) {
      // Se for um processo vazio que foi recém criado, remove
      setProcessos(processos.filter(p => p.id !== editingId));
    }
    setEditingId(null);
    setEditingData(null);
  };

  // Salvar edição
  const salvarEdicao = () => {
    if (!editingData) return;
    
    if (editingData.setor.trim() === '') {
      toast.error('O nome do Setor/Processo é obrigatório');
      return;
    }

    const novosProcessos = processos.map(p => 
      p.id === editingId ? editingData : p
    );
    
    setProcessos(novosProcessos);
    setEditingId(null);
    setEditingData(null);
    toast.success('Atividade atualizada');
  };

  // Atualizar campo durante edição
  const atualizarCampo = (campo: 'setor' | number, valor: string) => {
    if (!editingData) return;
    
    if (campo === 'setor') {
      setEditingData({ ...editingData, setor: valor });
    } else {
      const novasAtividades = [...editingData.atividades];
      novasAtividades[campo] = valor;
      setEditingData({ ...editingData, atividades: novasAtividades });
    }
  };

  // Gerar MP Individual
  const gerarMapaIndividual = (processoId: string) => {
    const processo = processos.find(p => p.id === processoId);
    
    if (!processo) return;

    if (processo.mapaGerado) {
      toast.info('Este processo já possui um mapa gerado');
      return;
    }

    if (!processo.setor.trim()) {
      toast.error('Preencha o nome do Setor/Processo antes de gerar o mapa');
      return;
    }

    // Verificar se tem pelo menos uma atividade preenchida
    const atividadesPreenchidas = processo.atividades.filter(a => a.trim() !== '');
    if (atividadesPreenchidas.length === 0) {
      toast.error('Preencha pelo menos uma atividade antes de gerar o mapa');
      return;
    }

    // Calcular próximo código MP baseado nos mapas já gerados
    const mapasGerados = processos.filter(p => p.mapaGerado);
    const proximoNumeroMP = mapasGerados.length + 1;
    const codigoMP = `MP${proximoNumeroMP.toString().padStart(2, '0')}`;

    // Converter atividades para o formato AtividadeProcesso
    const atividadesProcesso: AtividadeProcesso[] = atividadesPreenchidas.map((atividade, index) => ({
      id: generateId('ativ-'),
      nome: atividade,
      descricao: '',
      responsavel: '',
      tempoEstimado: '',
      ordem: index + 1
    }));

    // Criar processo no contexto (sessão Mapas de Processos)
    addProcesso({
      codigo: codigoMP,
      nome: processo.setor, // Nome do setor vira nome do processo
      departamento: processo.setor, // Usar setor como departamento inicial
      status: 'Ativo',
      tipo: 'Operacional',
      atividades: atividadesProcesso
    } as any);

    // Atualizar o processo com o código MP e marcar como gerado
    const novosProcessos = processos.map(p => 
      p.id === processoId 
        ? { ...p, codigoMP, mapaGerado: true }
        : p
    );

    setProcessos(novosProcessos);
    toast.success(`Mapa ${codigoMP} gerado com sucesso!`, {
      description: `O mapeamento do processo "${processo.setor}" foi criado.`
    });
  };

  // Gerar Mapeamento Completo (em lote)
  const gerarMapeamentoCompleto = () => {
    // Filtrar processos que ainda não têm mapa gerado
    const processosSemMapa = processos.filter(p => !p.mapaGerado);

    if (processosSemMapa.length === 0) {
      toast.info('Todos os processos já possuem mapas gerados', {
        description: 'Use a geração individual para criar novos mapas.'
      });
      return;
    }

    // Validar processos sem mapa
    const processosValidos = processosSemMapa.filter(p => {
      const temSetor = p.setor.trim() !== '';
      const temAtividades = p.atividades.some(a => a.trim() !== '');
      return temSetor && temAtividades;
    });

    if (processosValidos.length === 0) {
      toast.error('Nenhum processo válido para gerar mapa', {
        description: 'Os processos precisam ter setor e pelo menos uma atividade preenchidos.'
      });
      return;
    }

    // Calcular próximo número MP baseado nos mapas já gerados
    const mapasGerados = processos.filter(p => p.mapaGerado);
    let proximoNumeroMP = mapasGerados.length + 1;

    // Gerar códigos MP e criar processos no contexto
    processosValidos.forEach((processo) => {
      const codigoMP = `MP${proximoNumeroMP.toString().padStart(2, '0')}`;
      
      // Converter atividades para o formato AtividadeProcesso
      const atividadesPreenchidas = processo.atividades.filter(a => a.trim() !== '');
      const atividadesProcesso: AtividadeProcesso[] = atividadesPreenchidas.map((atividade, index) => ({
        id: generateId('ativ-'),
        nome: atividade,
        descricao: '',
        responsavel: '',
        tempoEstimado: '',
        ordem: index + 1
      }));

      // Criar processo no contexto (sessão Mapas de Processos)
      addProcesso({
        codigo: codigoMP,
        nome: processo.setor, // Nome do setor vira nome do processo
        departamento: processo.setor, // Usar setor como departamento inicial
        status: 'Ativo',
        tipo: 'Operacional',
        atividades: atividadesProcesso
      } as any);

      proximoNumeroMP++;
    });

    // Atualizar processos locais com códigos MP
    let tempProximoNumeroMP = mapasGerados.length + 1;
    const novosProcessos = processos.map(p => {
      if (processosValidos.find(pv => pv.id === p.id)) {
        const codigoMP = `MP${tempProximoNumeroMP.toString().padStart(2, '0')}`;
        tempProximoNumeroMP++;
        return { ...p, codigoMP, mapaGerado: true };
      }
      return p;
    });

    setProcessos(novosProcessos);
    
    const primeiroCodigo = `MP${(mapasGerados.length + 1).toString().padStart(2, '0')}`;
    const ultimoCodigo = `MP${(mapasGerados.length + processosValidos.length).toString().padStart(2, '0')}`;

    toast.success(`${processosValidos.length} mapa(s) gerado(s) com sucesso!`, {
      description: `Mapas criados de ${primeiroCodigo} a ${ultimoCodigo}.`
    });
  };

  // Contar processos com e sem mapas
  const processosSemMapa = processos.filter(p => !p.mapaGerado).length;
  const processosComMapa = processos.filter(p => p.mapaGerado).length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
              Lista de Processos
            </h1>
            <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Mapeamento inicial dos principais processos e atividades da organização
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-8">
            {processos.length > 0 && processosSemMapa > 0 && (
              <Button 
                onClick={gerarMapeamentoCompleto} 
                variant="outline"
                className="gap-2"
              >
                <Layers className="w-4 h-4" />
                Gerar Mapeamento Completo
              </Button>
            )}
            <Button onClick={adicionarProcesso} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Processo
            </Button>
          </div>
        </div>
      </div>

      {/* MetricCards */}
      {processos.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total de Processos"
            value={processos.length}
            icon={Layers}
            variant="default"
          />
          <MetricCard
            label="Mapas Gerados"
            value={processosComMapa}
            icon={CheckCircle2}
            variant="success"
          />
          <MetricCard
            label="Aguardando Geração"
            value={processosSemMapa}
            icon={Clock}
            variant="warning"
          />
        </div>
      )}

      {/* Tabela de Mapeamento */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-4 py-3 text-center text-xs text-gray-500 border-r border-gray-100 w-32" style={{ fontWeight: 500 }}>
                  Ações
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 border-r border-gray-100 w-16" style={{ fontWeight: 500 }}>
                  N.
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 border-r border-gray-100 w-24" style={{ fontWeight: 500 }}>
                  Código MP
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 border-r border-gray-100 min-w-[200px]" style={{ fontWeight: 500 }}>
                  Setores/Processos
                </th>
                {Array.from({ length: NUM_ATIVIDADES }, (_, i) => (
                  <th 
                    key={i} 
                    className="px-4 py-3 text-left text-xs text-gray-500 border-r border-gray-100 min-w-[180px]"
                    style={{ fontWeight: 500 }}
                  >
                    Atividade {i + 1}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs text-gray-500 w-32" style={{ fontWeight: 500 }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processos.length === 0 ? (
                <tr>
                  <td colSpan={NUM_ATIVIDADES + 5} className="px-4 py-12 text-center text-gray-500">
                    Nenhum processo mapeado. Clique em "Adicionar Processo" para começar.
                  </td>
                </tr>
              ) : (
                processos.map((processo) => {
                  const isEditing = editingId === processo.id;
                  const data = isEditing && editingData ? editingData : processo;

                  return (
                    <tr 
                      key={processo.id} 
                      className={`hover:bg-gray-50 ${processo.mapaGerado ? 'bg-green-50/30' : ''}`}
                    >
                      {/* Ações */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={salvarEdicao}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelarEdicao}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/processos/mapa/${processo.id}/visualizar`)}
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Visualizar processo"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => iniciarEdicao(processo)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Editar processo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            {!processo.mapaGerado && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => gerarMapaIndividual(processo.id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Gerar mapa de processo"
                              >
                                <Map className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {!processo.mapaGerado && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removerProcesso(processo.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Remover processo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Número */}
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300 font-medium">
                        {processo.numero}
                      </td>

                      {/* Código MP */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        {processo.mapaGerado ? (
                          <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded" style={{ fontWeight: 600 }}>
                            {processo.codigoMP}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Setor/Processo */}
                      <td className="px-4 py-3 border-r border-gray-300">
                        {isEditing ? (
                          <Input
                            value={data.setor}
                            onChange={(e) => atualizarCampo('setor', e.target.value)}
                            placeholder="Nome do Setor/Processo"
                            className="w-full"
                            autoFocus
                          />
                        ) : (
                          <div className="text-sm text-gray-900 font-medium">
                            {processo.setor || '-'}
                          </div>
                        )}
                      </td>

                      {/* Atividades */}
                      {Array.from({ length: NUM_ATIVIDADES }, (_, i) => (
                        <td key={i} className="px-4 py-3 border-r border-gray-300">
                          {isEditing ? (
                            <Input
                              value={data.atividades[i] || ''}
                              onChange={(e) => atualizarCampo(i, e.target.value)}
                              placeholder={`Atividade ${i + 1}`}
                              className="w-full"
                            />
                          ) : (
                            <div className="text-sm text-gray-700">
                              {processo.atividades[i] || '-'}
                            </div>
                          )}
                        </td>
                      ))}

                      {/* Ações */}
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={salvarEdicao}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelarEdicao}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/processos/mapa/${processo.id}/visualizar`)}
                              className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Visualizar processo"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => iniciarEdicao(processo)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Editar processo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            {!processo.mapaGerado && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => gerarMapaIndividual(processo.id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Gerar mapa de processo"
                              >
                                <Map className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {!processo.mapaGerado && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removerProcesso(processo.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Remover processo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}