/**
 * Utilitários compartilhados para o módulo de Recursos Humanos
 * Centraliza funções de cor/estilo/ícone repetidas em:
 * - pages/AvaliacaoExperiencia, pages/Colaboradores (requisito status)
 * - pages/AvaliacaoExperiencia, components/AvaliacaoExperiencia (parecer)
 * - components/AvaliacaoExperiencia, components/AvaliacaoDesempenho, pages/AvaliacaoDesempenho (nota, classificação, meta)
 */
import { CheckCircle2, XCircle, ThumbsDown, AlertCircle, ClipboardCheck, Award } from 'lucide-react';

// ─── Requisito Status (atende / nao-atende / parcial / pendente) ────────────

/**
 * Retorna classes CSS para status de requisito
 */
export function getRequisitoStatusColor(status?: string): string {
  switch (status) {
    case 'atende':
      return 'bg-green-50 border-green-300 text-green-700';
    case 'nao-atende':
      return 'bg-red-50 border-red-300 text-red-700';
    case 'parcial':
      return 'bg-yellow-50 border-yellow-300 text-yellow-700';
    default:
      return 'bg-gray-50 border-gray-300 text-gray-500';
  }
}

/**
 * Retorna ícone para status de requisito
 * @param size 'sm' = w-4 h-4 (AvaliacaoExperiencia), 'md' = w-5 h-5 (Colaboradores)
 */
export function getRequisitoStatusIcon(status?: string, size: 'sm' | 'md' = 'sm') {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  switch (status) {
    case 'atende':
      return <CheckCircle2 className={`${cls} text-green-600`} />;
    case 'nao-atende':
      return <XCircle className={`${cls} text-red-600`} />;
    case 'parcial':
      return <CheckCircle2 className={`${cls} text-yellow-600`} />;
    default:
      return <XCircle className={`${cls} text-gray-400`} />;
  }
}

// ─── Parecer (aprovado / reprovado / prorrogado) ────────────────────────────

/**
 * Retorna classes CSS para parecer de avaliação de experiência
 */
export function getParecerColor(parecer: string): string {
  switch (parecer) {
    case 'aprovado':
      return 'bg-green-100 text-green-700';
    case 'reprovado':
      return 'bg-red-100 text-red-700';
    case 'prorrogado':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ─── Nota de Avaliação (escala 1-4) ─────────────────────────────────────────

/**
 * Retorna label textual para nota de avaliação
 */
export function getNotaLabel(nota: number | null): string {
  switch (nota) {
    case 1: return 'Não Atende';
    case 2: return 'Abaixo do Esperado';
    case 3: return 'Atende';
    case 4: return 'Supera';
    default: return 'Não Avaliado';
  }
}

/**
 * Retorna classes CSS para nota de avaliação
 */
export function getNotaColor(nota: number | null): string {
  switch (nota) {
    case 1: return 'bg-red-100 text-red-800 border-red-300';
    case 2: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 3: return 'bg-green-100 text-green-800 border-green-300';
    case 4: return 'bg-blue-100 text-blue-800 border-blue-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

/**
 * Retorna ícone para nota de avaliação
 */
export function getNotaIcon(nota: number | null) {
  switch (nota) {
    case 1: return <ThumbsDown className="w-4 h-4" />;
    case 2: return <AlertCircle className="w-4 h-4" />;
    case 3: return <ClipboardCheck className="w-4 h-4" />;
    case 4: return <Award className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
}

// ─── Classificação de Desempenho (excelente / bom / regular / insatisfatorio) ─

/**
 * Retorna classes CSS para classificação de desempenho
 */
export function getClassificacaoColor(classificacao: string): string {
  switch (classificacao) {
    case 'excelente':
      return 'bg-green-100 text-green-700';
    case 'bom':
      return 'bg-blue-100 text-blue-700';
    case 'regular':
      return 'bg-yellow-100 text-yellow-700';
    case 'insatisfatorio':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ─── Meta Status (atingida / parcial / nao-atingida) ────────────────────────

/**
 * Retorna classes CSS para status de meta de desempenho
 */
export function getMetaStatusColor(status: string): string {
  switch (status) {
    case 'atingida':
      return 'bg-green-50 border-green-300 text-green-700';
    case 'parcial':
      return 'bg-yellow-50 border-yellow-300 text-yellow-700';
    case 'nao-atingida':
      return 'bg-red-50 border-red-300 text-red-700';
    default:
      return 'bg-gray-50 border-gray-300 text-gray-500';
  }
}

// ─── Cálculos de Avaliação (estatísticas e percentual) ──────────────────────

/**
 * Interface mínima para itens com nota (escala 1-4)
 */
interface ItemComNota {
  nota: number | null;
}

/**
 * Calcula estatísticas por faixa de nota (1=Não Atende, 2=Abaixo, 3=Atende, 4=Supera)
 * Usado em AvaliacaoExperiencia e AvaliacaoDesempenho (componentes e páginas)
 */
export function calcularEstatisticasNotas(itens: ItemComNota[]) {
  const total = itens.length;
  const naoAtende = itens.filter(i => i.nota === 1).length;
  const abaixo = itens.filter(i => i.nota === 2).length;
  const atende = itens.filter(i => i.nota === 3).length;
  const supera = itens.filter(i => i.nota === 4).length;

  return { total, naoAtende, abaixo, atende, supera };
}

/**
 * Calcula o percentual de aprovação (% de Atende + Supera sobre o total)
 * Usado em AvaliacaoExperiencia e AvaliacaoDesempenho ao salvar avaliações
 */
export function calcularPercentualAprovacao(itens: ItemComNota[]): number {
  if (itens.length === 0) return 0;
  const atendeSuperaCount = itens.filter(i => i.nota === 3 || i.nota === 4).length;
  return Math.round((atendeSuperaCount / itens.length) * 100);
}
