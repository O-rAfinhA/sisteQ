/**
 * Utilitários compartilhados para o módulo de Fornecedores
 * Centraliza funções de cor/estilo repetidas em Dashboard, Cadastro, Avaliacoes, HomologacaoLista e Ranking
 */

import type { Fornecedor, ROF, Recebimento } from '../types/fornecedor';

/**
 * Retorna classes CSS para o status de um fornecedor
 * Statuses: Homologado, Em Homologação, Homologado com Restrição, Bloqueado
 */
export function getFornecedorStatusColor(status: string): string {
  switch (status) {
    case 'Homologado':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Em Homologação':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'Homologado com Restrição':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Bloqueado':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Retorna classes CSS para a criticidade de um fornecedor
 * Criticidades: Crítico, Não Crítico
 */
export function getCriticidadeColor(criticidade: string): string {
  return criticidade === 'Crítico'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';
}

/**
 * IQF — Índice de Qualidade do Fornecedor (0–100)
 * Composição ponderada:
 *   Para fornecedores de Matéria-Prima / Materiais (com recebimentos):
 *     40% — Avaliações (nota média vs meta configurada por tipo)
 *     15% — Conformidade documental (% docs conformes sobre aplicáveis)
 *     20% — Ocorrências (penalização por ROFs abertas/graves)
 *     15% — Pontualidade de entrega (% recebimentos no prazo)
 *     10% — Qualidade de recebimento (% recebimentos aprovados)
 *
 *   Para demais fornecedores (sem recebimentos):
 *     50% — Avaliações
 *     25% — Conformidade documental
 *     25% — Ocorrências
 *
 * A meta de avaliação é obtida do `metaAvaliacaoPorTipo` nas configurações.
 * Se o fornecedor tem múltiplos tipos, usa-se a maior meta entre eles.
 *
 * Retorna null se não houver dados suficientes para cálculo.
 */
export function calcularIQF(
  fornecedor: Fornecedor,
  rofsDoParceiro: ROF[],
  metaAvaliacaoPorTipo?: { [tipo: string]: number },
  recebimentosDoParceiro?: Recebimento[]
): { score: number; detalhes: IQFDetalhes } | null {
  let temDados = false;

  // ── Determinar meta de avaliação do fornecedor ──
  let meta = 3.0; // fallback padrão
  if (metaAvaliacaoPorTipo && fornecedor.tipo.length > 0) {
    const metas = fornecedor.tipo
      .map(t => metaAvaliacaoPorTipo[t])
      .filter(m => m !== undefined && m > 0);
    if (metas.length > 0) {
      meta = Math.max(...metas);
    }
  }

  // ── 1. Avaliações ──
  let notaScore = 0;
  if (fornecedor.notaMedia !== undefined && fornecedor.avaliacoes.length > 0) {
    const atingimento = fornecedor.notaMedia / meta;
    notaScore = Math.min(atingimento, 1) * 100;
    temDados = true;
  }

  // ── 2. Conformidade Documental ──
  let conformidadeScore = 100;
  let totalAplicaveis = 0;
  let totalConformes = 0;
  if (fornecedor.homologacao?.analiseDocumental) {
    const docs = Object.values(fornecedor.homologacao.analiseDocumental);
    const aplicaveis = docs.filter(d => d.status === 'Aplicável');
    totalAplicaveis = aplicaveis.length;
    totalConformes = aplicaveis.filter(d => d.conforme).length;
    if (totalAplicaveis > 0) {
      conformidadeScore = (totalConformes / totalAplicaveis) * 100;
      temDados = true;
    }
  }

  // ── 3. Ocorrências / ROFs ──
  let ocorrenciaScore = 100;
  if (rofsDoParceiro.length > 0) {
    temDados = true;
    const abertas = rofsDoParceiro.filter(r => r.status === 'Aberta' || r.status === 'Em Tratamento');
    let penalidade = 0;
    abertas.forEach(r => {
      if (r.gravidade === 'Alta') penalidade += 25;
      else if (r.gravidade === 'Média') penalidade += 15;
      else penalidade += 8;
    });
    const concluidas = rofsDoParceiro.filter(r => r.status === 'Concluída');
    penalidade += concluidas.length * 3;
    ocorrenciaScore = Math.max(0, 100 - penalidade);
  }

  // ── 4 & 5. Pontualidade e Qualidade de Recebimento ──
  const recs = recebimentosDoParceiro || [];
  let pontualidadeScore = 100;
  let qualidadeRecScore = 100;
  const temRecebimentos = recs.length > 0;
  
  if (temRecebimentos) {
    temDados = true;
    const noPrazo = recs.filter(r => {
      if (!r.dataPrevista || !r.dataRecebimento) return true;
      return new Date(r.dataRecebimento) <= new Date(r.dataPrevista);
    }).length;
    pontualidadeScore = (noPrazo / recs.length) * 100;

    const aprovados = recs.filter(r => r.qualidade === 'Aprovado').length;
    const aceitoCondicional = recs.filter(r => r.qualidade === 'Aceito Condicional').length;
    // Aceito condicional pesa 50%, Rejeitado pesa 0%
    qualidadeRecScore = ((aprovados + aceitoCondicional * 0.5) / recs.length) * 100;
  }

  if (!temDados) return null;

  // Cálculo final ponderado (pesos ajustados se há recebimentos)
  let score: number;
  if (temRecebimentos) {
    // Peso redistribuído: 40/15/20/15/10
    score = Math.round(
      notaScore * 0.40 +
      conformidadeScore * 0.15 +
      ocorrenciaScore * 0.20 +
      pontualidadeScore * 0.15 +
      qualidadeRecScore * 0.10
    );
  } else {
    // Peso original: 50/25/25
    score = Math.round(
      notaScore * 0.50 +
      conformidadeScore * 0.25 +
      ocorrenciaScore * 0.25
    );
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    detalhes: {
      notaScore: Math.round(notaScore),
      conformidadeScore: Math.round(conformidadeScore),
      ocorrenciaScore: Math.round(ocorrenciaScore),
      pontualidadeScore: Math.round(pontualidadeScore),
      qualidadeRecScore: Math.round(qualidadeRecScore),
      meta,
      totalAvaliacoes: fornecedor.avaliacoes.length,
      totalAplicaveis,
      totalConformes,
      rofsAbertas: rofsDoParceiro.filter(r => r.status === 'Aberta' || r.status === 'Em Tratamento').length,
      rofsTotal: rofsDoParceiro.length,
      recebimentosTotal: recs.length,
      recebimentosNoPrazo: temRecebimentos ? recs.filter(r => {
        if (!r.dataPrevista || !r.dataRecebimento) return true;
        return new Date(r.dataRecebimento) <= new Date(r.dataPrevista);
      }).length : 0,
      recebimentosAprovados: temRecebimentos ? recs.filter(r => r.qualidade === 'Aprovado').length : 0
    }
  };
}

export interface IQFDetalhes {
  notaScore: number;
  conformidadeScore: number;
  ocorrenciaScore: number;
  pontualidadeScore: number;
  qualidadeRecScore: number;
  meta: number;
  totalAvaliacoes: number;
  totalAplicaveis: number;
  totalConformes: number;
  rofsAbertas: number;
  rofsTotal: number;
  recebimentosTotal: number;
  recebimentosNoPrazo: number;
  recebimentosAprovados: number;
}

/**
 * Retorna cor e label para o IQF
 */
export function getIQFColor(score: number): { bg: string; text: string; border: string; label: string } {
  if (score >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Excelente' };
  if (score >= 60) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Bom' };
  if (score >= 40) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Regular' };
  if (score >= 20) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Ruim' };
  return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Crítico' };
}

/**
 * Retorna a cor do gauge SVG para o IQF
 */
export function getIQFGaugeColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#2563eb';
  if (score >= 40) return '#d97706';
  if (score >= 20) return '#ea580c';
  return '#dc2626';
}