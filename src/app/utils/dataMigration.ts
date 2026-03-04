/**
 * Utilitários para migração de dados entre versões do sistema
 * Extrai a lógica de migração do contexto principal para melhorar a manutenibilidade
 */

import { DadosEstrategicos } from '../types/strategic';
import { generateId } from './helpers';
import { dataHojeISO } from './formatters';

export const migrateOldData = (parsed: any): DadosEstrategicos => {
  // Migrar planos de ação antigos para adicionar numeroPE
  const planosAcao = (parsed.planosAcao || []).map((plano: any, index: number) => {
    // Determinar dataInicio
    let dataInicio = plano.dataInicio;
    if (!dataInicio) {
      if (plano.criadoEm) {
        dataInicio = plano.criadoEm.includes('T') 
          ? plano.criadoEm.split('T')[0] 
          : plano.criadoEm;
      } else {
        dataInicio = dataHojeISO();
      }
    }

    return {
      ...plano,
      numeroPE: plano.numeroPE || plano.numeroPAE || `PE${(index + 1).toString().padStart(3, '0')}`,
      origemTipo: plano.origemTipo || 'Outros',
      acompanhamentos: plano.acompanhamentos || [],
      dataInicio,
      criadoEm: plano.criadoEm || new Date().toISOString(),
    };
  });

  const initialDirecionamento = {
    missao: '',
    visao: '',
    valores: [],
    politicaQualidade: '',
    politicaBsc: [],
    escopoCertificacao: '',
    exclusaoRequisito: '',
    objetivosBsc: [],
  };

  const initialCenario = {
    produtosServicos: '',
    regiaoAtuacao: '',
    canaisVenda: '',
    principaisClientes: [],
    principaisFornecedores: [],
    principaisConcorrentes: [],
  };

  return {
    direcionamento: migrateDirecionamento(parsed, planosAcao, initialDirecionamento),
    cenario: migrateCenario(parsed, initialCenario),
    swotItems: migrateSwotItems(parsed, planosAcao),
    partesInteressadas: parsed.partesInteressadas || [],
    planosAcao,
    planosAcoes: parsed.planosAcoes || [],
    riscos: parsed.riscos || [],
    processos: parsed.processos || [],
  };
};

function migrateDirecionamento(parsed: any, planosAcao: any[], initialDirecionamento: any) {
  return {
    ...initialDirecionamento,
    ...parsed.direcionamento,
    valores: migrateValores(parsed.direcionamento?.valores),
    politicaBsc: parsed.direcionamento?.politicaBsc || [],
    objetivosBsc: migrateObjetivosBsc(parsed.direcionamento?.objetivosBsc, planosAcao),
  };
}

function migrateValores(valores: any) {
  if (!Array.isArray(valores)) return [];
  
  return valores.map((v: any) => 
    typeof v === 'string' 
      ? { id: generateId(), valor: v, explicacao: '' }
      : v
  );
}

function migrateObjetivosBsc(objetivos: any[], planosAcao: any[]) {
  return (objetivos || []).map((obj: any, index: number) => ({
    ...obj,
    numeroObjetivo: obj.numeroObjetivo || `OBJ${index + 1}`,
    indicadorProjeto: obj.indicadorProjeto || '',
    resultadoAtual: obj.resultadoAtual || '',
    meta: obj.meta || '',
    prazo: obj.prazo || '',
    planoAcaoVinculado: obj.planoAcaoVinculado || getVinculadoFromId(obj.planoAcaoVinculadoId, planosAcao),
  }));
}

function migrateCenario(parsed: any, initialCenario: any) {
  return {
    ...initialCenario,
    ...parsed.cenario,
    principaisClientes: migrateArrayWithRelevancia(parsed.cenario?.principaisClientes),
    principaisFornecedores: migrateArrayWithRelevancia(parsed.cenario?.principaisFornecedores),
    principaisConcorrentes: migrateArrayWithRelevancia(parsed.cenario?.principaisConcorrentes),
  };
}

function migrateArrayWithRelevancia(arr: any[]) {
  if (!Array.isArray(arr)) return [];
  
  return arr.map((item: any) => 
    typeof item === 'string' 
      ? { id: generateId(), nome: item, nivelRelevancia: 2 }
      : item
  );
}

function migrateSwotItems(parsed: any, planosAcao: any[]) {
  return (parsed.swotItems || []).map((item: any, index: number, arr: any[]) => {
    const numeroSwot = item.numeroSwot || generateNumeroSwot(item.quadrante, arr, index);
    const nivelRelevancia = migrateNivelRelevancia(item.nivelRelevancia);
    const planoAcaoVinculado = item.planoAcaoVinculado || getVinculadoFromId(item.planoAcaoVinculadoId, planosAcao);

    return {
      ...item,
      numeroSwot,
      nivelRelevancia,
      planoAcaoVinculado,
    };
  });
}

function generateNumeroSwot(quadrante: string, arr: any[], index: number): string {
  const prefixos: Record<string, string> = {
    'forcas': 'FOR',
    'fraquezas': 'FRA',
    'oportunidades': 'OPO',
    'ameacas': 'AME',
  };
  
  const prefixo = prefixos[quadrante];
  const itemsDoQuadranteAntes = arr.slice(0, index).filter(i => i.quadrante === quadrante);
  const numero = itemsDoQuadranteAntes.length + 1;
  
  return `${prefixo}${numero}`;
}

function migrateNivelRelevancia(nivel: number | undefined): number {
  if (!nivel) return 2;
  
  // Migrar de 5 níveis para 3 níveis
  if (nivel === 1 || nivel === 2) return 1; // Muito Baixo ou Baixo -> Baixo
  if (nivel === 3) return 2; // Médio -> Médio
  if (nivel === 4 || nivel === 5) return 3; // Alto ou Muito Alto -> Alto
  
  return 2;
}

function getVinculadoFromId(id: string | undefined, planosAcao: any[]): string | undefined {
  if (!id) return undefined;
  
  const plano = planosAcao.find((p: any) => p.id === id);
  return plano?.numeroPE || plano?.numeroPAE;
}

// generateId importado de ./helpers
