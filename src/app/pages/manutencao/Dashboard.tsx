/**
 * Manutenção / Dashboard
 * Cards + gráficos filtráveis por intervalo de datas (dataAbertura das OS).
 * Alertas de estado atual (preventivas vencidas, corretivas críticas em aberto)
 * permanecem sempre em tempo-real, independente do filtro.
 * Seção MTTR/MTBF transferida da página de Indicadores.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Wrench, CheckCircle2, AlertTriangle, Clock,
  Plus, ArrowRight, XCircle, BarChart3, ShieldAlert, CalendarClock,
  CalendarDays, X, Activity, HardHat,
} from 'lucide-react';
import { formatarData } from '../../utils/formatters';
import {
  useManutencao,
  calcularStatusOS,
  diasAtePrazo,
  STATUS_OS_CONFIG,
  TIPO_MANUTENCAO_CONFIG,
  PRIORIDADE_CONFIG,
  calcularMTTR,
  calcularMTBF,
  calcularCustoTotal,
} from '../../hooks/useManutencao';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, CartesianGrid,
} from 'recharts';

// ─── Constantes de mês ────────────────────────────────
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Helpers de disponibilidade ──────────────────────
function dispColor(pct: number | null) {
  if (pct === null) return 'text-gray-300';
  if (pct >= 95) return 'text-emerald-600';
  if (pct >= 85) return 'text-amber-600';
  return 'text-red-600';
}
function dispBg(pct: number | null) {
  if (pct === null) return 'bg-gray-50';
  if (pct >= 95) return 'bg-emerald-50';
  if (pct >= 85) return 'bg-amber-50';
  return 'bg-red-50';
}
function dispBarFill(pct: number | null) {
  if (pct === null) return '#e5e7eb';
  if (pct >= 95) return '#10b981';
  if (pct >= 85) return '#f59e0b';
  return '#ef4444';
}

// ─── Tipo Preset ──────────────────────────────────────
type Preset = 'hoje' | 'semana' | 'mes' | 'mes-ant' | 'trimestre' | 'ano' | 'custom' | 'todos';

interface FiltroData {
  inicio: string;
  fim: string;
  preset: Preset;
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'hoje',      label: 'Hoje'        },
  { key: 'semana',    label: 'Esta semana' },
  { key: 'mes',       label: 'Este mês'    },
  { key: 'mes-ant',   label: 'Mês anterior'},
  { key: 'trimestre', label: 'Trimestre'   },
  { key: 'ano',       label: 'Este ano'    },
  { key: 'todos',     label: 'Todos'       },
];

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function calcularPreset(preset: Preset): { inicio: string; fim: string } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hStr = isoDate(hoje);

  if (preset === 'hoje') return { inicio: hStr, fim: hStr };

  if (preset === 'semana') {
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1));
    return { inicio: isoDate(seg), fim: hStr };
  }

  if (preset === 'mes') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { inicio: isoDate(ini), fim: hStr };
  }

  if (preset === 'mes-ant') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { inicio: isoDate(ini), fim: isoDate(fim) };
  }

  if (preset === 'trimestre') {
    const q = Math.floor(hoje.getMonth() / 3);
    const ini = new Date(hoje.getFullYear(), q * 3, 1);
    return { inicio: isoDate(ini), fim: hStr };
  }

  if (preset === 'ano') {
    const ini = new Date(hoje.getFullYear(), 0, 1);
    return { inicio: isoDate(ini), fim: hStr };
  }

  return { inicio: '', fim: '' };
}

// ─── StatCard ──────────────────────────────────────────
function StatCard({
  label, value, sublabel, icon: Icon, colorClass, onClick, realtime,
}: {
  label: string; value: number; sublabel?: string;
  icon: React.ElementType; colorClass: string; onClick?: () => void;
  realtime?: boolean;
}) {
  const bgIcon = colorClass.includes('red') ? 'bg-red-50' : colorClass.includes('amber') ? 'bg-amber-50' :
    colorClass.includes('emerald') ? 'bg-emerald-50' : colorClass.includes('blue') ? 'bg-blue-50' : 'bg-gray-50';
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-5 text-left transition-all hover:shadow-sm ${onClick ? 'cursor-pointer hover:border-gray-300' : 'cursor-default'} w-full relative overflow-hidden`}
    >
      {realtime && (
        <span className="absolute top-2 right-2 text-[9px] text-gray-300 uppercase tracking-wide" style={{ fontWeight: 600 }}>tempo real</span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>{label}</p>
          <p className={`mt-1 ${colorClass}`} style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${bgIcon} mt-4`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
    </button>
  );
}

// ─── CustomTooltip ─────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="text-gray-700" style={{ fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────
export function ManutencaoDashboard() {
  const { ordens, equipamentos, planos, stats } = useManutencao();
  const navigate = useNavigate();

  const [filtro, setFiltro] = useState<FiltroData>(() => {
    const { inicio, fim } = calcularPreset('mes');
    return { inicio, fim, preset: 'mes' };
  });

  function aplicarPreset(preset: Preset) {
    if (preset === 'custom') return;
    const { inicio, fim } = calcularPreset(preset);
    setFiltro({ inicio, fim, preset });
  }

  function setInicio(v: string) { setFiltro(f => ({ ...f, inicio: v, preset: 'custom' })); }
  function setFim(v: string)    { setFiltro(f => ({ ...f, fim: v,    preset: 'custom' })); }

  const filtroAtivo = !!(filtro.inicio || filtro.fim);

  function labelPeriodo(): string {
    if (!filtro.inicio && !filtro.fim) return 'Todos os registros';
    if (filtro.inicio && filtro.fim) return `${formatarData(filtro.inicio)} – ${formatarData(filtro.fim)}`;
    if (filtro.inicio) return `A partir de ${formatarData(filtro.inicio)}`;
    return `Até ${formatarData(filtro.fim)}`;
  }

  const ordensNoFiltro = useMemo(() => {
    return ordens.filter(o => {
      const d = o.dataAbertura || '';
      if (filtro.inicio && d < filtro.inicio) return false;
      if (filtro.fim && d > filtro.fim) return false;
      return true;
    });
  }, [ordens, filtro]);

  const sf = useMemo(() => {
    const statusList = ordensNoFiltro.map(o => ({ os: o, status: calcularStatusOS(o) }));
    const total      = ordensNoFiltro.length;
    const concluidas = statusList.filter(({ status }) => status === 'concluida').length;
    const atrasadas  = statusList.filter(({ status }) => status === 'atrasada').length;
    const corretivas  = ordensNoFiltro.filter(o => o.tipo === 'corretiva').length;
    const preventivas = ordensNoFiltro.filter(o => o.tipo === 'preventiva').length;
    const corretivasAbertas  = ordensNoFiltro.filter(o => o.tipo === 'corretiva' && !['concluida', 'cancelada'].includes(calcularStatusOS(o))).length;
    const corretivasCriticas = ordensNoFiltro.filter(o => o.tipo === 'corretiva' && o.prioridade === 'critica' && !['concluida', 'cancelada'].includes(calcularStatusOS(o))).length;
    const custoPecas   = ordensNoFiltro.reduce((s, o) => s + (o.custoPecas   || 0), 0);
    const custoServico = ordensNoFiltro.reduce((s, o) => s + (o.custoServico || 0), 0);
    const custoMaoObra = ordensNoFiltro.reduce((s, o) => s + (o.custoMaoObra || 0), 0);
    const custoTotal   = custoPecas + custoServico + custoMaoObra;

    const corrPorPrio = [
      { name: 'Crítica',   value: ordensNoFiltro.filter(o => o.tipo === 'corretiva' && o.prioridade === 'critica').length, fill: '#ef4444' },
      { name: 'Alta',      value: ordensNoFiltro.filter(o => o.tipo === 'corretiva' && o.prioridade === 'alta').length,    fill: '#f97316' },
      { name: 'Média',     value: ordensNoFiltro.filter(o => o.tipo === 'corretiva' && o.prioridade === 'media').length,   fill: '#f59e0b' },
      { name: 'Baixa',     value: ordensNoFiltro.filter(o => o.tipo === 'corretiva' && o.prioridade === 'baixa').length,   fill: '#9ca3af' },
      { name: 'S/ Prior.', value: ordensNoFiltro.filter(o => o.tipo === 'corretiva' && !o.prioridade).length,             fill: '#e5e7eb' },
    ].filter(d => d.value > 0);

    const prevRealizadas = ordensNoFiltro.filter(o => o.tipo === 'preventiva' && o.status === 'concluida').length;
    const prevPendentes  = ordensNoFiltro.filter(o => o.tipo === 'preventiva' && !['concluida', 'cancelada'].includes(o.status)).length;

    const countPorEq = equipamentos.map(eq => ({
      equipamento: eq,
      name: eq.codigo,
      corretivas: ordensNoFiltro.filter(o => o.equipamentoId === eq.id && o.tipo === 'corretiva').length,
      preventivas: ordensNoFiltro.filter(o => o.equipamentoId === eq.id && o.tipo === 'preventiva').length,
      total: ordensNoFiltro.filter(o => o.equipamentoId === eq.id).length,
    })).filter(e => e.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

    const osAbertas = ordensNoFiltro
      .filter(o => !['concluida', 'cancelada'].includes(calcularStatusOS(o)))
      .map(o => ({ os: o, dias: diasAtePrazo(o.prazo), status: calcularStatusOS(o) }))
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 8);

    const ultimasPeriodo = [...ordensNoFiltro]
      .sort((a, b) => b.dataAbertura.localeCompare(a.dataAbertura))
      .slice(0, 10);

    return {
      total, concluidas, atrasadas, corretivas, preventivas,
      corretivasAbertas, corretivasCriticas,
      custoTotal, corrPorPrio, prevRealizadas, prevPendentes,
      countPorEq, osAbertas, ultimasPeriodo,
    };
  }, [ordensNoFiltro, equipamentos]);

  const alertas = useMemo(() => {
    const list: { tipo: 'danger' | 'warning'; msg: string }[] = [];
    if (stats.corretivasCriticas > 0)
      list.push({ tipo: 'danger', msg: `${stats.corretivasCriticas} corretiva(s) com prioridade CRÍTICA em aberto (global).` });
    if (stats.atrasadas > 0)
      list.push({ tipo: 'danger', msg: `${stats.atrasadas} OS com prazo expirado sem encerramento (global).` });
    if (stats.preventivasVencidas > 0)
      list.push({ tipo: 'danger', msg: `${stats.preventivasVencidas} plano(s) de manutenção preventiva com data vencida.` });
    if (stats.preventivasVencendo7d > 0)
      list.push({ tipo: 'warning', msg: `${stats.preventivasVencendo7d} preventiva(s) vencendo nos próximos 7 dias.` });
    return list;
  }, [stats]);

  const totalPrev = sf.prevRealizadas + sf.prevPendentes;
  const dadosPreventivas = [
    { name: 'Realizadas', value: sf.prevRealizadas, fill: '#10b981' },
    { name: 'Pendentes',  value: sf.prevPendentes,  fill: '#3b82f6' },
  ];

  // ── MTTR/MTBF por equipamento (global) — com disponibilidade, custo e horas ──
  const indicadoresPorEquip = useMemo(() => {
    return equipamentos
      .filter(eq => ordens.some(o => o.equipamentoId === eq.id))
      .map(eq => {
        const osEq = ordens.filter(o => o.equipamentoId === eq.id);
        const mttr = calcularMTTR(osEq);
        const mtbf = calcularMTBF(osEq);
        const corretivas = osEq.filter(o => o.tipo === 'corretiva').length;
        const preventivas = osEq.filter(o => o.tipo === 'preventiva').length;
        const total = osEq.length;
        // Disponibilidade = MTBF / (MTBF + MTTR_em_dias) × 100  (MTTR em h → ÷24)
        const disponibilidade = (mttr != null && mtbf != null)
          ? Math.round((mtbf / (mtbf + mttr / 24)) * 100)
          : null;
        const custoTotal = osEq.reduce((s, o) => s + calcularCustoTotal(o), 0);
        const horasReparo = osEq.reduce((s, o) => s + (o.horasReparo || 0), 0);
        return { eq, mttr, mtbf, corretivas, preventivas, total, disponibilidade, custoTotal, horasReparo };
      })
      .sort((a, b) => b.corretivas - a.corretivas);
  }, [equipamentos, ordens]);

  // ── Tendência mensal — últimos 6 meses ──
  const tendencia = useMemo(() => {
    const agora = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MESES_ABR[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
      const falhas = ordens.filter(o => o.tipo === 'corretiva' && o.dataAbertura.startsWith(iso)).length;
      const concluidas = ordens.filter(o =>
        o.tipo === 'corretiva' && o.status === 'concluida' &&
        o.dataEncerramento?.startsWith(iso) && o.horasReparo != null
      );
      const mttr = concluidas.length > 0
        ? parseFloat((concluidas.reduce((s, o) => s + (o.horasReparo || 0), 0) / concluidas.length).toFixed(1))
        : 0;
      return { mes: label, falhas, mttr };
    });
  }, [ordens]);

  // ── KPIs globais derivados ──
  const disponibilidadeGlobal = (stats.mttrGlobal != null && stats.mtbfGlobal != null)
    ? Math.round((stats.mtbfGlobal / (stats.mtbfGlobal + stats.mttrGlobal / 24)) * 100)
    : null;

  const custoMedioFalha = (() => {
    const corrs = ordens.filter(o => o.tipo === 'corretiva');
    const total = corrs.reduce((s, o) => s + calcularCustoTotal(o), 0);
    return corrs.length > 0 ? total / corrs.length : 0;
  })();

  const rankingDisp = indicadoresPorEquip
    .filter(e => e.disponibilidade !== null)
    .map(e => ({
      name: e.eq.codigo,
      label: e.eq.nome.length > 14 ? e.eq.nome.slice(0, 13) + '…' : e.eq.nome,
      disponibilidade: e.disponibilidade!,
      fill: dispBarFill(e.disponibilidade),
    }))
    .sort((a, b) => a.disponibilidade - b.disponibilidade);

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
            Dashboard — Manutenção
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Visão consolidada por tipo, prioridade e período.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/manutencao/corretivas')}>
          <Plus className="w-4 h-4" /> Nova Corretiva
        </Button>
      </div>

      {/* ── Filtro de período ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Período:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => aplicarPreset(p.key)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filtro.preset === p.key && p.key !== 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
                style={{ fontWeight: filtro.preset === p.key ? 600 : 400 }}
              >
                {p.label}
              </button>
            ))}
            {filtro.preset === 'custom' && (
              <span className="px-3 py-1 rounded-full text-xs border bg-purple-50 text-purple-700 border-purple-200" style={{ fontWeight: 600 }}>
                Personalizado
              </span>
            )}
          </div>
          {filtroAtivo && (
            <button
              onClick={() => setFiltro({ inicio: '', fim: '', preset: 'todos' })}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-10 text-right">De</span>
            <Input type="date" value={filtro.inicio} onChange={e => setInicio(e.target.value)} className="h-8 text-xs w-[140px]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-10 text-right">Até</span>
            <Input type="date" value={filtro.fim} max={new Date().toISOString().split('T')[0]} onChange={e => setFim(e.target.value)} className="h-8 text-xs w-[140px]" />
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ml-auto ${
            filtroAtivo ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <CalendarDays className="w-3.5 h-3.5" />
            <span style={{ fontWeight: filtroAtivo ? 600 : 400 }}>{labelPeriodo()}</span>
            <span className="text-gray-400 ml-1">— {sf.total} OS</span>
          </div>
        </div>
      </div>

      {/* ── Alertas tempo-real ── */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
              a.tipo === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {a.tipo === 'danger' ? <XCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <span>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Cards tempo real ── */}
      <div>
        <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide" style={{ fontWeight: 600 }}>Estado Atual — Tempo Real</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Preventivas Vencidas" value={stats.preventivasVencidas} sublabel="Planos com data expirada" icon={CalendarClock} colorClass={stats.preventivasVencidas > 0 ? 'text-red-600' : 'text-gray-400'} onClick={() => navigate('/manutencao/plano')} realtime />
          <StatCard label="Preventivas Vencendo" value={stats.preventivasVencendo7d} sublabel="Nos próximos 7 dias" icon={Clock} colorClass={stats.preventivasVencendo7d > 0 ? 'text-amber-600' : 'text-gray-400'} onClick={() => navigate('/manutencao/plano')} realtime />
          <StatCard label="Corretivas Abertas" value={stats.corretivasAbertas} sublabel="Aguardando resolução" icon={Wrench} colorClass={stats.corretivasAbertas > 0 ? 'text-amber-600' : 'text-gray-400'} onClick={() => navigate('/manutencao/corretivas')} realtime />
          <StatCard label="Corretivas Críticas" value={stats.corretivasCriticas} sublabel="Prioridade máxima" icon={ShieldAlert} colorClass={stats.corretivasCriticas > 0 ? 'text-red-600' : 'text-gray-400'} onClick={() => navigate('/manutencao/corretivas')} realtime />
        </div>
      </div>

      {/* ── Cards do período ── */}
      <div>
        <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide" style={{ fontWeight: 600 }}>
          Período Selecionado — {labelPeriodo()}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-colors" onClick={() => navigate('/manutencao/os')}>
            <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Total OS no período</p>
            <p className="text-2xl text-gray-800 mt-1" style={{ fontWeight: 700 }}>{sf.total}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] text-red-500">{sf.corretivas} corretiva{sf.corretivas !== 1 ? 's' : ''}</span>
              <span className="text-[10px] text-blue-500">{sf.preventivas} preventiva{sf.preventivas !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Concluídas</p>
            <p className="text-2xl text-emerald-600 mt-1" style={{ fontWeight: 700 }}>{sf.concluidas}</p>
            {sf.total > 0 && <p className="text-[10px] text-gray-400 mt-1">{Math.round((sf.concluidas / sf.total) * 100)}% do período</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Atrasadas no período</p>
            <p className={`text-2xl mt-1 ${sf.atrasadas > 0 ? 'text-red-600' : 'text-gray-400'}`} style={{ fontWeight: 700 }}>{sf.atrasadas}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Custo Total</p>
            <p className="text-xl text-gray-800 mt-1" style={{ fontWeight: 700 }}>
              {sf.custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Peças + Serviços + M.O.</p>
          </div>
        </div>
      </div>

      {/* ── Gráficos do período ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Preventivas — Realizadas × Pendentes</p>
              <span className="text-xs text-gray-400">{labelPeriodo()}</span>
            </div>
            {totalPrev === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8 py-4">Sem dados de preventivas no período.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {dadosPreventivas.map(item => {
                  const pct = (item.value / totalPrev) * 100;
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{item.name}</span>
                        <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>{item.value} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.fill }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 flex items-center gap-4">
                  {dadosPreventivas.map(d => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /> {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Corretivas por Prioridade</p>
              <span className="text-xs text-gray-400">{labelPeriodo()}</span>
            </div>
            {sf.corrPorPrio.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8 py-4">Nenhuma corretiva no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160} className="mt-4">
                <BarChart data={sf.corrPorPrio} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="OS" radius={[4, 4, 0, 0]}>
                    {sf.corrPorPrio.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Equipamentos recorrentes + OS urgentes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Equipamentos Mais Recorrentes</p>
                <p className="text-xs text-gray-400 mt-0.5">{labelPeriodo()}</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-500" onClick={() => navigate('/manutencao/historico')}>
                Ver histórico <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            {sf.countPorEq.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Sem OS no período.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(100, sf.countPorEq.length * 36)}>
                <BarChart data={sf.countPorEq} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="corretivas" name="Corretivas" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="preventivas" name="Preventivas" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>OS em Aberto — Por Prazo</p>
                <p className="text-xs text-gray-400 mt-0.5">{labelPeriodo()}</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-500" onClick={() => navigate('/manutencao/os')}>
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            {sf.osAbertas.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Nenhuma OS em aberto no período.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sf.osAbertas.map(({ os, dias, status }) => {
                  const stCfg = STATUS_OS_CONFIG[status];
                  const priCfg = os.prioridade ? PRIORIDADE_CONFIG[os.prioridade] : null;
                  const eq = equipamentos.find(e => e.id === os.equipamentoId);
                  return (
                    <div key={os.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stCfg.dotColor}`} />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-800 block truncate" style={{ fontWeight: 500 }}>
                            {os.numero} — {eq?.nome || 'Equipamento'}
                          </span>
                          <span className="text-xs text-gray-400 block truncate">{os.descricao}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        {priCfg && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${priCfg.bg} ${priCfg.text} ${priCfg.border}`} style={{ fontWeight: 500 }}>
                            {priCfg.label}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          dias < 0 ? 'bg-red-100 text-red-700' : dias <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`} style={{ fontWeight: 500 }}>
                          {dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Manutenções do período ── */}
      <Card className="border-gray-200 rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Manutenções do Período</p>
              <p className="text-xs text-gray-400 mt-0.5">{labelPeriodo()} · {sf.ultimasPeriodo.length} exibida(s)</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-500" onClick={() => navigate('/manutencao/os')}>
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {sf.ultimasPeriodo.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nenhuma OS no período selecionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-200">
                    {['Nº OS', 'Tipo', 'Equipamento', 'Prioridade', 'Responsável', 'Abertura', 'Status'].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-xs text-gray-500 ${['Status', 'Prioridade'].includes(h) ? 'text-center' : 'text-left'}`} style={{ fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sf.ultimasPeriodo.map(os => {
                    const status = calcularStatusOS(os);
                    const stCfg = STATUS_OS_CONFIG[status];
                    const tipoCfg = TIPO_MANUTENCAO_CONFIG[os.tipo];
                    const priCfg = os.prioridade ? PRIORIDADE_CONFIG[os.prioridade] : null;
                    const eq = equipamentos.find(e => e.id === os.equipamentoId);
                    return (
                      <tr key={os.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5"><span className="text-sm text-gray-800 font-mono" style={{ fontWeight: 600 }}>{os.numero}</span></td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>{tipoCfg.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-700">{eq?.nome || '—'}</span>
                          <span className="text-xs text-gray-400 block">{os.setor || eq?.codigo}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {priCfg ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${priCfg.bg} ${priCfg.text} ${priCfg.border}`} style={{ fontWeight: 500 }}>{priCfg.label}</span>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5"><span className="text-sm text-gray-600">{os.responsavel || '—'}</span></td>
                        <td className="px-4 py-2.5"><span className="text-xs text-gray-500">{formatarData(os.dataAbertura)}</span></td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />
                            {stCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════
          CONFIABILIDADE & DESEMPENHO — seção completa MTTR / MTBF
          ════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>
              Confiabilidade & Desempenho — Global
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Baseado em todas as OS · MTTR calculado das corretivas concluídas com horas de reparo informadas
            </p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-500" onClick={() => navigate('/manutencao/indicadores')}>
            % Preventivas no prazo <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* MTTR */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>MTTR Global</p>
                <p className="mt-1 text-amber-600" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>
                  {stats.mttrGlobal != null ? `${stats.mttrGlobal.toFixed(1)}h` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Tempo médio de reparo</p>
                {stats.mttrGlobal != null && (
                  <p className={`text-[10px] mt-0.5 ${stats.mttrGlobal < 4 ? 'text-emerald-500' : stats.mttrGlobal < 8 ? 'text-amber-500' : 'text-red-500'}`} style={{ fontWeight: 600 }}>
                    {stats.mttrGlobal < 4 ? '● < 4h · Excelente' : stats.mttrGlobal < 8 ? '● 4–8h · Atenção' : '● > 8h · Crítico'}
                  </p>
                )}
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="text-amber-600" style={{ width: 18, height: 18 }} />
              </div>
            </div>
          </div>

          {/* MTBF */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>MTBF Global</p>
                <p className="mt-1 text-blue-600" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>
                  {stats.mtbfGlobal != null ? `${stats.mtbfGlobal.toFixed(0)}d` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Intervalo médio entre falhas</p>
                {stats.mtbfGlobal != null && (
                  <p className={`text-[10px] mt-0.5 ${stats.mtbfGlobal >= 30 ? 'text-emerald-500' : stats.mtbfGlobal >= 14 ? 'text-amber-500' : 'text-red-500'}`} style={{ fontWeight: 600 }}>
                    {stats.mtbfGlobal >= 30 ? '● ≥ 30d · Excelente' : stats.mtbfGlobal >= 14 ? '● ≥ 14d · Adequado' : '● < 14d · Crítico'}
                  </p>
                )}
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Activity className="text-blue-600" style={{ width: 18, height: 18 }} />
              </div>
            </div>
          </div>

          {/* Disponibilidade */}
          <div className={`rounded-xl border border-gray-200 p-5 ${dispBg(disponibilidadeGlobal)}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Disponibilidade</p>
                <p className={`mt-1 ${dispColor(disponibilidadeGlobal)}`} style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>
                  {disponibilidadeGlobal != null ? `${disponibilidadeGlobal}%` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">MTBF ÷ (MTBF + MTTR/24) × 100</p>
                {disponibilidadeGlobal != null && (
                  <p className={`text-[10px] mt-0.5 ${dispColor(disponibilidadeGlobal)}`} style={{ fontWeight: 600 }}>
                    {disponibilidadeGlobal >= 95 ? '● ≥ 95% · Excelente' : disponibilidadeGlobal >= 85 ? '● ≥ 85% · Adequado' : '● < 85% · Atenção'}
                  </p>
                )}
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/50`}>
                <HardHat className={dispColor(disponibilidadeGlobal)} style={{ width: 18, height: 18 }} />
              </div>
            </div>
            {disponibilidadeGlobal != null && (
              <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(disponibilidadeGlobal, 100)}%`, background: dispBarFill(disponibilidadeGlobal) }} />
              </div>
            )}
          </div>

          {/* Custo Médio / Falha */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Custo Médio / Falha</p>
                <p className="mt-1 text-gray-800" style={{ fontSize: custoMedioFalha > 0 ? '1.35rem' : '1.75rem', fontWeight: 700, lineHeight: 1.1 }}>
                  {custoMedioFalha > 0
                    ? custoMedioFalha.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                    : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Custo total ÷ nº corretivas</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Wrench className="text-gray-500" style={{ width: 18, height: 18 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tendência + Ranking Disponibilidade */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Gráfico de tendência */}
          <Card className="border-gray-200 rounded-xl lg:col-span-3">
            <CardContent className="p-6">
              <p className="text-sm text-gray-700 mb-0.5" style={{ fontWeight: 600 }}>Tendência — Falhas & MTTR (Últimos 6 Meses)</p>
              <p className="text-xs text-gray-400 mb-4">Barras = nº falhas abertas · Linha = MTTR médio das concluídas (h)</p>
              {tendencia.every(t => t.falhas === 0 && t.mttr === 0) ? (
                <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                  Sem dados de corretivas registradas.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={tendencia} margin={{ left: -10, right: 24, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#f59e0b' }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
                            <p className="text-gray-700 mb-1" style={{ fontWeight: 600 }}>{label}</p>
                            {payload.map((p: any, i: number) => (
                              <p key={i} style={{ color: p.color || p.fill }}>
                                {p.name}: {p.value}{p.unit || ''}
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar yAxisId="left" dataKey="falhas" name="Falhas" fill="#ef4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="mttr" name="MTTR" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} unit="h" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center gap-5 mt-2">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#ef4444', opacity: 0.75 }} /> Falhas abertas
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="w-5 border-t-2 inline-block" style={{ borderColor: '#f59e0b' }} /> MTTR médio (h)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ranking de disponibilidade */}
          <Card className="border-gray-200 rounded-xl lg:col-span-2">
            <CardContent className="p-6">
              <p className="text-sm text-gray-700 mb-0.5" style={{ fontWeight: 600 }}>Disponibilidade por Equipamento</p>
              <p className="text-xs text-gray-400 mb-4">Requer ≥ 2 corretivas para calcular MTBF</p>
              {rankingDisp.length === 0 ? (
                <div className="flex items-center justify-center h-36 text-xs text-gray-400 text-center">
                  Sem dados suficientes.<br />Registre ≥ 2 corretivas por equipamento.
                </div>
              ) : (
                <div className="space-y-3">
                  {rankingDisp.map(item => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 truncate max-w-[140px]" title={item.label}>{item.label}</span>
                        <span className="text-xs" style={{ fontWeight: 700, color: item.fill }}>{item.disponibilidade}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${item.disponibilidade}%`, background: item.fill }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    {[
                      { label: '≥ 95% · Excelente', color: '#10b981' },
                      { label: '≥ 85% · Adequado',  color: '#f59e0b' },
                      { label: '< 85% · Atenção',   color: '#ef4444' },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela detalhada por equipamento */}
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-700 mb-0.5" style={{ fontWeight: 600 }}>Detalhamento por Equipamento</p>
            <p className="text-xs text-gray-400 mb-4">
              MTTR exige OS concluídas com horas de reparo · MTBF exige ≥ 2 falhas · Disponib. exige ambos
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-200">
                    {['Equipamento', 'Tipo', 'Falhas', 'Preventivas', 'MTTR (h)', 'MTBF (d)', 'Disponib.', 'Horas Reparo', 'Custo Total'].map(h => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap ${
                          ['Falhas', 'Preventivas', 'MTTR (h)', 'MTBF (d)', 'Disponib.', 'Horas Reparo', 'Custo Total'].includes(h)
                            ? 'text-center' : 'text-left'
                        }`}
                        style={{ fontWeight: 600 }}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {indicadoresPorEquip.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-xs text-gray-400">
                        Nenhum equipamento com OS registradas. Cadastre OS para gerar os indicadores.
                      </td>
                    </tr>
                  ) : indicadoresPorEquip.map(({ eq, mttr, mtbf, corretivas, preventivas, disponibilidade, custoTotal, horasReparo }) => (
                    <tr key={eq.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{eq.nome}</span>
                        <span className="text-xs text-gray-400 block">{eq.codigo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{eq.tipo || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${corretivas > 0 ? 'text-red-600' : 'text-gray-300'}`} style={{ fontWeight: corretivas > 0 ? 700 : 400 }}>
                          {corretivas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${preventivas > 0 ? 'text-blue-600' : 'text-gray-300'}`} style={{ fontWeight: preventivas > 0 ? 600 : 400 }}>
                          {preventivas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${mttr != null ? 'text-amber-600' : 'text-gray-300'}`} style={{ fontWeight: mttr != null ? 600 : 400 }}>
                          {mttr != null ? `${mttr.toFixed(1)}h` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${mtbf != null ? 'text-blue-600' : 'text-gray-300'}`} style={{ fontWeight: mtbf != null ? 600 : 400 }}>
                          {mtbf != null ? `${mtbf.toFixed(0)}d` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {disponibilidade != null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-sm ${dispColor(disponibilidade)}`} style={{ fontWeight: 700 }}>
                              {disponibilidade}%
                            </span>
                            <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${disponibilidade}%`, background: dispBarFill(disponibilidade) }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${horasReparo > 0 ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontWeight: horasReparo > 0 ? 500 : 400 }}>
                          {horasReparo > 0 ? `${horasReparo.toFixed(1)}h` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm ${custoTotal > 0 ? 'text-gray-700' : 'text-gray-300'}`} style={{ fontWeight: custoTotal > 0 ? 500 : 400 }}>
                          {custoTotal > 0
                            ? custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Card de Fórmulas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              sigla: 'MTTR',
              nome: 'Mean Time To Repair',
              formula: 'Σ Horas de Reparo ÷ Nº de Falhas Concluídas',
              desc: 'Tempo médio, em horas, para restaurar o equipamento após uma falha. Quanto menor, melhor.',
              color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
            },
            {
              sigla: 'MTBF',
              nome: 'Mean Time Between Failures',
              formula: 'Σ Intervalos entre Falhas ÷ (Nº de Falhas − 1)',
              desc: 'Tempo médio, em dias, entre uma falha e a próxima. Quanto maior, mais confiável.',
              color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
            },
            {
              sigla: 'Disponib.',
              nome: 'Disponibilidade Operacional',
              formula: 'MTBF ÷ (MTBF + MTTR÷24) × 100',
              desc: 'Proporção do tempo disponível para operação. Meta ideal: ≥ 95%. Exige MTTR e MTBF calculados.',
              color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
            },
          ].map(f => (
            <div key={f.sigla} className={`rounded-xl border ${f.border} ${f.bg} p-4 space-y-1.5`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-md bg-white border ${f.border} ${f.color} font-mono`} style={{ fontWeight: 700 }}>
                  {f.sigla}
                </span>
                <span className="text-[10px] text-gray-500">{f.nome}</span>
              </div>
              <p className="text-xs text-gray-700 font-mono bg-white/70 px-2 py-1.5 rounded border border-white leading-relaxed">
                {f.formula}
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}