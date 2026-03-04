/**
 * Hook compartilhado — Módulo de Manutenção
 * Centraliza tipos, configs visuais, helpers e persistência localStorage
 */
import { useState, useEffect, useMemo } from 'react';
import { getFromStorage, setToStorage, generateId, generateSequentialCode } from '../utils/helpers';

// ═══════════════════════════════════════════════════
// Tipos exportados
// ═══════════════════════════════════════════════════

export type TipoManutencao = 'corretiva' | 'preventiva';

export type StatusOS =
  | 'aberta'
  | 'triagem'
  | 'em-andamento'
  | 'aguardando'
  | 'programada'
  | 'concluida'
  | 'cancelada'
  | 'atrasada'; // calculado — nunca armazenado

export type PrioridadeOS = 'critica' | 'alta' | 'media' | 'baixa';
export type PeriodicidadePlano = 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
export type StatusPlano = 'ativo' | 'inativo' | 'vencido';

export interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

/** Item individual de verificação dentro de um plano preventivo */
export interface ItemVerificacao {
  id: string;
  descricao: string;
  periodicidade: PeriodicidadePlano;
  ultimaExecucao?: string;            // data ISO da execução mais recente
  ultimaDueDateExecutada?: string;    // dueDate da ocorrência que foi satisfeita (para detecção de baixa persistida)
  historicoExecucoes?: string[];      // todas as datas de execução registradas (crescente)
  realizadoPor?: string;              // colaborador da execução mais recente
  historicoRealizadoPor?: string[];   // histórico de colaboradores (mesmo índice de historicoExecucoes)
  observacao?: string;
}

