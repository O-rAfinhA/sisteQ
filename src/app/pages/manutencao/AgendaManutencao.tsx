/**
 * Manutenção / Agenda de Manutenção
 * Visão mensal dos planos preventivos agrupados por equipamento por dia.
 * Cada célula do calendário exibe UM card por equipamento, indicando
 * quantos itens de verificação vencem naquele dia.
 */
import { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Clock, Edit2, CheckCircle2, CheckCheck, Wrench, User } from 'lucide-react';
import { formatarData, dataHojeISO } from '../../utils/formatters';
import { toast } from 'sonner';
import {
  useManutencao,
  calcularStatusPlano, calcularProximaExecucaoItem,
  PERIODICIDADE_CONFIG,
  type PlanoManutencao, type ItemVerificacao,
} from '../../hooks/useManutencao';
import { PlanoEditSheet } from '../../components/manutencao/PlanoEditSheet';
import { ConfiguracaoManutencaoSheet } from '../../components/manutencao/ConfiguracaoManutencaoSheet';

// ─── Tipos internos ─────────────────────────────────
/** Um item de verificação com contexto de data */
interface EventoItem {
  item: ItemVerificacao;
  dueDate: string;
  diasRestantes: number;
}

/** Agrupamento de todos os itens de um equipamento/plano num mesmo dia */
interface GrupoDia {
  plano: PlanoManutencao;
  equipamentoId: string;
  equipamentoNome: string;
  dueDate: string;
  itens: EventoItem[];
  /** diasRestantes do item mais urgente (mais negativo = mais atrasado) */
  piorDias: number;
}

type CorEvento = 'vencido' | 'hoje' | 'urgente' | 'futuro';

function corEvento(dias: number): CorEvento {
  if (dias < 0)  return 'vencido';
  if (dias === 0) return 'hoje';
  if (dias <= 7)  return 'urgente';
  return 'futuro';
}

