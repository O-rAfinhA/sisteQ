/**
 * Manutenção / OS — Corretivas
 * Gestão completa de OS corretivas com prioridade visual, stats e status codificados por cor.
 */
import { useState, useMemo, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
  Wrench, Plus, Edit2, Trash2, Search, Save, Eye, Upload, X,
  CheckCircle, Play, Download, Printer, AlertTriangle, Clock, ShieldAlert,
} from 'lucide-react';
import { formatarData, dataHojeISO } from '../../utils/formatters';
import { generateId } from '../../utils/helpers';
import {
  useManutencao, calcularStatusOS, diasAtePrazo,
  gerarNumeroOS, STATUS_OS_CONFIG, TIPO_MANUTENCAO_CONFIG, PRIORIDADE_CONFIG, calcularCustoTotal,
  type OrdemServico, type StatusOS, type PrioridadeOS,
} from '../../hooks/useManutencao';
import { CurrencyInput } from '../../components/ui/currency-input';
import { imprimirOS } from '../../utils/printOS';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CORRETIVA: { value: Exclude<StatusOS, 'atrasada' | 'programada'>; label: string }[] = [
  { value: 'aberta',       label: 'Aberta'       },
  { value: 'triagem',      label: 'Triagem'      },
  { value: 'em-andamento', label: 'Em Andamento' },
  { value: 'aguardando',   label: 'Aguardando'   },
  { value: 'concluida',    label: 'Concluída'    },
  { value: 'cancelada',    label: 'Cancelada'    },
];

// Paleta de cores dos filtros de status — alinhada ao STATUS_OS_CONFIG
const STATUS_PILL_ACTIVE: Record<string, string> = {
  todos:         'bg-gray-900 text-white border-gray-900',
  aberta:        'bg-gray-700 text-white border-gray-700',
  triagem:       'bg-yellow-500 text-white border-yellow-500',
  'em-andamento':'bg-amber-500 text-white border-amber-500',
  aguardando:    'bg-purple-500 text-white border-purple-500',
  atrasada:      'bg-red-600 text-white border-red-600',
  concluida:     'bg-emerald-600 text-white border-emerald-600',
  cancelada:     'bg-red-400 text-white border-red-400',
};

const STATUS_PILL_IDLE: Record<string, string> = {
  todos:         'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
  aberta:        'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
  triagem:       'bg-yellow-50 text-yellow-700 border-yellow-200 hover:border-yellow-400',
  'em-andamento':'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
  aguardando:    'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400',
  atrasada:      'bg-red-50 text-red-700 border-red-200 hover:border-red-400',
  concluida:     'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
  cancelada:     'bg-red-50 text-red-500 border-red-200 hover:border-red-300',
};

const PRIORITY_BORDER_COLOR: Record<string, string> = {
  critica: '#ef4444',
  alta:    '#f97316',
  media:   '#f59e0b',
  baixa:   '#9ca3af',
};

