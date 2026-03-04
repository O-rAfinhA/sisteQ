import { useState, useEffect } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Trash2, Edit, CheckCircle2, Calendar, DollarSign, ClipboardList, Eye, Clock, AlertCircle, ListChecks, MessageSquarePlus, Search, Target, X } from 'lucide-react';
import { MetricCard } from '../components/ui/metric-card';
import { PlanoAcaoEstrategico as PlanoAcaoType, TarefaAcao, OrigemPlanoAcao } from '../types/strategic';
import { toast } from 'sonner';
import { formatarData, formatarMoeda, moedaParaNumero, capitalizarNome, capitalizarPrimeiraLetra, formatarDataHoraCompleta, dataHojeISO } from '../utils/formatters';
import { PAEDetailsDialog } from '../components/PAEDetailsDialog';
import { DateInput } from '../components/ui/date-input';
import { SwotItemDetailsDialog } from '../components/SwotItemDetailsDialog';
import { ObjetivoBscDetailsDialog } from '../components/ObjetivoBscDetailsDialog';
import { getUsuariosNomes, getDepartamentoPorUsuario } from '../types/config';
import { ResponsavelCombobox } from '../components/ResponsavelCombobox';
import { PEViewDialog } from '../components/PEViewDialog';
import { generateId } from '../utils/helpers';
import { calcularProgressoTarefas, calcularProgressoPrazo, calcularMediasPlanos, contarVencimentos, validarPrazosTarefas, EMPTY_TAREFA, EMPTY_ACOMPANHAMENTO } from '../utils/plano-helpers';

type FiltroStatus = 'todos' | 'nao-iniciado' | 'em-andamento' | 'concluido' | 'atrasado' | 'vencem-30dias' | 'vencem-60dias';

const STATUS_CONFIG = {
  'nao-iniciado': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700', progress: 0 },
  'em-andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', progress: 50 },
  'concluido': { label: 'Concluído', color: 'bg-green-100 text-green-700', progress: 100 },
  'atrasado': { label: 'Atrasado', color: 'bg-red-100 text-red-700', progress: 25 },
};

const ORIGEM_PE_COLORS: Record<OrigemPlanoAcao, string> = {
  'SWOT': 'bg-blue-100 text-blue-700',
  'Mudança': 'bg-purple-100 text-purple-700',
  'Objetivo': 'bg-green-100 text-green-700',
  'Outros': 'bg-gray-100 text-gray-700',
};

