/**
 * Hook compartilhado para estado de Instrumentos de Medição
 * Centraliza tipos, helpers, configs e persistência localStorage
 */
import { useState, useEffect, useMemo } from 'react';
import { getFromStorage, setToStorage } from '../utils/helpers';
import { useStrategic } from '../context/StrategicContext';
import { getUsuariosNomes } from '../types/config';

// ═══════════════════════════════════════════════════
// Tipos exportados
// ═══════════════════════════════════════════════════

export type TipoControle = 'calibracao' | 'verificacao' | 'nao-aplicavel';
export type Criticidade = 'alta' | 'media' | 'baixa';
export type StatusInstrumento = 'valido' | 'atencao' | 'vencido' | 'bloqueado';
export type ResultadoCalibracao = 'aprovado' | 'reprovado';
export type ResultadoVerificacao = 'conforme' | 'nao-conforme';

export interface TipoInstrumento {
  id: string;
  codigo: string;
  descricao: string;
  capacidade: string;          // ex: "0-150 mm", "0-100 °C"
  tolerancia: string;           // ex: "±0.05 mm", "±0.1 °C"
  unidade: string;              // ex: "mm", "°C", "kg"
  localUso?: string;            // ex: "Produção — Linha A", vazio = uso geral
  observacoes?: string;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface MedicaoVerificacao {
  valorPadrao: string;
  valorEncontrado: string;
  desvio: string;
}

export interface RegistroCalibracao {
  id: string;
  data: string;
  proximaCalibracao: string;
  numCertificado: string;
  resultado: ResultadoCalibracao;
  certificadoBase64?: string;
  certificadoNome?: string;
  observacao?: string;
  // Rastreabilidade do padrão utilizado na calibração
  padraoUtilizadoId?: string;       // vínculo com a biblioteca de padrões
  numCertificadoPadrao?: string;     // nº certificado do padrão (preenchimento livre quando não vinculado)
  // Análise do erro vs tolerância do instrumento
  erroEncontrado?: string;           // erro indicado no certificado de calibração
}

export interface RegistroVerificacao {
  id: string;
  data: string;
  padraoId: string;
  pontoVerificado: string;
  valorPadrao: string;
  valorEncontrado: string;
  desvio: string;
  resultado: ResultadoVerificacao;
  observacao: string;
  anexoBase64?: string;
  anexoNome?: string;
  /** Múltiplas medições — campo novo; quando presente, sobrepõe valorPadrao/valorEncontrado/desvio legados */
  medicoes?: MedicaoVerificacao[];
}

export interface RegistroBloqueio {
  id: string;
  data: string;
  tipo: 'bloqueio' | 'desbloqueio';
  justificativa: string;
  usuario: string;
}

export interface Instrumento {
  id: string;
  codigo: string;
  descricao: string;
  fabricante: string;
  modelo: string;
  numSerie: string;
  localizacao: string;
  processoVinculado: string;
  departamento: string;
  responsavel: string;
  criticidade: Criticidade;
  tipoControle: TipoControle;
  justificativaNaoAplicavel: string;
  unidade: string;
  observacoesTecnicas: string;
  periodicidadeCalibracao: number;
  historicoCalibracao: RegistroCalibracao[];
  periodicidadeVerificacao: number;
  padraoUtilizadoId: string;
  tolerancia: string;
  tipoInstrumentoId: string;      // vínculo com tipo de instrumento
  historicoVerificacao: RegistroVerificacao[];
  bloqueado: boolean;
  historicoBloqueio: RegistroBloqueio[];
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface PadraoReferencia {
  id: string;
  codigo: string;
  descricao: string;
  numCertificado: string;
  dataCalibracao?: string;          // campo legado — mantido opcional para compatibilidade com dados existentes
  validade: string;
  certificadoBase64?: string;
  certificadoNome?: string;
  dataCriacao: string;
  dataAtualizacao: string;
}

// ═══ Storage Keys ═══
const INSTRUMENTOS_KEY = 'sisteq-instrumentos';
const PADROES_KEY = 'sisteq-padroes-referencia';
const TIPOS_INSTRUMENTOS_KEY = 'sisteq-tipos-instrumentos';

// ═══════════════════════════════════════════════════
// Configs visuais locais (por design)
// ═══════════════════════════════════════════════════

export const CRITICIDADE_CONFIG: Record<Criticidade, { label: string; bg: string; text: string; border: string }> = {
  alta: { label: 'Alta', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  media: { label: 'Média', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  baixa: { label: 'Baixa', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

export const TIPO_CONTROLE_CONFIG: Record<TipoControle, { label: string; bg: string; text: string; border: string }> = {
  calibracao: { label: 'Calibração', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  verificacao: { label: 'Verificação Interna', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'nao-aplicavel': { label: 'Não Aplicável', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

export const STATUS_CONFIG: Record<StatusInstrumento, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  valido: { label: 'Válido', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
  atencao: { label: 'Vence em 30d', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500' },
  vencido: { label: 'Vencido', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dotColor: 'bg-red-500' },
  bloqueado: { label: 'Bloqueado', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dotColor: 'bg-gray-500' },
};

// ═══════════════════════════════════════════════════
// Helpers exportados
// ═══════════════════════════════════════════════════

export function calcularProximaValidade(inst: Instrumento): string | null {
  if (inst.tipoControle === 'calibracao' && inst.historicoCalibracao.length > 0) {
    const ultima = [...inst.historicoCalibracao].sort((a, b) => b.data.localeCompare(a.data))[0];
    if (ultima.resultado === 'aprovado') return ultima.proximaCalibracao;
    return null;
  }
  if (inst.tipoControle === 'verificacao' && inst.historicoVerificacao.length > 0) {
    const ultima = [...inst.historicoVerificacao].sort((a, b) => b.data.localeCompare(a.data))[0];
    if (ultima.resultado === 'conforme') {
      const d = new Date(ultima.data);
      d.setMonth(d.getMonth() + (inst.periodicidadeVerificacao || 12));
      return d.toISOString().split('T')[0];
    }
    return null;
  }
  return null;
}

export function calcularStatus(inst: Instrumento): StatusInstrumento {
  if (inst.bloqueado) return 'bloqueado';
  if (inst.tipoControle === 'nao-aplicavel') return 'valido';

  const proxValidade = calcularProximaValidade(inst);
  if (!proxValidade) {
    if (inst.tipoControle === 'calibracao' && inst.historicoCalibracao.length > 0) {
      const ultima = [...inst.historicoCalibracao].sort((a, b) => b.data.localeCompare(a.data))[0];
      if (ultima.resultado === 'reprovado') return 'bloqueado';
    }
    if (inst.tipoControle === 'verificacao' && inst.historicoVerificacao.length > 0) {
      const ultima = [...inst.historicoVerificacao].sort((a, b) => b.data.localeCompare(a.data))[0];
      if (ultima.resultado === 'nao-conforme') return 'bloqueado';
    }
    return 'valido';
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(proxValidade);
  const diffMs = validade.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'atencao';
  return 'valido';
}

export function calcularStatusPadrao(padrao: PadraoReferencia): 'valido' | 'atencao' | 'vencido' {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(padrao.validade);
  const diffMs = validade.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'atencao';
  return 'valido';
}

export function calcularProximaCalibracao(data: string, periodicidade: number): string {
  const d = new Date(data);
  d.setMonth(d.getMonth() + periodicidade);
  return d.toISOString().split('T')[0];
}

export function calcularDesvio(valorPadrao: string, valorEncontrado: string): string {
  const vp = parseFloat(valorPadrao.replace(',', '.'));
  const ve = parseFloat(valorEncontrado.replace(',', '.'));
  if (isNaN(vp) || isNaN(ve)) return '';
  const d = ve - vp;
  return (d >= 0 ? '+' : '') + d.toFixed(4).replace(/\.?0+$/, '');
}

export function diasAteValidade(dataISO: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataISO);
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Analisa erro encontrado vs tolerância do instrumento.
 * Suporta formatos: "±0.05", "0.05", "+/-0.05", "0,05"
 * Retorna: 'dentro' | 'fora' | null (quando não é possível comparar)
 */
export function compararErroTolerancia(erroStr: string, toleranciaStr: string): 'dentro' | 'fora' | null {
  if (!erroStr?.trim() || !toleranciaStr?.trim()) return null;
  // Extrair valor numérico do erro (aceita +0.05, -0.03, 0.05, etc.)
  const erroNum = parseFloat(erroStr.replace(',', '.').replace(/[^\d.\-+]/g, ''));
  // Extrair valor numérico da tolerância (aceita ±0.05, +/-0.05, 0.05, etc.)
  const tolClean = toleranciaStr.replace(',', '.').replace(/[±+\-/]/g, '').replace(/[^\d.]/g, '');
  const tolNum = parseFloat(tolClean);
  if (isNaN(erroNum) || isNaN(tolNum) || tolNum <= 0) return null;
  return Math.abs(erroNum) <= tolNum ? 'dentro' : 'fora';
}

// ═══════════════════════════════════════════════════
// Hook principal
// ═══════════════════════════════════════════════════

export function useInstrumentos() {
  const { dados } = useStrategic();

  const [instrumentos, setInstrumentos] = useState<Instrumento[]>(() => {
    const stored = getFromStorage(INSTRUMENTOS_KEY, []);
    // Migração: adiciona tipoInstrumentoId em instrumentos antigos
    return stored.map((inst: any) => ({
      ...inst,
      tipoInstrumentoId: inst.tipoInstrumentoId || '',
    }));
  });
  const [padroes, setPadroes] = useState<PadraoReferencia[]>(() => getFromStorage(PADROES_KEY, []));
  const [tiposInstrumentos, setTiposInstrumentos] = useState<TipoInstrumento[]>(() => getFromStorage(TIPOS_INSTRUMENTOS_KEY, []));

  useEffect(() => { setToStorage(INSTRUMENTOS_KEY, instrumentos); }, [instrumentos]);
  useEffect(() => { setToStorage(PADROES_KEY, padroes); }, [padroes]);
  useEffect(() => { setToStorage(TIPOS_INSTRUMENTOS_KEY, tiposInstrumentos); }, [tiposInstrumentos]);

  const usuariosDisponiveis = useMemo(() => getUsuariosNomes(), []);
  const processosDisponiveis = useMemo(() => {
    return (dados.processos || []).map((p: any) => p.nome).filter(Boolean).sort();
  }, [dados.processos]);

  const stats = useMemo(() => {
    const total = instrumentos.length;
    const statusList = instrumentos.map(calcularStatus);
    const validos = statusList.filter(s => s === 'valido').length;
    const atencao = statusList.filter(s => s === 'atencao').length;
    const vencidos = statusList.filter(s => s === 'vencido').length;
    const bloqueados = statusList.filter(s => s === 'bloqueado').length;
    const criticosVencidos = instrumentos.filter((inst, i) =>
      inst.criticidade === 'alta' && (statusList[i] === 'vencido' || statusList[i] === 'bloqueado')
    ).length;
    const porTipo = {
      calibracao: instrumentos.filter(i => i.tipoControle === 'calibracao').length,
      verificacao: instrumentos.filter(i => i.tipoControle === 'verificacao').length,
      naoAplicavel: instrumentos.filter(i => i.tipoControle === 'nao-aplicavel').length,
    };
    const porCriticidade = {
      alta: instrumentos.filter(i => i.criticidade === 'alta').length,
      media: instrumentos.filter(i => i.criticidade === 'media').length,
      baixa: instrumentos.filter(i => i.criticidade === 'baixa').length,
    };
    const padroesVencidos = padroes.filter(p => calcularStatusPadrao(p) === 'vencido').length;
    const padroesVencendo = padroes.filter(p => calcularStatusPadrao(p) === 'atencao').length;
    const padroesValidos = padroes.filter(p => calcularStatusPadrao(p) === 'valido').length;
    return {
      total, validos, atencao, vencidos, bloqueados, criticosVencidos,
      porTipo, porCriticidade,
      padroesTotal: padroes.length, padroesVencidos, padroesVencendo, padroesValidos,
    };
  }, [instrumentos, padroes]);

  return {
    instrumentos, setInstrumentos,
    padroes, setPadroes,
    tiposInstrumentos, setTiposInstrumentos,
    usuariosDisponiveis,
    processosDisponiveis,
    stats,
  };
}