const COR_CONFIG: Record<CorEvento, { dot: string; badge: string; text: string; border: string; bg: string }> = {
  vencido:  { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',      text: 'text-red-700',    border: 'border-red-200',    bg: 'bg-red-50'    },
  hoje:     { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700',  border: 'border-amber-200',  bg: 'bg-amber-50'  },
  urgente:  { dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', text: 'text-yellow-700', border: 'border-yellow-100', bg: 'bg-yellow-50' },
  futuro:   { dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200',   text: 'text-blue-700',   border: 'border-blue-200',   bg: 'bg-blue-50'   },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Helpers de data ─────────────────────────────────
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Verifica se um item de verificação já foi executado para o período do dueDate.
 * Prioridade 1: campo direto ultimaDueDateExecutada (gravado desde a v2 do flow).
 * Prioridade 2: janela heurística [dueDate − periodicidade , dueDate] (dados legados).
 */
function itemBaixadoParaData(iv: ItemVerificacao, dueDate: string): boolean {
  // Verificação direta — gravada ao dar baixa a partir da v2
  if (iv.ultimaDueDateExecutada === dueDate) return true;
  // Fallback para dados gravados antes do campo ultimaDueDateExecutada existir
  if (!iv.ultimaExecucao) return false;
  const execDate = parseLocal(iv.ultimaExecucao);
  const due      = parseLocal(dueDate);
  const dias     = PERIODICIDADE_CONFIG[iv.periodicidade]?.diasAproximados ?? 0;
  if (dias <= 0) return true;
  const inicio = new Date(due);
  inicio.setDate(inicio.getDate() - dias);
  return execDate >= inicio && execDate <= due;
}

// ─── Componente ──────────────────────────────────────
export function ManutencaoAgenda() {
  const { planos, setPlanos, equipamentos } = useManutencao();
  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoDia | null>(null);
  const [editandoPlano, setEditandoPlano] = useState<PlanoManutencao | null>(null);
  // IDs de itens baixados — chave: "${planoId}:${itemIdx}" (por índice, independe de iv.id)
  const [baixados, setBaixados] = useState<Set<string>>(new Set());
  // Dados por item: realizadoPor e data de execução (editável antes de dar baixa)
  const [itemData, setItemData] = useState<Map<string, { realizadoPor: string; dataExecucao: string }>>(new Map());
  // Grupos executados nesta sessão — chave: "${planoId}-${dueDate}" → GrupoDia
  // Guardamos o objeto inteiro para renderizar o card cinza mesmo após o grupo sumir do useMemo
  const [executadosNaSessao, setExecutadosNaSessao] = useState<Map<string, GrupoDia>>(new Map());

  function prevMes() {
    setExecutadosNaSessao(new Map()); // limpa cinzas ao navegar de mês
    if (mes === 0) { setMes(11); setAno(a => a - 1); } else setMes(m => m - 1);
  }
  function nextMes() {
    setExecutadosNaSessao(new Map()); // limpa cinzas ao navegar de mês
    if (mes === 11) { setMes(0); setAno(a => a + 1); } else setMes(m => m + 1);
  }
  function irParaHoje() { setMes(hoje.getMonth()); setAno(hoje.getFullYear()); }

  // ─── Gerar grupos por dia ───────────────────────────
  const { gruposPorDia, gruposVencidosAnteriores } = useMemo(() => {
    const planosAtivos = planos.filter(p => calcularStatusPlano(p) !== 'inativo');
    const primeiroDoMes = new Date(ano, mes, 1);
    primeiroDoMes.setHours(0, 0, 0, 0);
    const ultimoDoMes = new Date(ano, mes + 1, 0);
    ultimoDoMes.setHours(23, 59, 59, 999);

    // mapa[dueISO][planoId] = GrupoDia
    const mapa: Record<string, Record<string, GrupoDia>> = {};
    // antigos[planoId] = GrupoDia
    const antigosMap: Record<string, GrupoDia> = {};

    planosAtivos.forEach(plano => {
      if (!plano.dataInicio) return;
      const eq = equipamentos.find(e => e.id === plano.equipamentoId);
      const equip = eq?.nome || 'Equipamento';
      const itens = plano.itensVerificacao || [];

      itens.forEach(item => {
        const diasPeriodo = PERIODICIDADE_CONFIG[item.periodicidade].diasAproximados;
        if (diasPeriodo <= 0) return;

        const baseStr = item.ultimaExecucao || plano.dataInicio;
        let current = parseLocal(baseStr);
        if (item.ultimaExecucao) current.setDate(current.getDate() + diasPeriodo);

        // Skip rápido para perto do mês exibido
        if (current < primeiroDoMes) {
          const diffDias = Math.ceil((primeiroDoMes.getTime() - current.getTime()) / 86400000);
          const skip = Math.max(0, Math.floor(diffDias / diasPeriodo) - 1);
          if (skip > 0) current.setDate(current.getDate() + skip * diasPeriodo);
        }

        let encontrouNoMes = false;
        let guard = 0;
        while (current <= ultimoDoMes && guard < 500) {
          guard++;
          if (current >= primeiroDoMes) {
            const dueISO = formatLocal(current);
            const diff = Math.ceil((current.getTime() - hoje.getTime()) / 86400000);
            const eventoItem: EventoItem = { item, dueDate: dueISO, diasRestantes: diff };

            if (!mapa[dueISO]) mapa[dueISO] = {};
            if (!mapa[dueISO][plano.id]) {
              mapa[dueISO][plano.id] = {
                plano, equipamentoId: plano.equipamentoId, equipamentoNome: equip,
                dueDate: dueISO, itens: [], piorDias: diff,
              };
            }
            mapa[dueISO][plano.id].itens.push(eventoItem);
            // Atualiza piorDias com o mais urgente (menor valor)
            if (diff < mapa[dueISO][plano.id].piorDias) {
              mapa[dueISO][plano.id].piorDias = diff;
            }
            encontrouNoMes = true;
          }
          current = new Date(current);
          current.setDate(current.getDate() + diasPeriodo);
        }

        // Sem ocorrência no mês: verifica se está vencido em mês anterior
        if (!encontrouNoMes) {
          const proxISO = calcularProximaExecucaoItem(item, plano.dataInicio);
          const proxDate = parseLocal(proxISO);
          const diff = Math.ceil((proxDate.getTime() - hoje.getTime()) / 86400000);
          if (proxDate < primeiroDoMes && diff < 0) {
            if (!antigosMap[plano.id]) {
              antigosMap[plano.id] = {
                plano, equipamentoId: plano.equipamentoId, equipamentoNome: equip,
                dueDate: proxISO, itens: [], piorDias: diff,
              };
            }
            antigosMap[plano.id].itens.push({ item, dueDate: proxISO, diasRestantes: diff });
            if (diff < antigosMap[plano.id].piorDias) antigosMap[plano.id].piorDias = diff;
          }
        }
      });
    });

    // Converte mapas para Record<string, GrupoDia[]>
    const gruposPorDia: Record<string, GrupoDia[]> = {};
    for (const [dueISO, porPlano] of Object.entries(mapa)) {
      gruposPorDia[dueISO] = Object.values(porPlano);
    }
    const gruposVencidosAnteriores = Object.values(antigosMap);

    return { gruposPorDia, gruposVencidosAnteriores };
  }, [planos, equipamentos, mes, ano, hoje]);

  // ─── Grid do calendário ───
  const semanas = useMemo(() => {
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(primeiroDia).fill(null),
      ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const semanas: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) semanas.push(cells.slice(i, i + 7));
    return semanas;
  }, [mes, ano]);

  function isoDoMes(dia: number) {
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  const isHoje = (dia: number) => hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === dia;

  // ─── Resumo ───
  const resumo = useMemo(() => {
    const todosItens = Object.values(gruposPorDia).flatMap(gs => gs.flatMap(g => g.itens));
    const antigosItens = gruposVencidosAnteriores.flatMap(g => g.itens);
    return {
      vencidos: todosItens.filter(e => e.diasRestantes < 0).length + antigosItens.length,
      hoje: todosItens.filter(e => e.diasRestantes === 0).length,
      urgentes: todosItens.filter(e => e.diasRestantes > 0 && e.diasRestantes <= 7).length,
      futuros: todosItens.filter(e => e.diasRestantes > 7).length,
    };
  }, [gruposPorDia, gruposVencidosAnteriores]);

  const totalGrupos = Object.values(gruposPorDia).reduce((s, gs) => s + gs.length, 0);

  function fecharDialog() {
    setGrupoSelecionado(null);
    setBaixados(new Set());
    setItemData(new Map());
    // executadosNaSessao é mantido — os cards cinza ficam até navegar de mês
  }

  /** Marca o grupo como executado para o card do calendário ficar cinza */
  function marcarGrupoComoExecutado(grupo: GrupoDia) {
    const key = `${grupo.plano.id}-${grupo.dueDate}`;
    setExecutadosNaSessao(prev => new Map([...prev, [key, grupo]]));
  }

  /** Lê dados de um item (com defaults) */
  function getItemDados(chave: string) {
    return itemData.get(chave) ?? { realizadoPor: '', dataExecucao: dataHojeISO() };
  }

  /** Atualiza um campo de um item específico */
  function setItemField(chave: string, field: 'realizadoPor' | 'dataExecucao', value: string) {
    setItemData(prev => {
      const current = prev.get(chave) ?? { realizadoPor: '', dataExecucao: dataHojeISO() };
      const next = new Map(prev);
      next.set(chave, { ...current, [field]: value });
      return next;
    });
  }

  /**
   * Dá baixa em um item específico.
   * Usa itemIdx (posição no array do grupo) como chave — não depende de item.id.
   */
  function darBaixaItem(planoId: string, itemIdx: number, item: ItemVerificacao) {
    const chave = `${planoId}:${itemIdx}`;
    const dados = getItemDados(chave);
    const execISO = dados.dataExecucao || dataHojeISO();
    const nomeResp = dados.realizadoPor.trim();
    // dueDate da ocorrência que está sendo satisfeita (para detecção persistida)
    const dueDateOcorrencia = grupoSelecionado?.dueDate;

    setPlanos(prev => prev.map(p => {
      if (p.id !== planoId) return p;
      return {
        ...p,
        itensVerificacao: p.itensVerificacao.map(iv => {
          const bate = item.id ? iv.id === item.id : iv.descricao === item.descricao;
          if (!bate) return iv;
          return {
            ...iv,
            ultimaExecucao: execISO,
            ultimaDueDateExecutada: dueDateOcorrencia,
            historicoExecucoes: [...(iv.historicoExecucoes || []), execISO],
            realizadoPor: nomeResp || iv.realizadoPor,
            historicoRealizadoPor: nomeResp
              ? [...(iv.historicoRealizadoPor ?? []), nomeResp]
              : iv.historicoRealizadoPor,
          };
        }),
        dataAtualizacao: dataHojeISO(),
      };
    }));

    const newBaixados = new Set([...baixados, chave]);
    setBaixados(newBaixados);

    // Sempre preservar o snapshot do grupo em executadosNaSessao ao dar qualquer baixa.
    // Isso evita que o card desapareça do calendário quando o useMemo recalcula
    // (itens mudam de data após ultimaExecucao ser atualizado).
    if (grupoSelecionado) {
      marcarGrupoComoExecutado(grupoSelecionado);
    }

    toast.success(`Baixa registrada: "${item.descricao}".`);
  }

  function darBaixaTodos() {
    if (!grupoSelecionado) return;
    const g = grupoSelecionado;

    // Pendentes com índice original preservado
    const pendentesComIdx = g.itens
      .map((ev, idx) => ({ ev, idx }))
      .filter(({ idx }) => !baixados.has(`${g.plano.id}:${idx}`));

    if (pendentesComIdx.length === 0) { toast('Todos os itens já foram baixados.'); return; }

    setPlanos(prev => prev.map(p => {
      if (p.id !== g.plano.id) return p;
      return {
        ...p,
        itensVerificacao: p.itensVerificacao.map(iv => {
          const match = pendentesComIdx.find(({ ev }) =>
            ev.item.id ? iv.id === ev.item.id : iv.descricao === ev.item.descricao
          );
          if (!match) return iv;
          const chave = `${g.plano.id}:${match.idx}`;
          const dados = getItemDados(chave);
          const execISO = dados.dataExecucao || dataHojeISO();
          const nomeResp = dados.realizadoPor.trim();
          return {
            ...iv,
            ultimaExecucao: execISO,
            ultimaDueDateExecutada: g.dueDate,
            historicoExecucoes: [...(iv.historicoExecucoes || []), execISO],
            realizadoPor: nomeResp || iv.realizadoPor,
            historicoRealizadoPor: nomeResp
              ? [...(iv.historicoRealizadoPor ?? []), nomeResp]
              : iv.historicoRealizadoPor,
          };
        }),
        dataAtualizacao: dataHojeISO(),
      };
    }));

    const allKeys = g.itens.map((_, idx) => `${g.plano.id}:${idx}`);
    setBaixados(new Set(allKeys));
    marcarGrupoComoExecutado(g);
    toast.success(`${pendentesComIdx.length} item(s) baixados — ${g.equipamentoNome}.`);
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
            Agenda de Manutenção
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Visualização mensal dos planos preventivos agrupados por equipamento.
          </p>
        </div>
      </div>

      {/* ── Resumo rápido ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vencidos',    value: resumo.vencidos,  cor: 'text-red-600',    corBg: 'bg-red-50 border-red-200'       },
          { label: 'Hoje',        value: resumo.hoje,      cor: 'text-amber-600',  corBg: 'bg-amber-50 border-amber-200'   },
          { label: 'Esta semana', value: resumo.urgentes,  cor: 'text-yellow-600', corBg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Programados', value: resumo.futuros,   cor: 'text-blue-600',   corBg: 'bg-blue-50 border-blue-200'    },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border px-4 py-3 ${card.corBg}`}>
            <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>{card.label}</p>
            <p className={`mt-1 ${card.cor}`} style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{card.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">item(s)</p>
          </div>
        ))}
      </div>

      {/* ── Alertas de vencidos em meses anteriores ── */}
      {gruposVencidosAnteriores.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700" style={{ fontWeight: 600 }}>
              {gruposVencidosAnteriores.reduce((s, g) => s + g.itens.length, 0)} item(s) vencido(s) em meses anteriores — {gruposVencidosAnteriores.length} equipamento(s)
            </span>
          </div>
          {gruposVencidosAnteriores.slice(0, 5).map((g, i) => (
            <button
              key={i}
              onClick={() => setGrupoSelecionado(g)}
              className="w-full flex items-center justify-between bg-white/70 hover:bg-white rounded-lg px-3 py-2 text-xs text-left transition-colors"
            >
              <span className="text-gray-700" style={{ fontWeight: 500 }}>
                {g.equipamentoNome}
                <span className="text-gray-400 ml-1">({g.itens.length} item{g.itens.length > 1 ? 's' : ''})</span>
              </span>
              <span className="text-red-600" style={{ fontWeight: 500 }}>{Math.abs(g.piorDias)}d atrasado</span>
            </button>
          ))}
          {gruposVencidosAnteriores.length > 5 && (
            <p className="text-xs text-red-600 text-right">+{gruposVencidosAnteriores.length - 5} outros equipamentos</p>
          )}
        </div>
      )}

      {/* ── Calendário ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Navegação */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevMes}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-gray-900" style={{ fontWeight: 600, fontSize: '1rem' }}>
              {MESES[mes]} {ano}
            </h2>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextMes}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={irParaHoje}>Hoje</Button>
            {totalGrupos > 0 && (
              <span className="text-xs text-gray-400">{totalGrupos} equipamento(s) com manutenção</span>
            )}
          </div>
        </div>

        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="px-2 py-2.5 text-center">
              <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {semanas.map((semana, si) =>
            semana.map((dia, di) => {
              if (!dia) {
                return (
                  <div
                    key={`${si}-${di}`}
                    className={`min-h-[120px] bg-gray-50/40 ${si < semanas.length - 1 ? 'border-b border-gray-100' : ''}`}
                  />
                );
              }
              const iso = isoDoMes(dia);
              const grupos = gruposPorDia[iso] || [];
              const eHoje = isHoje(dia);

              // Grupos executados nesta sessão que já não aparecem no useMemo
              // (porque ultimaExecucao foi atualizada e o próximo vencimento mudou de data)
              const executadosNesteDia: GrupoDia[] = [...executadosNaSessao.entries()]
                .filter(([key]) => key.endsWith(`-${iso}`))
                .map(([, g]) => g)
                .filter(g => !grupos.some(ng => ng.plano.id === g.plano.id));

              // Lista completa: grupos vivos + grupos executados-removidos
              const todosGrupos = [...grupos, ...executadosNesteDia];

              return (
                <div
                  key={`${si}-${di}`}
                  className={`min-h-[120px] p-2 ${si < semanas.length - 1 ? 'border-b border-gray-100' : ''} ${eHoje ? 'bg-blue-50/40' : 'hover:bg-gray-50/40'} transition-colors`}
                >
                  {/* Número do dia */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full mb-1.5 ${
                    eHoje ? 'bg-blue-600 text-white' : 'text-gray-500'
                  }`} style={{ fontWeight: eHoje ? 700 : 400, fontSize: '0.8125rem' }}>
                    {dia}
                  </div>

                  {/* Cards agrupados por equipamento */}
                  <div className="space-y-1">
                    {todosGrupos.slice(0, 3).map((grupo, gi) => {
                      const executadoKey = `${grupo.plano.id}-${grupo.dueDate}`;
                      const foiExecutado = executadosNaSessao.has(executadoKey);
                      const qtd = grupo.itens.length;
                      const baixadosParaGrupo = grupo.itens.filter((_, idx) =>
                        baixados.has(`${grupo.plano.id}:${idx}`)
                      ).length;

                      // Card cinza — manutenção concluída nesta sessão
                      if (foiExecutado) {
                        return (
                          <button
                            key={gi}
                            onClick={() => setGrupoSelecionado(grupo)}
                            className="w-full text-left px-1.5 py-1 rounded border bg-gray-100 border-gray-200 transition-opacity hover:opacity-70"
                            title={`${grupo.equipamentoNome} — concluído`}
                          >
                            <span className="flex items-center gap-1" style={{ fontWeight: 500, fontSize: '10px', lineHeight: '14px', color: '#9ca3af' }}>
                              <CheckCircle2 className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
                              <span className="truncate">{grupo.equipamentoNome}</span>
                            </span>
                            <span className="block pl-3.5" style={{ fontSize: '10px', lineHeight: '13px', color: '#d1d5db' }}>
                              {qtd}/{qtd}
                            </span>
                          </button>
                        );
                      }

                      // Card normal colorido
                      const cor = corEvento(grupo.piorDias);
                      const cfg = COR_CONFIG[cor];
                      return (
                        <button
                          key={gi}
                          onClick={() => setGrupoSelecionado(grupo)}
                          className={`w-full text-left px-1.5 py-1 rounded border transition-opacity hover:opacity-80 ${cfg.badge}`}
                          title={`${grupo.equipamentoNome} — ${qtd} item(s)`}
                        >
                          <span className={`flex items-center gap-1 ${cfg.text}`} style={{ fontWeight: 600, fontSize: '10px', lineHeight: '14px' }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                            <span className="truncate">{grupo.equipamentoNome}</span>
                          </span>
                          <span className="block text-gray-500 pl-2.5" style={{ fontSize: '10px', lineHeight: '13px' }}>
                            {baixadosParaGrupo}/{qtd}
                          </span>
                        </button>
                      );
                    })}

                    {todosGrupos.length > 3 && (
                      <button
                        className="w-full text-center text-[10px] text-gray-400 hover:text-gray-600 py-0.5"
                        onClick={() => setGrupoSelecionado(todosGrupos[3])}
                      >
                        +{todosGrupos.length - 3} equipamento{todosGrupos.length - 3 > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legenda */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/40 flex flex-wrap items-center gap-4">
          {([
            { cor: 'vencido', label: 'Vencido' },
            { cor: 'hoje',    label: 'Vence hoje' },
            { cor: 'urgente', label: 'Vence em ≤ 7d' },
            { cor: 'futuro',  label: 'Programado' },
          ] as const).map(({ cor, label }) => (
            <span key={cor} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${COR_CONFIG[cor].dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Lista complementar agrupada ── */}
      {totalGrupos > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
              Manutenções Programadas — {MESES[mes]} {ano}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(gruposPorDia)
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([, grupos]) => grupos)
              .map((grupo, i) => {
                const cor = corEvento(grupo.piorDias);
                const cfg = COR_CONFIG[cor];
                return (
                  <button
                    key={i}
                    onClick={() => setGrupoSelecionado(grupo)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                      <div>
                        <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>
                          {grupo.equipamentoNome}
                        </span>
                        <span className="text-xs text-gray-400 block">
                          {grupo.plano.codigo} · {grupo.itens.length} item{grupo.itens.length > 1 ? 's' : ''} de verificação
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-600 block">{formatarData(grupo.dueDate)}</span>
                      <span className={`text-[10px] ${cfg.text}`} style={{ fontWeight: 500 }}>
                        {grupo.piorDias < 0 ? `${Math.abs(grupo.piorDias)}d atrasado`
                          : grupo.piorDias === 0 ? 'Hoje'
                          : `em ${grupo.piorDias}d`}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {totalGrupos === 0 && gruposVencidosAnteriores.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhuma manutenção programada para {MESES[mes]} {ano}.</p>
          <p className="text-xs text-gray-400 mt-1">Cadastre planos preventivos para visualizar o calendário.</p>
        </div>
      )}

      {/* ── Dialog de detalhe do grupo ── */}
      <Dialog open={!!grupoSelecionado} onOpenChange={open => { if (!open) fecharDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>{grupoSelecionado?.equipamentoNome}</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => {
                  const plano = grupoSelecionado?.plano ?? null;
                  fecharDialog();
                  setEditandoPlano(plano);
                }}
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Plano
              </Button>
            </DialogTitle>
            <DialogDescription>
              {grupoSelecionado?.plano.codigo} · {grupoSelecionado ? formatarData(grupoSelecionado.dueDate) : ''}
            </DialogDescription>
          </DialogHeader>
          {grupoSelecionado && (() => {
            const cor = corEvento(grupoSelecionado.piorDias);
            const cfg = COR_CONFIG[cor];
            const g = grupoSelecionado;
            // Plano atualizado no estado persistido (para detectar baixas de sessões anteriores)
            const planoAtual = planos.find(p => p.id === g.plano.id);

            /** Verifica se o item está feito — sessão atual OU dado persistido (localStorage) */
            const isItemDone = (ev: EventoItem, idx: number): boolean => {
              if (baixados.has(`${g.plano.id}:${idx}`)) return true;
              const ivAtual = planoAtual?.itensVerificacao.find(iv =>
                ev.item.id ? iv.id === ev.item.id : iv.descricao === ev.item.descricao
              );
              return ivAtual ? itemBaixadoParaData(ivAtual, g.dueDate) : false;
            };

            /** Dados para exibir no item concluído — sessão tem prioridade, senão usa persistido */
            const getDadosItem = (ev: EventoItem, idx: number) => {
              const chave = `${g.plano.id}:${idx}`;
              if (itemData.has(chave)) return itemData.get(chave)!;
              const ivAtual = planoAtual?.itensVerificacao.find(iv =>
                ev.item.id ? iv.id === ev.item.id : iv.descricao === ev.item.descricao
              );
              return {
                realizadoPor: ivAtual?.realizadoPor || '',
                dataExecucao: ivAtual?.ultimaExecucao || dataHojeISO(),
              };
            };

            const totalBaixados = g.itens.filter((ev, idx) => isItemDone(ev, idx)).length;
            const todosBaixados = totalBaixados === g.itens.length;
            return (
              <div className="space-y-4">
                {/* Status geral */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.badge}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {g.piorDias < 0 ? `${Math.abs(g.piorDias)}d atrasado`
                      : g.piorDias === 0 ? 'Vence hoje'
                      : `Vence em ${g.piorDias}d`}
                  </span>
                  {totalBaixados > 0 && (
                    <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1" style={{ fontWeight: 500 }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {totalBaixados}/{g.itens.length} baixado{totalBaixados > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Info do plano */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Responsável</span>
                    <span className="text-gray-700">{g.plano.responsavel || '—'}</span>
                  </div>
                  {g.plano.duracaoEstimada && (
                    <div>
                      <span className="text-xs text-gray-400 block">Duração est.</span>
                      <span className="text-gray-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {g.plano.duracaoEstimada}h
                      </span>
                    </div>
                  )}
                </div>

                {g.plano.necessitaParada && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Este plano necessita parada do equipamento
                  </div>
                )}

                {/* Itens de verificação com baixa individual */}
                <div>
                  <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                    Itens de verificação ({g.itens.length})
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {g.itens.map((ev, idx) => {
                      const chave = `${g.plano.id}:${idx}`;
                      const jaBaixado = isItemDone(ev, idx);
                      const dados = getDadosItem(ev, idx);
                      const ic = jaBaixado ? 'futuro' : corEvento(ev.diasRestantes);
                      const icfg = COR_CONFIG[ic];

                      // ── Item concluído (fica visível, cinza/verde) ──────────
                      if (jaBaixado) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-2 px-3 py-2.5 rounded-lg border bg-emerald-50 border-emerald-200"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-emerald-700 line-through" style={{ fontWeight: 500 }}>
                                {ev.item.descricao}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-emerald-600" style={{ fontWeight: 500 }}>
                                  {formatarData(dados.dataExecucao)}
                                </span>
                                {dados.realizadoPor && (
                                  <span className="text-[10px] text-emerald-600">
                                    · {dados.realizadoPor}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-600 flex-shrink-0" style={{ fontWeight: 700 }}>
                              ✓ OK
                            </span>
                          </div>
                        );
                      }

                      // ── Item pendente (com inputs por item) ────────────────
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border transition-all ${icfg.badge}`}
                        >
                          {/* Linha 1: descrição + botão dar baixa */}
                          <div className="flex items-start gap-2 px-3 pt-2.5 pb-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${icfg.dot} flex-shrink-0 mt-1.5`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${icfg.text}`} style={{ fontWeight: 500 }}>
                                {ev.item.descricao}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400">
                                  {PERIODICIDADE_CONFIG[ev.item.periodicidade].label}
                                </span>
                                {ev.item.ultimaExecucao && (
                                  <span className="text-[10px] text-gray-400">
                                    · Última: {formatarData(ev.item.ultimaExecucao)}
                                    {ev.item.realizadoPor && (
                                      <span className="ml-1">· {ev.item.realizadoPor}</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => darBaixaItem(g.plano.id, idx, ev.item)}
                              className="flex-shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                              style={{ fontWeight: 600 }}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Dar baixa
                            </button>
                          </div>
                          {/* Linha 2: inputs por item */}
                          <div className="flex gap-2 px-3 pb-2.5 pl-5">
                            <div className="flex items-center gap-1.5 flex-1 bg-white/70 border border-gray-200 rounded px-2 py-1 min-w-0">
                              <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <input
                                type="text"
                                value={dados.realizadoPor}
                                onChange={e => setItemField(chave, 'realizadoPor', e.target.value)}
                                placeholder="Realizado por..."
                                className="flex-1 bg-transparent text-[10px] text-gray-600 placeholder-gray-300 focus:outline-none min-w-0"
                              />
                            </div>
                            <input
                              type="date"
                              value={dados.dataExecucao}
                              onChange={e => setItemField(chave, 'dataExecucao', e.target.value)}
                              className="bg-white/70 border border-gray-200 rounded px-2 py-1 text-[10px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-200 w-[7.5rem] flex-shrink-0"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé: dar baixa em todos */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
                  <p className="text-xs text-gray-400">
                    {todosBaixados
                      ? 'Todos os itens foram baixados.'
                      : `${g.itens.length - totalBaixados} item(s) pendente(s)`}
                  </p>
                  {!todosBaixados && (
                    <Button
                      size="sm"
                      className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={darBaixaTodos}
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Dar baixa em todos
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Sheet de edição direta pela agenda ── */}
      {editandoPlano && (
        <PlanoEditSheet
          plano={editandoPlano}
          onClose={() => setEditandoPlano(null)}
        />
      )}
    </div>
  );
}