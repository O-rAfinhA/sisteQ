import { useState, useEffect, useMemo } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { useKPI } from '../hooks/useKPI';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { MetricCard } from '../components/ui/metric-card';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  ClipboardCheck,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Users,
  Target,
  ShieldAlert,
  Truck,
  GraduationCap,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  ArrowRight,
  Lightbulb,
  RefreshCcw,
  DollarSign,
  AlertCircle,
  Zap,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { formatarData, formatarDataPtBr, dataHojeISO } from '../utils/formatters';
import { generateId, getFromStorage } from '../utils/helpers';
import { getUsuariosNomes } from '../types/config';
import { ResponsavelCombobox } from '../components/ResponsavelCombobox';
import { calcularClassificacao } from '../utils/risk-helpers';
import { PlanoAcaoSelector } from '../components/PlanoAcaoSelector';
import { PlanoAcaoCorretivaSelector } from '../components/PlanoAcaoCorretivaSelector';

// ═══════════════════════════════════════════════════
// Tipos da RAC (Reunião de Análise Crítica)
// ═══════════════════════════════════════════════════

interface SaidaRAC {
  id: string;
  tipo: 'Melhoria' | 'Mudança no SGQ' | 'Recurso' | 'Decisão' | 'Ação';
  descricao: string;
  responsavel: string;
  prazo: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluída';
  vinculoPE?: string;
  vinculoPA?: string;
}

interface SnapshotRAC {
  kpis: { total: number; dentroMeta: number; atencao: number; foraMeta: number };
  pas: { total: number; abertos: number; concluidos: number; atrasados: number; emEficacia: number; eficazes: number; naoEficazes: number };
  pes: { total: number; abertos: number; concluidos: number; atrasados: number };
  riscos: { total: number; altos: number; medios: number; baixos: number; emTratamento: number };
  fornecedores: { total: number; homologados: number; bloqueados: number; comRestricao: number; notaMedia: number };
  treinamentos: { total: number; concluidos: number; eficazes: number; pendentes: number };
  documentos: { total: number; vigentes: number; emRevisao: number; obsoletos: number; vencidos: number };
}

interface AnaliseCritica {
  id: string;
  numero: string;
  titulo: string;
  classificacao: 'Ordinária' | 'Extraordinária';
  dataReuniao: string;
  local: string;
  horaInicio: string;
  horaFim: string;
  responsavel: string;
  participantes: string[];
  status: 'Rascunho' | 'Em Andamento' | 'Concluída';
  anoReferencia: string;
  periodoInicio: string;
  periodoFim: string;
  conclusao: string;
  entradas: Record<string, string>;
  snapshot: SnapshotRAC;
  saidas: SaidaRAC[];
  dataCriacao: string;
  dataAtualizacao: string;
}

// ═══ Configs locais (por design — padrão do sistema) ═══

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  'Rascunho': { label: 'Rascunho', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: Clock },
  'Em Andamento': { label: 'Em Andamento', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: RefreshCcw },
  'Concluída': { label: 'Concluída', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
};

const TIPO_SAIDA_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'Melhoria': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Mudança no SGQ': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Recurso': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Decisão': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Ação': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const STATUS_SAIDA_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'Pendente': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  'Em Andamento': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'Concluída': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const STORAGE_KEY_PREFIX = 'sisteq-rac-';
const PERIODICIDADE_KEY = 'sisteq-rac-periodicidade';
const TIPOS_SAIDA: SaidaRAC['tipo'][] = ['Melhoria', 'Mudança no SGQ', 'Recurso', 'Decisão', 'Ação'];