const FORM_VAZIO = {
  equipamentoId: '', descricao: '', responsavel: '',
  dataAbertura: dataHojeISO(), prazo: '',
  status: 'aberta' as Exclude<StatusOS, 'atrasada' | 'programada'>,
  prioridade: 'sem-prioridade' as PrioridadeOS | 'sem-prioridade',
  setor: '', solicitante: '',
  custoPecas: '', custoServico: '', custoMaoObra: '',
  horasReparo: '', dataEncerramento: '',
  motivoCancelamento: '', observacao: '',
  anexoBase64: '', anexoNome: '',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ManutencaoCorretivas() {
  const { ordens, setOrdens, equipamentos } = useManutencao();

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroEq, setFiltroEq] = useState('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);

  // Form / modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingOS, setViewingOS] = useState<OrdemServico | null>(null);
  const [cancelandoOS, setCancelandoOS] = useState<OrdemServico | null>(null);
  const [motivoCancelInput, setMotivoCancelInput] = useState('');
  const [formData, setFormData] = useState({ ...FORM_VAZIO });
  const fileRef = useRef<HTMLInputElement>(null);

  const corretivas = useMemo(() => ordens.filter(o => o.tipo === 'corretiva'), [ordens]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const contagens = useMemo(() => {
    const sl = corretivas.map(o => ({ os: o, st: calcularStatusOS(o) }));
    return {
      total:          corretivas.length,
      aberta:         sl.filter(({ st }) => st === 'aberta').length,
      triagem:        sl.filter(({ st }) => st === 'triagem').length,
      emAndamento:    sl.filter(({ st }) => st === 'em-andamento').length,
      aguardando:     sl.filter(({ st }) => st === 'aguardando').length,
      atrasada:       sl.filter(({ st }) => st === 'atrasada').length,
      concluida:      sl.filter(({ st }) => st === 'concluida').length,
      cancelada:      sl.filter(({ st }) => st === 'cancelada').length,
      criticas:       corretivas.filter(o => o.prioridade === 'critica' && !['concluida', 'cancelada'].includes(calcularStatusOS(o))).length,
    };
  }, [corretivas]);

  // ── Filtro ─────────────────────────────────────────────────────────────────

  const filtrados = useMemo(() => {
    return corretivas.filter(os => {
      const status = calcularStatusOS(os);
      const eq = equipamentos.find(e => e.id === os.equipamentoId);
      const matchBusca = !busca || [os.numero, os.descricao, eq?.nome, os.responsavel, os.setor, os.solicitante].some(v =>
        v?.toLowerCase().includes(busca.toLowerCase())
      );
      const matchStatus = filtroStatus === 'todos' || status === filtroStatus;
      const matchEq = filtroEq === 'todos' || os.equipamentoId === filtroEq;
      const matchPrioridade = filtroPrioridade === 'todos' || os.prioridade === filtroPrioridade;
      const matchResponsavel = !filtroResponsavel || os.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase());
      const matchSetor = !filtroSetor || os.setor?.toLowerCase().includes(filtroSetor.toLowerCase());
      const matchInicio = !filtroDataInicio || os.dataAbertura >= filtroDataInicio;
      const matchFim = !filtroDataFim || os.dataAbertura <= filtroDataFim;
      return matchBusca && matchStatus && matchEq && matchPrioridade && matchResponsavel && matchSetor && matchInicio && matchFim;
    }).sort((a, b) => {
      const ordemPri: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3, '': 4 };
      const pa = ordemPri[a.prioridade || ''];
      const pb = ordemPri[b.prioridade || ''];
      if (pa !== pb) return pa - pb;
      return b.dataAbertura.localeCompare(a.dataAbertura);
    });
  }, [corretivas, busca, filtroStatus, filtroEq, filtroPrioridade, filtroResponsavel, filtroSetor, filtroDataInicio, filtroDataFim, equipamentos]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleOpenNew() {
    setEditingId(null);
    setFormData({ ...FORM_VAZIO, dataAbertura: dataHojeISO() });
    setIsFormOpen(true);
  }

  function handleOpenEdit(os: OrdemServico) {
    setEditingId(os.id);
    setFormData({
      equipamentoId: os.equipamentoId,
      descricao: os.descricao, responsavel: os.responsavel,
      dataAbertura: os.dataAbertura, prazo: os.prazo,
      status: (os.status === 'programada' ? 'aberta' : os.status) as any,
      prioridade: os.prioridade || 'sem-prioridade',
      setor: os.setor || '', solicitante: os.solicitante || '',
      custoPecas: os.custoPecas != null ? String(os.custoPecas) : '',
      custoServico: os.custoServico != null ? String(os.custoServico) : '',
      custoMaoObra: os.custoMaoObra != null ? String(os.custoMaoObra) : '',
      horasReparo: os.horasReparo != null ? String(os.horasReparo) : '',
      dataEncerramento: os.dataEncerramento || '',
      motivoCancelamento: os.motivoCancelamento || '',
      observacao: os.observacao || '',
      anexoBase64: os.anexoBase64 || '', anexoNome: os.anexoNome || '',
    });
    setIsFormOpen(true);
  }

  function handleSave() {
    if (!formData.equipamentoId) { toast.error('Selecione o equipamento.'); return; }
    if (!formData.descricao.trim()) { toast.error('Informe a descrição.'); return; }
    if (!formData.prazo) { toast.error('Informe o prazo.'); return; }
    if (formData.status === 'cancelada' && !formData.motivoCancelamento.trim()) {
      toast.error('Informe o motivo do cancelamento.'); return;
    }
    const agora = dataHojeISO();
    const campos = {
      tipo: 'corretiva' as const, equipamentoId: formData.equipamentoId,
      descricao: formData.descricao.trim(), responsavel: formData.responsavel.trim(),
      dataAbertura: formData.dataAbertura, prazo: formData.prazo,
      status: formData.status,
      prioridade: (formData.prioridade === 'sem-prioridade' ? undefined : formData.prioridade as PrioridadeOS),
      setor: formData.setor.trim() || undefined,
      solicitante: formData.solicitante.trim() || undefined,
      custoPecas: formData.custoPecas ? parseFloat(formData.custoPecas) : undefined,
      custoServico: formData.custoServico ? parseFloat(formData.custoServico) : undefined,
      custoMaoObra: formData.custoMaoObra ? parseFloat(formData.custoMaoObra) : undefined,
      horasReparo: formData.horasReparo ? parseFloat(formData.horasReparo) : undefined,
      dataEncerramento: formData.dataEncerramento || undefined,
      motivoCancelamento: formData.motivoCancelamento.trim() || undefined,
      observacao: formData.observacao.trim() || undefined,
      anexoBase64: formData.anexoBase64 || undefined,
      anexoNome: formData.anexoNome || undefined,
    };
    if (editingId) {
      setOrdens(prev => prev.map(o => o.id === editingId ? { ...o, ...campos, dataAtualizacao: agora } : o));
      toast.success('Corretiva atualizada.');
    } else {
      const nova: OrdemServico = {
        id: generateId('os-'), numero: gerarNumeroOS(ordens),
        ...campos, dataCriacao: agora, dataAtualizacao: agora,
      };
      setOrdens(prev => [...prev, nova]);
      toast.success(`OS ${nova.numero} aberta.`);
    }
    setIsFormOpen(false);
  }

  function handleDelete() {
    if (!deleteId) return;
    setOrdens(prev => prev.filter(o => o.id !== deleteId));
    setDeleteId(null);
    toast.success('Corretiva excluída.');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setFormData(p => ({ ...p, anexoBase64: reader.result as string, anexoNome: file.name }));
    reader.readAsDataURL(file);
  }

  function mudarStatus(os: OrdemServico, novoStatus: Exclude<StatusOS, 'atrasada' | 'programada'>) {
    if (novoStatus === 'cancelada') {
      setCancelandoOS(os);
      setMotivoCancelInput('');
      return;
    }
    setOrdens(prev => prev.map(o => o.id === os.id ? {
      ...o, status: novoStatus,
      dataEncerramento: novoStatus === 'concluida' && !o.dataEncerramento ? dataHojeISO() : o.dataEncerramento,
      dataAtualizacao: dataHojeISO(),
    } : o));
    toast.success(`OS ${os.numero} → "${STATUS_OS_CONFIG[novoStatus].label}".`);
  }

  function confirmarCancelamento() {
    if (!cancelandoOS) return;
    if (!motivoCancelInput.trim()) { toast.error('Informe o motivo do cancelamento.'); return; }
    setOrdens(prev => prev.map(o => o.id === cancelandoOS.id ? {
      ...o, status: 'cancelada', motivoCancelamento: motivoCancelInput.trim(), dataAtualizacao: dataHojeISO(),
    } : o));
    toast.success(`OS ${cancelandoOS.numero} cancelada.`);
    setCancelandoOS(null);
  }

  function handleImprimir(os: OrdemServico) {
    const eq = equipamentos.find(e => e.id === os.equipamentoId);
    imprimirOS(os, eq ? { nome: eq.nome, codigo: eq.codigo, tipo: eq.tipo, localizacao: eq.localizacao, fabricante: eq.fabricante, modelo: eq.modelo, numSerie: eq.numSerie } : undefined);
  }

  function limparFiltros() {
    setBusca(''); setFiltroStatus('todos'); setFiltroEq('todos');
    setFiltroPrioridade('todos'); setFiltroResponsavel('');
    setFiltroSetor(''); setFiltroDataInicio(''); setFiltroDataFim('');
  }

  const eqAtivos = equipamentos.filter(e => e.ativo);
  const setField = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(p => ({ ...p, [key]: e.target.value }));

  const hasFiltroAtivo = busca || filtroStatus !== 'todos' || filtroEq !== 'todos' ||
    filtroPrioridade !== 'todos' || filtroResponsavel || filtroSetor || filtroDataInicio || filtroDataFim;

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 bg-blue-50 text-blue-600"
              style={{ fontWeight: 600 }}
            >
              <Wrench style={{ width: 11, height: 11 }} />
              MANUTENÇÃO
            </div>
          </div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            OS — Corretivas
          </h1>
          <p className="text-gray-500 mt-1 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Abertura e acompanhamento de ordens de serviço corretivas por prioridade e status.
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" /> Nova Corretiva
        </Button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: contagens.total, color: 'text-gray-800', icon: null },
          { label: 'Em Andamento', value: contagens.emAndamento, color: contagens.emAndamento > 0 ? 'text-amber-600' : 'text-gray-400', icon: null },
          { label: 'Atrasadas', value: contagens.atrasada, color: contagens.atrasada > 0 ? 'text-red-600' : 'text-gray-400', icon: contagens.atrasada > 0 ? AlertTriangle : null },
          { label: 'Críticas abertas', value: contagens.criticas, color: contagens.criticas > 0 ? 'text-red-600' : 'text-gray-400', icon: contagens.criticas > 0 ? ShieldAlert : null },
          { label: 'Concluídas', value: contagens.concluida, color: 'text-emerald-600', icon: null },
          { label: 'Canceladas', value: contagens.cancelada, color: 'text-gray-400', icon: null },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>{s.label}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {s.icon && <s.icon className={`w-4 h-4 ${s.color}`} />}
              <p className={s.color} style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtro de status (pills coloridos) ── */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { key: 'todos',        label: 'Todas',        count: contagens.total },
          { key: 'aberta',       label: 'Abertas',      count: contagens.aberta },
          { key: 'triagem',      label: 'Triagem',      count: contagens.triagem },
          { key: 'em-andamento', label: 'Em Andamento', count: contagens.emAndamento },
          { key: 'aguardando',   label: 'Aguardando',   count: contagens.aguardando },
          { key: 'atrasada',     label: 'Atrasadas',    count: contagens.atrasada },
          { key: 'concluida',    label: 'Concluídas',   count: contagens.concluida },
          { key: 'cancelada',    label: 'Canceladas',   count: contagens.cancelada },
        ] as const).map(item => (
          <button
            key={item.key}
            onClick={() => setFiltroStatus(item.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
              filtroStatus === item.key ? STATUS_PILL_ACTIVE[item.key] : STATUS_PILL_IDLE[item.key]
            }`}
            style={{ fontWeight: filtroStatus === item.key ? 600 : 400 }}
          >
            {item.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filtroStatus === item.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`} style={{ fontWeight: 600 }}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-3">
        {/* Linha principal */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por número, equipamento, descrição..." className="pl-9 h-9 text-sm" />
          </div>
          <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
            <SelectTrigger className="h-9 text-xs w-[130px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda Prioridade</SelectItem>
              <SelectItem value="critica">🔴 Crítica</SelectItem>
              <SelectItem value="alta">🟠 Alta</SelectItem>
              <SelectItem value="media">🟡 Média</SelectItem>
              <SelectItem value="baixa">⚪ Baixa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroEq} onValueChange={setFiltroEq}>
            <SelectTrigger className="h-9 text-xs w-[170px]"><SelectValue placeholder="Equipamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Equipamentos</SelectItem>
              {eqAtivos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => setMostrarFiltrosAvancados(v => !v)}
            className={`text-xs px-3 h-9 rounded-lg border transition-colors ${mostrarFiltrosAvancados ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
          >
            {mostrarFiltrosAvancados ? 'Menos filtros' : '+ Filtros'}
          </button>
          {hasFiltroAtivo && (
            <button onClick={limparFiltros} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
        {/* Filtros avançados */}
        {mostrarFiltrosAvancados && (
          <div className="flex gap-3 flex-wrap pt-1 border-t border-gray-100">
            <Input value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} placeholder="Setor..." className="h-9 text-sm w-[130px]" />
            <Input value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} placeholder="Responsável..." className="h-9 text-sm w-[150px]" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">De</span>
              <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="h-9 text-xs w-[130px]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">até</span>
              <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="h-9 text-xs w-[130px]" />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-200">
                {['', 'Nº OS', 'Equipamento / Setor', 'Prioridade', 'Descrição', 'Responsável', 'Prazo', 'Custo', 'Status', 'Ações'].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs text-gray-500 ${['Ações', 'Status', 'Prazo', 'Custo', 'Prioridade'].includes(h) ? 'text-center' : 'text-left'} ${h === '' ? 'w-1 px-0' : ''}`}
                    style={{ fontWeight: 600 }}
                  >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Wrench className="w-7 h-7 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500" style={{ fontWeight: 500 }}>
                          {corretivas.length === 0 ? 'Nenhuma OS corretiva cadastrada.' : 'Nenhuma OS encontrada com os filtros aplicados.'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {corretivas.length === 0 ? 'Registre a primeira falha para começar.' : 'Tente ajustar os filtros de busca.'}
                        </p>
                      </div>
                      {corretivas.length === 0 && (
                        <Button size="sm" className="gap-2 mt-1" onClick={handleOpenNew}>
                          <Plus className="w-4 h-4" /> Abrir Corretiva
                        </Button>
                      )}
                      {corretivas.length > 0 && hasFiltroAtivo && (
                        <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={limparFiltros}>
                          <X className="w-3.5 h-3.5" /> Limpar filtros
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {filtrados.map(os => {
                const status = calcularStatusOS(os);
                const stCfg = STATUS_OS_CONFIG[status];
                const eq = equipamentos.find(e => e.id === os.equipamentoId);
                const dias = diasAtePrazo(os.prazo);
                const custo = calcularCustoTotal(os);
                const priCfg = os.prioridade ? PRIORIDADE_CONFIG[os.prioridade] : null;
                const isCriticalActive = os.prioridade === 'critica' && !['concluida', 'cancelada'].includes(status);
                const borderColor = PRIORITY_BORDER_COLOR[os.prioridade || ''] || '#e5e7eb';
                return (
                  <tr
                    key={os.id}
                    className={`hover:bg-gray-50/60 transition-colors ${isCriticalActive ? 'bg-red-50/30' : ''}`}
                    style={{ borderLeft: `3px solid ${borderColor}` }}
                  >
                    {/* Coluna vazia (serve como separador visual do border-left) */}
                    <td className="w-0 p-0" />
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 font-mono" style={{ fontWeight: 700 }}>{os.numero}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{eq?.nome || '—'}</span>
                      <span className="text-xs text-gray-400 block">{os.setor || eq?.localizacao || eq?.codigo}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {priCfg ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${priCfg.bg} ${priCfg.text} ${priCfg.border}`} style={{ fontWeight: 600 }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priCfg.dotColor}`} />
                          {priCfg.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-sm text-gray-700 line-clamp-2">{os.descricao}</span>
                      {os.solicitante && <span className="text-xs text-gray-400 block">Req: {os.solicitante}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{os.responsavel || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-500 block">{formatarData(os.prazo)}</span>
                      {status !== 'concluida' && status !== 'cancelada' && (
                        <span className={`text-[10px] ${dias < 0 ? 'text-red-600' : dias <= 3 ? 'text-amber-600' : 'text-gray-400'}`} style={{ fontWeight: 600 }}>
                          {dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {custo > 0 ? (
                        <span className="text-xs text-gray-700" style={{ fontWeight: 500 }}>
                          {custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />
                        {stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Visualizar" onClick={() => setViewingOS(os)}>
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Imprimir OS" onClick={() => handleImprimir(os)}>
                          <Printer className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        {status === 'aberta' && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Iniciar execução" onClick={() => mudarStatus(os, 'em-andamento')}>
                            <Play className="w-3.5 h-3.5 text-amber-500" />
                          </Button>
                        )}
                        {(['em-andamento', 'atrasada', 'aguardando'] as StatusOS[]).includes(status) && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Concluir" onClick={() => mudarStatus(os, 'concluida')}>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          </Button>
                        )}
                        <span className="w-px h-4 bg-gray-200 mx-0.5" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Editar" onClick={() => handleOpenEdit(os)}>
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Excluir" onClick={() => setDeleteId(os.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtrados.length} corretiva(s) exibida(s)</span>
            {filtrados.some(o => calcularCustoTotal(o) > 0) && (
              <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>
                Custo total: {filtrados.reduce((acc, o) => acc + calcularCustoTotal(o), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Form Sheet ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-full sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto px-6">
          <DialogHeader className="pb-4 pt-6">
            <DialogTitle>{editingId ? 'Editar Corretiva' : 'Nova Corretiva'}</DialogTitle>
            <DialogDescription>Preencha os dados de abertura e execução da OS corretiva.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pb-8">

            {/* Prioridade + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={v => setFormData(p => ({ ...p, prioridade: v as PrioridadeOS | 'sem-prioridade' }))}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Sem prioridade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem-prioridade">Sem prioridade</SelectItem>
                    <SelectItem value="critica">🔴 Crítica</SelectItem>
                    <SelectItem value="alta">🟠 Alta</SelectItem>
                    <SelectItem value="media">🟡 Média</SelectItem>
                    <SelectItem value="baixa">⚪ Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_CORRETIVA.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'cancelada' && (
              <div>
                <Label className="text-xs text-gray-600">Motivo do Cancelamento *</Label>
                <Input value={formData.motivoCancelamento} onChange={setField('motivoCancelamento')} placeholder="Motivo obrigatório..." className="mt-1 text-sm" />
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-600">Equipamento *</Label>
              <Select value={formData.equipamentoId} onValueChange={v => setFormData(p => ({ ...p, equipamentoId: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>
                  {equipamentos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Setor</Label>
                <Input value={formData.setor} onChange={setField('setor')} placeholder="ex: Produção" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Solicitante</Label>
                <Input value={formData.solicitante} onChange={setField('solicitante')} placeholder="Nome do solicitante" className="mt-1 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Descrição do Problema *</Label>
              <Input value={formData.descricao} onChange={setField('descricao')} placeholder="Descreva o problema encontrado" className="mt-1 text-sm" />
            </div>

            <div>
              <Label className="text-xs text-gray-600">Responsável</Label>
              <Input value={formData.responsavel} onChange={setField('responsavel')} placeholder="Técnico responsável" className="mt-1 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Data de Abertura *</Label>
                <Input type="date" value={formData.dataAbertura} onChange={setField('dataAbertura')} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Prazo *</Label>
                <Input type="date" value={formData.prazo} onChange={setField('prazo')} className="mt-1 text-sm" />
              </div>
            </div>

            {formData.status === 'concluida' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div>
                  <Label className="text-xs text-emerald-700">Data de Encerramento</Label>
                  <Input type="date" value={formData.dataEncerramento} onChange={setField('dataEncerramento')} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-emerald-700">Horas de Reparo</Label>
                  <Input type="number" min="0" step="0.5" value={formData.horasReparo} onChange={setField('horasReparo')} placeholder="ex: 2.5" className="mt-1 text-sm" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Custos (R$)</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'custoPecas' as const, label: 'Peças' },
                  { key: 'custoServico' as const, label: 'Serviço' },
                  { key: 'custoMaoObra' as const, label: 'Mão de Obra' },
                ]).map(({ key, label }) => (
                  <div key={key}>
                    <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
                    <CurrencyInput
                      value={formData[key]}
                      onChange={v => setFormData(p => ({ ...p, [key]: v }))}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
              {(parseFloat(formData.custoPecas || '0') + parseFloat(formData.custoServico || '0') + parseFloat(formData.custoMaoObra || '0')) > 0 && (
                <p className="text-xs text-gray-500 text-right" style={{ fontWeight: 500 }}>
                  Total: {(parseFloat(formData.custoPecas || '0') + parseFloat(formData.custoServico || '0') + parseFloat(formData.custoMaoObra || '0')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs text-gray-600">Observações</Label>
              <Input value={formData.observacao} onChange={setField('observacao')} placeholder="Observações adicionais..." className="mt-1 text-sm" />
            </div>

            <div>
              <Label className="text-xs text-gray-600">Evidência / Anexo</Label>
              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-xs text-gray-600 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {formData.anexoNome || 'Selecionar arquivo'}
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
                </label>
                {formData.anexoNome && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setFormData(p => ({ ...p, anexoBase64: '', anexoNome: '' }))}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewingOS} onOpenChange={() => setViewingOS(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>OS {viewingOS?.numero} — Corretiva</DialogTitle>
            <DialogDescription>Detalhes da ordem de serviço corretiva</DialogDescription>
          </DialogHeader>
          {viewingOS && (() => {
            const status = calcularStatusOS(viewingOS);
            const stCfg = STATUS_OS_CONFIG[status];
            const tipoCfg = TIPO_MANUTENCAO_CONFIG[viewingOS.tipo];
            const priCfg = viewingOS.prioridade ? PRIORIDADE_CONFIG[viewingOS.prioridade] : null;
            const eq = equipamentos.find(e => e.id === viewingOS.equipamentoId);
            const custo = calcularCustoTotal(viewingOS);
            return (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />{stCfg.label}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>{tipoCfg.label}</span>
                    {priCfg && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${priCfg.bg} ${priCfg.text} ${priCfg.border}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priCfg.dotColor}`} />{priCfg.label}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => handleImprimir(viewingOS)}>
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs text-gray-400 block">Equipamento</span><span className="text-gray-800" style={{ fontWeight: 500 }}>{eq?.nome || '—'}</span></div>
                  <div><span className="text-xs text-gray-400 block">Setor</span><span className="text-gray-700">{viewingOS.setor || '—'}</span></div>
                  <div><span className="text-xs text-gray-400 block">Responsável</span><span className="text-gray-700">{viewingOS.responsavel || '—'}</span></div>
                  <div><span className="text-xs text-gray-400 block">Solicitante</span><span className="text-gray-700">{viewingOS.solicitante || '—'}</span></div>
                  <div><span className="text-xs text-gray-400 block">Abertura</span><span className="text-gray-700">{formatarData(viewingOS.dataAbertura)}</span></div>
                  <div><span className="text-xs text-gray-400 block">Prazo</span><span className="text-gray-700">{formatarData(viewingOS.prazo)}</span></div>
                  {viewingOS.dataEncerramento && <div><span className="text-xs text-gray-400 block">Encerramento</span><span className="text-gray-700">{formatarData(viewingOS.dataEncerramento)}</span></div>}
                  {viewingOS.horasReparo != null && <div><span className="text-xs text-gray-400 block">Horas</span><span className="text-gray-700">{viewingOS.horasReparo}h</span></div>}
                </div>
                {custo > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-400 block">Peças</span><span className="text-gray-700" style={{ fontWeight: 500 }}>R$ {(viewingOS.custoPecas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                    <div><span className="text-gray-400 block">Serviço</span><span className="text-gray-700" style={{ fontWeight: 500 }}>R$ {(viewingOS.custoServico || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                    <div><span className="text-gray-400 block">Mão de Obra</span><span className="text-gray-700" style={{ fontWeight: 500 }}>R$ {(viewingOS.custoMaoObra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                    <div className="col-span-3 pt-1 border-t border-gray-200"><span style={{ fontWeight: 600 }}>Total: R$ {custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                )}
                <div><span className="text-xs text-gray-400 block mb-1">Descrição</span><p className="text-gray-700 bg-gray-50 rounded-lg p-3">{viewingOS.descricao}</p></div>
                {viewingOS.motivoCancelamento && <div><span className="text-xs text-gray-400 block mb-1">Motivo Cancelamento</span><p className="text-red-600 text-xs bg-red-50 rounded-lg p-3">{viewingOS.motivoCancelamento}</p></div>}
                {viewingOS.observacao && <div><span className="text-xs text-gray-400 block mb-1">Observações</span><p className="text-gray-600 text-xs">{viewingOS.observacao}</p></div>}
                {viewingOS.anexoBase64 && (
                  <a href={viewingOS.anexoBase64} download={viewingOS.anexoNome} className="flex items-center gap-2 text-blue-600 text-xs hover:text-blue-800">
                    <Download className="w-3.5 h-3.5" /> {viewingOS.anexoNome}
                  </a>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Cancelamento ── */}
      <AlertDialog open={!!cancelandoOS} onOpenChange={() => setCancelandoOS(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar OS {cancelandoOS?.numero}</AlertDialogTitle>
            <AlertDialogDescription>Informe o motivo do cancelamento (obrigatório).</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Input value={motivoCancelInput} onChange={e => setMotivoCancelInput(e.target.value)} placeholder="Motivo do cancelamento..." className="text-sm" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarCancelamento} className="bg-red-600 hover:bg-red-700">Confirmar Cancelamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Exclusão ── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Corretiva</AlertDialogTitle>
            <AlertDialogDescription>A OS será excluída permanentemente.</AlertDialogDescription>
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
