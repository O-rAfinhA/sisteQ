/**
 * Manutenção / OS — Preventivas
 * Visão semanal derivada diretamente dos Planos de Manutenção (mesma fonte que a Agenda).
 * Elimina a divergência anterior: todos os dados agora vêm de planos.itensVerificacao.
 * Grupos por equipamento/plano, imprimíveis como checklist para a equipe técnica.
 */
import { useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  ChevronLeft, ChevronRight, Search, Printer,
  Calendar, AlertTriangle, Clock, ClipboardList, Info, Wrench,
} from 'lucide-react';
import { formatarData } from '../../utils/formatters';
import {
  useManutencao,
  calcularStatusPlano,
  PERIODICIDADE_CONFIG,
  type PlanoManutencao, type ItemVerificacao, type Equipamento,
} from '../../hooks/useManutencao';
import { ConfiguracaoManutencaoSheet } from '../../components/manutencao/ConfiguracaoManutencaoSheet';
import { imprimirManutencaoSemanal, type GrupoParaImpressao } from '../../utils/printOS';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ItemDaSemana {
  item: ItemVerificacao;
  dueDate: string;        // ISO — data de vencimento nesta semana
  diasRestantes: number;  // negativo = atrasado
}

interface GrupoSemanal {
  key: string;
  equipamento: Equipamento;
  plano: PlanoManutencao;
  itens: ItemDaSemana[];
  piorDias: number;       // menor diasRestantes do grupo (mais urgente)
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function semanaDeData(ref: Date): { inicio: Date; fim: Date } {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diffParaSegunda = dow === 0 ? -6 : 1 - dow;
  const inicio = new Date(d);
  inicio.setDate(d.getDate() + diffParaSegunda);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

const MESES_ABR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtSemana(ini: Date, fim: Date): string {
  const di = ini.getDate(), mi = MESES_ABR[ini.getMonth()], ai = ini.getFullYear();
  const df = fim.getDate(), mf = MESES_ABR[fim.getMonth()], af = fim.getFullYear();
  if (ai !== af) return `${di} ${mi} ${ai} — ${df} ${mf} ${af}`;
  if (mi === mf)  return `${di} a ${df} de ${mi} de ${ai}`;
  return `${di} ${mi} — ${df} ${mf} de ${ai}`;
}

// ─── Config de urgência visual ────────────────────────────────────────────────

function urgCfg(dias: number) {
  if (dias < 0)   return { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',        label: `${Math.abs(dias)}d atrasado` };
  if (dias === 0) return { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'Vence hoje'                  };
  if (dias <= 3)  return { dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: `em ${dias}d`                };
  return           { dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200',      label: `em ${dias}d`                   };
}

/**
 * Encontra a ocorrência de um item de verificação dentro de [semanaInicio, semanaFim].
 * Se nenhuma ocorrência cair na semana e estiver vendo a semana atual, retorna
 * o vencimento atrasado mais recente (diasRestantes < 0).
 */
function ocorrenciaNaSemana(
  item: ItemVerificacao,
  plano: PlanoManutencao,
  semanaInicio: Date,
  semanaFim: Date,
  hoje: Date,
  ehSemanaAtual: boolean,
): { dueDate: string; diasRestantes: number } | null {
  const diasPeriodo = PERIODICIDADE_CONFIG[item.periodicidade].diasAproximados;
  if (diasPeriodo <= 0) return null;

  const baseStr = item.ultimaExecucao || plano.dataInicio;
  let current = parseLocal(baseStr);
  if (item.ultimaExecucao) current.setDate(current.getDate() + diasPeriodo);

  // Fast-forward para perto da semana (sem ultrapassar)
  if (current < semanaInicio) {
    const diffDias = Math.ceil((semanaInicio.getTime() - current.getTime()) / 86400000);
    const skip = Math.max(0, Math.floor(diffDias / diasPeriodo) - 1);
    if (skip > 0) current.setDate(current.getDate() + skip * diasPeriodo);
  }

  // Avança até entrar na semana ou ultrapassá-la
  let guard = 0;
  while (current < semanaInicio && guard < 60) {
    current.setDate(current.getDate() + diasPeriodo);
    guard++;
  }

  // Ocorrência dentro da semana
  if (current >= semanaInicio && current <= semanaFim) {
    const dueISO = formatLocal(current);
    const dias = Math.ceil((current.getTime() - hoje.getTime()) / 86400000);
    return { dueDate: dueISO, diasRestantes: dias };
  }

  // Sem ocorrência na semana → verificar vencimento atrasado (só semana atual)
  if (ehSemanaAtual) {
    const startDate = parseLocal(baseStr);
    if (item.ultimaExecucao) startDate.setDate(startDate.getDate() + diasPeriodo);
    if (startDate < semanaInicio) {
      // Achar a última ocorrência antes da semana
      let lastDue = new Date(startDate);
      let temp = new Date(lastDue);
      temp.setDate(temp.getDate() + diasPeriodo);
      while (temp < semanaInicio) {
        lastDue = temp;
        temp = new Date(lastDue);
        temp.setDate(temp.getDate() + diasPeriodo);
      }
      const dias = Math.ceil((lastDue.getTime() - hoje.getTime()) / 86400000);
      if (dias < 0) return { dueDate: formatLocal(lastDue), diasRestantes: dias };
    }
  }

  return null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ManutencaoOS() {
  const { planos, equipamentos } = useManutencao();

  const [semanaRef, setSemanaRef] = useState(() => new Date());
  const [busca, setBusca] = useState('');

  const hoje = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const { inicio: semanaInicio, fim: semanaFim } = useMemo(
    () => semanaDeData(semanaRef), [semanaRef]
  );

  const ehSemanaAtual = useMemo(() => {
    const { inicio } = semanaDeData(hoje);
    return semanaInicio.getTime() === inicio.getTime();
  }, [semanaInicio, hoje]);

  function prevSemana() { setSemanaRef(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function nextSemana() { setSemanaRef(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }
  function irParaHoje() { setSemanaRef(new Date()); }

  // ── Derivar grupos da semana a partir dos Planos (mesma lógica da Agenda) ──
  const gruposSemana = useMemo<GrupoSemanal[]>(() => {
    const planosAtivos = planos.filter(p => calcularStatusPlano(p) !== 'inativo');
    const grupos: GrupoSemanal[] = [];

    planosAtivos.forEach(plano => {
      if (!plano.dataInicio) return;
      const eq = equipamentos.find(e => e.id === plano.equipamentoId);
      if (!eq) return;

      const itensGrupo: ItemDaSemana[] = [];

      (plano.itensVerificacao || []).forEach(item => {
        const occ = ocorrenciaNaSemana(item, plano, semanaInicio, semanaFim, hoje, ehSemanaAtual);
        if (occ) itensGrupo.push({ item, ...occ });
      });

      if (itensGrupo.length > 0) {
        const piorDias = Math.min(...itensGrupo.map(i => i.diasRestantes));
        grupos.push({
          key: `${plano.id}-${eq.id}`,
          equipamento: eq,
          plano,
          itens: itensGrupo.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
          piorDias,
        });
      }
    });

    return grupos.sort((a, b) => a.piorDias - b.piorDias);
  }, [planos, equipamentos, semanaInicio, semanaFim, hoje, ehSemanaAtual]);

  const filtrados = useMemo(() => {
    if (!busca) return gruposSemana;
    const q = busca.toLowerCase();
    return gruposSemana.filter(g =>
      g.equipamento.nome.toLowerCase().includes(q) ||
      g.equipamento.codigo.toLowerCase().includes(q) ||
      g.plano.codigo.toLowerCase().includes(q) ||
      g.plano.nome.toLowerCase().includes(q) ||
      (g.equipamento.localizacao || '').toLowerCase().includes(q)
    );
  }, [gruposSemana, busca]);

  const stats = useMemo(() => ({
    equipamentos: gruposSemana.length,
    itens: gruposSemana.reduce((s, g) => s + g.itens.length, 0),
    atrasados: gruposSemana.filter(g => g.piorDias < 0).length,
    hoje: gruposSemana.filter(g => g.piorDias === 0).length,
  }), [gruposSemana]);

  // ── Impressão ──────────────────────────────────────────────────────────────

  function toGrupoImpressao(g: GrupoSemanal): GrupoParaImpressao {
    return {
      equipamento: {
        nome: g.equipamento.nome,
        codigo: g.equipamento.codigo,
        tipo: g.equipamento.tipo,
        localizacao: g.equipamento.localizacao,
        fabricante: g.equipamento.fabricante,
        modelo: g.equipamento.modelo,
        numSerie: g.equipamento.numSerie,
      },
      plano: {
        codigo: g.plano.codigo,
        nome: g.plano.nome,
        responsavel: g.plano.responsavel,
        duracaoEstimada: g.plano.duracaoEstimada,
        necessitaParada: g.plano.necessitaParada,
      },
      itens: g.itens.map(iv => ({
        descricao: iv.item.descricao,
        periodicidade: PERIODICIDADE_CONFIG[iv.item.periodicidade].label,
        ultimaExecucao: iv.item.ultimaExecucao,
        dueDate: iv.dueDate,
        diasRestantes: iv.diasRestantes,
        observacao: iv.item.observacao,
      })),
    };
  }

  function handleImprimirGrupo(g: GrupoSemanal) {
    imprimirManutencaoSemanal({
      semanaInicio: formatLocal(semanaInicio),
      semanaFim: formatLocal(semanaFim),
      grupos: [toGrupoImpressao(g)],
    });
  }

  function handleImprimirTodos() {
    if (filtrados.length === 0) return;
    imprimirManutencaoSemanal({
      semanaInicio: formatLocal(semanaInicio),
      semanaFim: formatLocal(semanaFim),
      grupos: filtrados.map(toGrupoImpressao),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

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
            OS — Preventivas
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Manutenções preventivas agrupadas por semana e equipamento. Imprima a OS para a equipe técnica.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConfiguracaoManutencaoSheet />
          {filtrados.length > 0 && (
            <Button variant="outline" className="gap-2 h-9" onClick={handleImprimirTodos}>
              <Printer className="w-4 h-4" /> Imprimir semana
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats de semana ── */}
      {gruposSemana.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Equipamentos', value: stats.equipamentos, color: 'text-gray-800' },
            { label: 'Itens de verificação', value: stats.itens, color: 'text-blue-600' },
            { label: 'Com atraso', value: stats.atrasados, color: stats.atrasados > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Vence hoje', value: stats.hoje, color: stats.hoje > 0 ? 'text-amber-600' : 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide" style={{ fontWeight: 600 }}>{s.label}</p>
              <p className={`mt-0.5 ${s.color}`} style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Navegador de semana ── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Prev / Label / Next */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevSemana}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[230px]">
              <p className="text-gray-900" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {ehSemanaAtual ? 'Semana atual · ' : ''}{fmtSemana(semanaInicio, semanaFim)}
              </p>
              <p className="text-xs text-gray-400">
                {formatarData(formatLocal(semanaInicio))} → {formatarData(formatLocal(semanaFim))}
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextSemana}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Ações rápidas */}
          <div className="flex items-center gap-3 flex-wrap">
            {!ehSemanaAtual && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={irParaHoje}>
                Semana atual
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Integração com a Agenda ── */}
      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Dados derivados dos <strong>Planos de Manutenção Preventiva</strong> — mesma fonte da Agenda.
          Itens são exibidos quando o vencimento calculado cai na semana selecionada.
          Na semana atual, itens em atraso também são exibidos.
        </span>
      </div>

      {/* ── Busca ── */}
      {gruposSemana.length > 0 && (
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar equipamento, plano, localização..."
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* ── Conteúdo ── */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {planos.length === 0
              ? 'Nenhum plano de manutenção cadastrado.'
              : gruposSemana.length === 0
                ? 'Nenhuma manutenção preventiva programada para esta semana.'
                : 'Nenhum equipamento encontrado com este filtro.'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {planos.length === 0
              ? 'Cadastre planos com itens de verificação para gerar as OS preventivas.'
              : 'Navegue entre as semanas para ver as programações.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtrados.map(grupo => {
            const urg = urgCfg(grupo.piorDias);
            const eq = grupo.equipamento;
            const pl = grupo.plano;
            const atrasados = grupo.itens.filter(i => i.diasRestantes < 0).length;

            return (
              <div key={grupo.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

                {/* ── Card header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${urg.dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }} className="text-gray-900">
                          {eq.nome}
                        </span>
                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {eq.codigo}
                        </span>
                        {eq.tipo && (
                          <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            {eq.tipo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 flex-wrap">
                        <ClipboardList className="w-3 h-3" />
                        <span>{pl.codigo} · {pl.nome}</span>
                        {eq.localizacao && <><span>·</span><span>{eq.localizacao}</span></>}
                        {pl.responsavel && <><span>·</span><span>Resp.: {pl.responsavel}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {pl.necessitaParada && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Parada
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-lg border ${urg.badge}`} style={{ fontWeight: 600 }}>
                      {urg.label}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => handleImprimirGrupo(grupo)}
                      title="Imprimir OS desta máquina"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimir
                    </Button>
                  </div>
                </div>

                {/* ── Tabela de itens ── */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/60 border-b border-gray-100">
                        <th className="px-5 py-2.5 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>
                          Item de Verificação
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 600 }}>
                          Periodicidade
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 600 }}>
                          Última Execução
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 600 }}>
                          Vencimento
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs text-gray-500 whitespace-nowrap" style={{ fontWeight: 600 }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {grupo.itens.map((iv, idx) => {
                        const iu = urgCfg(iv.diasRestantes);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                            <td className="px-5 py-3">
                              <span className="text-sm text-gray-800">{iv.item.descricao}</span>
                              {iv.item.observacao && (
                                <span className="text-xs text-gray-400 block mt-0.5">{iv.item.observacao}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                {PERIODICIDADE_CONFIG[iv.item.periodicidade].label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-400">
                              {iv.item.ultimaExecucao ? formatarData(iv.item.ultimaExecucao) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs ${iu.badge.split(' ')[1]}`} style={{ fontWeight: 600 }}>
                                {formatarData(iv.dueDate)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${iu.badge}`} style={{ fontWeight: 600 }}>
                                <span className={`w-1.5 h-1.5 rounded-full ${iu.dot}`} />
                                {iu.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Card footer ── */}
                <div className="px-5 py-2.5 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {grupo.itens.length} item{grupo.itens.length !== 1 ? 's' : ''} de verificação
                    </span>
                    {atrasados > 0 && (
                      <span className="text-red-500" style={{ fontWeight: 500 }}>
                        · {atrasados} em atraso
                      </span>
                    )}
                    {pl.duracaoEstimada && (
                      <span>· Duração estimada: {pl.duracaoEstimada}h</span>
                    )}
                  </div>
                  {pl.necessitaParada && (
                    <span className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="w-3 h-3" /> Necessita parada do equipamento
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}