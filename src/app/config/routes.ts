/**
 * Constantes de Rotas do Sistema
 * 
 * Centralizando todas as rotas em um único local para:
 * - Evitar erros de digitação
 * - Facilitar manutenção
 * - Autocomplete no IDE
 * - Refatoração segura
 */

export const ROUTES = {
  /**
   * Gestão Estratégica
   */
  GESTAO_ESTRATEGICA: {
    BASE: '/gestao-estrategica',
    DIRECIONAMENTO: '/gestao-estrategica',
    CENARIO: '/gestao-estrategica/cenario',
    PARTES_INTERESSADAS: '/gestao-estrategica/partes-interessadas',
    SWOT: '/gestao-estrategica/swot',
    OBJETIVOS: '/gestao-estrategica/objetivos',
    COMUNICACAO: '/gestao-estrategica/comunicacao',
    PLANO_ACAO: '/gestao-estrategica/plano-acao',
    TAREFAS: '/gestao-estrategica/tarefas',
    ANALISE_CRITICA: '/gestao-estrategica/analise-critica',
  },

  /**
   * Processos
   */
  PROCESSOS: {
    BASE: '/processos',
    LISTA: '/processos',
    MAPA: '/processos/mapa',
    RELATORIOS: '/processos/relatorios',
  },

  /**
   * Gestão de Riscos
   */
  GESTAO_RISCOS: {
    BASE: '/gestao-riscos',
    DASHBOARD: '/gestao-riscos',
    REGISTRO: '/gestao-riscos/registro',
    MATRIZ: '/gestao-riscos/matriz',
    TRATAMENTO: '/gestao-riscos/tratamento',
    HISTORICO: '/gestao-riscos/historico',
  },

  /**
   * Ações Corretivas
   */
  ACOES_CORRETIVAS: {
    PLANO_ACAO: '/acoes-corretivas/plano-acao',
    TAREFAS: '/acoes-corretivas/tarefas',
  },

  /**
   * Controle de Documentos
   */
  DOCUMENTOS: {
    BASE: '/documentos',
    DASHBOARD: '/documentos/dashboard',
    INTERNOS: '/documentos/internos',
    CLIENTES: '/documentos/clientes',
    EXTERNOS: '/documentos/externos',
    LICENCAS: '/documentos/licencas',
    CERTIDOES: '/documentos/certidoes',
    TIPOS: '/documentos/tipos',
  },

  /**
   * Recursos Humanos
   */
  RH: {
    BASE: '/recursos-humanos',
    DASHBOARD: '/recursos-humanos/dashboard',
    COLABORADORES: '/recursos-humanos/colaboradores',
    DESCRICAO_FUNCOES: '/recursos-humanos/descricao-funcoes',
    INTEGRACAO: '/recursos-humanos/integracao',
    AVALIACAO_EXPERIENCIA: '/recursos-humanos/avaliacao-experiencia',
    AVALIACAO_DESEMPENHO: '/recursos-humanos/avaliacao-desempenho',
    MATRIZ_QUALIFICACAO: '/recursos-humanos/matriz-qualificacao',
    PLANO_QUALIFICACAO: '/recursos-humanos/plano-qualificacao',
  },

  /**
   * Fornecedores
   */
  FORNECEDORES: {
    BASE: '/fornecedores',
    DASHBOARD: '/fornecedores',
    CADASTRO: '/fornecedores/cadastro',
    HOMOLOGACAO: '/fornecedores/homologacao',
    AVALIACOES: '/fornecedores/avaliacoes',
    ROF: '/fornecedores/rof',
    RECEBIMENTO: '/fornecedores/recebimento',
    RANKING: '/fornecedores/ranking',
    CONFIGURACOES: '/fornecedores/configuracoes',
  },

  /**
   * Indicadores de Desempenho (KPI)
   */
  KPI: {
    BASE: '/kpi',
    CENTRAL: '/kpi',
    MATRIZ: '/matriz-kpi',
  },

  /**
   * Configurações
   */
  CONFIG: {
    USUARIOS: '/configuracoes/usuarios',
    DEPARTAMENTOS: '/configuracoes/departamentos',
    FUNCOES: '/configuracoes/funcoes',
    TIPOS_DOCUMENTOS: '/configuracoes/tipos-documentos',
  },

  /**
   * Página Inicial
   */
  HOME: '/',
} as const;

/**
 * Helper para construir rotas com query params
 */
export function buildRoute(path: string, params?: Record<string, string>): string {
  if (!params) return path;
  
  const queryString = new URLSearchParams(params).toString();
  return `${path}?${queryString}`;
}

/**
 * Tipos para autocomplete
 */
export type GestaoEstrategicaRoute = typeof ROUTES.GESTAO_ESTRATEGICA[keyof typeof ROUTES.GESTAO_ESTRATEGICA];
export type ProcessosRoute = typeof ROUTES.PROCESSOS[keyof typeof ROUTES.PROCESSOS];
export type AcoesCorretivasRoute = typeof ROUTES.ACOES_CORRETIVAS[keyof typeof ROUTES.ACOES_CORRETIVAS];
export type DocumentosRoute = typeof ROUTES.DOCUMENTOS[keyof typeof ROUTES.DOCUMENTOS];
export type ConfigRoute = typeof ROUTES.CONFIG[keyof typeof ROUTES.CONFIG];
export type GestaoRiscosRoute = typeof ROUTES.GESTAO_RISCOS[keyof typeof ROUTES.GESTAO_RISCOS];
export type RHRoute = typeof ROUTES.RH[keyof typeof ROUTES.RH];
export type FornecedoresRoute = typeof ROUTES.FORNECEDORES[keyof typeof ROUTES.FORNECEDORES];
export type KPIRoute = typeof ROUTES.KPI[keyof typeof ROUTES.KPI];