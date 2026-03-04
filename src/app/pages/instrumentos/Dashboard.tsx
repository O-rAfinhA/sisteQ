/**
 * Dashboard — Instrumentos de Medição
 * Visão geral do controle metrológico: status, alertas, vencimentos e pendências.
 * Padrões de Referência removidos do dash — são instrumentos do fornecedor/laboratório,
 * não de controle interno. A Biblioteca de Padrões existe apenas como registro de rastreabilidade.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MetricCard } from '../../components/ui/metric-card';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Gauge, ShieldCheck, ShieldX, ShieldAlert, Lock, AlertTriangle, XCircle,
  ArrowRight, Clock, CheckCircle2, Plus, Ruler, FileX, ClipboardX,
} from 'lucide-react';
import { formatarData } from '../../utils/formatters';
import {
  useInstrumentos,
  calcularStatus,
  calcularProximaValidade,
  diasAteValidade,
  STATUS_CONFIG,
  CRITICIDADE_CONFIG,
  TIPO_CONTROLE_CONFIG,
  type Instrumento,
  type StatusInstrumento,
} from '../../hooks/useInstrumentos';

export function InstrumentosDashboard() {
  const { instrumentos, tiposInstrumentos, stats } = useInstrumentos();
  const navigate = useNavigate();

  // ═══ Próximos vencimentos — até 90 dias ═══
  const proximosVencimentos = useMemo(() => {
    return instrumentos
      .map(inst => {
        const prox = calcularProximaValidade(inst);
        const status = calcularStatus(inst);
        if (!prox || status === 'bloqueado') return null;
        const dias = diasAteValidade(prox);
        if (dias > 90) return null;
        return { inst, prox, dias, status };
      })
      .filter(Boolean)
      .sort((a, b) => a!.dias - b!.dias)
      .slice(0, 10) as { inst: Instrumento; prox: string; dias: number; status: StatusInstrumento }[];
  }, [instrumentos]);

  // ═══ Instrumentos sem histórico de calibração/verificação ═══
  // São os que precisam de ação imediata — nunca tiveram registro
  const semHistorico = useMemo(() => {
    return instrumentos.filter(inst => {
      if (inst.bloqueado) return false;
      if (inst.tipoControle === 'nao-aplicavel') return false;
      if (inst.tipoControle === 'calibracao') return inst.historicoCalibracao.length === 0;
      if (inst.tipoControle === 'verificacao') return inst.historicoVerificacao.length === 0;
      return false;
    }).sort((a, b) => {
      // Alta criticidade primeiro
      const cOrd = { alta: 0, media: 1, baixa: 2 };
      return (cOrd[a.criticidade] ?? 1) - (cOrd[b.criticidade] ?? 1);
    });
  }, [instrumentos]);

  // ═══ Alertas críticos ═══
  const alertas = useMemo(() => {
    const list: { tipo: 'danger' | 'warning'; msg: string }[] = [];
    if (stats.criticosVencidos > 0)
      list.push({ tipo: 'danger', msg: `${stats.criticosVencidos} instrumento(s) de criticidade ALTA vencido(s) ou bloqueado(s).` });
    if (stats.vencidos > 0)
      list.push({ tipo: 'danger', msg: `${stats.vencidos} instrumento(s) com validade expirada.` });
    if (semHistorico.length > 0)
      list.push({ tipo: 'warning', msg: `${semHistorico.length} instrumento(s) ainda sem registro de calibração/verificação.` });
    if (stats.atencao > 0)
      list.push({ tipo: 'warning', msg: `${stats.atencao} instrumento(s) vencem nos próximos 30 dias.` });
    return list;
  }, [stats, semHistorico]);

  // Distribuição para barras visuais
  const barTipoData = [
    { label: 'Calibração', value: stats.porTipo.calibracao, color: 'bg-blue-500' },
    { label: 'Verificação Interna', value: stats.porTipo.verificacao, color: 'bg-purple-500' },
    { label: 'Não Aplicável', value: stats.porTipo.naoAplicavel, color: 'bg-gray-300' },
  ];
  const barCritData = [
    { label: 'Alta', value: stats.porCriticidade.alta, color: 'bg-red-500' },
    { label: 'Média', value: stats.porCriticidade.media, color: 'bg-amber-500' },
    { label: 'Baixa', value: stats.porCriticidade.baixa, color: 'bg-gray-400' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Dashboard — Instrumentos de Medição
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Visão geral do controle metrológico, alertas e próximos vencimentos.
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/instrumentos-medicao/instrumentos')}>
          <Plus className="w-4 h-4" /> Novo Instrumento
        </Button>
      </div>

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                a.tipo === 'danger'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              {a.tipo === 'danger'
                ? <XCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <span>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Metric Cards — 2 × 4 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total"
          value={stats.total}
          icon={Gauge}
          variant="default"
          onClick={() => navigate('/instrumentos-medicao/instrumentos')}
        />
        <MetricCard label="Válidos" value={stats.validos} icon={ShieldCheck} variant="success" />
        <MetricCard
          label="Atenção (30d)"
          value={stats.atencao}
          icon={Clock}
          variant={stats.atencao > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Vencidos"
          value={stats.vencidos}
          icon={ShieldX}
          variant={stats.vencidos > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="Bloqueados"
          value={stats.bloqueados}
          icon={Lock}
          variant={stats.bloqueados > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="Alta Crit. Vencidos"
          value={stats.criticosVencidos}
          icon={ShieldAlert}
          variant={stats.criticosVencidos > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="Tipos Cadastrados"
          value={tiposInstrumentos.length}
          icon={Ruler}
          variant="default"
          onClick={() => navigate('/instrumentos-medicao/tipos')}
        />
        {/* Substituiu "Padrões" — padrões são do fornecedor, não controle interno */}
        <MetricCard
          label="Sem Histórico"
          value={semHistorico.length}
          icon={FileX}
          variant={semHistorico.length > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/instrumentos-medicao/instrumentos')}
        />
      </div>

      {/* ── Distribuições ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por Tipo de Controle */}
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Distribuição por Tipo de Controle</p>
            <div className="mt-4 space-y-3">
              {barTipoData.map(item => {
                const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{item.label}</span>
                      <span className="text-xs text-gray-500">{item.value} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {stats.total === 0 && <p className="text-xs text-gray-400 text-center mt-4">Nenhum instrumento cadastrado.</p>}
          </CardContent>
        </Card>

        {/* Por Criticidade */}
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Distribuição por Criticidade</p>
            <div className="mt-4 space-y-3">
              {barCritData.map(item => {
                const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{item.label}</span>
                      <span className="text-xs text-gray-500">{item.value} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {stats.total === 0 && <p className="text-xs text-gray-400 text-center mt-4">Nenhum instrumento cadastrado.</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Painéis de ação — Vencimentos + Sem Histórico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Próximos Vencimentos */}
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Próximos Vencimentos</p>
              <Button
                variant="ghost" size="sm"
                className="gap-1 text-xs text-gray-500"
                onClick={() => navigate('/instrumentos-medicao/calendario')}
              >
                Ver calendário <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {proximosVencimentos.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Nenhum vencimento nos próximos 90 dias.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {proximosVencimentos.map(item => {
                  const stCfg = STATUS_CONFIG[item.status];
                  return (
                    <div
                      key={item.inst.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stCfg.dotColor}`} />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-800 block truncate" style={{ fontWeight: 500 }}>
                            {item.inst.codigo}
                          </span>
                          <span className="text-xs text-gray-400 block truncate">{item.inst.descricao}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-xs text-gray-500 hidden sm:block">{formatarData(item.prox)}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            item.dias < 0 ? 'bg-red-100 text-red-700' :
                            item.dias <= 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}
                          style={{ fontWeight: 500 }}
                        >
                          {item.dias < 0 ? `${Math.abs(item.dias)}d atrás` : `${item.dias}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instrumentos sem Histórico */}
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Sem Histórico de Calibração/Verificação</p>
              <Button
                variant="ghost" size="sm"
                className="gap-1 text-xs text-gray-500"
                onClick={() => navigate('/instrumentos-medicao/instrumentos')}
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {semHistorico.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Todos os instrumentos possuem histórico registrado.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {semHistorico.slice(0, 10).map(inst => {
                  const critCfg = CRITICIDADE_CONFIG[inst.criticidade];
                  const tipoCfg = TIPO_CONTROLE_CONFIG[inst.tipoControle];
                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ClipboardX className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-800 block truncate" style={{ fontWeight: 500 }}>
                            {inst.codigo}
                          </span>
                          <span className="text-xs text-gray-400 block truncate">{inst.descricao}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] border ${critCfg.bg} ${critCfg.text} ${critCfg.border}`}
                          style={{ fontWeight: 500 }}
                        >
                          {critCfg.label}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`}
                          style={{ fontWeight: 500 }}
                        >
                          {tipoCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {semHistorico.length > 10 && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    + {semHistorico.length - 10} instrumento(s) não exibidos
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Matriz Criticidade × Status ── */}
      <Card className="border-gray-200 rounded-xl">
        <CardContent className="p-6">
          <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Matriz Criticidade × Status</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Criticidade</th>
                  {(['valido', 'atencao', 'vencido', 'bloqueado'] as const).map(s => (
                    <th key={s} className="px-4 py-2.5 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>
                      {STATUS_CONFIG[s].label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(['alta', 'media', 'baixa'] as const).map(crit => {
                  const instsCrit = instrumentos.filter(i => i.criticidade === crit);
                  const statusCounts = {
                    valido: instsCrit.filter(i => calcularStatus(i) === 'valido').length,
                    atencao: instsCrit.filter(i => calcularStatus(i) === 'atencao').length,
                    vencido: instsCrit.filter(i => calcularStatus(i) === 'vencido').length,
                    bloqueado: instsCrit.filter(i => calcularStatus(i) === 'bloqueado').length,
                  };
                  const critCfg = CRITICIDADE_CONFIG[crit];
                  return (
                    <tr key={crit} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${critCfg.bg} ${critCfg.text} ${critCfg.border}`}
                          style={{ fontWeight: 500 }}
                        >
                          {critCfg.label}
                        </span>
                      </td>
                      {(['valido', 'atencao', 'vencido', 'bloqueado'] as const).map(s => (
                        <td key={s} className="px-4 py-2.5 text-center">
                          <span
                            className={`text-sm ${
                              statusCounts[s] > 0 && (s === 'vencido' || s === 'bloqueado') ? 'text-red-600' :
                              statusCounts[s] > 0 && s === 'atencao' ? 'text-amber-600' :
                              'text-gray-500'
                            }`}
                            style={{ fontWeight: statusCounts[s] > 0 ? 600 : 400 }}
                          >
                            {statusCounts[s]}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{instsCrit.length}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {instrumentos.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-4">Nenhum instrumento cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