export interface PlanoManutencao {
  id: string;
  codigo: string;              // PM-001
  nome: string;
  equipamentoId: string;
  descricao?: string;          // descrição geral / objetivo do plano
  dataInicio: string;          // data de referência para cálculo do calendário
  duracaoEstimada?: number;    // horas
  necessitaParada?: boolean;
  responsavel: string;
  itensVerificacao: ItemVerificacao[];
  status: StatusPlano;
  observacoes?: string;
  // Campos legados (compatibilidade com dados antigos em localStorage)
  periodicidade?: PeriodicidadePlano;
  proximaData?: string;
  ultimaExecucao?: string;
  checklist?: ChecklistItem[];
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface Equipamento {
  id: string;
  codigo: string;        // EQ-001
  nome: string;
  tipo: string;
  localizacao: string;
  fabricante: string;
  modelo: string;
  numSerie: string;
  responsavel: string;
  departamento: string;
  ativo: boolean;
  observacoes?: string;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface OrdemServico {
  id: string;
  numero: string;          // OS-001
  tipo: TipoManutencao;
  equipamentoId: string;
  descricao: string;
  responsavel: string;
  dataAbertura: string;
  prazo: string;
  status: Exclude<StatusOS, 'atrasada'>; // atrasada é calculado
  prioridade?: PrioridadeOS;
  setor?: string;
  solicitante?: string;
  custoPecas?: number;
  custoServico?: number;
  custoMaoObra?: number;
  motivoCancelamento?: string;
  horasReparo?: number;
  dataEncerramento?: string;
  observacao?: string;
  planoManutencaoId?: string;
  corretivaOrigemId?: string;  // para corretiva gerada a partir de preventiva
  anexoBase64?: string;
  anexoNome?: string;
  dataCriacao: string;
  dataAtualizacao: string;
}

// ═══ Storage Keys ═══
const EQUIPAMENTOS_KEY  = 'sisteq-manutencao-equipamentos';
const OS_KEY            = 'sisteq-manutencao-os';
const PLANOS_KEY        = 'sisteq-manutencao-planos';
const TIPOS_EQ_KEY      = 'sisteq-manutencao-tipos-equipamento';

export const TIPOS_EQUIPAMENTO_DEFAULT = [
  'Compressor', 'Bomba Hidráulica', 'Torno CNC', 'Fresadora', 'Prensa',
  'Correia Transportadora', 'Empilhadeira', 'Gerador', 'Painel Elétrico',
  'Sistema de Refrigeração', 'Caldeira', 'Outro',
];

// ═══════════════════════════════════════════════════
// Configs visuais locais (por design)
// ═══════════════════════════════════════════════════

export const STATUS_OS_CONFIG: Record<StatusOS, {
  label: string; bg: string; text: string; border: string; dotColor: string;
}> = {
  aberta:          { label: 'Aberta',       bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-300',    dotColor: 'bg-gray-400'    },
  triagem:         { label: 'Triagem',      bg: 'bg-yellow-50',   text: 'text-yellow-700',  border: 'border-yellow-200',  dotColor: 'bg-yellow-500'  },
  'em-andamento':  { label: 'Em Andamento', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   dotColor: 'bg-amber-500'   },
  aguardando:      { label: 'Aguardando',   bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200',  dotColor: 'bg-purple-400'  },
  programada:      { label: 'Programada',   bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200',    dotColor: 'bg-blue-400'    },
  concluida:       { label: 'Concluída',    bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
  cancelada:       { label: 'Cancelada',    bg: 'bg-red-50',      text: 'text-red-600',     border: 'border-red-200',     dotColor: 'bg-red-300'     },
  atrasada:        { label: 'Atrasada',     bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     dotColor: 'bg-red-500'     },
};

export const TIPO_MANUTENCAO_CONFIG: Record<TipoManutencao, {
  label: string; bg: string; text: string; border: string;
}> = {
  corretiva:  { label: 'Corretiva',  bg: 'bg-red-50',   text: 'text-red-700',  border: 'border-red-200'  },
  preventiva: { label: 'Preventiva', bg: 'bg-blue-50',  text: 'text-blue-700', border: 'border-blue-200' },
};

export const PRIORIDADE_CONFIG: Record<PrioridadeOS, {
  label: string; bg: string; text: string; border: string; dotColor: string;
}> = {
  critica: { label: 'Crítica', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dotColor: 'bg-red-500'    },
  alta:    { label: 'Alta',    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dotColor: 'bg-orange-500' },
  media:   { label: 'Média',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dotColor: 'bg-amber-400'  },
  baixa:   { label: 'Baixa',   bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200',   dotColor: 'bg-gray-400'   },
};

export const PERIODICIDADE_CONFIG: Record<PeriodicidadePlano, { label: string; diasAproximados: number }> = {
  diaria:      { label: 'Diária',      diasAproximados: 1   },
  semanal:     { label: 'Semanal',     diasAproximados: 7   },
  quinzenal:   { label: 'Quinzenal',   diasAproximados: 15  },
  mensal:      { label: 'Mensal',      diasAproximados: 30  },
  bimestral:   { label: 'Bimestral',   diasAproximados: 60  },
  trimestral:  { label: 'Trimestral',  diasAproximados: 90  },
  semestral:   { label: 'Semestral',   diasAproximados: 180 },
  anual:       { label: 'Anual',       diasAproximados: 365 },
};

export const STATUS_PLANO_CONFIG: Record<StatusPlano, {
  label: string; bg: string; text: string; border: string;
}> = {
  ativo:   { label: 'Ativo',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  inativo: { label: 'Inativo', bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300'   },
  vencido: { label: 'Vencido', bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200'    },
};

// Statuses que representam OS "ativa" (não finalizada)
export const STATUS_ATIVO_SET = new Set<StatusOS>(['aberta', 'triagem', 'em-andamento', 'aguardando', 'programada', 'atrasada']);

// ═══════════════════════════════════════════════════
// Helpers exportados
// ═══════════════════════════════════════════════════

/** Status efetivo da OS — statuses intermediários viram 'atrasada' se prazo passou */
export function calcularStatusOS(os: OrdemServico): StatusOS {
  if (os.status === 'concluida' || os.status === 'cancelada') return os.status;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(os.prazo);
  if (prazo < hoje && os.status !== 'programada') return 'atrasada';
  return os.status;
}

/** Dias restantes até o prazo (negativo = atrasado) */
export function diasAtePrazo(dataISO: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = isoLocal(dataISO);
  return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/** Próxima data a partir da última execução + periodicidade */
export function calcularProximaData(ultimaExecucao: string, periodicidade: PeriodicidadePlano): string {
  const d = isoLocal(ultimaExecucao);
  const dias = PERIODICIDADE_CONFIG[periodicidade].diasAproximados;
  d.setDate(d.getDate() + dias);
  return localISO(d);
}

/**
 * Próxima execução de um item de verificação.
 * Se nunca foi executado: dataInicio é a primeira data de vencimento.
 * Após execução: lastExec + periodicity.
 */
export function calcularProximaExecucaoItem(item: ItemVerificacao, dataInicio: string): string {
  if (item.ultimaExecucao) {
    const d = isoLocal(item.ultimaExecucao);
    d.setDate(d.getDate() + PERIODICIDADE_CONFIG[item.periodicidade].diasAproximados);
    return localISO(d);
  }
  return dataInicio; // primeira execução devida na data de início
}

/**
 * Data mais urgente de um plano (item com menor próxima execução).
 * Compatível com planos legados que ainda usam proximaData.
 */
export function calcularDataMaisUrgenteDoPlano(plano: PlanoManutencao): string | null {
  const itens = plano.itensVerificacao || [];
  if (itens.length === 0) return plano.proximaData || null;
  const dates = itens.map(i => calcularProximaExecucaoItem(i, plano.dataInicio));
  return dates.sort()[0];
}

/** Status do plano baseado nos itens de verificação (ou no campo legado proximaData) */
export function calcularStatusPlano(plano: PlanoManutencao): StatusPlano {
  if (plano.status === 'inativo') return 'inativo';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Itens de verificação (nova estrutura)
  const itens = plano.itensVerificacao || [];
  if (itens.length > 0) {
    const algumVencido = itens.some(item => {
      const prox = isoLocal(calcularProximaExecucaoItem(item, plano.dataInicio));
      return prox < hoje;
    });
    return algumVencido ? 'vencido' : 'ativo';
  }

  // Compatibilidade legada
  if (plano.proximaData) {
    const proxData = isoLocal(plano.proximaData);
    return proxData < hoje ? 'vencido' : 'ativo';
  }

  return 'ativo';
}

/** Custo total de uma OS */
export function calcularCustoTotal(os: OrdemServico): number {
  return (os.custoPecas || 0) + (os.custoServico || 0) + (os.custoMaoObra || 0);
}

/** MTTR (horas) para um equipamento: média das horas de reparo das OS corretivas concluídas */
export function calcularMTTR(os: OrdemServico[], equipamentoId?: string): number | null {
  const filtradas = os.filter(o =>
    o.tipo === 'corretiva' &&
    o.status === 'concluida' &&
    o.horasReparo != null &&
    (equipamentoId ? o.equipamentoId === equipamentoId : true)
  );
  if (filtradas.length === 0) return null;
  const total = filtradas.reduce((acc, o) => acc + (o.horasReparo || 0), 0);
  return total / filtradas.length;
}

/** MTBF (dias) para um equipamento: intervalo médio entre falhas corretivas */
export function calcularMTBF(os: OrdemServico[], equipamentoId?: string): number | null {
  const falhas = os
    .filter(o =>
      o.tipo === 'corretiva' &&
      (equipamentoId ? o.equipamentoId === equipamentoId : true)
    )
    .sort((a, b) => a.dataAbertura.localeCompare(b.dataAbertura));
  if (falhas.length < 2) return null;
  let totalDias = 0;
  for (let i = 1; i < falhas.length; i++) {
    const ant = new Date(falhas[i - 1].dataAbertura);
    const atual = new Date(falhas[i].dataAbertura);
    totalDias += Math.ceil((atual.getTime() - ant.getTime()) / (1000 * 60 * 60 * 24));
  }
  return totalDias / (falhas.length - 1);
}

// ═══════════════════════════════════════════════════
// Geração de códigos sequenciais
// ═══════════════════════════════════════════════════

export function gerarNumeroOS(ordens: OrdemServico[]): string {
  const max = ordens.reduce((acc, o) => {
    const n = parseInt(o.numero.replace('OS-', '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return generateSequentialCode('OS-', max + 1, 3);
}

export function gerarCodigoPlano(planos: PlanoManutencao[]): string {
  const max = planos.reduce((acc, p) => {
    const n = parseInt(p.codigo.replace('PM-', '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return generateSequentialCode('PM-', max + 1, 3);
}

export function gerarCodigoEquipamento(equipamentos: Equipamento[]): string {
  const max = equipamentos.reduce((acc, e) => {
    const n = parseInt(e.codigo.replace('EQ-', '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return generateSequentialCode('EQ-', max + 1, 3);
}

// ═══════════════════════════════════════════════════
// Hook principal
// ═══════════════════════════════════════════════════

export function useManutencao() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(() =>
    getFromStorage(EQUIPAMENTOS_KEY, [])
  );
  const [ordens, setOrdens] = useState<OrdemServico[]>(() =>
    getFromStorage(OS_KEY, [])
  );
  const [planos, setPlanos] = useState<PlanoManutencao[]>(() =>
    getFromStorage(PLANOS_KEY, [])
  );
  const [tiposEquipamento, setTiposEquipamento] = useState<string[]>(() =>
    getFromStorage(TIPOS_EQ_KEY, TIPOS_EQUIPAMENTO_DEFAULT)
  );

  useEffect(() => { setToStorage(EQUIPAMENTOS_KEY, equipamentos); }, [equipamentos]);
  useEffect(() => { setToStorage(OS_KEY, ordens); }, [ordens]);
  useEffect(() => { setToStorage(PLANOS_KEY, planos); }, [planos]);
  useEffect(() => { setToStorage(TIPOS_EQ_KEY, tiposEquipamento); }, [tiposEquipamento]);

  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7Dias = new Date(hoje);
    em7Dias.setDate(hoje.getDate() + 7);

    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const total = ordens.length;
    const statusList = ordens.map(o => ({ os: o, status: calcularStatusOS(o) }));

    const abertas       = statusList.filter(({ status }) => status === 'aberta').length;
    const emTriagem     = statusList.filter(({ status }) => status === 'triagem').length;
    const emAndamento   = statusList.filter(({ status }) => status === 'em-andamento').length;
    const aguardando    = statusList.filter(({ status }) => status === 'aguardando').length;
    const programadas   = statusList.filter(({ status }) => status === 'programada').length;
    const concluidas    = statusList.filter(({ status }) => status === 'concluida').length;
    const canceladas    = statusList.filter(({ status }) => status === 'cancelada').length;
    const atrasadas     = statusList.filter(({ status }) => status === 'atrasada').length;
    const corretivas    = ordens.filter(o => o.tipo === 'corretiva').length;
    const preventivas   = ordens.filter(o => o.tipo === 'preventiva').length;

    // Cards específicos
    const corretivasAbertas = ordens.filter(o =>
      o.tipo === 'corretiva' && STATUS_ATIVO_SET.has(calcularStatusOS(o))
    ).length;

    const corretivasCriticas = ordens.filter(o =>
      o.tipo === 'corretiva' &&
      o.prioridade === 'critica' &&
      STATUS_ATIVO_SET.has(calcularStatusOS(o))
    ).length;

    const planosAtivos   = planos.filter(p => calcularStatusPlano(p) === 'ativo').length;
    const planosVencidos = planos.filter(p => calcularStatusPlano(p) === 'vencido').length;

    // Preventivas vencidas = planos vencidos
    const preventivasVencidas = planosVencidos;

    // Preventivas vencendo em 7 dias = planos ativos com data mais urgente entre hoje e hoje+7
    const preventivasVencendo7d = planos.filter(p => {
      if (calcularStatusPlano(p) !== 'ativo') return false;
      const dataUrgente = calcularDataMaisUrgenteDoPlano(p);
      if (!dataUrgente) return false;
      const d = new Date(dataUrgente);
      return d >= hoje && d <= em7Dias;
    }).length;

    const equipamentosAtivos = equipamentos.filter(e => e.ativo).length;

    // Equipamentos com mais OS (top 5)
    const countPorEq = equipamentos.map(eq => ({
      equipamento: eq,
      total: ordens.filter(o => o.equipamentoId === eq.id).length,
      corretivas: ordens.filter(o => o.equipamentoId === eq.id && o.tipo === 'corretiva').length,
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    // Corretivas por prioridade (mês atual)
    const corretivasMesAtual = ordens.filter(o =>
      o.tipo === 'corretiva' && (o.dataAbertura || '').startsWith(mesAtual)
    );
    const corretivas_critica = corretivasMesAtual.filter(o => o.prioridade === 'critica').length;
    const corretivas_alta    = corretivasMesAtual.filter(o => o.prioridade === 'alta').length;
    const corretivas_media   = corretivasMesAtual.filter(o => o.prioridade === 'media').length;
    const corretivas_baixa   = corretivasMesAtual.filter(o => o.prioridade === 'baixa').length;
    const corretivas_sem     = corretivasMesAtual.filter(o => !o.prioridade).length;

    // Preventivas mês atual: realizadas vs. pendentes
    const preventivasMesRealizadas = ordens.filter(o =>
      o.tipo === 'preventiva' &&
      o.status === 'concluida' &&
      (o.dataEncerramento || '').startsWith(mesAtual)
    ).length;
    const preventivasMesPendentes = planos.filter(p => {
      if (calcularStatusPlano(p) === 'inativo') return false;
      const d = calcularDataMaisUrgenteDoPlano(p);
      return !!d && d.startsWith(mesAtual);
    }).length + ordens.filter(o =>
      o.tipo === 'preventiva' &&
      (o.dataAbertura || '').startsWith(mesAtual) &&
      o.status !== 'concluida' && o.status !== 'cancelada'
    ).length;

    const mttrGlobal = calcularMTTR(ordens);
    const mtbfGlobal = calcularMTBF(ordens);

    return {
      total, abertas, emTriagem, emAndamento, aguardando, programadas,
      concluidas, canceladas, atrasadas,
      corretivas, preventivas,
      corretivasAbertas, corretivasCriticas,
      preventivasVencidas, preventivasVencendo7d,
      planosAtivos, planosVencidos,
      equipamentosAtivos,
      countPorEq,
      corretivas_critica, corretivas_alta, corretivas_media, corretivas_baixa, corretivas_sem,
      preventivasMesRealizadas, preventivasMesPendentes,
      mttrGlobal, mtbfGlobal,
    };
  }, [ordens, planos, equipamentos]);

  return {
    equipamentos, setEquipamentos,
    ordens, setOrdens,
    planos, setPlanos,
    tiposEquipamento, setTiposEquipamento,
    stats,
  };
}

// Funções auxiliares para manipulação de datas
/** Cria Date em horário LOCAL a partir de string ISO "YYYY-MM-DD" (evita UTC shift) */
function isoLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formata Date local para string ISO "YYYY-MM-DD" */
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}