const CLASSIFICACAO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  'Ordinária': { label: 'Ordinária', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Extraordinária': { label: 'Extraordinária', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

interface PeriodicidadeConfig {
  tipo: 'Anual' | 'Semestral' | 'Trimestral' | 'Personalizada';
  intervaloMeses: number;
}

const PERIODICIDADE_OPTIONS: { value: PeriodicidadeConfig['tipo']; label: string; meses: number }[] = [
  { value: 'Anual', label: 'Anual (12 meses)', meses: 12 },
  { value: 'Semestral', label: 'Semestral (6 meses)', meses: 6 },
  { value: 'Trimestral', label: 'Trimestral (3 meses)', meses: 3 },
  { value: 'Personalizada', label: 'Personalizada', meses: 0 },
];

function getPeriodicidadeConfig(): PeriodicidadeConfig {
  try {
    const raw = localStorage.getItem(PERIODICIDADE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tipo: 'Anual', intervaloMeses: 12 };
}

function calcularConformidadePeriodica(racs: AnaliseCritica[], config: PeriodicidadeConfig): { status: 'em-dia' | 'atencao' | 'atrasada' | 'sem-dados'; label: string; diasRestantes?: number; proximaData?: string } {
  const concluidas = racs.filter(r => r.status === 'Concluída').sort((a, b) => b.dataReuniao.localeCompare(a.dataReuniao));
  if (concluidas.length === 0) {
    return { status: 'sem-dados', label: 'Nenhuma análise concluída' };
  }
  const ultima = new Date(concluidas[0].dataReuniao);
  const proxima = new Date(ultima);
  proxima.setMonth(proxima.getMonth() + config.intervaloMeses);
  const hoje = new Date();
  const diffMs = proxima.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const proximaStr = proxima.toISOString().split('T')[0];

  if (diffDias < 0) {
    return { status: 'atrasada', label: `Atrasada (${Math.abs(diffDias)} dias)`, diasRestantes: diffDias, proximaData: proximaStr };
  }
  if (diffDias <= 30) {
    return { status: 'atencao', label: `Próxima em ${diffDias} dias`, diasRestantes: diffDias, proximaData: proximaStr };
  }
  return { status: 'em-dia', label: `Em dia — próxima em ${diffDias} dias`, diasRestantes: diffDias, proximaData: proximaStr };
}

// ═══ Seções de entrada (9.3.2) — Configuráveis ═══

interface EntradaConfig {
  key: string;
  label: string;
  hint: string;
  isDefault?: boolean;
}

const ENTRADAS_ICON_MAP: Record<string, typeof FileText> = {
  statusAcoesAnteriores: RefreshCcw,
  mudancasContexto: AlertTriangle,
  desempenhoKPIs: BarChart3,
  satisfacaoCliente: Users,
  naoConformidades: AlertCircle,
  resultadosAuditorias: ClipboardCheck,
  desempenhoFornecedores: Truck,
  adequacaoRecursos: DollarSign,
  eficaciaRiscos: ShieldAlert,
  oportunidadesMelhoria: Lightbulb,
};

const DEFAULT_ENTRADAS: EntradaConfig[] = [
  { key: 'statusAcoesAnteriores', label: 'Status das Ações de RACs Anteriores', hint: 'Acompanhamento de decisões e ações definidas na última análise crítica.', isDefault: true },
  { key: 'mudancasContexto', label: 'Mudanças em Questões Externas e Internas', hint: 'Alterações no contexto organizacional, mercado, legislação, tecnologia ou partes interessadas.', isDefault: true },
  { key: 'desempenhoKPIs', label: 'Desempenho dos Indicadores (KPIs)', hint: 'Resultados dos indicadores de desempenho, tendências e análise de metas atingidas.', isDefault: true },
  { key: 'satisfacaoCliente', label: 'Satisfação do Cliente', hint: 'Resultados de pesquisas, reclamações, devoluções, NPS e percepção do cliente.', isDefault: true },
  { key: 'naoConformidades', label: 'Não Conformidades e Ações Corretivas', hint: 'Análise dos PAs abertos, concluídos, eficácia das ações corretivas e tendências.', isDefault: true },
  { key: 'resultadosAuditorias', label: 'Resultados de Auditorias', hint: 'Constatações de auditorias internas e externas, não conformidades e observações.', isDefault: true },
  { key: 'desempenhoFornecedores', label: 'Desempenho de Fornecedores', hint: 'Avaliações, homologações, ROFs, bloqueios, IQF e tendências de fornecedores.', isDefault: true },
  { key: 'adequacaoRecursos', label: 'Adequação de Recursos', hint: 'Recursos humanos, infraestrutura, ambiente de trabalho, investimentos necessários.', isDefault: true },
  { key: 'eficaciaRiscos', label: 'Eficácia das Ações sobre Riscos e Oportunidades', hint: 'Riscos identificados, planos de tratamento executados, reavaliação dos níveis.', isDefault: true },
  { key: 'oportunidadesMelhoria', label: 'Oportunidades de Melhoria', hint: 'Propostas de melhoria contínua, inovação, otimização de processos.', isDefault: true },
];

const ENTRADAS_CONFIG_KEY = 'sisteq-rac-entradas-config';

function getEntradasConfig(): EntradaConfig[] {
  try {
    const raw = localStorage.getItem(ENTRADAS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_ENTRADAS;
}

function saveEntradasConfig(config: EntradaConfig[]) {
  localStorage.setItem(ENTRADAS_CONFIG_KEY, JSON.stringify(config));
}

function getEntradaIcon(key: string) {
  return ENTRADAS_ICON_MAP[key] || FileText;
}

// ═══════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════

export function AnaliseCritica() {
  const { dados, anoAtual } = useStrategic();
  const { indicadores, calcularStatus } = useKPI();

  // Estado local
  const storageKey = `${STORAGE_KEY_PREFIX}${anoAtual}`;
  const [racs, setRacs] = useState<AnaliseCritica[]>(() => getFromStorage<AnaliseCritica[]>(storageKey, []));
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeConfig>(() => getPeriodicidadeConfig());
  const [showPeriodicidadeConfig, setShowPeriodicidadeConfig] = useState(false);
  const [intervaloCustom, setIntervaloCustom] = useState<number>(periodicidade.intervaloMeses || 12);

  // Dialog / Sheet states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingRAC, setEditingRAC] = useState<AnaliseCritica | null>(null);
  const [viewingRAC, setViewingRAC] = useState<AnaliseCritica | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Entradas config (configurável)
  const [entradasConfig, setEntradasConfig] = useState<EntradaConfig[]>(() => getEntradasConfig());
  const [showEntradasManager, setShowEntradasManager] = useState(false);
  const [novaEntradaLabel, setNovaEntradaLabel] = useState('');
  const [novaEntradaHint, setNovaEntradaHint] = useState('');

  // Form state
  const [formData, setFormData] = useState<Omit<AnaliseCritica, 'id' | 'numero' | 'dataCriacao' | 'dataAtualizacao' | 'snapshot'>>(createEmptyForm());
  const [novoParticipante, setNovoParticipante] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(entradasConfig.map(s => s.key)));

  // Saídas form
  const [novaSaida, setNovaSaida] = useState<Omit<SaidaRAC, 'id'>>({ tipo: 'Ação', descricao: '', responsavel: '', prazo: '', status: 'Pendente', vinculoPE: '', vinculoPA: '' });
  const [editingSaidaId, setEditingSaidaId] = useState<string | null>(null);

  // Salvar no localStorage quando racs mudar
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(racs));
  }, [racs, storageKey]);

  // Recarregar quando mudar o ano
  useEffect(() => {
    const key = `${STORAGE_KEY_PREFIX}${anoAtual}`;
    setRacs(getFromStorage<AnaliseCritica[]>(key, []));
  }, [anoAtual]);

  const usuariosDisponiveis = useMemo(() => getUsuariosNomes(), []);

  function validateRACForm(data: typeof formData) {
    const errors: Partial<Record<'titulo' | 'responsavel' | 'dataReuniao' | 'periodoInicio' | 'periodoFim' | 'intervalo', string>> = {};
    if (!data.titulo.trim()) errors.titulo = 'Informe o título da reunião.';
    if (!data.responsavel.trim()) errors.responsavel = 'Informe o responsável.';
    if (!data.dataReuniao) errors.dataReuniao = 'Informe a data da reunião.';
    if (!data.periodoInicio) errors.periodoInicio = 'Informe a data inicial do intervalo.';
    if (!data.periodoFim) errors.periodoFim = 'Informe a data final do intervalo.';
    if (data.periodoInicio && data.periodoFim && data.periodoFim < data.periodoInicio) {
      errors.intervalo = 'A data final do intervalo deve ser posterior à data inicial.';
    }
    return errors;
  }

  const liveFormErrors = useMemo(() => validateRACForm(formData), [formData]);
  const canSubmitForm = useMemo(() => Object.keys(liveFormErrors).length === 0, [liveFormErrors]);

  // ═══ Snapshot builder: puxa dados de todos os módulos ═══
  function buildSnapshot(): SnapshotRAC {
    // KPIs
    const kpiTotal = indicadores.length;
    let dentroMeta = 0, atencao = 0, foraMeta = 0;
    indicadores.forEach(ind => {
      const st = calcularStatus(ind);
      if (st === 'Dentro da Meta') dentroMeta++;
      else if (st === 'Atenção') atencao++;
      else foraMeta++;
    });

    // PAs (Ações Corretivas)
    const pas = dados.planosAcoes || [];
    const pasAbertos = pas.filter(p => ['nao-iniciado', 'em-andamento'].includes(p.statusAcompanhamento)).length;
    const pasConcluidos = pas.filter(p => p.statusAcompanhamento === 'concluido').length;
    const pasAtrasados = pas.filter(p => p.statusAcompanhamento === 'atrasado').length;
    const pasEmEficacia = pas.filter(p => p.statusAcompanhamento === 'em-avaliacao-eficacia').length;
    const pasEficazes = pas.filter(p => p.eficaz === true).length;
    const pasNaoEficazes = pas.filter(p => p.eficaz === false).length;

    // PEs (Planos Estratégicos)
    const pes = dados.planosAcao || [];
    const pesAbertos = pes.filter(p => ['nao-iniciado', 'em-andamento'].includes(p.statusAcompanhamento)).length;
    const pesConcluidos = pes.filter(p => p.statusAcompanhamento === 'concluido').length;
    const pesAtrasados = pes.filter(p => p.statusAcompanhamento === 'atrasado').length;

    // Riscos
    const riscos = dados.riscos || [];
    let rAlto = 0, rMedio = 0, rBaixo = 0;
    riscos.forEach(r => {
      const { nivel } = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial);
      if (nivel === 'Alto') rAlto++;
      else if (nivel === 'Médio') rMedio++;
      else rBaixo++;
    });
    const emTratamento = riscos.filter(r => r.status === 'Tratar').length;

    // Fornecedores
    const fornecedores = getFromStorage<any[]>('fornecedores', []);
    const fTotal = fornecedores.length;
    const fHomologados = fornecedores.filter((f: any) => f.status === 'Homologado').length;
    const fBloqueados = fornecedores.filter((f: any) => f.status === 'Bloqueado').length;
    const fRestricao = fornecedores.filter((f: any) => f.status === 'Homologado com Restrição').length;
    const avaliacoes = getFromStorage<any[]>('fornecedores_avaliacoes', []);
    const notaMedia = avaliacoes.length > 0
      ? avaliacoes.reduce((sum: number, a: any) => sum + (a.notaFinal || 0), 0) / avaliacoes.length
      : 0;

    // Treinamentos (Plano de Qualificação)
    const treinamentos = getFromStorage<any[]>('sisteq-planos-qualificacao', []);
    const tTotal = treinamentos.length;
    const tConcluidos = treinamentos.filter((t: any) => t.status === 'Concluído').length;
    const tEficazes = treinamentos.filter((t: any) => t.eficaz === true).length;
    const tPendentes = treinamentos.filter((t: any) => ['Agendado', 'Em Andamento'].includes(t.status)).length;

    // Documentos
    const docsInternos = getFromStorage<any[]>('sisteq-docs-internos', []);
    const docsClientes = getFromStorage<any[]>('sisteq-docs-clientes', []);
    const docsExternos = getFromStorage<any[]>('sisteq-docs-externos', []);
    const docsLicencas = getFromStorage<any[]>('sisteq-docs-licencas', []);
    const docsCertidoes = getFromStorage<any[]>('sisteq-docs-certidoes', []);
    const allDocs = [...docsInternos, ...docsClientes, ...docsExternos, ...docsLicencas, ...docsCertidoes];
    const dTotal = allDocs.length;
    const dVigentes = allDocs.filter((d: any) => d.status === 'Vigente').length;
    const dEmRevisao = allDocs.filter((d: any) => ['Em Revisão', 'Em Aprovação'].includes(d.status)).length;
    const dObsoletos = allDocs.filter((d: any) => ['Obsoleto', 'Obsoleta'].includes(d.status)).length;
    // Vencidos: docs com dataValidade < hoje
    const hoje = new Date().toISOString().split('T')[0];
    const dVencidos = allDocs.filter((d: any) => {
      const validade = d.dataValidade || d.dataVencimento;
      return validade && validade < hoje;
    }).length;

    return {
      kpis: { total: kpiTotal, dentroMeta, atencao, foraMeta },
      pas: { total: pas.length, abertos: pasAbertos, concluidos: pasConcluidos, atrasados: pasAtrasados, emEficacia: pasEmEficacia, eficazes: pasEficazes, naoEficazes: pasNaoEficazes },
      pes: { total: pes.length, abertos: pesAbertos, concluidos: pesConcluidos, atrasados: pesAtrasados },
      riscos: { total: riscos.length, altos: rAlto, medios: rMedio, baixos: rBaixo, emTratamento },
      fornecedores: { total: fTotal, homologados: fHomologados, bloqueados: fBloqueados, comRestricao: fRestricao, notaMedia: Math.round(notaMedia * 10) / 10 },
      treinamentos: { total: tTotal, concluidos: tConcluidos, eficazes: tEficazes, pendentes: tPendentes },
      documentos: { total: dTotal, vigentes: dVigentes, emRevisao: dEmRevisao, obsoletos: dObsoletos, vencidos: dVencidos },
    };
  }

  function createEmptyForm(): Omit<AnaliseCritica, 'id' | 'numero' | 'dataCriacao' | 'dataAtualizacao' | 'snapshot'> {
    return {
      titulo: '',
      classificacao: 'Ordinária',
      dataReuniao: dataHojeISO(),
      local: '',
      horaInicio: '',
      horaFim: '',
      responsavel: '',
      participantes: [],
      status: 'Rascunho',
      anoReferencia: anoAtual,
      periodoInicio: `${anoAtual}-01-01`,
      periodoFim: `${anoAtual}-12-31`,
      conclusao: '',
      entradas: Object.fromEntries(entradasConfig.map(e => [e.key, ''])),
      saidas: [],
    };
  }

  function generateNumero(): string {
    const maxNum = racs.reduce((max, r) => {
      const num = parseInt(r.numero.replace('RAC', ''));
      return num > max ? num : max;
    }, 0);
    return `RAC${(maxNum + 1).toString().padStart(3, '0')}`;
  }

  // ═══ CRUD Handlers ═══

  function handleOpenNew() {
    setEditingRAC(null);
    setFormData(createEmptyForm());
    setExpandedSections(new Set(entradasConfig.map(s => s.key)));
    setIsFormOpen(true);
  }

  function handleOpenEdit(rac: AnaliseCritica) {
    setEditingRAC(rac);
    // Mescla entradas existentes com config atual (garante que novas entradas apareçam)
    const entradasMerged: Record<string, string> = Object.fromEntries(entradasConfig.map(e => [e.key, '']));
    Object.entries(rac.entradas).forEach(([k, v]) => { entradasMerged[k] = v; });
    setFormData({
      titulo: rac.titulo,
      classificacao: rac.classificacao || 'Ordinária',
      dataReuniao: rac.dataReuniao,
      local: rac.local || '',
      horaInicio: rac.horaInicio || '',
      horaFim: rac.horaFim || '',
      responsavel: rac.responsavel,
      participantes: [...rac.participantes],
      status: rac.status,
      anoReferencia: rac.anoReferencia,
      periodoInicio: rac.periodoInicio || `${rac.anoReferencia}-01-01`,
      periodoFim: rac.periodoFim || `${rac.anoReferencia}-12-31`,
      conclusao: rac.conclusao || '',
      entradas: entradasMerged,
      saidas: rac.saidas.map(s => ({ ...s })),
    });
    setExpandedSections(new Set(entradasConfig.map(s => s.key)));
    setIsFormOpen(true);
  }

  function handleSave() {
    const errors = validateRACForm(formData);
    const firstError = errors.titulo || errors.responsavel || errors.dataReuniao || errors.periodoInicio || errors.periodoFim || errors.intervalo;
    if (firstError) {
      toast.error(firstError);
      return;
    }

    const now = new Date().toISOString();
    const snapshot = buildSnapshot();

    if (editingRAC) {
      setRacs(prev => prev.map(r => r.id === editingRAC.id ? {
        ...r,
        ...formData,
        snapshot,
        dataAtualizacao: now,
      } : r));
      toast.success('Análise Crítica atualizada com sucesso!');
    } else {
      const novaRAC: AnaliseCritica = {
        id: generateId('rac-'),
        numero: generateNumero(),
        ...formData,
        snapshot,
        dataCriacao: now,
        dataAtualizacao: now,
      };
      setRacs(prev => [...prev, novaRAC]);
      toast.success('Análise Crítica criada com sucesso!');
    }

    setIsFormOpen(false);
    setEditingRAC(null);
  }

  function handleDelete() {
    if (!deleteId) return;
    setRacs(prev => prev.filter(r => r.id !== deleteId));
    setDeleteId(null);
    if (viewingRAC?.id === deleteId) setIsViewOpen(false);
    toast.success('Análise Crítica excluída com sucesso!');
  }

  function handleView(rac: AnaliseCritica) {
    setViewingRAC(rac);
    setIsViewOpen(true);
  }

  // Participantes
  function addParticipante() {
    const nome = novoParticipante.trim();
    if (!nome) return;
    if (formData.participantes.includes(nome)) { toast.error('Participante já adicionado.'); return; }
    setFormData(prev => ({ ...prev, participantes: [...prev.participantes, nome] }));
    setNovoParticipante('');
  }

  function removeParticipante(nome: string) {
    setFormData(prev => ({ ...prev, participantes: prev.participantes.filter(p => p !== nome) }));
  }

  // Entradas config management
  function addEntradaConfig() {
    const label = novaEntradaLabel.trim();
    if (!label) { toast.error('Informe o título da entrada.'); return; }
    const key = 'custom_' + generateId('ent-');
    const novaEntrada: EntradaConfig = { key, label, hint: novaEntradaHint.trim() || 'Entrada personalizada.', isDefault: false };
    const updated = [...entradasConfig, novaEntrada];
    setEntradasConfig(updated);
    saveEntradasConfig(updated);
    // Adiciona a nova chave ao formData.entradas
    setFormData(prev => ({ ...prev, entradas: { ...prev.entradas, [key]: '' } }));
    setExpandedSections(prev => new Set([...prev, key]));
    setNovaEntradaLabel('');
    setNovaEntradaHint('');
    toast.success(`Entrada "${label}" adicionada.`);
  }

  function removeEntradaConfig(key: string) {
    const entry = entradasConfig.find(e => e.key === key);
    const updated = entradasConfig.filter(e => e.key !== key);
    if (updated.length === 0) { toast.error('É necessário manter ao menos uma entrada.'); return; }
    setEntradasConfig(updated);
    saveEntradasConfig(updated);
    // Remove do formData.entradas
    setFormData(prev => {
      const { [key]: _, ...rest } = prev.entradas;
      return { ...prev, entradas: rest };
    });
    setExpandedSections(prev => { const s = new Set(prev); s.delete(key); return s; });
    toast.success(`Entrada "${entry?.label || key}" removida.`);
  }

  function restoreDefaultEntradas() {
    setEntradasConfig(DEFAULT_ENTRADAS);
    saveEntradasConfig(DEFAULT_ENTRADAS);
    setFormData(prev => {
      const newEntradas: Record<string, string> = {};
      DEFAULT_ENTRADAS.forEach(e => { newEntradas[e.key] = prev.entradas[e.key] || ''; });
      return { ...prev, entradas: newEntradas };
    });
    setExpandedSections(new Set(DEFAULT_ENTRADAS.map(s => s.key)));
    toast.success('Entradas restauradas ao padrão.');
  }

  // Saídas
  function addSaida() {
    if (!novaSaida.descricao.trim()) { toast.error('Informe a descrição da saída.'); return; }
    if (!novaSaida.responsavel.trim()) { toast.error('Informe o responsável.'); return; }
    const saida: SaidaRAC = { id: generateId('saida-'), ...novaSaida };
    setFormData(prev => ({ ...prev, saidas: [...prev.saidas, saida] }));
    setNovaSaida({ tipo: 'Ação', descricao: '', responsavel: '', prazo: '', status: 'Pendente', vinculoPE: '', vinculoPA: '' });
    setEditingSaidaId(null);
  }

  function removeSaida(id: string) {
    setFormData(prev => ({ ...prev, saidas: prev.saidas.filter(s => s.id !== id) }));
  }

  function handleSavePeriodicidade(tipo: PeriodicidadeConfig['tipo'], mesesCustom?: number) {
    const opt = PERIODICIDADE_OPTIONS.find(p => p.value === tipo);
    const meses = tipo === 'Personalizada' ? (mesesCustom || 12) : (opt?.meses || 12);
    const config: PeriodicidadeConfig = { tipo, intervaloMeses: meses };
    localStorage.setItem(PERIODICIDADE_KEY, JSON.stringify(config));
    setPeriodicidade(config);
    setShowPeriodicidadeConfig(false);
    toast.success(`Periodicidade atualizada: ${tipo} (${meses} meses)`);
  }

  const conformidadePeriodica = useMemo(() => calcularConformidadePeriodica(racs, periodicidade), [racs, periodicidade]);

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // ═══ Filtros ═══
  const racsFiltradas = useMemo(() => {
    return racs.filter(r => {
      const matchBusca = !busca || r.titulo.toLowerCase().includes(busca.toLowerCase()) || r.numero.toLowerCase().includes(busca.toLowerCase()) || r.responsavel.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === 'todos' || r.status === filtroStatus;
      return matchBusca && matchStatus;
    }).sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao));
  }, [racs, busca, filtroStatus]);

  // ═══ Estatísticas do resumo ═══
  const stats = useMemo(() => ({
    total: racs.length,
    rascunho: racs.filter(r => r.status === 'Rascunho').length,
    emAndamento: racs.filter(r => r.status === 'Em Andamento').length,
    concluidas: racs.filter(r => r.status === 'Concluída').length,
    saidasPendentes: racs.reduce((sum, r) => sum + r.saidas.filter(s => s.status === 'Pendente').length, 0),
  }), [racs]);

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontSize: '1.75rem', fontWeight: 600 }}>
            Análise Crítica pela Direção
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reuniões de Análise Crítica do SGQ — Ano de referência: <span className="text-gray-700" style={{ fontWeight: 500 }}>{anoAtual}</span>
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Análise Crítica
        </Button>
      </div>

      {/* Indicador de Periodicidade */}
      <div className={`flex items-center justify-between rounded-xl border p-4 ${
        conformidadePeriodica.status === 'em-dia' ? 'bg-emerald-50 border-emerald-200' :
        conformidadePeriodica.status === 'atencao' ? 'bg-amber-50 border-amber-200' :
        conformidadePeriodica.status === 'atrasada' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            conformidadePeriodica.status === 'em-dia' ? 'bg-emerald-100' :
            conformidadePeriodica.status === 'atencao' ? 'bg-amber-100' :
            conformidadePeriodica.status === 'atrasada' ? 'bg-red-100' :
            'bg-gray-100'
          }`}>
            <Calendar className={`w-4 h-4 ${
              conformidadePeriodica.status === 'em-dia' ? 'text-emerald-600' :
              conformidadePeriodica.status === 'atencao' ? 'text-amber-600' :
              conformidadePeriodica.status === 'atrasada' ? 'text-red-600' :
              'text-gray-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Periodicidade: {periodicidade.tipo}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${
                conformidadePeriodica.status === 'em-dia' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                conformidadePeriodica.status === 'atencao' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                conformidadePeriodica.status === 'atrasada' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-gray-100 text-gray-600 border-gray-200'
              }`} style={{ fontWeight: 500 }}>
                {conformidadePeriodica.label}
              </span>
            </div>
            {conformidadePeriodica.proximaData && (
              <p className="text-xs text-gray-500 mt-0.5">
                Próxima prevista: {formatarData(conformidadePeriodica.proximaData)}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPeriodicidadeConfig(!showPeriodicidadeConfig)} className="text-xs gap-1.5">
          <RefreshCcw className="w-3.5 h-3.5" />
          Configurar
        </Button>
      </div>

      {/* Config de Periodicidade (colapsável) */}
      {showPeriodicidadeConfig && (
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Configurar Periodicidade</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PERIODICIDADE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'Personalizada') {
                      setPeriodicidade(prev => ({ ...prev, tipo: 'Personalizada' }));
                    } else {
                      handleSavePeriodicidade(opt.value);
                    }
                  }}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    periodicidade.tipo === opt.value
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm" style={{ fontWeight: 500 }}>{opt.value}</p>
                  {opt.meses > 0 && <p className="text-xs text-gray-400 mt-0.5">a cada {opt.meses} meses</p>}
                </button>
              ))}
            </div>
            {periodicidade.tipo === 'Personalizada' && (
              <div className="flex items-center gap-3 mt-4">
                <Label className="text-xs text-gray-600 whitespace-nowrap">Intervalo (meses):</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={intervaloCustom}
                  onChange={e => setIntervaloCustom(parseInt(e.target.value) || 12)}
                  className="w-24"
                />
                <Button size="sm" onClick={() => handleSavePeriodicidade('Personalizada', intervaloCustom)}>
                  Salvar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Total de RACs" value={stats.total} icon={ClipboardCheck} variant="info" />
        <MetricCard label="Rascunho" value={stats.rascunho} icon={Clock} variant="default" />
        <MetricCard label="Em Andamento" value={stats.emAndamento} icon={RefreshCcw} variant="info" />
        <MetricCard label="Concluídas" value={stats.concluidas} icon={CheckCircle2} variant="success" />
        <MetricCard label="Saídas Pendentes" value={stats.saidasPendentes} icon={AlertTriangle} variant={stats.saidasPendentes > 0 ? 'warning' : 'default'} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por título, número ou responsável..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {['todos', 'Rascunho', 'Em Andamento', 'Concluída'].map(st => (
            <Button
              key={st}
              variant={filtroStatus === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroStatus(st)}
              className="text-xs"
            >
              {st === 'todos' ? 'Todos' : st}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de RACs */}
      {racsFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500" style={{ fontWeight: 500 }}>
            {racs.length === 0
              ? `Nenhuma Análise Crítica registrada para ${anoAtual}.`
              : 'Nenhuma RAC corresponde aos filtros aplicados.'}
          </p>
          {racs.length === 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Clique em "Nova Análise Crítica" para iniciar a primeira reunião.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {racsFiltradas.map(rac => {
            const stCfg = STATUS_CONFIG[rac.status];
            const saidasPendentes = rac.saidas.filter(s => s.status === 'Pendente').length;
            const saidasConcluidas = rac.saidas.filter(s => s.status === 'Concluída').length;
            const entradasPreenchidas = Object.values(rac.entradas).filter(v => v.trim().length > 0).length;

            return (
              <div key={rac.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start gap-4">
                  {/* Indicador visual */}
                  <div className={`w-11 h-11 rounded-lg ${stCfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <stCfg.icon className={`w-5 h-5 ${stCfg.text}`} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>{rac.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${stCfg.bg} ${stCfg.text} border ${stCfg.border}`} style={{ fontWeight: 500 }}>
                        {stCfg.label}
                      </span>
                      {(() => {
                        const clCfg = CLASSIFICACAO_CONFIG[rac.classificacao || 'Ordinária'];
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${clCfg.bg} ${clCfg.text} border ${clCfg.border}`} style={{ fontWeight: 500 }}>
                            {clCfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <h3 className="text-gray-900 mt-1 truncate" style={{ fontWeight: 600 }}>{rac.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatarData(rac.dataReuniao)}
                        {rac.horaInicio && <span className="text-gray-400">({rac.horaInicio}{rac.horaFim ? `–${rac.horaFim}` : ''})</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {rac.responsavel}
                      </span>
                      {rac.local && (
                        <span className="flex items-center gap-1 text-gray-400">
                          {rac.local}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded" style={{ fontWeight: 500 }}>
                        <Calendar className="w-3 h-3" />
                        {rac.periodoInicio && rac.periodoFim
                          ? `${formatarData(rac.periodoInicio)} — ${formatarData(rac.periodoFim)}`
                          : `Ref. ${rac.anoReferencia}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {entradasPreenchidas}/{entradasConfig.length} entradas
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5" />
                        {rac.saidas.length} saída{rac.saidas.length !== 1 ? 's' : ''}
                        {saidasPendentes > 0 && (
                          <span className="text-amber-600">({saidasPendentes} pendente{saidasPendentes !== 1 ? 's' : ''})</span>
                        )}
                      </span>
                    </div>

                    {/* Mini snapshot badges */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <SnapshotBadge label="KPIs" total={rac.snapshot.kpis.total} ok={rac.snapshot.kpis.dentroMeta} warn={rac.snapshot.kpis.atencao} bad={rac.snapshot.kpis.foraMeta} />
                      <SnapshotBadge label="PAs" total={rac.snapshot.pas.total} ok={rac.snapshot.pas.concluidos} warn={rac.snapshot.pas.abertos} bad={rac.snapshot.pas.atrasados} />
                      <SnapshotBadge label="Riscos" total={rac.snapshot.riscos.total} ok={rac.snapshot.riscos.baixos} warn={rac.snapshot.riscos.medios} bad={rac.snapshot.riscos.altos} />
                      <SnapshotBadge label="Fornec." total={rac.snapshot.fornecedores.total} ok={rac.snapshot.fornecedores.homologados} warn={rac.snapshot.fornecedores.comRestricao} bad={rac.snapshot.fornecedores.bloqueados} />
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleView(rac)} title="Visualizar">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(rac)} title="Editar">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setDeleteId(rac.id)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL: Formulário de Criação/Edição ═══ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0"
          aria-describedby="rac-form-description"
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg" style={{ fontWeight: 600 }}>
                {editingRAC ? `Editar ${editingRAC.numero}` : 'Nova Análise Crítica'}
              </DialogTitle>
              <DialogDescription id="rac-form-description">
                {editingRAC ? 'Atualize as informações da análise crítica.' : `Registre a reunião de análise crítica para o ano ${anoAtual}.`}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Dados Gerais */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Dados da Reunião</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-600">Título da Reunião *</Label>
                    <Input
                      value={formData.titulo}
                      onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Reunião de Análise Crítica — 1.o Semestre 2026"
                      aria-invalid={!!liveFormErrors.titulo}
                    />
                    {liveFormErrors.titulo && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.titulo}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Classificação</Label>
                    <Select value={formData.classificacao} onValueChange={(v: any) => setFormData(prev => ({ ...prev, classificacao: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ordinária">Ordinária</SelectItem>
                        <SelectItem value="Extraordinária">Extraordinária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <Select value={formData.status} onValueChange={(v: any) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Data da Reunião *</Label>
                    <Input
                      type="date"
                      value={formData.dataReuniao}
                      onChange={e => setFormData(prev => ({ ...prev, dataReuniao: e.target.value }))}
                      aria-invalid={!!liveFormErrors.dataReuniao}
                    />
                    {liveFormErrors.dataReuniao && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.dataReuniao}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Local</Label>
                    <Input
                      value={formData.local}
                      onChange={e => setFormData(prev => ({ ...prev, local: e.target.value }))}
                      placeholder="Ex: Sala de reuniões, Online, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Hora Início</Label>
                    <Input
                      type="time"
                      value={formData.horaInicio}
                      onChange={e => setFormData(prev => ({ ...prev, horaInicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Hora Fim</Label>
                    <Input
                      type="time"
                      value={formData.horaFim}
                      onChange={e => setFormData(prev => ({ ...prev, horaFim: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Representante da Direção *</Label>
                    <ResponsavelCombobox
                      value={formData.responsavel}
                      onChange={val => setFormData(prev => ({ ...prev, responsavel: val }))}
                      usuarios={usuariosDisponiveis}
                      placeholder="Nome do responsável"
                    />
                    {liveFormErrors.responsavel && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {liveFormErrors.responsavel}
                      </p>
                    )}
                  </div>
                </div>

                {/* Intervalo de Análise */}
                <div className="mt-4">
                  <Label className="text-xs text-gray-600 flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Intervalo de Análise
                  </Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Período dos dados sendo analisados nesta reunião.
                  </p>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">De</Label>
                      <Input
                        type="date"
                        value={formData.periodoInicio}
                        onChange={e => {
                          const v = e.target.value;
                          const ano = v ? new Date(v).getFullYear().toString() : anoAtual;
                          setFormData(prev => ({ ...prev, periodoInicio: v, anoReferencia: ano }));
                        }}
                        aria-invalid={!!liveFormErrors.periodoInicio || !!liveFormErrors.intervalo}
                      />
                      {liveFormErrors.periodoInicio && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {liveFormErrors.periodoInicio}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs pb-2">até</span>
                    <div>
                      <Label className="text-xs text-gray-500">Até</Label>
                      <Input
                        type="date"
                        value={formData.periodoFim}
                        onChange={e => setFormData(prev => ({ ...prev, periodoFim: e.target.value }))}
                        aria-invalid={!!liveFormErrors.periodoFim || !!liveFormErrors.intervalo}
                      />
                      {liveFormErrors.periodoFim && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {liveFormErrors.periodoFim}
                        </p>
                      )}
                    </div>
                    <div className="pb-0.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700" style={{ fontWeight: 500 }}>
                        <FileText className="w-3 h-3" />
                        Ref. {formData.anoReferencia}
                      </span>
                    </div>
                  </div>
                  {liveFormErrors.intervalo && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {liveFormErrors.intervalo}
                    </p>
                  )}
                </div>

                {/* Participantes */}
                <div>
                  <Label className="text-xs text-gray-600">Participantes</Label>
                  <div className="flex gap-2 mt-1">
                    <ResponsavelCombobox
                      value={novoParticipante}
                      onChange={setNovoParticipante}
                      usuarios={usuariosDisponiveis}
                      placeholder="Adicionar participante"
                    />
                    <Button size="sm" variant="outline" onClick={addParticipante} className="flex-shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.participantes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.participantes.map(p => (
                        <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs" style={{ fontWeight: 500 }}>
                          {p}
                          <button onClick={() => removeParticipante(p)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Snapshot Preview */}
            <Card className="border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Snapshot do SGQ (dados atuais)</span>
                  </div>
                  <span className="text-xs text-gray-400">Capturado automaticamente ao salvar</span>
                </div>
                <SnapshotGrid snapshot={buildSnapshot()} />
              </CardContent>
            </Card>

            {/* Entradas (9.3.2) — Configuráveis */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRight className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Entradas da Análise Crítica</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {Object.values(formData.entradas).filter(v => v.trim().length > 0).length}/{entradasConfig.length} preenchidas
                  </span>
                  <Button
                    variant={showEntradasManager ? 'default' : 'ghost'}
                    size="sm"
                    className="ml-auto gap-1.5 h-7 text-xs"
                    onClick={() => setShowEntradasManager(prev => !prev)}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {showEntradasManager ? 'Fechar Configuração' : 'Configurar Entradas'}
                  </Button>
                </div>

                {/* Painel de gerenciamento de entradas */}
                {showEntradasManager && (
                  <div className="mb-4 p-4 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-indigo-700" style={{ fontWeight: 600 }}>
                        Gerenciar Entradas ({entradasConfig.length})
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-indigo-600 gap-1" onClick={restoreDefaultEntradas}>
                        <RefreshCcw className="w-3 h-3" />
                        Restaurar Padrão
                      </Button>
                    </div>

                    {/* Lista de entradas configuradas */}
                    <div className="space-y-1.5">
                      {entradasConfig.map((entry) => {
                        const Icon = getEntradaIcon(entry.key);
                        return (
                          <div key={entry.key} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-indigo-100">
                            <Icon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span className="flex-1 text-xs text-gray-700 truncate" style={{ fontWeight: 500 }}>{entry.label}</span>
                            {entry.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded" style={{ fontWeight: 500 }}>padrão</span>
                            )}
                            <button
                              onClick={() => removeEntradaConfig(entry.key)}
                              className="p-0.5 hover:bg-red-50 rounded transition-colors group"
                              title={`Remover "${entry.label}"`}
                            >
                              <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Formulário para adicionar nova entrada */}
                    <div className="border-t border-indigo-200 pt-3 space-y-2">
                      <span className="text-xs text-indigo-600" style={{ fontWeight: 600 }}>Adicionar nova entrada</span>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={novaEntradaLabel}
                            onChange={e => setNovaEntradaLabel(e.target.value)}
                            placeholder="Título da entrada (ex: Satisfação dos Colaboradores)"
                            className="text-xs h-8 bg-white"
                          />
                          <Input
                            value={novaEntradaHint}
                            onChange={e => setNovaEntradaHint(e.target.value)}
                            placeholder="Descrição/dica (opcional)"
                            className="text-xs h-8 bg-white"
                          />
                        </div>
                        <Button size="sm" onClick={addEntradaConfig} className="h-8 gap-1 self-end">
                          <Plus className="w-3.5 h-3.5" />
                          Incluir
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de entradas */}
                <div className="space-y-2">
                  {entradasConfig.map(section => {
                    const isExpanded = expandedSections.has(section.key);
                    const value = formData.entradas[section.key] || '';
                    const isFilled = value.trim().length > 0;
                    const Icon = getEntradaIcon(section.key);
                    return (
                      <div key={section.key} className={`border rounded-lg overflow-hidden transition-colors ${isFilled ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                        <button
                          onClick={() => toggleSection(section.key)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isFilled ? 'text-emerald-600' : 'text-gray-400'}`} />
                          <span className="flex-1 text-sm text-gray-700" style={{ fontWeight: 500 }}>{section.label}</span>
                          {!section.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 border border-indigo-200 rounded" style={{ fontWeight: 500 }}>personalizada</span>
                          )}
                          {isFilled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1">
                            <p className="text-xs text-gray-400 mb-2 italic">{section.hint}</p>
                            <Textarea
                              value={value}
                              onChange={e => setFormData(prev => ({
                                ...prev,
                                entradas: { ...prev.entradas, [section.key]: e.target.value },
                              }))}
                              placeholder="Registre a análise desta entrada..."
                              rows={4}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Saídas (9.3.3) */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Saídas da Análise Crítica</span>
                  <span className="text-xs text-gray-400 ml-auto">{formData.saidas.length} registrada{formData.saidas.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Lista de saídas existentes */}
                {formData.saidas.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.saidas.map(saida => {
                      const tipoCfg = TIPO_SAIDA_CONFIG[saida.tipo] || TIPO_SAIDA_CONFIG['Ação'];
                      const stCfg = STATUS_SAIDA_CONFIG[saida.status] || STATUS_SAIDA_CONFIG['Pendente'];
                      return (
                        <div key={saida.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>
                                {saida.tipo}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                                {saida.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{saida.descricao}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>{saida.responsavel}</span>
                              {saida.prazo && <span>{formatarData(saida.prazo)}</span>}
                              {saida.vinculoPE && <span className="text-indigo-500">{saida.vinculoPE}</span>}
                              {saida.vinculoPA && <span className="text-orange-500">{saida.vinculoPA}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => removeSaida(saida.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Formulário de nova saída */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50/50 space-y-3">
                  <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Adicionar saída</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Tipo *</Label>
                      <Select value={novaSaida.tipo} onValueChange={(v: any) => setNovaSaida(prev => ({ ...prev, tipo: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_SAIDA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Status</Label>
                      <Select value={novaSaida.status} onValueChange={(v: any) => setNovaSaida(prev => ({ ...prev, status: v }))}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-gray-600">Descrição *</Label>
                      <Textarea
                        value={novaSaida.descricao}
                        onChange={e => setNovaSaida(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Descreva a decisão, ação ou melhoria..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Responsável *</Label>
                      <ResponsavelCombobox
                        value={novaSaida.responsavel}
                        onChange={val => setNovaSaida(prev => ({ ...prev, responsavel: val }))}
                        usuarios={usuariosDisponiveis}
                        placeholder="Responsável"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Prazo</Label>
                      <Input
                        type="date"
                        value={novaSaida.prazo}
                        onChange={e => setNovaSaida(prev => ({ ...prev, prazo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <PlanoAcaoSelector
                        value={novaSaida.vinculoPE || undefined}
                        onChange={val => setNovaSaida(prev => ({ ...prev, vinculoPE: val || '' }))}
                        label="Vincular ao PE (opcional)"
                      />
                    </div>
                    <div>
                      <PlanoAcaoCorretivaSelector
                        value={novaSaida.vinculoPA || undefined}
                        onChange={val => setNovaSaida(prev => ({ ...prev, vinculoPA: val || '' }))}
                        label="Vincular ao PA (opcional)"
                      />
                    </div>
                  </div>
                  <Button size="sm" onClick={addSaida} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Saída
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Conclusão / Deliberações Gerais */}
            <Card className="border-gray-200 rounded-xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Conclusão e Deliberações Gerais</span>
                </div>
                <p className="text-xs text-gray-400 italic">
                  Resumo executivo das principais decisões, encaminhamentos e conclusões da reunião.
                </p>
                <Textarea
                  value={formData.conclusao}
                  onChange={e => setFormData(prev => ({ ...prev, conclusao: e.target.value }))}
                  placeholder="Registre as conclusões gerais da análise crítica..."
                  rows={5}
                  className="text-sm"
                />
              </CardContent>
            </Card>

            {/* Botões de ação */}
            <div className="flex justify-end gap-3 pt-2 pb-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} variant={editingRAC ? "black" : "default"} className="gap-2" disabled={!canSubmitForm}>
                <Save className="w-4 h-4" />
                {editingRAC ? 'Salvar Alterações' : 'Criar Análise Crítica'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ SHEET: Visualização ═══ */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>{viewingRAC?.numero ?? 'Visualizar RAC'}</DialogTitle>
          </DialogHeader>
          {viewingRAC && <RACViewContent rac={viewingRAC} onEdit={() => { setIsViewOpen(false); handleOpenEdit(viewingRAC); }} onClose={() => setIsViewOpen(false)} />}
        </DialogContent>
      </Dialog>

      {/* ═══ AlertDialog: Confirmação de exclusão ═══ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir esta Análise Crítica? Todos os dados da reunião, entradas e saídas serão permanentemente removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Sub-componentes
// ═══════════════════════════════════════════════════

function SnapshotBadge({ label, total, ok, warn, bad }: { label: string; total: number; ok: number; warn: number; bad: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs">
      <span className="text-gray-500" style={{ fontWeight: 500 }}>{label}</span>
      <span className="text-gray-700" style={{ fontWeight: 600 }}>{total}</span>
      <div className="flex items-center gap-0.5 ml-0.5">
        {ok > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${ok} ok`} />}
        {warn > 0 && <span className="w-2 h-2 rounded-full bg-amber-400" title={`${warn} atenção`} />}
        {bad > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title={`${bad} crítico`} />}
      </div>
    </div>
  );
}

function SnapshotGrid({ snapshot }: { snapshot: SnapshotRAC }) {
  const blocks = [
    {
      title: 'Indicadores (KPI)', icon: BarChart3, color: 'text-blue-600',
      items: [
        { label: 'Total', value: snapshot.kpis.total },
        { label: 'Dentro da Meta', value: snapshot.kpis.dentroMeta, color: 'text-emerald-600' },
        { label: 'Atenção', value: snapshot.kpis.atencao, color: 'text-amber-600' },
        { label: 'Fora da Meta', value: snapshot.kpis.foraMeta, color: 'text-red-600' },
      ],
    },
    {
      title: 'Ações Corretivas (PA)', icon: AlertCircle, color: 'text-orange-600',
      items: [
        { label: 'Total', value: snapshot.pas.total },
        { label: 'Abertos', value: snapshot.pas.abertos, color: 'text-blue-600' },
        { label: 'Concluídos', value: snapshot.pas.concluidos, color: 'text-emerald-600' },
        { label: 'Atrasados', value: snapshot.pas.atrasados, color: 'text-red-600' },
        { label: 'Em Eficácia', value: snapshot.pas.emEficacia, color: 'text-purple-600' },
        { label: 'Eficazes', value: snapshot.pas.eficazes, color: 'text-emerald-600' },
      ],
    },
    {
      title: 'Planos Estratégicos (PE)', icon: Target, color: 'text-indigo-600',
      items: [
        { label: 'Total', value: snapshot.pes.total },
        { label: 'Abertos', value: snapshot.pes.abertos, color: 'text-blue-600' },
        { label: 'Concluídos', value: snapshot.pes.concluidos, color: 'text-emerald-600' },
        { label: 'Atrasados', value: snapshot.pes.atrasados, color: 'text-red-600' },
      ],
    },
    {
      title: 'Riscos', icon: ShieldAlert, color: 'text-red-600',
      items: [
        { label: 'Total', value: snapshot.riscos.total },
        { label: 'Altos', value: snapshot.riscos.altos, color: 'text-red-600' },
        { label: 'Médios', value: snapshot.riscos.medios, color: 'text-amber-600' },
        { label: 'Baixos', value: snapshot.riscos.baixos, color: 'text-emerald-600' },
        { label: 'Em Tratamento', value: snapshot.riscos.emTratamento, color: 'text-blue-600' },
      ],
    },
    {
      title: 'Fornecedores', icon: Truck, color: 'text-purple-600',
      items: [
        { label: 'Total', value: snapshot.fornecedores.total },
        { label: 'Homologados', value: snapshot.fornecedores.homologados, color: 'text-emerald-600' },
        { label: 'Com Restrição', value: snapshot.fornecedores.comRestricao, color: 'text-amber-600' },
        { label: 'Bloqueados', value: snapshot.fornecedores.bloqueados, color: 'text-red-600' },
        { label: 'Nota Média', value: snapshot.fornecedores.notaMedia, color: 'text-gray-700' },
      ],
    },
    {
      title: 'Qualificação / Treinamentos', icon: GraduationCap, color: 'text-teal-600',
      items: [
        { label: 'Total', value: snapshot.treinamentos.total },
        { label: 'Concluídos', value: snapshot.treinamentos.concluidos, color: 'text-emerald-600' },
        { label: 'Eficazes', value: snapshot.treinamentos.eficazes, color: 'text-emerald-600' },
        { label: 'Pendentes', value: snapshot.treinamentos.pendentes, color: 'text-amber-600' },
      ],
    },
    {
      title: 'Documentos', icon: FileText, color: 'text-cyan-600',
      items: [
        { label: 'Total', value: snapshot.documentos.total },
        { label: 'Vigentes', value: snapshot.documentos.vigentes, color: 'text-emerald-600' },
        { label: 'Em Revisão', value: snapshot.documentos.emRevisao, color: 'text-blue-600' },
        { label: 'Obsoletos', value: snapshot.documentos.obsoletos, color: 'text-gray-500' },
        { label: 'Vencidos', value: snapshot.documentos.vencidos, color: 'text-red-600' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {blocks.map(block => (
        <div key={block.title} className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <block.icon className={`w-3.5 h-3.5 ${block.color}`} />
            <span className="text-xs text-gray-600 truncate" style={{ fontWeight: 600 }}>{block.title}</span>
          </div>
          <div className="space-y-1">
            {block.items.map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{item.label}</span>
                <span className={`text-xs ${item.color || 'text-gray-700'}`} style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ View Content ═══
function RACViewContent({ rac, onEdit, onClose }: { rac: AnaliseCritica; onEdit: () => void; onClose: () => void }) {
  const stCfg = STATUS_CONFIG[rac.status];
  const clCfg = CLASSIFICACAO_CONFIG[rac.classificacao || 'Ordinária'];
  const viewEntradasConfig = useMemo(() => getEntradasConfig(), []);
  // Mostra todas as entradas que existem na RAC, mescladas com config atual
  const entradasKeys = useMemo(() => {
    const configKeys = new Set(viewEntradasConfig.map(e => e.key));
    const allKeys = [...viewEntradasConfig];
    // Adiciona entradas que existem na RAC mas não estão mais na config (entradas removidas)
    Object.keys(rac.entradas).forEach(k => {
      if (!configKeys.has(k)) {
        allKeys.push({ key: k, label: k, hint: '', isDefault: false });
      }
    });
    return allKeys;
  }, [rac.entradas, viewEntradasConfig]);
  const totalEntradas = entradasKeys.length;
  const entradasPreenchidas = Object.values(rac.entradas).filter(v => v.trim().length > 0).length;
  const saidasPendentes = rac.saidas.filter(s => s.status === 'Pendente').length;
  const saidasConcluidas = rac.saidas.filter(s => s.status === 'Concluída').length;

  return (
    <div>
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-indigo-200 text-xs" style={{ fontWeight: 600 }}>{rac.numero}</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white border border-white/30" style={{ fontWeight: 500 }}>
                {stCfg.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-white/15 text-white border border-white/20" style={{ fontWeight: 500 }}>
                {clCfg.label}
              </span>
            </div>
            <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{rac.titulo}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-white hover:bg-white/10 gap-1.5">
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-indigo-200">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />{formatarData(rac.dataReuniao)}
            {rac.horaInicio && <span>({rac.horaInicio}{rac.horaFim ? `–${rac.horaFim}` : ''})</span>}
          </span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{rac.responsavel}</span>
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {rac.periodoInicio && rac.periodoFim
              ? `${formatarData(rac.periodoInicio)} — ${formatarData(rac.periodoFim)}`
              : `Ano: ${rac.anoReferencia}`}
          </span>
          {rac.local && <span className="flex items-center gap-1">{rac.local}</span>}
        </div>
        {rac.participantes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {rac.participantes.map(p => (
              <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-white/15 text-white border border-white/20" style={{ fontWeight: 500 }}>{p}</span>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Resumo visual */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
            <p className="text-lg text-blue-700" style={{ fontWeight: 700 }}>{entradasPreenchidas}/{totalEntradas}</p>
            <p className="text-xs text-blue-500" style={{ fontWeight: 500 }}>Entradas</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
            <p className="text-lg text-amber-700" style={{ fontWeight: 700 }}>{rac.saidas.length}</p>
            <p className="text-xs text-amber-500" style={{ fontWeight: 500 }}>Saídas</p>
          </div>
          <div className={`${saidasPendentes > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} rounded-lg p-3 text-center border`}>
            <p className={`text-lg ${saidasPendentes > 0 ? 'text-red-700' : 'text-emerald-700'}`} style={{ fontWeight: 700 }}>{saidasPendentes}</p>
            <p className={`text-xs ${saidasPendentes > 0 ? 'text-red-500' : 'text-emerald-500'}`} style={{ fontWeight: 500 }}>Pendentes</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
            <p className="text-lg text-emerald-700" style={{ fontWeight: 700 }}>{saidasConcluidas}</p>
            <p className="text-xs text-emerald-500" style={{ fontWeight: 500 }}>Concluídas</p>
          </div>
        </div>

        {/* Snapshot */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Snapshot do SGQ</span>
            <span className="text-xs text-gray-400 ml-auto">Capturado em {formatarDataPtBr(rac.dataAtualizacao)}</span>
          </div>
          <SnapshotGrid snapshot={rac.snapshot} />
        </div>

        <Separator />

        {/* Entradas */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Entradas da Análise Crítica</span>
            <span className="text-xs text-gray-400 ml-auto">{entradasPreenchidas}/{totalEntradas}</span>
          </div>
          <div className="space-y-3">
            {entradasKeys.map(section => {
              const value = rac.entradas[section.key] || '';
              const isFilled = value.trim().length > 0;
              const Icon = getEntradaIcon(section.key);
              return (
                <div key={section.key} className={`border rounded-lg p-4 ${isFilled ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 bg-gray-50/50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isFilled ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{section.label}</span>
                    {!section.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 border border-indigo-200 rounded" style={{ fontWeight: 500 }}>personalizada</span>
                    )}
                    {isFilled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                    {!isFilled && <span className="text-xs text-gray-400 ml-auto italic">Não preenchido</span>}
                  </div>
                  {isFilled && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{value}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Saídas */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Saídas da Análise Crítica</span>
          </div>
          {rac.saidas.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              Nenhuma saída registrada.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500" style={{ fontWeight: 600 }}>Tipo</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500" style={{ fontWeight: 600 }}>Descrição</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500" style={{ fontWeight: 600 }}>Responsável</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500" style={{ fontWeight: 600 }}>Prazo</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500" style={{ fontWeight: 600 }}>Vínculo</th>
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500" style={{ fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rac.saidas.map((saida, idx) => {
                    const tipoCfg = TIPO_SAIDA_CONFIG[saida.tipo] || TIPO_SAIDA_CONFIG['Ação'];
                    const stCfg = STATUS_SAIDA_CONFIG[saida.status] || STATUS_SAIDA_CONFIG['Pendente'];
                    return (
                      <tr key={saida.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>
                            {saida.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 max-w-[250px]">
                          <span className="line-clamp-2">{saida.descricao}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{saida.responsavel}</td>
                        <td className="px-4 py-2.5 text-gray-500">{saida.prazo ? formatarData(saida.prazo) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            {saida.vinculoPE && <span className="text-xs text-indigo-600" style={{ fontWeight: 500 }}>{saida.vinculoPE}</span>}
                            {saida.vinculoPA && <span className="text-xs text-orange-600" style={{ fontWeight: 500 }}>{saida.vinculoPA}</span>}
                            {!saida.vinculoPE && !saida.vinculoPA && <span className="text-xs text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                            {saida.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conclusão */}
        {rac.conclusao && rac.conclusao.trim().length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Conclusão e Deliberações Gerais</span>
              </div>
              <div className="bg-emerald-50/30 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{rac.conclusao}</p>
              </div>
            </div>
          </>
        )}

        {/* Metadados */}
        <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
          <span>Criado em: {formatarDataPtBr(rac.dataCriacao)}</span>
          <span>Atualizado em: {formatarDataPtBr(rac.dataAtualizacao)}</span>
        </div>
      </div>
    </div>
  );
}

export default AnaliseCritica;
