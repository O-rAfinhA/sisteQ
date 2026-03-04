import { useState, useEffect } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { useSearchParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Trash2, Edit, CheckCircle2, DollarSign, ClipboardList, Clock, AlertCircle, MessageSquarePlus, Search, X, FileCheck, Eye } from 'lucide-react';
import { PlanoAcoes as PlanoAcoesType, TarefaAcao, OrigemPA } from '../types/strategic';
import { toast } from 'sonner';
import { formatarData, formatarMoeda, moedaParaNumero, capitalizarNome, capitalizarPrimeiraLetra, formatarDataHoraCompleta, formatarNumero, dataHojeISO } from '../utils/formatters';
import { DateInput } from '../components/ui/date-input';
import { getUsuariosNomes, getDepartamentoPorUsuario } from '../types/config';
import { ResponsavelCombobox } from '../components/ResponsavelCombobox';
import { MetricCard } from '../components/ui/metric-card';
import { ROUTES } from '../config/routes';
import { safeDecodeURIComponent } from '../components/kpi/SafeDecodeURI';
import { useKPI } from '../hooks/useKPI';
import { calcularProgressoTarefas, calcularProgressoPrazo, calcularMediasPlanos, contarVencimentos, temTarefaAtrasada, validarPrazosTarefas, EMPTY_TAREFA, EMPTY_ACOMPANHAMENTO } from '../utils/plano-helpers';
import { generateId, getFromStorage } from '../utils/helpers';

type FiltroStatus = 'todos' | 'nao-iniciado' | 'em-andamento' | 'concluido' | 'atrasado' | 'vencem-30dias' | 'vencem-60dias';

const STATUS_CONFIG = {
  'nao-iniciado': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700', progress: 0 },
  'em-andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', progress: 50 },
  'em-avaliacao-eficacia': { label: 'Avaliação de Eficácia', color: 'bg-purple-100 text-purple-700', progress: 75 },
  'concluido': { label: 'Concluído', color: 'bg-green-100 text-green-700', progress: 100 },
  'atrasado': { label: 'Atrasado', color: 'bg-red-100 text-red-700', progress: 25 },
};

const ORIGEM_PA_OPTIONS: OrigemPA[] = [
  'NC Interna',
  'Falha de processo',
  'Produto/serviço NC',
  'Auditoria Interna',
  'Auditoria Externa',
  'Cliente',
  'Reclamação de Cliente',
  'Indicador de desempenho',
  'Fornecedor',
  'Meio Ambiente',
  'Segurança e Saúde',
  'Risco',
  'Outros',
];

const ORIGEM_PA_COLORS: Record<OrigemPA, string> = {
  'NC Interna': 'bg-red-100 text-red-700',
  'Falha de processo': 'bg-orange-100 text-orange-700',
  'Produto/serviço NC': 'bg-pink-100 text-pink-700',
  'Auditoria Interna': 'bg-purple-100 text-purple-700',
  'Auditoria Externa': 'bg-indigo-100 text-indigo-700',
  'Cliente': 'bg-blue-100 text-blue-700',
  'Reclamação de Cliente': 'bg-cyan-100 text-cyan-700',
  'Indicador de desempenho': 'bg-teal-100 text-teal-700',
  'Fornecedor': 'bg-green-100 text-green-700',
  'Meio Ambiente': 'bg-lime-100 text-lime-700',
  'Segurança e Saúde': 'bg-yellow-100 text-yellow-700',
  'Risco': 'bg-amber-100 text-amber-700',
  'Outros': 'bg-gray-100 text-gray-700',
};

import { PlanoAcaoDetailsDialog } from '../components/PlanoAcaoDetailsDialog';

