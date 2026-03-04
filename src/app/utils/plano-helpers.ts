/**
 * Funções compartilhadas para Planos de Ação (PA) e Planos Estratégicos (PE)
 * Elimina duplicação de cálculos entre PlanoAcaoCorretiva, PlanoAcaoEstrategico,
 * TarefasConsolidadas e TarefasGlobaisConsolidadas
 */

import { TarefaAcao } from '../types/strategic';

// ============ CONSTANTES COMPARTILHADAS ============

export const EMPTY_TAREFA = { descricao: '', responsavel: '', departamento: '', prazo: '' };
export const EMPTY_ACOMPANHAMENTO = { descricao: '', responsavel: '' };

export const STATUS_PLANO_CONFIG = {
  'nao-iniciado': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700', progress: 0 },
  'em-andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', progress: 50 },
  'concluido': { label: 'Concluído', color: 'bg-green-100 text-green-700', progress: 100 },
  'atrasado': { label: 'Atrasado', color: 'bg-red-100 text-red-700', progress: 25 },
} as const;

// ============ CÁLCULOS DE PROGRESSO ============

/**
 * Calcula progresso baseado em tarefas concluídas (0-100)
 */
export function calcularProgressoTarefas(tarefas: TarefaAcao[]): number {
  if (tarefas.length === 0) return 0;
  const concluidas = tarefas.filter(t => t.concluida).length;
  return Math.round((concluidas / tarefas.length) * 100);
}

/**
 * Calcula progresso de prazo (0-100+) entre data início e data final
 */
export function calcularProgressoPrazo(dataInicio: string, prazoFinal: string): number {
  const inicio = new Date(dataInicio);
  const final = new Date(prazoFinal);
  const hoje = new Date();

  const totalDias = Math.max(1, Math.ceil((final.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
  const diasDecorridos = Math.ceil((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(100, Math.max(0, Math.round((diasDecorridos / totalDias) * 100)));
}

/**
 * Calcula médias gerais de progresso e prazo para uma lista de planos
 */
export function calcularMediasPlanos<T extends { tarefas: TarefaAcao[]; dataInicio: string; prazoFinal: string }>(
  planos: T[]
): { progressoGeral: number; prazoGeral: number } {
  if (planos.length === 0) return { progressoGeral: 0, prazoGeral: 0 };

  const somaProgresso = planos.reduce((acc, p) => acc + calcularProgressoTarefas(p.tarefas), 0);
  const somaPrazo = planos.reduce((acc, p) => acc + calcularProgressoPrazo(p.dataInicio, p.prazoFinal), 0);

  return {
    progressoGeral: Math.round(somaProgresso / planos.length),
    prazoGeral: Math.round(somaPrazo / planos.length),
  };
}

// ============ CÁLCULOS DE VENCIMENTO ============

/**
 * Calcula diferença em dias entre hoje e uma data futura
 */
export function diasAteVencimento(prazoFinal: string): number {
  const hoje = new Date();
  const prazo = new Date(prazoFinal);
  return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Conta planos que vencem dentro de N dias
 */
export function contarVencimentos<T extends { prazoFinal: string; statusAcompanhamento?: string }>(
  planos: T[],
  diasMin: number,
  diasMax: number
): number {
  return planos.filter(p => {
    if (p.statusAcompanhamento === 'concluido' || !p.prazoFinal) return false;
    const dias = diasAteVencimento(p.prazoFinal);
    return dias > diasMin && dias <= diasMax;
  }).length;
}

/**
 * Verifica se alguma tarefa está atrasada
 */
export function temTarefaAtrasada(tarefas: TarefaAcao[]): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return tarefas.some(tarefa => {
    if (tarefa.concluida || !tarefa.prazo) return false;
    const prazo = new Date(tarefa.prazo);
    prazo.setHours(0, 0, 0, 0);
    return prazo < hoje;
  });
}

/**
 * Valida se alguma tarefa tem prazo superior ao prazo final
 */
export function validarPrazosTarefas(tarefas: TarefaAcao[], prazoFinal: string): boolean {
  if (!prazoFinal || tarefas.length === 0) return true;
  const prazoFinalDate = new Date(prazoFinal);
  return !tarefas.some(t => t.prazo && new Date(t.prazo) > prazoFinalDate);
}
