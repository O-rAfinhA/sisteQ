/**
 * Calendário de Calibrações e Verificações
 * Timeline visual de próximos vencimentos, programação e histórico
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Calendar, ChevronLeft, ChevronRight, Gauge, BookOpen, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { formatarData } from '../../utils/formatters';
import {
  useInstrumentos,
  calcularStatus,
  calcularProximaValidade,
  calcularStatusPadrao,
  diasAteValidade,
  STATUS_CONFIG,
  CRITICIDADE_CONFIG,
  TIPO_CONTROLE_CONFIG,
  type Instrumento,
  type PadraoReferencia,
  type StatusInstrumento,
} from '../../hooks/useInstrumentos';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface EventoCalendario {
  id: string;
  data: string; // ISO date
  tipo: 'calibracao' | 'verificacao' | 'padrao';
  label: string;
  sublabel: string;
  status: StatusInstrumento | 'valido' | 'atencao' | 'vencido';
  criticidade?: 'alta' | 'media' | 'baixa';
}

export function InstrumentosCalendario() {
  const { instrumentos, padroes } = useInstrumentos();

  const hoje = new Date();
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [filtroTipo, setFiltroTipo] = useState('todos');

  // Montar eventos do ano inteiro
  const eventos = useMemo(() => {
    const list: EventoCalendario[] = [];

    instrumentos.forEach(inst => {
      const prox = calcularProximaValidade(inst);
      if (!prox) return;
      const d = new Date(prox);
      if (d.getFullYear() !== anoAtual) return;
      if (filtroTipo !== 'todos' && inst.tipoControle !== filtroTipo) return;

      const dias = diasAteValidade(prox);
      let status: StatusInstrumento = 'valido';
      if (inst.bloqueado) status = 'bloqueado';
      else if (dias < 0) status = 'vencido';
      else if (dias <= 30) status = 'atencao';

      list.push({
        id: inst.id,
        data: prox,
        tipo: inst.tipoControle === 'calibracao' ? 'calibracao' : 'verificacao',
        label: inst.codigo,
        sublabel: inst.descricao,
        status,
        criticidade: inst.criticidade,
      });
    });

    if (filtroTipo === 'todos' || filtroTipo === 'padrao') {
      padroes.forEach(p => {
        const d = new Date(p.validade);
        if (d.getFullYear() !== anoAtual) return;
        const status = calcularStatusPadrao(p);
        list.push({
          id: p.id,
          data: p.validade,
          tipo: 'padrao',
          label: p.codigo,
          sublabel: p.descricao,
          status,
        });
      });
    }

    return list.sort((a, b) => a.data.localeCompare(b.data));
  }, [instrumentos, padroes, anoAtual, filtroTipo]);

  // Agrupar por mês
  const eventosPorMes = useMemo(() => {
    const map: Record<number, EventoCalendario[]> = {};
    for (let i = 0; i < 12; i++) map[i] = [];
    eventos.forEach(ev => {
      const m = new Date(ev.data).getMonth();
      map[m].push(ev);
    });
    return map;
  }, [eventos]);

  // Resumo do ano
  const resumoAno = useMemo(() => {
    const total = eventos.length;
    const vencidos = eventos.filter(e => e.status === 'vencido').length;
    const atencao = eventos.filter(e => e.status === 'atencao').length;
    const validos = eventos.filter(e => e.status === 'valido').length;
    return { total, vencidos, atencao, validos };
  }, [eventos]);

  const mesAtual = hoje.getMonth();
  const eAnoAtual = anoAtual === hoje.getFullYear();

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Calendário de Calibrações e Verificações
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Programação anual de vencimentos de instrumentos e padrões de referência.
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setAnoAtual(a => a - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-700 px-2" style={{ fontWeight: 600 }}>{anoAtual}</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setAnoAtual(a => a + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="h-9 text-xs w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="calibracao">Calibração</SelectItem>
            <SelectItem value="verificacao">Verificação</SelectItem>
            <SelectItem value="padrao">Padrões</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {/* Legendas */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Calibração</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Verificação</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Padrão</span>
        </div>
      </div>

      {/* Resumo do ano */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-gray-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Eventos em {anoAtual}</span>
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{resumoAno.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500">No prazo</span>
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{resumoAno.validos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Atenção (30d)</span>
              <p className="text-lg text-gray-900" style={{ fontWeight: 600 }}>{resumoAno.atencao}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500">Vencidos</span>
              <p className="text-lg text-red-600" style={{ fontWeight: 600 }}>{resumoAno.vencidos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Grid de Meses ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MESES.map((nomeMes, mesIdx) => {
          const evs = eventosPorMes[mesIdx];
          const isAtual = eAnoAtual && mesIdx === mesAtual;
          const isPassado = eAnoAtual && mesIdx < mesAtual;
          const temVencido = evs.some(e => e.status === 'vencido');
          const temAtencao = evs.some(e => e.status === 'atencao');

          return (
            <Card
              key={mesIdx}
              className={`rounded-xl transition-all ${
                isAtual
                  ? 'border-2 border-blue-300 shadow-sm'
                  : temVencido
                    ? 'border-red-200'
                    : temAtencao
                      ? 'border-amber-200'
                      : 'border-gray-200'
              } ${isPassado && !temVencido ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                {/* Cabeçalho do mês */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isAtual ? 'text-blue-700' : 'text-gray-700'}`} style={{ fontWeight: 600 }}>
                      {nomeMes}
                    </span>
                    {isAtual && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700" style={{ fontWeight: 500 }}>Atual</span>
                    )}
                  </div>
                  {evs.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      temVencido ? 'bg-red-100 text-red-700' :
                      temAtencao ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`} style={{ fontWeight: 500 }}>
                      {evs.length}
                    </span>
                  )}
                </div>

                {/* Eventos */}
                {evs.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-3">—</p>
                ) : (
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {evs.map(ev => {
                      const tipoColor = ev.tipo === 'calibracao' ? 'bg-blue-500' : ev.tipo === 'verificacao' ? 'bg-purple-500' : 'bg-slate-500';
                      const statusBorder = ev.status === 'vencido' ? 'border-l-red-500' : ev.status === 'atencao' ? 'border-l-amber-500' : 'border-l-emerald-400';
                      const dia = new Date(ev.data).getDate();

                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md border-l-[3px] bg-gray-50/50 hover:bg-gray-50 transition-colors ${statusBorder}`}
                        >
                          <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0" style={{ fontWeight: 600 }}>{dia}</span>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tipoColor}`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-gray-700 block truncate" style={{ fontWeight: 500 }}>
                              {ev.label}
                            </span>
                          </div>
                          {ev.criticidade && ev.criticidade === 'alta' && (
                            <span className="text-xs px-1 py-0 rounded bg-red-50 text-red-600 flex-shrink-0" style={{ fontWeight: 500, fontSize: '0.625rem' }}>
                              ALTA
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══ Lista cronológica detalhada ═══ */}
      <Card className="border-gray-200 rounded-xl">
        <CardContent className="p-6">
          <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
            Lista Cronológica Completa — {anoAtual}
          </span>
          {eventos.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhum evento programado para {anoAtual}.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Data</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Código</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500" style={{ fontWeight: 600 }}>Descrição</th>
                    <th className="px-4 py-2.5 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Tipo</th>
                    <th className="px-4 py-2.5 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Criticidade</th>
                    <th className="px-4 py-2.5 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Status</th>
                    <th className="px-4 py-2.5 text-center text-xs text-gray-500" style={{ fontWeight: 600 }}>Dias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eventos.map(ev => {
                    const stCfg = STATUS_CONFIG[ev.status];
                    const dias = diasAteValidade(ev.data);
                    const tipoCfg = ev.tipo === 'calibracao' ? TIPO_CONTROLE_CONFIG.calibracao :
                                    ev.tipo === 'verificacao' ? TIPO_CONTROLE_CONFIG.verificacao :
                                    { label: 'Padrão', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
                    const critCfg = ev.criticidade ? CRITICIDADE_CONFIG[ev.criticidade] : null;
                    return (
                      <tr key={`${ev.id}-${ev.data}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-600">{formatarData(ev.data)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{ev.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-500 line-clamp-1">{ev.sublabel}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${tipoCfg.bg} ${tipoCfg.text} ${tipoCfg.border}`} style={{ fontWeight: 500 }}>
                            {tipoCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {critCfg ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${critCfg.bg} ${critCfg.text} ${critCfg.border}`} style={{ fontWeight: 500 }}>
                              {critCfg.label}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`} style={{ fontWeight: 500 }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />
                            {stCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs ${
                            dias < 0 ? 'text-red-600' : dias <= 30 ? 'text-amber-600' : 'text-gray-500'
                          }`} style={{ fontWeight: 500 }}>
                            {dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
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
    </div>
  );
}