export default function PlanoAcaoCorretiva() {
  const { dados, addPlanoAcoes, updatePlanoAcoes, deletePlanoAcoes } = useStrategic();
  const { updateIndicador } = useKPI();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoAcoesType | null>(null);
  const [viewingPlano, setViewingPlano] = useState<PlanoAcoesType | null>(null);
  const [identificadoNovoRisco, setIdentificadoNovoRisco] = useState(false);
  const [formData, setFormData] = useState<{
    origem: OrigemPA;
    indicadorId?: string;
    indicadorMes?: number;
    indicadorAno?: number;
    descricaoNaoConformidade: string;
    acaoImediata: string;
    causaRaiz: string;
    tarefas: TarefaAcao[];
    investimento: number;
    dataInicio: string;
    prazoFinal: string;
    statusAcompanhamento: PlanoAcoesType['statusAcompanhamento'];
    acompanhamentos: PlanoAcoesType['acompanhamentos'];
    acaoImplantada: boolean;
    dataImplantacao?: string;
    dataVerificacaoEficacia?: string;
    eficaz?: boolean;
    evidenciaEficacia?: string;
  }>({
    origem: 'Outros',
    indicadorId: undefined,
    indicadorMes: undefined,
    indicadorAno: undefined,
    descricaoNaoConformidade: '',
    acaoImediata: '',
    causaRaiz: '',
    tarefas: [],
    investimento: 0,
    dataInicio: dataHojeISO(),
    prazoFinal: '',
    statusAcompanhamento: 'nao-iniciado',
    acompanhamentos: [],
    acaoImplantada: false,
    dataImplantacao: undefined,
    dataVerificacaoEficacia: undefined,
    eficaz: undefined,
    evidenciaEficacia: undefined,
  });

  const [novaTarefa, setNovaTarefa] = useState({ ...EMPTY_TAREFA });
  const [novoAcompanhamento, setNovoAcompanhamento] = useState({ ...EMPTY_ACOMPANHAMENTO });
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingTarefaId, setEditingTarefaId] = useState<string | null>(null);
  const [editingTarefaData, setEditingTarefaData] = useState({ ...EMPTY_TAREFA });
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<string[]>([]);
  const [investimentoInput, setInvestimentoInput] = useState('R$ 0,00');

  useEffect(() => {
    setUsuariosDisponiveis(getUsuariosNomes());
  }, []);

  useEffect(() => {
    const editPlanoId = searchParams.get('editPlanoId');
    const editPlanoNumero = searchParams.get('editPlanoNumero');
    
    if (editPlanoId) {
      const plano = dados.planosAcoes?.find(p => p.id === editPlanoId);
      if (plano) {
        handleEdit(plano);
        setSearchParams({});
      }
    } else if (editPlanoNumero) {
      const plano = dados.planosAcoes?.find(p => p.numeroPE === editPlanoNumero);
      if (plano) {
        handleEdit(plano);
        setSearchParams({});
      }
    }
  }, [searchParams, dados.planosAcoes, setSearchParams]);

  // Processar abertura de PA a partir de Indicador
  useEffect(() => {
    const origem = searchParams.get('origem');
    const indicadorId = searchParams.get('indicadorId');
    const indicadorNome = searchParams.get('indicadorNome');
    const resultadoAtual = searchParams.get('resultadoAtual');
    const meta = searchParams.get('meta');
    const unidadeMedida = searchParams.get('unidadeMedida');
    const mes = searchParams.get('mes');
    const ano = searchParams.get('ano');
    
    if (origem === 'indicador' && indicadorId && indicadorNome) {
      // Formatar a descrição com resultado e meta (usando decodificação segura)
      const nomeIndicador = safeDecodeURIComponent(indicadorNome);
      const resultado = resultadoAtual ? formatarNumero(parseFloat(resultadoAtual)) : '0';
      const metaValor = meta ? formatarNumero(parseFloat(meta)) : '0';
      const unidade = safeDecodeURIComponent(unidadeMedida);
      
      const descricao = `Indicador "${nomeIndicador}" fora da meta estabelecida.\n\nResultado Atingido: ${resultado} ${unidade}\nMeta Estabelecida: ${metaValor} ${unidade}`;
      
      // Abrir o modal com dados pré-preenchidos
      setIsDialogOpen(true);
      setFormData({
        origem: 'Indicador de desempenho',
        indicadorId: indicadorId, // Salvar o ID do indicador
        indicadorMes: mes ? parseInt(mes) : undefined,
        indicadorAno: ano ? parseInt(ano) : undefined,
        descricaoNaoConformidade: descricao,
        acaoImediata: '',
        causaRaiz: '',
        tarefas: [],
        investimento: 0,
        dataInicio: '',
        prazoFinal: '',
        statusAcompanhamento: 'planejamento',
        acompanhamentos: [],
        acaoImplantada: false,
        dataImplantacao: undefined,
        dataVerificacaoEficacia: undefined,
        eficaz: undefined,
        evidenciaEficacia: undefined,
      });
      setInvestimentoInput('R$ 0,00');
      // Limpar os parâmetros da URL
      setSearchParams({});
      toast.success('Plano de Ação vinculado ao indicador. Preencha os campos necessários.');
    }
  }, [searchParams, setSearchParams]);

  // Verificar tarefas atrasadas e atualizar status automaticamente
  useEffect(() => {
    if (formData.tarefas.length === 0) return;
    if (formData.statusAcompanhamento === 'concluido') return; // Não alterar se já está concluído
    if (formData.statusAcompanhamento === 'em-avaliacao-eficacia') return; // Não alterar se está em avaliação
    
    if (temTarefaAtrasada(formData.tarefas) && formData.statusAcompanhamento !== 'atrasado') {
      setFormData(prev => ({
        ...prev,
        statusAcompanhamento: 'atrasado'
      }));
      toast.warning('Status alterado para "Atrasado" - há tarefas com prazo vencido.');
    }
  }, [formData.tarefas, formData.statusAcompanhamento]);

  const handleSubmit = () => {
    if (!formData.descricaoNaoConformidade.trim()) {
      toast.error('Por favor, preencha a descrição da não conformidade.');
      return;
    }

    if (!formData.tarefas.length) {
      toast.error('Por favor, adicione pelo menos uma tarefa.');
      return;
    }

    // Validar prazos das tarefas
    if (!validarPrazosTarefas(formData.tarefas, formData.prazoFinal)) {
      toast.error('Erro: Existem tarefas com prazo superior ao prazo final do PA. Ajuste os prazos antes de salvar.');
      return;
    }

    if (editingPlano) {
      updatePlanoAcoes(editingPlano.id, formData);
      toast.success('Plano de ações atualizado com sucesso!');
    } else {
      const indicadorIdTemp = formData.indicadorId;
      const mesTemp = formData.indicadorMes;
      const anoTemp = formData.indicadorAno;
      addPlanoAcoes(formData);
      
      // Se o PA está vinculado a um indicador, atualizar o indicador após salvar
      if (indicadorIdTemp) {
        // Dar um pequeno delay para garantir que o PA foi salvo
        setTimeout(() => {
          const ultimoPA = dados.planosAcoes[dados.planosAcoes.length - 1];
          if (ultimoPA) {
            // Vincular o PA ao mês/ano específico (se fornecido) ou aos últimos 3 resultados
            vincularPAaoIndicador(indicadorIdTemp, ultimoPA.id, ultimoPA.numeroPE, mesTemp, anoTemp);
            toast.success(`Plano de ações ${ultimoPA.numeroPE} criado e vinculado ao indicador!`);
          } else {
            toast.success('Plano de ações criado com sucesso!');
          }
        }, 100);
      } else {
        toast.success('Plano de ações criado com sucesso!');
      }
    }

    handleDialogClose(false);
  };

  const handleEdit = (plano: PlanoAcoesType) => {
    // Se estiver visualizando, fechar o modal de visualização
    if (isDetailsDialogOpen) {
      setIsDetailsDialogOpen(false);
      setViewingPlano(null);
    }

    setEditingPlano(plano);
    setFormData({
      origem: plano.origem,
      indicadorId: plano.indicadorId,
      descricaoNaoConformidade: plano.descricaoNaoConformidade,
      acaoImediata: plano.acaoImediata,
      causaRaiz: plano.causaRaiz,
      tarefas: plano.tarefas,
      investimento: plano.investimento,
      dataInicio: plano.dataInicio,
      prazoFinal: plano.prazoFinal,
      statusAcompanhamento: plano.statusAcompanhamento,
      acompanhamentos: plano.acompanhamentos,
      acaoImplantada: plano.acaoImplantada ?? false,
      dataImplantacao: plano.dataImplantacao,
      dataVerificacaoEficacia: plano.dataVerificacaoEficacia,
      eficaz: plano.eficaz,
      evidenciaEficacia: plano.evidenciaEficacia,
    });
    setInvestimentoInput(formatarMoeda(plano.investimento));
    setIsDialogOpen(true);
  };

  const handleView = (plano: PlanoAcoesType) => {
    setViewingPlano(plano);
    setIsDetailsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano de ações?')) {
      deletePlanoAcoes(id);
      toast.success('Plano de ações excluído com sucesso!');
    }
  };

  const vincularPAaoIndicador = (indicadorId: string, planoAcaoId: string, planoAcaoNumero: string, mes?: number, ano?: number) => {
    // Buscar o indicador no localStorage
    const indicadores = getFromStorage<any[]>('sisteq_kpi_indicadores', []);
    if (indicadores.length === 0) return;
    const indicador = indicadores.find((ind: any) => ind.id === indicadorId);
    
    if (!indicador) return;
    
    // Vincular o PA ao mês/ano específico se fornecido, ou aos últimos 3 resultados
    const historicoAtualizado = indicador.historicoResultados.map((resultado: any) => {
      if (mes !== undefined && ano !== undefined) {
        // Vincular apenas ao mês/ano específico
        if (resultado.mes === mes && resultado.ano === ano) {
          return {
            ...resultado,
            planoAcaoId,
            planoAcaoNumero,
          };
        }
      } else {
        // Comportamento antigo: vincular aos últimos 3 meses
        const historico = [...(indicador.historicoResultados || [])].sort((a, b) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          return b.mes - a.mes;
        });
        const ultimosTresMeses = historico.slice(0, 3);
        const temNosTres = ultimosTresMeses.some(
          (m: any) => m.mes === resultado.mes && m.ano === resultado.ano
        );
        
        if (temNosTres) {
          return {
            ...resultado,
            planoAcaoId,
            planoAcaoNumero,
          };
        }
      }
      
      return resultado;
    });
    
    // Atualizar o indicador
    const indicadoresAtualizados = indicadores.map((ind: any) =>
      ind.id === indicadorId
        ? { ...ind, historicoResultados: historicoAtualizado }
        : ind
    );
    
    localStorage.setItem('sisteq_kpi_indicadores', JSON.stringify(indicadoresAtualizados));
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingPlano(null);
      setFormData({
        origem: 'Outros',
        indicadorId: undefined,
        indicadorMes: undefined,
        indicadorAno: undefined,
        descricaoNaoConformidade: '',
        acaoImediata: '',
        causaRaiz: '',
        tarefas: [],
        investimento: 0,
        dataInicio: dataHojeISO(),
        prazoFinal: '',
        statusAcompanhamento: 'nao-iniciado',
        acompanhamentos: [],
        acaoImplantada: false,
        dataImplantacao: undefined,
        dataVerificacaoEficacia: undefined,
        eficaz: undefined,
        evidenciaEficacia: undefined,
      });
      setInvestimentoInput('R$ 0,00');
      setNovaTarefa({ ...EMPTY_TAREFA });
      setNovoAcompanhamento({ ...EMPTY_ACOMPANHAMENTO });
      setEditingTarefaId(null);
      setEditingTarefaData({ ...EMPTY_TAREFA });
      setIdentificadoNovoRisco(false);
    }
    setIsDialogOpen(open);
  };

  const handleInvestimentoChange = (valor: string) => {
    setInvestimentoInput(valor);
    const numero = moedaParaNumero(valor);
    setFormData(prev => ({ ...prev, investimento: numero }));
  };

  const handleResponsavelChange = (nomeResponsavel: string) => {
    const departamento = getDepartamentoPorUsuario(nomeResponsavel);
    setNovaTarefa(prev => ({ 
      ...prev, 
      responsavel: nomeResponsavel,
      departamento: departamento
    }));
  };

  const handleEditResponsavelChange = (nomeResponsavel: string) => {
    const departamento = getDepartamentoPorUsuario(nomeResponsavel);
    setEditingTarefaData(prev => ({ 
      ...prev, 
      responsavel: nomeResponsavel,
      departamento: departamento
    }));
  };

  const handleAcompanhamentoResponsavelChange = (nomeResponsavel: string) => {
    setNovoAcompanhamento(prev => ({ ...prev, responsavel: nomeResponsavel }));
  };

  const handleAcaoImplantadaChange = (checked: boolean) => {
    const dataVerificacao = new Date();
    dataVerificacao.setDate(dataVerificacao.getDate() + 30);
    const dataVerificacaoStr = dataVerificacao.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      acaoImplantada: checked,
      dataImplantacao: checked ? dataHojeISO() : undefined,
      dataVerificacaoEficacia: checked ? dataVerificacaoStr : undefined,
      statusAcompanhamento: checked ? 'em-avaliacao-eficacia' : prev.statusAcompanhamento,
      eficaz: undefined,
      evidenciaEficacia: undefined,
    }));

    if (checked) {
      toast.info('Status alterado para "Avaliação de Eficácia"');
    }
  };

  const handleEficazChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      eficaz: value === 'sim' ? true : value === 'nao' ? false : undefined,
      statusAcompanhamento: value === 'sim' ? 'concluido' : prev.statusAcompanhamento,
      evidenciaEficacia: undefined
    }));

    if (value === 'sim') {
      toast.success('Status alterado para "Concluído" - ação foi eficaz!');
    }
  };

  const addTarefa = () => {
    if (!novaTarefa.descricao.trim()) {
      toast.error('Por favor, preencha a descrição da tarefa.');
      return;
    }

    if (!novaTarefa.responsavel.trim()) {
      toast.error('Por favor, selecione um responsável.');
      return;
    }

    if (!novaTarefa.prazo) {
      toast.error('Por favor, defina o prazo da tarefa.');
      return;
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
    toast.success('Tarefa adicionada!');
  };

  const removeTarefa = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tarefas: prev.tarefas.filter(t => t.id !== id),
    }));
    toast.success('Tarefa removida!');
  };

  const toggleTarefaConcluida = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tarefas: prev.tarefas.map(t =>
        t.id === id
          ? { ...t, concluida: !t.concluida, dataConclusao: !t.concluida ? new Date().toISOString() : undefined }
          : t
      ),
    }));
  };

  const startEditingTarefa = (tarefa: TarefaAcao) => {
    setEditingTarefaId(tarefa.id);
    setEditingTarefaData({
      descricao: tarefa.descricao,
      responsavel: tarefa.responsavel,
      departamento: tarefa.departamento || '',
      prazo: tarefa.prazo,
    });
  };

  const saveEditingTarefa = () => {
    if (!editingTarefaData.descricao.trim()) {
      toast.error('A descrição da tarefa não pode estar vazia.');
      return;
    }

    if (!editingTarefaData.responsavel.trim()) {
      toast.error('Por favor, selecione um responsável.');
      return;
    }

    if (!editingTarefaData.prazo) {
      toast.error('Por favor, defina o prazo da tarefa.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      tarefas: prev.tarefas.map(t =>
        t.id === editingTarefaId
          ? { ...t, ...editingTarefaData }
          : t
      ),
    }));

    setEditingTarefaId(null);
    setEditingTarefaData({ ...EMPTY_TAREFA });
    toast.success('Tarefa atualizada!');
  };

  const cancelEditingTarefa = () => {
    setEditingTarefaId(null);
    setEditingTarefaData({ ...EMPTY_TAREFA });
  };

  const addAcompanhamento = () => {
    if (!novoAcompanhamento.descricao.trim()) {
      toast.error('Por favor, preencha a descrição do acompanhamento.');
      return;
    }

    if (!novoAcompanhamento.responsavel.trim()) {
      toast.error('Por favor, selecione um responsável.');
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
  };

  const removeAcompanhamento = (id: string) => {
    setFormData(prev => ({
      ...prev,
      acompanhamentos: prev.acompanhamentos.filter(a => a.id !== id),
    }));
    toast.success('Acompanhamento removido!');
  };

  // Filtros
  const planosAcoes = dados.planosAcoes || [];
  
  const planosComFiltros = planosAcoes.filter(plano => {
    // Filtro de busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      const matchNumero = plano.numeroPE?.toLowerCase().includes(buscaLower);
      const matchDescricao = plano.descricaoNaoConformidade?.toLowerCase().includes(buscaLower);
      const matchOrigem = plano.origem?.toLowerCase().includes(buscaLower);
      
      if (!matchNumero && !matchDescricao && !matchOrigem) {
        return false;
      }
    }

    // Filtro de status
    if (filtroStatus === 'todos') return true;
    
    if (filtroStatus === 'vencem-30dias' || filtroStatus === 'vencem-60dias') {
      const hoje = new Date();
      const prazoFinal = new Date(plano.prazoFinal);
      const diffTime = prazoFinal.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (filtroStatus === 'vencem-30dias') {
        return diffDays > 0 && diffDays <= 30;
      } else {
        return diffDays > 30 && diffDays <= 60;
      }
    }
    
    return plano.statusAcompanhamento === filtroStatus;
  });

  // Calcular dados para estatísticas (usando helpers centralizados)
  const vencem30dias = contarVencimentos(planosAcoes, 0, 30);
  const vencem60dias = contarVencimentos(planosAcoes, 30, 60);
  const { progressoGeral, prazoGeral } = calcularMediasPlanos(planosAcoes);

  const temFiltrosAtivos = filtroStatus !== 'todos' || busca !== '';
  
  const limparFiltros = () => {
    setFiltroStatus('todos');
    setBusca('');
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Plano de Ações (PA)</h1>
          <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie os planos de ações vinculados a não conformidades e melhorias.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Plano de Ações
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlano ? 'Editar Plano de Ações' : 'Novo Plano de Ações'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do plano de ações corretivas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Origem */}
              <div>
                <Label>Origem</Label>
                <Select
                  value={formData.origem}
                  onValueChange={(value: OrigemPA) => setFormData(prev => ({ ...prev, origem: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGEM_PA_OPTIONS.map(origem => (
                      <SelectItem key={origem} value={origem}>
                        {origem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição da Não Conformidade */}
              <div>
                <Label>Descrição da Não Conformidade *</Label>
                <Textarea
                  className="mt-2"
                  value={formData.descricaoNaoConformidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricaoNaoConformidade: capitalizarPrimeiraLetra(e.target.value) }))}
                  placeholder="Descreva a não conformidade identificada..."
                  rows={3}
                />
              </div>

              {/* Ação Imediata */}
              <div>
                <Label>Ação Imediata</Label>
                <Textarea
                  className="mt-2"
                  value={formData.acaoImediata}
                  onChange={(e) => setFormData(prev => ({ ...prev, acaoImediata: capitalizarPrimeiraLetra(e.target.value) }))}
                  placeholder="Descreva a ação imediata tomada..."
                  rows={3}
                />
              </div>

              {/* Causa Raiz */}
              <div>
                <Label>Causa Raiz</Label>
                <Textarea
                  className="mt-2"
                  value={formData.causaRaiz}
                  onChange={(e) => setFormData(prev => ({ ...prev, causaRaiz: capitalizarPrimeiraLetra(e.target.value) }))}
                  placeholder="Identifique a causa raiz do problema..."
                  rows={3}
                />
              </div>

              {/* Datas e Investimento */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <DateInput
                    value={formData.dataInicio}
                    onChange={(value) => setFormData(prev => ({ ...prev, dataInicio: value }))}
                  />
                </div>
                <div>
                  <Label>Prazo Final</Label>
                  <DateInput
                    value={formData.prazoFinal}
                    onChange={(value) => setFormData(prev => ({ ...prev, prazoFinal: value }))}
                  />
                </div>
                <div>
                  <Label>Investimento</Label>
                  <Input
                    value={investimentoInput}
                    onChange={(e) => handleInvestimentoChange(e.target.value)}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.statusAcompanhamento}
                  onValueChange={(value: PlanoAcoesType['statusAcompanhamento']) =>
                    setFormData(prev => ({ ...prev, statusAcompanhamento: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
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

              {/* Nova seção: Identificado novo risco */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="novo-risco-plano"
                    checked={identificadoNovoRisco}
                    onCheckedChange={(checked) => setIdentificadoNovoRisco(checked === true)}
                  />
                  <label
                    htmlFor="novo-risco-plano"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Identificado novo risco?
                  </label>
                </div>

                {identificadoNovoRisco && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-900 font-medium">
                          Novo risco identificado
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          Você pode cadastrar este risco no módulo de Gestão de Riscos.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-300 hover:bg-amber-100 text-amber-900"
                      onClick={() => {
                        setIsDialogOpen(false);
                        navigate(`${ROUTES.GESTAO_RISCOS.REGISTRO}?novoRisco=true`);
                      }}
                    >
                      Cadastrar Novo Risco
                    </Button>
                  </div>
                )}
              </div>

              {/* Tarefas */}
              <div className="border-t pt-4">
                <Label className="text-base" style={{ fontWeight: 600 }}>Tarefas</Label>
                <div className="space-y-2 mt-3">
                  {formData.tarefas.map((tarefa) => {
                    const isEditing = editingTarefaId === tarefa.id;
                    
                    if (isEditing) {
                      return (
                        <div key={tarefa.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Input
                            value={editingTarefaData.descricao}
                            onChange={(e) => setEditingTarefaData(prev => ({ ...prev, descricao: capitalizarPrimeiraLetra(e.target.value) }))}
                            placeholder="Descrição da tarefa"
                            className="flex-1"
                          />
                          <ResponsavelCombobox
                            value={editingTarefaData.responsavel}
                            onChange={handleEditResponsavelChange}
                            usuarios={usuariosDisponiveis}
                            placeholder="Responsável"
                            className="w-40"
                          />
                          <DateInput
                            value={editingTarefaData.prazo}
                            onChange={(value) => setEditingTarefaData(prev => ({ ...prev, prazo: value }))}
                            className="w-36"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveEditingTarefa()}
                            className="text-green-600"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditingTarefa}
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
                          onCheckedChange={() => toggleTarefaConcluida(tarefa.id)}
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
                          onClick={() => startEditingTarefa(tarefa)}
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

              {/* Ação Implantada */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acaoImplantada"
                    checked={formData.acaoImplantada}
                    onCheckedChange={handleAcaoImplantadaChange}
                  />
                  <Label htmlFor="acaoImplantada" className="text-base cursor-pointer" style={{ fontWeight: 600 }}>
                    Ação Implantada?
                  </Label>
                </div>

                {formData.acaoImplantada && (
                  <div className="mt-4 space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <FileCheck className="w-5 h-5" />
                      <span className="font-medium">
                        Data de Implantação: {formatarData(formData.dataImplantacao || '')}
                      </span>
                    </div>

                    <div>
                      <Label>Data de Verificação da Eficácia *</Label>
                      <DateInput
                        value={formData.dataVerificacaoEficacia || ''}
                        onChange={(value) => setFormData(prev => ({ ...prev, dataVerificacaoEficacia: value }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Pré-preenchida com +30 dias a partir da data de implantação
                      </p>
                    </div>

                    {formData.dataVerificacaoEficacia && (
                      <>
                        <div>
                          <Label>Eficaz? *</Label>
                          <Select
                            value={formData.eficaz === undefined ? '' : formData.eficaz ? 'sim' : 'nao'}
                            onValueChange={handleEficazChange}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sim">Sim</SelectItem>
                              <SelectItem value="nao">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.eficaz !== undefined && (
                          <div>
                            <Label>Evidência da Eficácia *</Label>
                            <Textarea
                              className="mt-2"
                              value={formData.evidenciaEficacia || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, evidenciaEficacia: capitalizarPrimeiraLetra(e.target.value) }))}
                              placeholder="Descreva as evidências que comprovam a eficácia da ação..."
                              rows={3}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Acompanhamentos */}
              {editingPlano && (
                <div className="border-t pt-4">
                  <Label className="text-base" style={{ fontWeight: 600 }}>Acompanhamentos</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Adicione atualizações sobre o progresso do plano de ação
                  </p>
                  
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
                    />
                    <Button onClick={addAcompanhamento} variant="outline" size="sm" className="w-full">
                      <MessageSquarePlus className="w-4 h-4 mr-2" />
                      Adicionar Acompanhamento
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={handleSubmit} className="w-full">
                {editingPlano ? 'Atualizar' : 'Criar'} Plano de Ação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {planosAcoes.length === 0 ? (
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
              label="Total PAs"
              value={planosAcoes.length}
              icon={ClipboardList}
              variant="default"
              onClick={() => setFiltroStatus('todos')}
              active={filtroStatus === 'todos'}
            />
            <MetricCard
              label="Em Andamento"
              value={planosAcoes.filter(p => p.statusAcompanhamento === 'em-andamento').length}
              icon={Clock}
              variant="info"
              onClick={() => setFiltroStatus('em-andamento')}
              active={filtroStatus === 'em-andamento'}
              trendLabel={`${planosAcoes.length > 0 ? Math.round((planosAcoes.filter(p => p.statusAcompanhamento === 'em-andamento').length / planosAcoes.length) * 100) : 0}% do total`}
              trend="neutral"
            />
            <MetricCard
              label="Concluídos"
              value={planosAcoes.filter(p => p.statusAcompanhamento === 'concluido').length}
              icon={CheckCircle2}
              variant="success"
              onClick={() => setFiltroStatus('concluido')}
              active={filtroStatus === 'concluido'}
              trendLabel={`${planosAcoes.length > 0 ? Math.round((planosAcoes.filter(p => p.statusAcompanhamento === 'concluido').length / planosAcoes.length) * 100) : 0}% do total`}
              trend="neutral"
            />
            <MetricCard
              label="Atrasados"
              value={planosAcoes.filter(p => p.statusAcompanhamento === 'atrasado').length}
              icon={AlertCircle}
              variant="danger"
              onClick={() => setFiltroStatus('atrasado')}
              active={filtroStatus === 'atrasado'}
              trendLabel={`${planosAcoes.length > 0 ? Math.round((planosAcoes.filter(p => p.statusAcompanhamento === 'atrasado').length / planosAcoes.length) * 100) : 0}% do total`}
              trend="neutral"
            />
            <MetricCard
              label="Investimento Total"
              value={formatarMoeda(planosAcoes.reduce((total, p) => total + (p.investimento || 0), 0))}
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
                  placeholder="Buscar por PA, ação, origem ou status..."
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
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>PA</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Não Conformidade</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Origem</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Prazo</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Progresso</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                      <th className="px-4 py-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {planosComFiltros.map((plano) => {
                      const progresso = calcularProgressoTarefas(plano.tarefas);
                      const statusConfig = STATUS_CONFIG[plano.statusAcompanhamento] || { label: 'N/A', color: 'bg-gray-100 text-gray-700' };
                      const origemColor = ORIGEM_PA_COLORS[plano.origem] || 'bg-gray-100 text-gray-700';
                      const tarefasConcluidas = plano.tarefas.filter(t => t.concluida).length;
                      const totalTarefas = plano.tarefas.length;
                      const progressoPrazo = calcularProgressoPrazo(plano.dataInicio, plano.prazoFinal);

                      return (
                        <tr key={plano.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-blue-600">{plano.numeroPE}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-md">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">{plano.descricaoNaoConformidade}</p>
                              {plano.acaoImplantada && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <FileCheck className="w-2.5 h-2.5 mr-1" />
                                    Implantada
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={origemColor} variant="secondary">
                              {plano.origem || 'N/A'}
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
                                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{progressoPrazo}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">
                                  📅 {formatarData(plano.prazoFinal)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[140px]">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${Math.max(progresso, 2)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{progresso}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">
                                  {tarefasConcluidas}/{totalTarefas} tarefas
                                </span>
                              </div>
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
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(plano)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(plano.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
      {/* Modal de Detalhes */}
      <PlanoAcaoDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        plano={viewingPlano}
        onEdit={handleEdit}
      />
    </div>
  );
}