export default function PlanoAcaoEstrategicoPage() {
  const { dados, addPlanoAcao, updatePlanoAcao, deletePlanoAcao } = useStrategic();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAcaoType | null>(null);
  const [viewingPlano, setViewingPlano] = useState<PlanoAcaoType | null>(null);
  const [isPEViewOpen, setIsPEViewOpen] = useState(false);
  const [isPAEDetailsOpen, setIsPAEDetailsOpen] = useState(false);
  const [selectedSwotItem, setSelectedSwotItem] = useState<any>(null);
  const [selectedObjetivo, setSelectedObjetivo] = useState<any>(null);
  const [isSwotDialogOpen, setIsSwotDialogOpen] = useState(false);
  const [isObjetivoDialogOpen, setIsObjetivoDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    origemTipo: OrigemPlanoAcao;
    acao: string;
    tarefas: TarefaAcao[];
    investimento: number;
    dataInicio: string;
    prazoFinal: string;
    statusAcompanhamento: PlanoAcaoType['statusAcompanhamento'];
    acompanhamentos: PlanoAcaoType['acompanhamentos'];
  }>({
    origemTipo: 'Outros',
    acao: '',
    tarefas: [],
    investimento: 0,
    dataInicio: dataHojeISO(), // Data atual por padrão
    prazoFinal: '',
    statusAcompanhamento: 'nao-iniciado',
    acompanhamentos: [],
  });

  const [novaTarefa, setNovaTarefa] = useState({ ...EMPTY_TAREFA });
  const [novoAcompanhamento, setNovoAcompanhamento] = useState({ ...EMPTY_ACOMPANHAMENTO });
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingTarefaId, setEditingTarefaId] = useState<string | null>(null);
  const [editingTarefaData, setEditingTarefaData] = useState({ ...EMPTY_TAREFA });
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    // Carregar usuários e pessoas disponíveis
    setUsuariosDisponiveis(getUsuariosNomes());
  }, []);

  useEffect(() => {
    const planoId = searchParams.get('planoId');
    const editPlanoId = searchParams.get('editPlanoId');
    
    if (planoId) {
      const plano = dados.planosAcao.find(p => p.id === planoId);
      if (plano) {
        setViewingPlano(plano);
        setIsPAEDetailsOpen(true);
        // Limpar o query param
        setSearchParams({});
      }
    } else if (editPlanoId) {
      const plano = dados.planosAcao.find(p => p.id === editPlanoId);
      if (plano) {
        handleEdit(plano);
        // Limpar o query param
        setSearchParams({});
      }
    }
  }, [searchParams, dados.planosAcao, setSearchParams]);

  const handleSubmit = () => {
    if (!formData.acao.trim()) {
      toast.error('Por favor, preencha a ação.');
      return;
    }

    // Validar prazos das tarefas
    if (!validarPrazosTarefas(formData.tarefas, formData.prazoFinal)) {
      toast.error('Erro: Existem tarefas com prazo superior ao prazo final do PE. Ajuste os prazos antes de salvar.');
      return;
    }

    if (editingPlano) {
      updatePlanoAcao(editingPlano.id, formData);
      toast.success('Plano de ação atualizado com sucesso!');
    } else {
      addPlanoAcao(formData);
      toast.success('Plano de ação criado com sucesso!');
    }

    handleDialogClose(false);
  };

  const handleView = (plano: PlanoAcaoType) => {
    setViewingPlano(plano);
    setIsPEViewOpen(true);
  };

  const handleEdit = (plano: PlanoAcaoType) => {
    setEditingPlano(plano);
    setFormData({
      origemTipo: plano.origemTipo,
      acao: plano.acao,
      tarefas: plano.tarefas,
      investimento: plano.investimento,
      dataInicio: plano.dataInicio,
      prazoFinal: plano.prazoFinal,
      statusAcompanhamento: plano.statusAcompanhamento,
      acompanhamentos: plano.acompanhamentos,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano de ação?')) {
      deletePlanoAcao(id);
      toast.success('Plano de ação excluído com sucesso!');
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingPlano(null);
      setFormData({
        origemTipo: 'Outros',
        acao: '',
        tarefas: [],
        investimento: 0,
        dataInicio: dataHojeISO(), // Data atual por padrão
        prazoFinal: '',
        statusAcompanhamento: 'nao-iniciado',
        acompanhamentos: [],
      });
      setNovaTarefa({ ...EMPTY_TAREFA });
      setNovoAcompanhamento({ ...EMPTY_ACOMPANHAMENTO });
      setEditingTarefaId(null);
      setEditingTarefaData({ ...EMPTY_TAREFA });
    }
    setIsDialogOpen(open);
  };

  const handleInvestimentoChange = (valor: string) => {
    const numero = moedaParaNumero(valor);
    setFormData(prev => ({ ...prev, investimento: numero }));
  };

  // Função para atualizar responsável e preencher departamento automaticamente
  const handleResponsavelChange = (nomeResponsavel: string) => {
    const departamento = getDepartamentoPorUsuario(nomeResponsavel);
    setNovaTarefa(prev => ({ 
      ...prev, 
      responsavel: nomeResponsavel,
      departamento: departamento
    }));
  };

  // Função para atualizar responsável no modo edição
  const handleEditResponsavelChange = (nomeResponsavel: string) => {
    const departamento = getDepartamentoPorUsuario(nomeResponsavel);
    setEditingTarefaData(prev => ({ 
      ...prev, 
      responsavel: nomeResponsavel,
      departamento: departamento
    }));
  };

  // Função para atualizar responsável do acompanhamento
  const handleAcompanhamentoResponsavelChange = (nomeResponsavel: string) => {
    setNovoAcompanhamento(prev => ({ 
      ...prev, 
      responsavel: nomeResponsavel
    }));
  };

  const addTarefa = () => {
    if (!novaTarefa.descricao.trim()) {
      toast.error('Preencha a descrição da tarefa.');
      return;
    }

    // Validar prazo da tarefa em relação ao prazo final do PE
    if (novaTarefa.prazo && formData.prazoFinal) {
      const prazoTarefa = new Date(novaTarefa.prazo);
      const prazoFinalPe = new Date(formData.prazoFinal);
      
      if (prazoTarefa > prazoFinalPe) {
        toast.error(`O prazo da tarefa (${formatarData(novaTarefa.prazo)}) não pode ser superior ao prazo final do PE (${formatarData(formData.prazoFinal)}).`);
        return;
      }
    }

    const newTarefa: TarefaAcao = {
      id: generateId(),
      descricao: novaTarefa.descricao,
      responsavel: novaTarefa.responsavel,
      departamento: novaTarefa.departamento,
      prazo: novaTarefa.prazo,
      concluida: false,
    };

    setFormData(prev => ({
      ...prev,
      tarefas: [...prev.tarefas, newTarefa],
    }));

    setNovaTarefa({ ...EMPTY_TAREFA });
    toast.success('Tarefa adicionada com sucesso!');
  };

  const removeTarefa = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tarefas: prev.tarefas.filter(t => t.id !== id),
    }));
  };

  const startEditTarefa = (tarefa: TarefaAcao) => {
    setEditingTarefaId(tarefa.id);
    setEditingTarefaData({
      descricao: tarefa.descricao,
      responsavel: tarefa.responsavel,
      departamento: tarefa.departamento || '',
      prazo: tarefa.prazo,
    });
  };

  const saveEditTarefa = (tarefaId: string) => {
    if (!editingTarefaData.descricao.trim()) {
      toast.error('Preencha a descrição da tarefa.');
      return;
    }

    // Validar prazo da tarefa em relação ao prazo final do PE
    if (editingTarefaData.prazo && formData.prazoFinal) {
      const prazoTarefa = new Date(editingTarefaData.prazo);
      const prazoFinalPe = new Date(formData.prazoFinal);
      
      if (prazoTarefa > prazoFinalPe) {
        toast.error(`O prazo da tarefa (${formatarData(editingTarefaData.prazo)}) não pode ser superior ao prazo final do PE (${formatarData(formData.prazoFinal)}).`);
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      tarefas: prev.tarefas.map(t => 
        t.id === tarefaId 
          ? { ...t, ...editingTarefaData }
          : t
      ),
    }));

    setEditingTarefaId(null);
    setEditingTarefaData({ ...EMPTY_TAREFA });
    toast.success('Tarefa atualizada!');
  };

  const cancelEditTarefa = () => {
    setEditingTarefaId(null);
    setEditingTarefaData({ ...EMPTY_TAREFA });
  };

  const toggleTarefa = (planoId: string, tarefaId: string) => {
    const plano = dados.planosAcao.find(p => p.id === planoId);
    if (!plano) return;

    const tarefasAtualizadas = plano.tarefas.map(t =>
      t.id === tarefaId ? { 
        ...t, 
        concluida: !t.concluida,
        dataConclusao: !t.concluida ? new Date().toISOString() : undefined
      } : t
    );

    updatePlanoAcao(planoId, { tarefas: tarefasAtualizadas });
  };

  const calcularProgresso = (plano: PlanoAcaoType) => {
    if (plano.tarefas.length === 0) return STATUS_CONFIG[plano.statusAcompanhamento].progress;
    return calcularProgressoTarefas(plano.tarefas);
  };

  // Filtrar planos baseado na busca
  const planosFiltrados = dados.planosAcao.filter(plano => {
    if (!busca.trim()) return true;
    const buscaLower = busca.toLowerCase();
    
    // Buscar nos responsáveis das tarefas
    const responsaveisTarefas = plano.tarefas
      .map(tarefa => tarefa.responsavel.toLowerCase())
      .join(' ');
    
    return (
      plano.numeroPE.toLowerCase().includes(buscaLower) ||
      plano.acao.toLowerCase().includes(buscaLower) ||
      plano.origemTipo.toLowerCase().includes(buscaLower) ||
      STATUS_CONFIG[plano.statusAcompanhamento].label.toLowerCase().includes(buscaLower) ||
      responsaveisTarefas.includes(buscaLower)
    );
  });

  // Calcular estatísticas gerais (usando helpers centralizados)
  const { progressoGeral, prazoGeral } = calcularMediasPlanos(dados.planosAcao);
  const vencem30dias = contarVencimentos(dados.planosAcao, 0, 30);
  const vencem60dias = contarVencimentos(dados.planosAcao, 30, 60);

  // Aplicar filtros combinados
  const planosComFiltros = planosFiltrados.filter(plano => {
    if (filtroStatus === 'todos') return true;
    
    if (filtroStatus === 'vencem-30dias') {
      if (plano.statusAcompanhamento === 'concluido' || !plano.prazoFinal) return false;
      const prazoFinal = new Date(plano.prazoFinal);
      const hoje = new Date();
      const dias30 = new Date();
      dias30.setDate(dias30.getDate() + 30);
      return prazoFinal >= hoje && prazoFinal <= dias30;
    }
    
    if (filtroStatus === 'vencem-60dias') {
      if (plano.statusAcompanhamento === 'concluido' || !plano.prazoFinal) return false;
      const prazoFinal = new Date(plano.prazoFinal);
      const hoje = new Date();
      const dias60 = new Date();
      dias60.setDate(dias60.getDate() + 60);
      return prazoFinal >= hoje && prazoFinal <= dias60;
    }
    
    return plano.statusAcompanhamento === filtroStatus;
  });

  // Limpar filtros
  const limparFiltros = () => {
    setFiltroStatus('todos');
    setBusca('');
  };

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtroStatus !== 'todos' || busca.trim() !== '';

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Plano de Ação Estratégico</h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie os planos de ação vinculados aos objetivos e análises estratégicas.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2 flex-shrink-0 ml-8">
              <Plus className="w-4 h-4" />
              Novo Plano de Ação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlano ? `Editar ${editingPlano.numeroPE}` : 'Novo Plano Estratégico'}</DialogTitle>
              <DialogDescription>
                Preencha as informações do plano estratégico.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Origem *</Label>
                  <Select
                    value={formData.origemTipo}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, origemTipo: value as OrigemPlanoAcao }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGEM_PE_COLORS).map(([key, color]) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.statusAcompanhamento}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, statusAcompanhamento: value as PlanoAcaoType['statusAcompanhamento'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Ação *</Label>
                <Textarea
                  value={formData.acao}
                  onChange={(e) => setFormData(prev => ({ ...prev, acao: capitalizarPrimeiraLetra(e.target.value) }))}
                  placeholder="Descreva a ação estratégica..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Investimento (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.investimento || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, investimento: parseFloat(e.target.value) || 0 }))}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.investimento > 0 && `Valor: ${formatarMoeda(formData.investimento)}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <DateInput
                    value={formData.dataInicio}
                    onChange={(value) => setFormData(prev => ({ ...prev, dataInicio: value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Data de referência para cálculo do progresso de prazo
                  </p>
                </div>
                <div>
                  <Label>Prazo Final *</Label>
                  <DateInput
                    value={formData.prazoFinal}
                    onChange={(value) => setFormData(prev => ({ ...prev, prazoFinal: value }))}
                  />
                </div>
              </div>

              {/* Tarefas */}
              <div className="border-t pt-4">
                <Label className="text-base" style={{ fontWeight: 600 }}>Tarefas</Label>
                <div className="space-y-2 mt-3">
                  {formData.tarefas.map((tarefa) => {
                    const isEditing = editingTarefaId === tarefa.id;
                    
                    if (isEditing) {
                      return (
                        <div key={tarefa.id} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                          <Input
                            value={editingTarefaData.descricao}
                            onChange={(e) => setEditingTarefaData(prev => ({ ...prev, descricao: capitalizarPrimeiraLetra(e.target.value) }))}
                            placeholder="Descrição"
                            className="flex-1"
                          />
                          <ResponsavelCombobox
                            value={editingTarefaData.responsavel}
                            onChange={handleEditResponsavelChange}
                            usuarios={usuariosDisponiveis}
                            placeholder="Responsável"
                            className="w-40"
                          />
                          <Input
                            value={editingTarefaData.departamento}
                            readOnly
                            placeholder="Departamento"
                            className="w-32 bg-gray-50"
                            title="Preenchido automaticamente"
                          />
                          <DateInput
                            value={editingTarefaData.prazo}
                            onChange={(value) => setEditingTarefaData(prev => ({ ...prev, prazo: value }))}
                            className="w-36"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveEditTarefa(tarefa.id)}
                            className="text-green-600"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditTarefa}
                          >
                            ✕
                          </Button>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={tarefa.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Checkbox
                          checked={tarefa.concluida}
                          onCheckedChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              tarefas: prev.tarefas.map(t =>
                                t.id === tarefa.id ? { 
                                  ...t, 
                                  concluida: !t.concluida,
                                  dataConclusao: !t.concluida ? new Date().toISOString() : undefined
                                } : t
                              ),
                            }));
                          }}
                        />
                        <div className="flex-1">
                          <span className={`text-sm ${tarefa.concluida ? 'line-through text-gray-400' : ''}`}>
                            {tarefa.descricao}
                          </span>
                          {tarefa.concluida && tarefa.dataConclusao && (
                            <span className="text-xs text-green-600 ml-2">
                              ✓ Concluída em {formatarData(tarefa.dataConclusao.split('T')[0])}
                            </span>
                          )}
                        </div>
                        {tarefa.responsavel && <span className="text-xs text-gray-500">({tarefa.responsavel})</span>}
                        {tarefa.prazo && <span className="text-xs text-gray-500">{formatarData(tarefa.prazo)}</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditTarefa(tarefa)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTarefa(tarefa.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 mt-3">
                  <Input
                    placeholder="Descrição da tarefa"
                    value={novaTarefa.descricao}
                    onChange={(e) => setNovaTarefa(prev => ({ ...prev, descricao: capitalizarPrimeiraLetra(e.target.value) }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <ResponsavelCombobox
                      value={novaTarefa.responsavel}
                      onChange={handleResponsavelChange}
                      usuarios={usuariosDisponiveis}
                      placeholder="Responsável"
                      className="w-full"
                    />
                    <Input
                      placeholder="Departamento"
                      value={novaTarefa.departamento}
                      readOnly
                      className="bg-gray-50"
                      title="Preenchido automaticamente ao selecionar responsável"
                    />
                    <DateInput
                      value={novaTarefa.prazo}
                      onChange={(value) => setNovaTarefa(prev => ({ ...prev, prazo: value }))}
                      placeholder="dd/mm/aa"
                    />
                  </div>
                </div>
                <Button onClick={addTarefa} variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Tarefa
                </Button>
              </div>

              {/* Acompanhamentos */}
              {editingPlano && (
                <div className="border-t pt-4">
                  <Label className="text-base" style={{ fontWeight: 600 }}>Acompanhamentos</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Adicione atualizações sobre o progresso do plano de ação
                  </p>
                  
                  {/* Lista de Acompanhamentos */}
                  <div className="space-y-2 mt-3 max-h-60 overflow-y-auto">
                    {formData.acompanhamentos && formData.acompanhamentos.length > 0 ? (
                      formData.acompanhamentos
                        .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
                        .map((acomp) => (
                          <div key={acomp.id} className="p-3 bg-blue-50 border border-blue-100 rounded">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{acomp.descricao}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {acomp.responsavel}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {formatarDataHoraCompleta(acomp.dataHora)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-gray-400 italic py-3">Nenhum acompanhamento registrado ainda</p>
                    )}
                  </div>

                  {/* Adicionar Novo Acompanhamento */}
                  <div className="space-y-2 mt-3">
                    <Textarea
                      placeholder="Descreva a atualização..."
                      value={novoAcompanhamento.descricao}
                      onChange={(e) => setNovoAcompanhamento(prev => ({ ...prev, descricao: capitalizarPrimeiraLetra(e.target.value) }))}
                      rows={2}
                    />
                    <ResponsavelCombobox
                      value={novoAcompanhamento.responsavel}
                      onChange={handleAcompanhamentoResponsavelChange}
                      usuarios={usuariosDisponiveis}
                      placeholder="Responsável pelo acompanhamento"
                      className="w-full"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      if (!novoAcompanhamento.descricao.trim() || !novoAcompanhamento.responsavel.trim()) {
                        toast.error('Preencha a descrição e o responsável.');
                        return;
                      }

                      const newAcompanhamento = {
                        id: generateId(),
                        descricao: novoAcompanhamento.descricao,
                        responsavel: novoAcompanhamento.responsavel,
                        dataHora: new Date().toISOString(),
                      };

                      setFormData(prev => ({
                        ...prev,
                        acompanhamentos: [...prev.acompanhamentos, newAcompanhamento],
                      }));

                      setNovoAcompanhamento({ ...EMPTY_ACOMPANHAMENTO });
                      toast.success('Acompanhamento adicionado!');
                    }}
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                  >
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    Adicionar Acompanhamento
                  </Button>
                </div>
              )}

              {/* Vínculos - Mostrar apenas no modo edição */}
              {editingPlano && (() => {
                const swotVinculados = dados.swotItems.filter(item => item.planoAcaoVinculado === editingPlano.numeroPE);
                const objetivosVinculados = dados.direcionamento.objetivosBsc.filter(obj => obj.planoAcaoVinculado === editingPlano.numeroPE);
                
                if (swotVinculados.length === 0 && objetivosVinculados.length === 0) {
                  return null;
                }

                return (
                  <div className="border-t pt-4">
                    <Label className="text-base" style={{ fontWeight: 600 }}>Vínculos</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Itens vinculados a este plano de ação
                    </p>
                    
                    <div className="mt-3 space-y-3">
                      {/* Itens SWOT */}
                      {swotVinculados.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-2">Análise SWOT:</p>
                          <div className="flex flex-wrap gap-2">
                            {swotVinculados.map(item => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setSelectedSwotItem(item);
                                  setIsSwotDialogOpen(true);
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                              >
                                {item.numeroSwot}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Objetivos Estratégicos */}
                      {objetivosVinculados.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-2">Objetivos Estratégicos:</p>
                          <div className="flex flex-wrap gap-2">
                            {objetivosVinculados.map(obj => (
                              <button
                                key={obj.id}
                                onClick={() => {
                                  setSelectedObjetivo(obj);
                                  setIsObjetivoDialogOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer"
                              >
                                <Target className="w-3 h-3" />
                                {obj.numeroObjetivo}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <Button onClick={handleSubmit} className="w-full">
                {editingPlano ? 'Atualizar' : 'Criar'} Plano de Ação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {dados.planosAcao.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              Nenhum plano de ação criado ainda.<br />
              Clique no botão acima para criar o primeiro plano.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de Resumo - CLICÁVEIS */}
          <div className="grid grid-cols-5 gap-4">
            <MetricCard
              label="Total PEs"
              value={dados.planosAcao.length}
              icon={ClipboardList}
              variant="default"
              onClick={() => setFiltroStatus('todos')}
              active={filtroStatus === 'todos'}
            />
            <MetricCard
              label="Em Andamento"
              value={dados.planosAcao.filter(p => p.statusAcompanhamento === 'em-andamento').length}
              icon={Clock}
              variant="info"
              onClick={() => setFiltroStatus('em-andamento')}
              active={filtroStatus === 'em-andamento'}
              trendLabel={`${dados.planosAcao.length > 0 ? Math.round((dados.planosAcao.filter(p => p.statusAcompanhamento === 'em-andamento').length / dados.planosAcao.length) * 100) : 0}% do total`}
              trend="neutral"
            />
            <MetricCard
              label="Concluídos"
              value={dados.planosAcao.filter(p => p.statusAcompanhamento === 'concluido').length}
              icon={CheckCircle2}
              variant="success"
              onClick={() => setFiltroStatus('concluido')}
              active={filtroStatus === 'concluido'}
              trendLabel={`${dados.planosAcao.length > 0 ? Math.round((dados.planosAcao.filter(p => p.statusAcompanhamento === 'concluido').length / dados.planosAcao.length) * 100) : 0}% do total`}
              trend="neutral"
            />
            <MetricCard
              label="Atrasados"
              value={dados.planosAcao.filter(p => p.statusAcompanhamento === 'atrasado').length}
              icon={AlertCircle}
              variant="danger"
              onClick={() => setFiltroStatus('atrasado')}
              active={filtroStatus === 'atrasado'}
              trendLabel={`${dados.planosAcao.length > 0 ? Math.round((dados.planosAcao.filter(p => p.statusAcompanhamento === 'atrasado').length / dados.planosAcao.length) * 100) : 0}% do total`}
              trend="neutral"
            />
            <MetricCard
              label="Investimento Total"
              value={formatarMoeda(dados.planosAcao.reduce((total, p) => total + (p.investimento || 0), 0))}
              icon={DollarSign}
              variant="success"
            />
          </div>

          {/* Cards de Prazos de Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Vencem em 30 dias"
              value={vencem30dias}
              icon={Clock}
              variant="warning"
              onClick={() => setFiltroStatus('vencem-30dias')}
              active={filtroStatus === 'vencem-30dias'}
            />
            <MetricCard
              label="Vencem em 60 dias"
              value={vencem60dias}
              icon={Clock}
              variant="warning"
              onClick={() => setFiltroStatus('vencem-60dias')}
              active={filtroStatus === 'vencem-60dias'}
            />
          </div>

          {/* Banner de Filtros Ativos */}
          {temFiltrosAtivos && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Filtros ativos:</span>
                  {filtroStatus !== 'todos' && (
                    <Badge className="bg-white text-gray-700 border border-gray-300">
                      Status: {
                        filtroStatus === 'nao-iniciado' ? 'Não Iniciado' :
                        filtroStatus === 'em-andamento' ? 'Em Andamento' :
                        filtroStatus === 'concluido' ? 'Concluído' :
                        filtroStatus === 'atrasado' ? 'Atrasado' :
                        filtroStatus === 'vencem-30dias' ? 'Vencem em 30 dias' :
                        filtroStatus === 'vencem-60dias' ? 'Vencem em 60 dias' :
                        ''
                      }
                    </Badge>
                  )}
                  {busca && (
                    <Badge className="bg-white text-gray-700 border border-gray-300">
                      Busca: "{busca}"
                    </Badge>
                  )}
                  <span className="text-sm text-gray-600">
                    ({planosComFiltros.length} {planosComFiltros.length === 1 ? 'plano' : 'planos'} encontrado{planosComFiltros.length !== 1 && 's'})
                  </span>
                </div>
                <Button
                  onClick={limparFiltros}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}

          {/* Busca e Indicadores Gerais */}
          <div className="grid grid-cols-3 gap-4">
            {/* Campo de Busca */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por PE, ação, origem ou status..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-12"
                />
              </div>
            </div>

            {/* Indicador de Prazo Geral */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-0 h-12 flex items-center px-4">
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="text-sm text-gray-700 whitespace-nowrap" style={{ fontWeight: 500 }}>Prazo</span>
                  <div className="flex-1 flex items-center">
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all ${
                          prazoGeral > 100 ? 'bg-red-500' : 
                          prazoGeral > 80 ? 'bg-orange-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(prazoGeral, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 whitespace-nowrap" style={{ fontWeight: 700 }}>{prazoGeral}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Indicador de Progresso Geral */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-0 h-12 flex items-center px-4">
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="text-sm text-gray-700 whitespace-nowrap" style={{ fontWeight: 500 }}>Progresso</span>
                  <div className="flex-1 flex items-center">
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${progressoGeral}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 whitespace-nowrap" style={{ fontWeight: 700 }}>{progressoGeral}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista Compacta de Planos */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60">
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>PE</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Ação</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Origem</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Prazo</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Progresso</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                      <th className="px-4 py-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {planosComFiltros.map((plano) => {
                      const progresso = calcularProgresso(plano);
                      const statusConfig = STATUS_CONFIG[plano.statusAcompanhamento];
                      const origemColor = ORIGEM_PE_COLORS[plano.origemTipo];
                      const tarefasConcluidas = plano.tarefas.filter(t => t.concluida).length;
                      const totalTarefas = plano.tarefas.length;
                      
                      // Buscar itens SWOT vinculados a este PE
                      const swotVinculados = dados.swotItems.filter(item => item.planoAcaoVinculado === plano.numeroPE);
                      
                      // Buscar objetivos vinculados a este PE
                      const objetivosVinculados = dados.direcionamento.objetivosBsc.filter(obj => obj.planoAcaoVinculado === plano.numeroPE);

                      const progressoPrazo = calcularProgressoPrazo(plano.dataInicio, plano.prazoFinal);

                      return (
                        <tr key={plano.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-blue-600">{plano.numeroPE}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-md">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">{plano.acao}</p>
                              {(swotVinculados.length > 0 || objetivosVinculados.length > 0) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {swotVinculados.map(swot => (
                                    <button
                                      key={swot.id}
                                      onClick={() => {
                                        setSelectedSwotItem(swot);
                                        setIsSwotDialogOpen(true);
                                      }}
                                      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                                    >
                                      {swot.numeroSwot}
                                    </button>
                                  ))}
                                  {objetivosVinculados.map(obj => (
                                    <button
                                      key={obj.id}
                                      onClick={() => {
                                        setSelectedObjetivo(obj);
                                        setIsObjetivoDialogOpen(true);
                                      }}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer"
                                    >
                                      <Target className="w-2.5 h-2.5" />
                                      {obj.numeroObjetivo}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={origemColor} variant="secondary">
                              {plano.origemTipo}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[140px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      progressoPrazo > 100 ? 'bg-red-500' : 
                                      progressoPrazo > 80 ? 'bg-orange-500' : 
                                      'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.max(progressoPrazo, 2)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-600">{progressoPrazo}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>{plano.prazoFinal ? formatarData(plano.prazoFinal) : '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[140px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${progresso}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-600">{Math.round(progresso)}%</span>
                              </div>
                              {totalTarefas > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <ListChecks className="w-3 h-3 text-gray-400" />
                                  <span>{tarefasConcluidas}/{totalTarefas}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={statusConfig.color} variant="secondary">
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(plano)}
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(plano)}
                                className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(plano.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog de Visualização do PE */}
      <PEViewDialog
        plano={viewingPlano}
        open={isPEViewOpen}
        onOpenChange={setIsPEViewOpen}
      />

      {/* Dialog de Detalhes do PAE */}
      <PAEDetailsDialog 
        open={isPAEDetailsOpen} 
        onOpenChange={setIsPAEDetailsOpen} 
        pae={viewingPlano} 
      />

      {/* Dialogs de Detalhes dos Vínculos */}
      <SwotItemDetailsDialog
        open={isSwotDialogOpen}
        onOpenChange={setIsSwotDialogOpen}
        item={selectedSwotItem}
      />

      <ObjetivoBscDetailsDialog
        open={isObjetivoDialogOpen}
        onOpenChange={setIsObjetivoDialogOpen}
        objetivo={selectedObjetivo}
      />
    </div>
  );
}