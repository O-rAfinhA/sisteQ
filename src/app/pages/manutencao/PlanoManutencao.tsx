/**
 * Manutenção / Planos de Manutenção Preventiva
 * Cadastro de planos com itens de verificação e periodicidade por item.
 * O sistema calcula automaticamente quando cada item é devido.
 * "Baixar" registra a execução e reinicia o ciclo de cada item verificado.
 */
import { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
  Clock, Plus, Edit2, Trash2, Search, Save, X, CheckSquare,
  AlertTriangle, CheckCircle2, ArrowDownCircle, History, Eye, Wrench, User,
} from 'lucide-react';
import { formatarData, dataHojeISO } from '../../utils/formatters';
import { generateId } from '../../utils/helpers';
import { getFromStorage } from '../../utils/helpers';
import {
  useManutencao,
  calcularStatusPlano, calcularProximaExecucaoItem, calcularDataMaisUrgenteDoPlano,
  diasAtePrazo, gerarCodigoPlano,
  STATUS_PLANO_CONFIG, PERIODICIDADE_CONFIG,
  type PlanoManutencao, type ItemVerificacao, type PeriodicidadePlano, type StatusPlano
} from '../../hooks/useManutencao';
import { PlanoEditSheet } from '../../components/manutencao/PlanoEditSheet';
import { ConfiguracaoManutencaoSheet } from '../../components/manutencao/ConfiguracaoManutencaoSheet';

// ─── Form state ─────────────────────────────────────
const FORM_VAZIO = {
  equipamentoId: '',
  descricao: '',
  dataInicio: dataHojeISO(),
  duracaoEstimada: '',
  necessitaParada: false,
  responsavel: '',
  status: 'ativo' as StatusPlano,
  observacoes: '',
  itensVerificacao: [] as ItemVerificacao[],
};

const ITEM_VAZIO = { descricao: '', periodicidade: 'mensal' as PeriodicidadePlano };

