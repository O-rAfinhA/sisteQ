/**
 * Manutenção / Indicadores — % Preventivas no Prazo
 * KPI: preventivas concluídas / preventivas programadas no mês × 100
 * "No prazo" = concluída dentro da mesma semana civil do prazo programado.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Target, CheckCircle2, Calendar, Clock, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from 'recharts';
import { useManutencao } from '../../hooks/useManutencao';
import { formatarData } from '../../utils/formatters';

const MESES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ── Helpers de semana ────────────────────────────────────────────────────────

/** Retorna {week, year} para uma string ISO — "semana" começa na segunda-feira */
function getISOWeek(dateStr: string): { week: number; year: number } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = (d.getDay() + 6) % 7; // Seg=0 … Dom=6
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - dayOfWeek);
  const jan1 = new Date(startOfWeek.getFullYear(), 0, 1);
  const week = Math.ceil(((startOfWeek.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
  return { week, year: startOfWeek.getFullYear() };
}

/** True se as duas datas ISO pertencem à mesma semana ISO */
function isSameWeek(date1: string, date2: string): boolean {
  const w1 = getISOWeek(date1);
  const w2 = getISOWeek(date2);
  return w1.week === w2.week && w1.year === w2.year;
}

/** Semana do mês (1–5) de uma data ISO */
function getWeekOfMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return Math.ceil(d.getDate() / 7);
}

// ── Cores dinâmicas por performance ─────────────────────────────────────────

function kpiColor(pct: number | null): string {
  if (pct === null) return 'text-gray-400';
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-red-600';
}
function kpiBg(pct: number | null): string {
  if (pct === null) return 'bg-gray-50';
  if (pct >= 90) return 'bg-emerald-50';
  if (pct >= 70) return 'bg-amber-50';
  return 'bg-red-50';
}
function kpiBarColor(pct: number | null): string {
  if (pct === null) return '#9ca3af';
  if (pct >= 90) return '#10b981';
  if (pct >= 70) return '#f59e0b';
  return '#ef4444';
}

// ─────────────────────────────────────────────────────────────────────────────

export function ManutencaoIndicadores() {
  const { ordens, equipamentos } = useManutencao();

  const hoje = new Date();

  // ── Meses disponíveis (últimos 12 + atual) ──
  const mesesDisponiveis = useMemo(() => {
    const result: { iso: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MESES_LABEL[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
      result.push({ iso, label });
    }
    return result;
  }, []);

  const mesAtualISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualISO);
  const mesLabel = mesesDisponiveis.find(m => m.iso === mesSelecionado)?.label ?? mesSelecionado;

  // ── KPI do mês selecionado ──
  const kpiMes = useMemo(() => {
    const programadas = ordens.filter(
      o => o.tipo === 'preventiva' && o.prazo.startsWith(mesSelecionado)
    );
    const realizadas = programadas.filter(o => o.status === 'concluida');
    const realizadasNoPrazo = realizadas.filter(
      o => o.dataEncerramento && isSameWeek(o.dataEncerramento, o.prazo)
    );
    const pct = programadas.length > 0
      ? Math.round((realizadas.length / programadas.length) * 100)
      : null;
    const pctNoPrazo = programadas.length > 0
      ? Math.round((realizadasNoPrazo.length / programadas.length) * 100)
      : null;
    return { programadas, realizadas: realizadas.length, realizadasNoPrazo: realizadasNoPrazo.length, pct, pctNoPrazo };
  }, [ordens, mesSelecionado]);

  // ── Histórico mensal (últimos 12 meses) ──
  const historico = useMemo(() => {
    return mesesDisponiveis.map(({ iso, label }) => {
      const prog = ordens.filter(o => o.tipo === 'preventiva' && o.prazo.startsWith(iso));
      const real = prog.filter(o => o.status === 'concluida');
      const noPrazo = real.filter(o => o.dataEncerramento && isSameWeek(o.dataEncerramento, o.prazo));
      const pct = prog.length > 0 ? Math.round((real.length / prog.length) * 100) : null;
      return { mes: label, programadas: prog.length, realizadas: real.length, realizadasNoPrazo: noPrazo.length, pct };
    });
  }, [ordens, mesesDisponiveis]);

  // ── Detalhamento por semana do mês selecionado ──
  const semanas = useMemo(() => {
    const weeks: Record<number, { programadas: number; realizadas: number; realizadasNoPrazo: number }> = {};
    kpiMes.programadas.forEach(os => {
      const week = getWeekOfMonth(os.prazo);
      if (!weeks[week]) weeks[week] = { programadas: 0, realizadas: 0, realizadasNoPrazo: 0 };
      weeks[week].programadas++;
      if (os.status === 'concluida') {
        weeks[week].realizadas++;
        if (os.dataEncerramento && isSameWeek(os.dataEncerramento, os.prazo)) {
          weeks[week].realizadasNoPrazo++;
        }
      }
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([week, data]) => ({ semana: `Semana ${week}`, ...data }));
  }, [kpiMes.programadas]);

  const semDados = kpiMes.programadas.length === 0;

  // ── Tooltip custom ──
  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm text-xs">
        <p className="text-gray-700 mb-1" style={{ fontWeight: 600 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }}>
            {p.name}: {p.value}{p.dataKey === 'pct' ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 bg-blue-50 text-blue-600" style={{ fontWeight: 600 }}>
              <Target style={{ width: 11, height: 11 }} />
              MANUTENÇÃO
            </div>
          </div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Indicadores de Manutenção
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            % de manutenções preventivas realizadas no prazo — referência: semana civil do prazo programado.
          </p>
        </div>
        <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
          <SelectTrigger className="h-9 text-xs w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {mesesDisponiveis.map(m => (
              <SelectItem key={m.iso} value={m.iso}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aviso sem dados */}
      {semDados && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Nenhuma OS preventiva com prazo em <strong>{mesLabel}</strong>. Cadastre OS preventivas com data de prazo nesse mês para gerar o indicador.
          </span>
        </div>
      )}

      {/* ── Cards KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* KPI principal */}
        <Card className={`rounded-xl border-0 ${kpiBg(kpiMes.pct)}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">Realizadas / Programadas</p>
                <p className={`mt-1 ${kpiColor(kpiMes.pct)}`} style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1 }}>
                  {kpiMes.pct !== null ? `${kpiMes.pct}%` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{mesLabel}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${kpiBg(kpiMes.pct)} border border-white/50 flex items-center justify-center flex-shrink-0`}>
                <Target className={kpiColor(kpiMes.pct)} style={{ width: 18, height: 18 }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {[
          {
            label: 'Programadas', value: kpiMes.programadas.length,
            sub: `Prazo em ${mesLabel}`, color: 'text-blue-600', bg: 'bg-blue-50', Icon: Calendar,
          },
          {
            label: 'Realizadas', value: kpiMes.realizadas,
            sub: 'Status concluída', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: CheckCircle2,
          },
          {
            label: 'No Prazo (semana)', value: kpiMes.realizadasNoPrazo,
            sub: `${kpiMes.pctNoPrazo !== null ? kpiMes.pctNoPrazo + '% das programadas' : '—'}`,
            color: 'text-purple-600', bg: 'bg-purple-50', Icon: Clock,
          },
        ].map(card => (
          <Card key={card.label} className="border-gray-200 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className={`mt-1 ${card.color}`} style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{card.value}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                  <card.Icon className={card.color} style={{ width: 18, height: 18 }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Barra de desempenho ── */}
      {!semDados && (
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Desempenho — {mesLabel}</p>
              <div className="flex items-center gap-4 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≥ 90% Excelente</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> ≥ 70% Adequado</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {'<'} 70% Crítico</span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: 'Realizadas / Programadas',
                  value: kpiMes.realizadas, total: kpiMes.programadas.length,
                  pct: kpiMes.pct, color: kpiBarColor(kpiMes.pct),
                },
                {
                  label: 'Realizadas no Prazo / Programadas',
                  value: kpiMes.realizadasNoPrazo, total: kpiMes.programadas.length,
                  pct: kpiMes.pctNoPrazo, color: '#8b5cf6',
                },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-600">{item.label}</span>
                    <span className="text-xs" style={{ fontWeight: 600, color: item.color }}>
                      {item.value}/{item.total} — {item.pct !== null ? `${item.pct}%` : '—'}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.pct ?? 0, 100)}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Histórico mensal ── */}
      <Card className="border-gray-200 rounded-xl">
        <CardContent className="p-6">
          <p className="text-sm text-gray-700 mb-1" style={{ fontWeight: 600 }}>Histórico — % Realizadas (Últimos 12 Meses)</p>
          <p className="text-xs text-gray-400 mb-4">Proporção de preventivas concluídas em relação às programadas por mês</p>
          {historico.every(h => h.programadas === 0) ? (
            <div className="flex items-center justify-center h-40 text-xs text-gray-400">Sem dados históricos disponíveis.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historico} margin={{ left: -10, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="% Realizadas" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {historico.map((entry, i) => (
                    <Cell key={i} fill={kpiBarColor(entry.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Detalhamento por semana ── */}
      {!semDados && semanas.length > 0 && (
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-700 mb-1" style={{ fontWeight: 600 }}>Detalhamento por Semana — {mesLabel}</p>
            <p className="text-xs text-gray-400 mb-4">Semana determinada pela data de prazo de cada OS preventiva</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={semanas} margin={{ left: -10, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="programadas" name="Programadas" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="realizadas" name="Realizadas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="realizadasNoPrazo" name="No Prazo" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Tabela de preventivas do mês ── */}
      <Card className="border-gray-200 rounded-xl">
        <CardContent className="p-6">
          <p className="text-sm text-gray-700 mb-4" style={{ fontWeight: 600 }}>Preventivas do Mês — {mesLabel}</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-200">
                  {['Nº OS', 'Equipamento', 'Responsável', 'Prazo', 'Conclusão', 'Status', 'No Prazo'].map(h => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 text-xs text-gray-500 ${['Status', 'No Prazo'].includes(h) ? 'text-center' : 'text-left'}`}
                      style={{ fontWeight: 600 }}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kpiMes.programadas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                    Nenhuma preventiva programada para {mesLabel}.
                  </td></tr>
                )}
                {kpiMes.programadas.map(os => {
                  const eq = equipamentos.find(e => e.id === os.equipamentoId);
                  const concluida = os.status === 'concluida';
                  const noPrazo = concluida && !!os.dataEncerramento && isSameWeek(os.dataEncerramento, os.prazo);
                  return (
                    <tr key={os.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-gray-800 font-mono" style={{ fontWeight: 600 }}>{os.numero}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{eq?.nome || '—'}</span>
                        <span className="text-xs text-gray-400 block">{eq?.codigo}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-gray-600">{os.responsavel || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">{formatarData(os.prazo)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {os.dataEncerramento ? formatarData(os.dataEncerramento) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${
                          concluida
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`} style={{ fontWeight: 500 }}>
                          {concluida ? 'Concluída' : os.status.charAt(0).toUpperCase() + os.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!concluida ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : noPrazo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ fontWeight: 500 }}>
                            <CheckCircle2 className="w-3 h-3" /> Sim
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 500 }}>
                            Fora do prazo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}