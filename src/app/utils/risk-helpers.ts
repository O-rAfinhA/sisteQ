// ─────────────────────────────────────────────
// Utilitários compartilhados do módulo de Riscos
// ─────────────────────────────────────────────

export type NivelRisco = 'Baixo' | 'Médio' | 'Alto';

export interface ClassificacaoRisco {
  valor: number;
  nivel: NivelRisco;
}

/**
 * Calcula a classificação de risco (impacto × probabilidade)
 */
export const calcularClassificacao = (impacto: number, probabilidade: number): ClassificacaoRisco => {
  const valor = impacto * probabilidade;
  let nivel: NivelRisco;
  
  if (valor <= 2) {
    nivel = 'Baixo';
  } else if (valor <= 4) {
    nivel = 'Médio';
  } else {
    nivel = 'Alto';
  }
  
  return { valor, nivel };
};

/**
 * Retorna classes Tailwind semânticas para badges de nível de risco
 */
export const getNivelColor = (nivel: NivelRisco): string => {
  switch (nivel) {
    case 'Baixo':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Médio':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Alto':
      return 'bg-red-50 text-red-700 border-red-200';
  }
};

/**
 * Retorna classes Tailwind para badges de status de tratamento
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Aceitar':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Tratar':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Transferir':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};