// ─── Componente ──────────────────────────────────────
export function ManutencaoPlano() {
  const { planos, setPlanos, equipamentos } = useManutencao();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroEq, setFiltroEq] = useState('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');

  // Form (criação)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ ...FORM_VAZIO });
  const [novoItem, setNovoItem] = useState({ ...ITEM_VAZIO });

  // Edição via PlanoEditSheet
  const [editingPlano, setEditingPlano] = useState<PlanoManutencao | null>(null);

  // Detalhe / baixar
  const [viewingPlano, setViewingPlano] = useState<PlanoManutencao | null>(null);
  const [baixandoPlano, setBaixandoPlano] = useState<PlanoManutencao | null>(null);
  const [dataExecucao, setDataExecucao] = useState(dataHojeISO());
  const [realizadoPor, setRealizadoPor] = useState('');
  const [itensMarcados, setItensMarcados] = useState<Set<string>>(new Set());

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const eqAtivos = equipamentos.filter(e => e.ativo);

  // ─── Filtro ───
  const filtrados = useMemo(() => {
    return planos.filter(p => {
      const status = calcularStatusPlano(p);
      const eq = equipamentos.find(e => e.id === p.equipamentoId);
      const matchBusca = !busca || [p.codigo, p.nome, p.descricao, eq?.nome, p.responsavel].some(v =>
        v?.toLowerCase().includes(busca.toLowerCase())
      );
      const matchStatus = filtroStatus === 'todos' || status === filtroStatus;
      const matchEq = filtroEq === 'todos' || p.equipamentoId === filtroEq;
      const matchResp = !filtroResponsavel || p.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase());
      return matchBusca && matchStatus && matchEq && matchResp;
    }).sort((a, b) => {
      // Vencidos primeiro
      const sa = calcularStatusPlano(a);
      const sb = calcularStatusPlano(b);
      if (sa === 'vencido' && sb !== 'vencido') return -1;
      if (sb === 'vencido' && sa !== 'vencido') return 1;
      const da = calcularDataMaisUrgenteDoPlano(a) || '';
      const db = calcularDataMaisUrgenteDoPlano(b) || '';
      return da.localeCompare(db);
    });
  }, [planos, busca, filtroStatus, filtroEq, filtroResponsavel, equipamentos]);

  // ─── Form ───
  function handleOpenNew() {
    setFormData({ ...FORM_VAZIO, dataInicio: dataHojeISO() });
    setNovoItem({ ...ITEM_VAZIO });
    setIsFormOpen(true);
  }

  function handleOpenEdit(p: PlanoManutencao) {
    setEditingPlano(p);
  }

  function adicionarItem() {
    if (!novoItem.descricao.trim()) { toast.error('Informe a descrição do item.'); return; }
    const item: ItemVerificacao = {
      id: generateId('iv-'),
      descricao: novoItem.descricao.trim(),
      periodicidade: novoItem.periodicidade,
    };
    setFormData(p => ({ ...p, itensVerificacao: [...p.itensVerificacao, item] }));
    setNovoItem({ ...ITEM_VAZIO });
  }

  function removerItem(id: string) {
    setFormData(p => ({ ...p, itensVerificacao: p.itensVerificacao.filter(i => i.id !== id) }));
  }

  function handleSave() {
    if (!formData.equipamentoId) { toast.error('Selecione o equipamento.'); return; }
    if (!formData.dataInicio) { toast.error('Informe a data de início.'); return; }
    if (formData.itensVerificacao.length === 0) { toast.error('Adicione ao menos um item de verificação.'); return; }
    const eq = eqAtivos.find(e => e.id === formData.equipamentoId);
    const nomeDerivado = eq ? eq.nome : 'Equipamento';
    const agora = dataHojeISO();
    const novo: PlanoManutencao = {
      id: generateId('pm-'), codigo: gerarCodigoPlano(planos),
      nome: nomeDerivado,
      equipamentoId: formData.equipamentoId,
      descricao: formData.descricao.trim() || undefined,
      dataInicio: formData.dataInicio,
      duracaoEstimada: formData.duracaoEstimada ? parseFloat(formData.duracaoEstimada) : undefined,
      necessitaParada: formData.necessitaParada,
      responsavel: formData.responsavel.trim(),
      status: formData.status,
      observacoes: formData.observacoes.trim() || undefined,
      itensVerificacao: formData.itensVerificacao,
      dataCriacao: agora, dataAtualizacao: agora,
    };
    setPlanos(prev => [...prev, novo]);
    toast.success(`Plano ${novo.codigo} criado.`);
    setIsFormOpen(false);
  }

  function handleDelete() {
    if (!deleteId) return;
    setPlanos(prev => prev.filter(p => p.id !== deleteId));
    setDeleteId(null);
    toast.success('Plano excluído.');
  }

  // ─── Baixar ───
  function abrirBaixar(plano: PlanoManutencao) {
    setBaixandoPlano(plano);
    setDataExecucao(dataHojeISO());
    setRealizadoPor('');
    // Pré-seleciona todos os itens vencidos
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencidos = new Set<string>(
      (plano.itensVerificacao || [])
        .filter(i => new Date(calcularProximaExecucaoItem(i, plano.dataInicio)) <= hoje)
        .map(i => i.id)
    );
    setItensMarcados(vencidos.size > 0 ? vencidos : new Set());
  }

  function toggleItem(id: string) {
    setItensMarcados(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function confirmarBaixar() {
    if (!baixandoPlano) return;
    if (itensMarcados.size === 0) { toast.error('Selecione ao menos um item para registrar.'); return; }
    setPlanos(prev => prev.map(p => {
      if (p.id !== baixandoPlano.id) return p;
      return {
        ...p,
        itensVerificacao: (p.itensVerificacao || []).map(i => {
          if (!itensMarcados.has(i.id)) return i;
          // Acumula o histórico sem duplicar a data
          const historico = i.historicoExecucoes ?? [];
          const novoHistorico = historico.includes(dataExecucao)
            ? historico
            : [...historico, dataExecucao].sort();
          const nomeResp = realizadoPor.trim();
          const historicoResp = nomeResp
            ? [...(i.historicoRealizadoPor ?? []), nomeResp]
            : i.historicoRealizadoPor;
          return {
            ...i,
            ultimaExecucao: dataExecucao,
            historicoExecucoes: novoHistorico,
            realizadoPor: nomeResp || i.realizadoPor,
            historicoRealizadoPor: historicoResp,
          };
        }),
        dataAtualizacao: dataHojeISO(),
      };
    }));
    toast.success(`${itensMarcados.size} item(s) registrado(s) em ${formatarData(dataExecucao)}.`);
    setBaixandoPlano(null);
  }

  // ─── Helpers de exibição ───
  function statusItem(item: ItemVerificacao, dataInicio: string) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const prox = new Date(calcularProximaExecucaoItem(item, dataInicio));
    const diff = Math.ceil((prox.getTime() - hoje.getTime()) / 86400000);
    if (diff < 0) return { cor: 'text-red-600', bg: 'bg-red-50 border-red-200', label: `${Math.abs(diff)}d atrasado`, urgente: true };
    if (diff === 0) return { cor: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Hoje', urgente: true };
    if (diff <= 7) return { cor: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', label: `em ${diff}d`, urgente: false };
    return { cor: 'text-gray-500', bg: 'bg-gray-50 border-gray-100', label: `em ${diff}d`, urgente: false };
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 bg-blue-50 text-blue-600" style={{ fontWeight: 600 }}>
              <Wrench style={{ width: 11, height: 11 }} />
              MANUTENÇÃO
            </div>
          </div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Planos de Manutenção Preventiva
          </h1>
          <p className="text-gray-500 mt-1 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Cadastre planos com itens de verificação e periodicidades individuais. O sistema calcula automaticamente os próximos vencimentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenNew} className="gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de Planos', value: planos.length, color: 'text-gray-800' },
          { label: 'Ativos', value: planos.filter(p => calcularStatusPlano(p) === 'ativo').length, color: 'text-emerald-600' },
          { label: 'Vencidos', value: planos.filter(p => calcularStatusPlano(p) === 'vencido').length, color: planos.filter(p => calcularStatusPlano(p) === 'vencido').length > 0 ? 'text-red-600' : 'text-gray-400' },
          { label: 'Inativos', value: planos.filter(p => p.status === 'inativo').length, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>{s.label}</p>
            <p className={`mt-0.5 ${s.color}`} style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar plano, equipamento..." className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="h-9 text-xs w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEq} onValueChange={setFiltroEq}>
          <SelectTrigger className="h-9 text-xs w-[160px]"><SelectValue placeholder="Equipamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Equipamentos</SelectItem>
            {eqAtivos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} placeholder="Responsável..." className="h-9 text-sm w-[140px]" />
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-200">
                {['Código / Nome', 'Equipamento', 'Itens', 'Próx. Vencimento', 'Responsável', 'Duração', 'Status', 'Ações'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs text-gray-500 ${['Ações', 'Status', 'Próx. Vencimento', 'Itens', 'Duração'].includes(h) ? 'text-center' : 'text-left'}`} style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Nenhum plano encontrado.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleOpenNew}><Plus className="w-4 h-4" /> Criar Plano</Button>
                </td></tr>
              )}
              {filtrados.map(plano => {
                const status = calcularStatusPlano(plano);
                const stCfg = STATUS_PLANO_CONFIG[status];
                const eq = equipamentos.find(e => e.id === plano.equipamentoId);
                const proxData = calcularDataMaisUrgenteDoPlano(plano);
                const dias = proxData ? diasAtePrazo(proxData) : null;
                const itens = plano.itensVerificacao || [];
                const vencidos = proxData ? itens.filter(i => diasAtePrazo(calcularProximaExecucaoItem(i, plano.dataInicio)) < 0).length : 0;
                const executados = itens.filter(i => !!i.ultimaExecucao).length;
                return (
                  <tr key={plano.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 font-mono" style={{ fontWeight: 600 }}>{plano.codigo}</span>
                      <span className="text-sm text-gray-700 block">{plano.nome}</span>
                      {plano.necessitaParada && (
                        <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded" style={{ fontWeight: 500 }}>
                          Necessita Parada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{eq?.nome || '—'}</span>
                      <span className="text-xs text-gray-400 block">{eq?.codigo}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${itens.length > 0 ? 'text-gray-700' : 'text-gray-400'}`} style={{ fontWeight: 600 }}>{itens.length}</span>
                      {executados > 0 && (
                        <span className="block text-[10px] text-emerald-600" style={{ fontWeight: 500 }}>{executados} executado{executados !== 1 ? 's' : ''}</span>
                      )}
                      {vencidos > 0 && (
                        <span className="block text-[10px] text-red-600" style={{ fontWeight: 500 }}>{vencidos} vencido{vencidos !== 1 ? 's' : ''}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {proxData ? (
                        <>
                          <span className="text-xs text-gray-600 block">{formatarData(proxData)}</span>
                          <span className={`text-[10px] ${dias! < 0 ? 'text-red-600' : dias! <= 7 ? 'text-amber-600' : 'text-gray-400'}`} style={{ fontWeight: 500 }}>
                            {dias! < 0 ? `${Math.abs(dias!)}d atraso` : dias === 0 ? 'Hoje' : `em ${dias}d`}
                          </span>
                        </>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-gray-600">{plano.responsavel || '—'}</span></td>
                    <td className="px-4 py-3 text-center">
                      {plano.duracaoEstimada ? (
                        <span className="text-xs text-gray-600">{plano.duracaoEstimada}h</span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                        {stCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Baixar */}
                        <Button
                          variant="ghost" size="sm"
                          className={`h-7 px-2 gap-1 text-xs ${status === 'vencido' ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                          onClick={() => abrirBaixar(plano)}
                          title="Registrar Execução"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" /> Baixar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Visualizar" onClick={() => setViewingPlano(plano)}>
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingPlano(plano)}>
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(plano.id)}>
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
          <div className="px-4 py-2.5 bg-gray-50/40 border-t border-gray-100">
            <span className="text-xs text-gray-400">{filtrados.length} plano(s) exibido(s)</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
           SHEET — Visualizar Plano (somente leitura)
      ══════════════════════════════════ */}
      <Dialog open={!!viewingPlano} onOpenChange={() => setViewingPlano(null)}>
        <DialogContent className="w-full sm:max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto px-6">
          {viewingPlano && (() => {
            const eq = equipamentos.find(e => e.id === viewingPlano.equipamentoId);
            const status = calcularStatusPlano(viewingPlano);
            const stCfg = STATUS_PLANO_CONFIG[status];
            const itens = viewingPlano.itensVerificacao || [];
            return (
              <>
                <DialogHeader className="pb-4 pt-6">
                  <div className="flex items-start justify-between pr-2">
                    <div>
                      <DialogTitle className="font-mono">{viewingPlano.codigo}</DialogTitle>
                      <DialogDescription className="mt-0.5">{viewingPlano.nome}</DialogDescription>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border mt-1 ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                      {stCfg.label}
                    </span>
                  </div>
                </DialogHeader>

                <div className="space-y-5 pb-10">

                  {/* Equipamento + Data */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>Equipamento</p>
                      <p className="text-sm text-gray-800 mt-0.5" style={{ fontWeight: 500 }}>{eq?.nome || '—'}</p>
                      <p className="text-xs text-gray-400">{eq?.codigo}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>Data de Início</p>
                      <p className="text-sm text-gray-700 mt-0.5">{viewingPlano.dataInicio ? formatarData(viewingPlano.dataInicio) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>Responsável</p>
                      <p className="text-sm text-gray-700 mt-0.5">{viewingPlano.responsavel || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>Duração Est.</p>
                      <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
                        {viewingPlano.duracaoEstimada ? <><Clock className="w-3.5 h-3.5 text-gray-400" />{viewingPlano.duracaoEstimada}h</> : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Alertas especiais */}
                  {viewingPlano.necessitaParada && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span style={{ fontWeight: 500 }}>Este plano necessita parada do equipamento para execução.</span>
                    </div>
                  )}

                  {/* Descrição */}
                  {viewingPlano.descricao && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 600 }}>Descrição / Objetivo</p>
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 leading-relaxed">
                        {viewingPlano.descricao}
                      </p>
                    </div>
                  )}

                  {/* Itens de verificação */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                        Itens de Verificação
                      </p>
                      <span className="text-[10px] text-gray-400">{itens.length} item(s)</span>
                    </div>
                    {itens.length === 0 ? (
                      <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400">Nenhum item cadastrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {itens.map((item, idx) => {
                          const st = statusItem(item, viewingPlano.dataInicio);
                          const prox = calcularProximaExecucaoItem(item, viewingPlano.dataInicio);
                          const historico = item.historicoExecucoes ?? [];
                          return (
                            <div key={item.id} className={`rounded-lg border px-4 py-3 ${st.bg}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-xs text-gray-400 mt-0.5 shrink-0">{idx + 1}.</span>
                                  <div className="min-w-0">
                                    <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{item.descricao}</p>
                                    <p className="text-xs text-blue-600 mt-0.5">{PERIODICIDADE_CONFIG[item.periodicidade].label}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-xs ${st.cor}`} style={{ fontWeight: 600 }}>{st.label}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">Próx: {formatarData(prox)}</p>
                                </div>
                              </div>
                              {/* Histórico de execuções */}
                              {historico.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100/80">
                                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-1.5">
                                    <History className="w-3 h-3" /> Histórico ({historico.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {historico.slice(-6).map((d, i) => (
                                      <span key={i} className="text-[10px] bg-white/80 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                                        {formatarData(d)}
                                      </span>
                                    ))}
                                    {historico.length > 6 && (
                                      <span className="text-[10px] text-gray-400">+{historico.length - 6} ant.</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Última execução se não tem histórico */}
                              {historico.length === 0 && item.ultimaExecucao && (
                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Última execução: {formatarData(item.ultimaExecucao)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Observações */}
                  {viewingPlano.observacoes && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 600 }}>Observações</p>
                      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 leading-relaxed">
                        {viewingPlano.observacoes}
                      </p>
                    </div>
                  )}

                  {/* Metadados */}
                  <div className="flex items-center justify-between text-[10px] text-gray-300 pt-1">
                    <span>Criado: {viewingPlano.dataCriacao ? formatarData(viewingPlano.dataCriacao) : '—'}</span>
                    <span>Atualizado: {viewingPlano.dataAtualizacao ? formatarData(viewingPlano.dataAtualizacao) : '—'}</span>
                  </div>

                  {/* Ações */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setViewingPlano(null)}>Fechar</Button>
                    <Button
                      className="gap-2"
                      onClick={() => {
                        const plano = viewingPlano!;
                        setViewingPlano(null);
                        setTimeout(() => setEditingPlano(plano), 200);
                      }}
                    >
                      <Edit2 className="w-4 h-4" /> Editar Plano
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════
           DIALOG — Registrar Execução (Baixar)
      ══════════════════════════════════ */}
      <Dialog open={!!baixandoPlano} onOpenChange={() => setBaixandoPlano(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Execução — {baixandoPlano?.codigo}</DialogTitle>
            <DialogDescription>
              Marque os itens verificados e confirme. O próximo vencimento será calculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          {baixandoPlano && (() => {
            const itens = baixandoPlano.itensVerificacao || [];
            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
            return (
              <div className="space-y-4">
                {/* Data de execução */}
                <div>
                  <Label className="text-xs text-gray-600">Data de Execução</Label>
                  <Input
                    type="date"
                    value={dataExecucao}
                    onChange={e => setDataExecucao(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>

                {/* Realizado por */}
                <div>
                  <Label className="text-xs text-gray-600">Realizado por</Label>
                  <Input
                    value={realizadoPor}
                    onChange={e => setRealizadoPor(e.target.value)}
                    placeholder="Nome do técnico"
                    className="mt-1 text-sm"
                  />
                </div>

                {/* Lista de itens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>Itens de Verificação</span>
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800" onClick={() => setItensMarcados(new Set(itens.map(i => i.id)))}>
                        Todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => setItensMarcados(new Set())}>
                        Nenhum
                      </button>
                    </div>
                  </div>

                  {itens.map(item => {
                    const proxData = calcularProximaExecucaoItem(item, baixandoPlano.dataInicio);
                    const proxDate = new Date(proxData);
                    const diff = Math.ceil((proxDate.getTime() - hoje.getTime()) / 86400000);
                    const isVencido = diff < 0;
                    const marcado = itensMarcados.has(item.id);
                    const historico = (item.historicoExecucoes ?? []).slice().reverse(); // mais recente primeiro
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          marcado ? 'bg-emerald-50 border-emerald-200' : isVencido ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => toggleItem(item.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{item.descricao}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-blue-600">{PERIODICIDADE_CONFIG[item.periodicidade].label}</span>
                            <span className={`text-xs ${isVencido ? 'text-red-600' : diff <= 7 ? 'text-amber-600' : 'text-gray-400'}`} style={{ fontWeight: 500 }}>
                              {isVencido ? `${Math.abs(diff)}d atrasado` : diff === 0 ? 'Vence hoje' : `Vence em ${diff}d`}
                            </span>
                          </div>
                          {/* Histórico de execuções */}
                          {historico.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1 mb-1">
                                <History className="w-3 h-3 text-gray-400" />
                                <span className="text-[10px] text-gray-400" style={{ fontWeight: 600 }}>
                                  Execuções registradas ({historico.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {historico.slice(0, 6).map((d, i) => (
                                  <span
                                    key={i}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                      i === 0
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-gray-50 border-gray-100 text-gray-500'
                                    }`}
                                    title={i === 0 ? 'Mais recente' : ''}
                                  >
                                    {formatarData(d)}
                                  </span>
                                ))}
                                {historico.length > 6 && (
                                  <span className="text-[10px] text-gray-400 px-1">+{historico.length - 6} mais</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {isVencido && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                        {marcado && !isVencido && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setBaixandoPlano(null)}>Cancelar</Button>
                  <Button onClick={confirmarBaixar} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <CheckSquare className="w-4 h-4" /> Confirmar Execução ({itensMarcados.size})
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>O plano será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══════════════════════════════════
           SHEET — Criar Novo Plano
      ══════════════════════════════════ */}
      <Dialog open={isFormOpen} onOpenChange={v => { if (!v) setIsFormOpen(false); }}>
        <DialogContent className="w-full sm:max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto px-6">
          <DialogHeader className="pb-4 pt-6">
            <DialogTitle>Novo Plano de Manutenção Preventiva</DialogTitle>
            <DialogDescription>Preencha os dados e adicione os itens de verificação com suas periodicidades.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pb-10">
            {/* Equipamento */}
            <div>
              <Label className="text-xs text-gray-600">Equipamento *</Label>
              <p className="text-[11px] text-gray-400 mt-0.5 mb-1">O nome do plano será o nome do equipamento selecionado.</p>
              <Select value={formData.equipamentoId} onValueChange={v => setFormData(p => ({ ...p, equipamentoId: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>
                  {eqAtivos.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} — {e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {formData.equipamentoId && (() => {
                const eq = eqAtivos.find(e => e.id === formData.equipamentoId);
                return eq ? <p className="text-xs text-blue-600 mt-1.5 pl-1">Nome do plano: <span style={{ fontWeight: 600 }}>{eq.nome}</span></p> : null;
              })()}
            </div>

            {/* Descrição */}
            <div>
              <Label className="text-xs text-gray-600">Descrição / Objetivo do Plano</Label>
              <Input
                value={formData.descricao}
                onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Objetivo geral deste plano preventivo..."
                className="mt-1 text-sm"
              />
            </div>

            {/* Data início + Duração + Parada */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Data de Início *</Label>
                <Input type="date" value={formData.dataInicio} onChange={e => setFormData(p => ({ ...p, dataInicio: e.target.value }))} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Duração Est. (h)</Label>
                <Input type="number" min="0" step="0.5" value={formData.duracaoEstimada} onChange={e => setFormData(p => ({ ...p, duracaoEstimada: e.target.value }))} placeholder="ex: 2.5" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Necessita Parada?</Label>
                <Select value={formData.necessitaParada ? 'sim' : 'nao'} onValueChange={v => setFormData(p => ({ ...p, necessitaParada: v === 'sim' }))}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsável + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Responsável</Label>
                <Input value={formData.responsavel} onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do técnico" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as StatusPlano }))}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Itens de verificação */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-600" style={{ fontWeight: 600 }}>Itens de Verificação *</Label>
                <span className="text-[10px] text-gray-400">{formData.itensVerificacao.length} item(s)</span>
              </div>
              {formData.itensVerificacao.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center mb-3">
                  <p className="text-xs text-gray-400">Nenhum item. Adicione abaixo.</p>
                </div>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {formData.itensVerificacao.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 group">
                      <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800 block truncate">{item.descricao}</span>
                        <span className="text-xs text-blue-600">{PERIODICIDADE_CONFIG[item.periodicidade].label}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removerItem(item.id)}>
                        <X className="w-3 h-3 text-gray-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {/* Adicionar item */}
              <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Adicionar item</p>
                <Input
                  value={novoItem.descricao}
                  onChange={e => setNovoItem(p => ({ ...p, descricao: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem(); } }}
                  placeholder="Descrição do item de verificação..."
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Select value={novoItem.periodicidade} onValueChange={v => setNovoItem(p => ({ ...p, periodicidade: v as PeriodicidadePlano }))}>
                    <SelectTrigger className="text-sm flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PERIODICIDADE_CONFIG) as [PeriodicidadePlano, { label: string }][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={adicionarItem} className="gap-1.5 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-xs text-gray-600">Observações</Label>
              <Input value={formData.observacoes} onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} placeholder="Informações adicionais..." className="mt-1 text-sm" />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" /> Criar Plano
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════
           SHEET — Editar Plano (PlanoEditSheet reutilizável)
      ══════════════════════════════════ */}
      {editingPlano && (
        <PlanoEditSheet
          plano={editingPlano}
          onClose={() => setEditingPlano(null)}
          setPlanosPai={setPlanos}
        />
      )}
    </div>
  );
}
