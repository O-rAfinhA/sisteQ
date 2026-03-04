/**
 * Manutenção / Histórico de Equipamentos
 * Linha do tempo de todas as intervenções por equipamento,
 * com fechamento de dados e valores gastos (peças, serviços, mão de obra).
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Search, History, Wrench, HardHat, Clock, CheckCircle2,
  ChevronRight, DollarSign, Package, Settings, User, CalendarCheck,
  TrendingUp, AlertTriangle, XCircle,
} from 'lucide-react';
import { formatarData } from '../../utils/formatters';
import {
  useManutencao, calcularStatusOS, calcularMTTR, calcularMTBF,
  calcularCustoTotal, STATUS_OS_CONFIG, TIPO_MANUTENCAO_CONFIG, PRIORIDADE_CONFIG,
} from '../../hooks/useManutencao';
import { ConfiguracaoManutencaoSheet } from '../../components/manutencao/ConfiguracaoManutencaoSheet';

// ─── Formatação de moeda ────────────────────────────────
function moeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Mini stat ─────────────────────────────────────────
function MiniStat({
  label, value, color = 'text-gray-700',
}: {
  label: string; value: string | number; color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className={`text-base ${color}`} style={{ fontWeight: 700 }}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5" style={{ fontWeight: 500 }}>{label}</p>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────
export function ManutencaoHistorico() {
  const { equipamentos, ordens } = useManutencao();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // ── Lista de equipamentos filtrada ──
  const equipamentosFiltrados = useMemo(() => {
    return equipamentos.filter(eq =>
      !busca || [eq.codigo, eq.nome, eq.tipo, eq.localizacao].some(v =>
        v?.toLowerCase().includes(busca.toLowerCase())
      )
    ).sort((a, b) => {
      const ta = ordens.filter(o => o.equipamentoId === a.id).length;
      const tb = ordens.filter(o => o.equipamentoId === b.id).length;
      return tb - ta;
    });
  }, [equipamentos, ordens, busca]);

  const equip = equipamentos.find(e => e.id === selectedId);

  // ── OS do equipamento selecionado ──
  const osDoEquip = useMemo(() => {
    if (!selectedId) return [];
    return ordens
      .filter(o => {
        const matchEq = o.equipamentoId === selectedId;
        const matchTipo = filtroTipo === 'todos' || o.tipo === filtroTipo;
        const matchSt = filtroStatus === 'todos' || calcularStatusOS(o) === filtroStatus;
        return matchEq && matchTipo && matchSt;
      })
      .sort((a, b) => b.dataAbertura.localeCompare(a.dataAbertura));
  }, [selectedId, ordens, filtroTipo, filtroStatus]);

  // ── Indicadores do equipamento ──
  const indicadores = useMemo(() => {
    if (!selectedId) return null;
    const osEq = ordens.filter(o => o.equipamentoId === selectedId);
    const corretivas = osEq.filter(o => o.tipo === 'corretiva');
    const preventivas = osEq.filter(o => o.tipo === 'preventiva');
    const concluidas = osEq.filter(o => o.status === 'concluida');

    const custoCorretivas = corretivas.reduce((s, o) => s + calcularCustoTotal(o), 0);
    const custoPreventivas = preventivas.reduce((s, o) => s + calcularCustoTotal(o), 0);
    const custoTotal = custoCorretivas + custoPreventivas;

    const custoPecas   = osEq.reduce((s, o) => s + (o.custoPecas   || 0), 0);
    const custoServico = osEq.reduce((s, o) => s + (o.custoServico || 0), 0);
    const custoMaoObra = osEq.reduce((s, o) => s + (o.custoMaoObra || 0), 0);

    const mttr = calcularMTTR(ordens, selectedId);
    const mtbf = calcularMTBF(ordens, selectedId);

    return {
      total: osEq.length,
      corretivas: corretivas.length,
      preventivas: preventivas.length,
      concluidas: concluidas.length,
      custoTotal, custoCorretivas, custoPreventivas,
      custoPecas, custoServico, custoMaoObra,
      mttr, mtbf,
    };
  }, [selectedId, ordens]);

  // Custo total das OS exibidas (com filtro)
  const custoFiltrado = useMemo(() => osDoEquip.reduce((s, o) => s + calcularCustoTotal(o), 0), [osDoEquip]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border border-blue-100 bg-blue-50 text-blue-600" style={{ fontWeight: 600 }}>
              <Wrench style={{ width: 11, height: 11 }} />
              MANUTENÇÃO
            </div>
          </div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Histórico de Equipamentos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Consulta cronológica de todas as intervenções com fechamento de dados e valores gastos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Coluna esquerda: lista de equipamentos ── */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar equipamento..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="space-y-1 max-h-[680px] overflow-y-auto pr-1">
            {equipamentosFiltrados.length === 0 && (
              <div className="text-center py-10">
                <HardHat className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Nenhum equipamento cadastrado.</p>
              </div>
            )}
            {equipamentosFiltrados.map(eq => {
              const totalOS = ordens.filter(o => o.equipamentoId === eq.id).length;
              const custo   = ordens.filter(o => o.equipamentoId === eq.id).reduce((s, o) => s + calcularCustoTotal(o), 0);
              const isSelected = selectedId === eq.id;
              return (
                <button
                  key={eq.id}
                  onClick={() => setSelectedId(eq.id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${isSelected ? 'text-white' : 'text-gray-800'}`} style={{ fontWeight: 600 }}>
                      {eq.nome}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                      {eq.codigo} · {eq.tipo}
                    </p>
                    {custo > 0 && (
                      <p className={`text-[10px] mt-1 ${isSelected ? 'text-white/50' : 'text-gray-400'}`}>
                        {moeda(custo)} em OS
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`} style={{ fontWeight: 600 }}>
                      {totalOS}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white/60' : 'text-gray-300'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Coluna direita: histórico ── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedId ? (
            <div className="flex items-center justify-center h-72 bg-white rounded-xl border border-dashed border-gray-200">
              <div className="text-center">
                <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Selecione um equipamento para ver o histórico.</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Card de resumo do equipamento ── */}
              <Card className="border-gray-200 rounded-xl">
                <CardContent className="p-5 space-y-4">

                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-900" style={{ fontWeight: 600 }}>{equip?.nome}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{equip?.tipo} · {equip?.localizacao || 'Sem localização'}</p>
                      {equip?.fabricante && (
                        <p className="text-xs text-gray-400 mt-0.5">{equip.fabricante} {equip.modelo}</p>
                      )}
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${equip?.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`} style={{ fontWeight: 500 }}>
                      {equip?.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Indicadores de OS */}
                  <div className="grid grid-cols-5 gap-2">
                    <MiniStat label="Total OS"    value={indicadores?.total      ?? 0} />
                    <MiniStat label="Corretivas"  value={indicadores?.corretivas ?? 0} color="text-red-600" />
                    <MiniStat label="Preventivas" value={indicadores?.preventivas ?? 0} color="text-blue-600" />
                    <MiniStat label="MTTR"        value={indicadores?.mttr != null ? `${indicadores.mttr.toFixed(1)}h` : '—'} color="text-amber-600" />
                    <MiniStat label="MTBF"        value={indicadores?.mtbf != null ? `${indicadores.mtbf.toFixed(0)}d` : '—'} color="text-purple-600" />
                  </div>

                  {/* Resumo financeiro */}
                  {(indicadores?.custoTotal ?? 0) > 0 && (
                    <div className="border border-gray-100 rounded-xl bg-gray-50/60 p-4 space-y-3">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                        <DollarSign className="w-3.5 h-3.5" /> Custo Total Acumulado — Todas as OS
                      </p>

                      {/* Barra proporcional corretivas vs preventivas */}
                      {(indicadores!.custoCorretivas + indicadores!.custoPreventivas) > 0 && (
                        <div>
                          <div className="h-2 rounded-full overflow-hidden bg-gray-200 flex">
                            {indicadores!.custoCorretivas > 0 && (
                              <div
                                className="bg-red-400 h-full"
                                style={{ width: `${(indicadores!.custoCorretivas / indicadores!.custoTotal) * 100}%` }}
                              />
                            )}
                            {indicadores!.custoPreventivas > 0 && (
                              <div
                                className="bg-blue-400 h-full"
                                style={{ width: `${(indicadores!.custoPreventivas / indicadores!.custoTotal) * 100}%` }}
                              />
                            )}
                          </div>
                          <div className="flex gap-4 mt-1.5">
                            <span className="text-[10px] text-red-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Corretivas: {moeda(indicadores!.custoCorretivas)}
                            </span>
                            <span className="text-[10px] text-blue-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Preventivas: {moeda(indicadores!.custoPreventivas)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Breakdown por categoria */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Peças',     value: indicadores!.custoPecas,   icon: Package,  color: 'text-gray-600' },
                          { label: 'Serviços',  value: indicadores!.custoServico, icon: Settings, color: 'text-gray-600' },
                          { label: 'Mão de Obra', value: indicadores!.custoMaoObra, icon: User,   color: 'text-gray-600' },
                        ].map(({ label, value, icon: Icon, color }) => (
                          <div key={label} className="bg-white rounded-lg border border-gray-100 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] text-gray-400" style={{ fontWeight: 500 }}>{label}</span>
                            </div>
                            <p className={`text-sm ${color}`} style={{ fontWeight: 600 }}>{moeda(value)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Total Geral</span>
                        <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{moeda(indicadores!.custoTotal)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Filtros de intervenções ── */}
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Intervenções</p>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos tipos</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em-andamento">Em andamento</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-400">{osDoEquip.length} registro(s)</span>
                {custoFiltrado > 0 && (
                  <span className="text-xs text-emerald-600 ml-auto flex items-center gap-1" style={{ fontWeight: 600 }}>
                    <TrendingUp className="w-3.5 h-3.5" /> {moeda(custoFiltrado)} no filtro
                  </span>
                )}
              </div>

              {/* ── Linha do tempo ── */}
              {osDoEquip.length === 0 ? (
                <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-dashed border-gray-200">
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Nenhuma intervenção encontrada.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {osDoEquip.map((os, idx) => {
                    const status   = calcularStatusOS(os);
                    const stCfg    = STATUS_OS_CONFIG[status];
                    const tipoCfg  = TIPO_MANUTENCAO_CONFIG[os.tipo];
                    const priCfg   = os.prioridade ? PRIORIDADE_CONFIG[os.prioridade] : null;
                    const isLast   = idx === osDoEquip.length - 1;
                    const custo    = calcularCustoTotal(os);
                    const concluida = os.status === 'concluida';
                    const cancelada = os.status === 'cancelada';

                    // Dias de duração (abertura → encerramento ou hoje)
                    const dAbr = new Date(os.dataAbertura);
                    const dEnc = os.dataEncerramento ? new Date(os.dataEncerramento) : new Date();
                    const duracaoDias = Math.max(0, Math.ceil((dEnc.getTime() - dAbr.getTime()) / 86400000));

                    return (
                      <div key={os.id} className="flex gap-4">
                        {/* Linha vertical + ícone */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            os.tipo === 'corretiva'
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-blue-50 border border-blue-200'
                          }`}>
                            {os.tipo === 'corretiva'
                              ? <Wrench className="w-3.5 h-3.5 text-red-500" />
                              : <HardHat className="w-3.5 h-3.5 text-blue-500" />
                            }
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 mb-1 min-h-[20px]" />}
                        </div>

                        {/* Card da intervenção */}
                        <div className={`flex-1 bg-white border rounded-xl p-4 ${isLast ? '' : 'mb-2'} ${
                          cancelada ? 'border-gray-200 opacity-70' : 'border-gray-200'
                        }`}>

                          {/* Linha: número + pills + custo */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-900 font-mono" style={{ fontWeight: 700 }}>{os.numero}</span>
                                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>
                                  {tipoCfg.label}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                                  <span className={`w-1 h-1 rounded-full ${stCfg.dotColor}`} />{stCfg.label}
                                </span>
                                {priCfg && (
                                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] border ${priCfg.bg} ${priCfg.text} ${priCfg.border}`} style={{ fontWeight: 500 }}>
                                    {priCfg.label}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-gray-700 mt-1.5" style={{ fontWeight: 500 }}>{os.descricao}</p>
                              {os.observacao && <p className="text-xs text-gray-400 mt-0.5">{os.observacao}</p>}
                            </div>

                            {/* Custo destacado */}
                            {custo > 0 && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{moeda(custo)}</p>
                                <p className="text-[10px] text-gray-400">custo total</p>
                              </div>
                            )}
                          </div>

                          {/* ── Fechamento de dados ── */}
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">

                            {/* Datas e métricas de tempo */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>Abertura: {formatarData(os.dataAbertura)}</span>
                              </div>
                              {concluida && os.dataEncerramento ? (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                  <CalendarCheck className="w-3 h-3" />
                                  <span style={{ fontWeight: 500 }}>Encerrada: {formatarData(os.dataEncerramento)}</span>
                                </div>
                              ) : cancelada ? (
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <XCircle className="w-3 h-3" />
                                  <span>Cancelada</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Em aberto · Prazo: {formatarData(os.prazo)}</span>
                                </div>
                              )}
                              {os.horasReparo != null && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                                  <Wrench className="w-3 h-3" />
                                  <span style={{ fontWeight: 500 }}>{os.horasReparo}h reparo</span>
                                </div>
                              )}
                              {concluida && os.dataEncerramento && (
                                <span className="text-[10px] text-gray-400">
                                  {duracaoDias}d de duração
                                </span>
                              )}
                              {os.responsavel && (
                                <span className="text-xs text-gray-400">Téc: {os.responsavel}</span>
                              )}
                            </div>

                            {/* Breakdown de custos (se houver) */}
                            {custo > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {os.custoPecas != null && os.custoPecas > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600">
                                    <Package className="w-3 h-3 text-gray-400" />
                                    <span>Peças:</span>
                                    <span style={{ fontWeight: 600 }}>{moeda(os.custoPecas)}</span>
                                  </div>
                                )}
                                {os.custoServico != null && os.custoServico > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600">
                                    <Settings className="w-3 h-3 text-gray-400" />
                                    <span>Serviços:</span>
                                    <span style={{ fontWeight: 600 }}>{moeda(os.custoServico)}</span>
                                  </div>
                                )}
                                {os.custoMaoObra != null && os.custoMaoObra > 0 && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span>M.O.:</span>
                                    <span style={{ fontWeight: 600 }}>{moeda(os.custoMaoObra)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded border border-emerald-100 text-xs text-emerald-700 ml-auto">
                                  <DollarSign className="w-3 h-3" />
                                  <span>Total:</span>
                                  <span style={{ fontWeight: 700 }}>{moeda(custo)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}