/**
 * Constantes Globais do Sistema
 * Centraliza todas as configurações e constantes para facilitar manutenção
 */

// ============ STATUS CONFIGURATIONS ============

export const STATUS_CONFIG = {
  'nao-iniciado': { 
    label: 'Não Iniciado', 
    color: 'bg-gray-100 text-gray-700', 
    progress: 0 
  },
  'em-andamento': { 
    label: 'Em Andamento', 
    color: 'bg-blue-100 text-blue-700', 
    progress: 50 
  },
  'em-avaliacao-eficacia': { 
    label: 'Avaliação de Eficácia', 
    color: 'bg-purple-100 text-purple-700', 
    progress: 75 
  },
  'concluido': { 
    label: 'Concluído', 
    color: 'bg-green-100 text-green-700', 
    progress: 100 
  },
  'atrasado': { 
    label: 'Atrasado', 
    color: 'bg-red-100 text-red-700', 
    progress: 25 
  },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

// ============ ORIGEM PA (PLANO DE AÇÃO) ============

export const ORIGEM_PA_OPTIONS = [
  'NC Interna',
  'Falha de processo',
  'Produto/serviço NC',
  'Auditoria Interna',
  'Auditoria Externa',
  'Cliente',
  'Reclamação de Cliente',
  'Indicador de desempenho',
  'Fornecedor',
  'Meio Ambiente',
  'Segurança e Saúde',
  'Risco',
  'Outros',
] as const;

export type OrigemPA = typeof ORIGEM_PA_OPTIONS[number];

export const ORIGEM_PA_CONFIG: Record<OrigemPA, { label: string; color: string }> = {
  'NC Interna': { label: 'NC Interna', color: 'bg-red-100 text-red-700' },
  'Falha de processo': { label: 'Falha de processo', color: 'bg-orange-100 text-orange-700' },
  'Produto/serviço NC': { label: 'Produto/serviço NC', color: 'bg-pink-100 text-pink-700' },
  'Auditoria Interna': { label: 'Auditoria Interna', color: 'bg-purple-100 text-purple-700' },
  'Auditoria Externa': { label: 'Auditoria Externa', color: 'bg-indigo-100 text-indigo-700' },
  'Cliente': { label: 'Cliente', color: 'bg-blue-100 text-blue-700' },
  'Reclamação de Cliente': { label: 'Reclamação de Cliente', color: 'bg-cyan-100 text-cyan-700' },
  'Indicador de desempenho': { label: 'Indicador de desempenho', color: 'bg-teal-100 text-teal-700' },
  'Fornecedor': { label: 'Fornecedor', color: 'bg-green-100 text-green-700' },
  'Meio Ambiente': { label: 'Meio Ambiente', color: 'bg-lime-100 text-lime-700' },
  'Segurança e Saúde': { label: 'Segurança e Saúde', color: 'bg-yellow-100 text-yellow-700' },
  'Risco': { label: 'Risco', color: 'bg-amber-100 text-amber-700' },
  'Outros': { label: 'Outros', color: 'bg-gray-100 text-gray-700' },
};

// ============ PERSPECTIVAS BSC ============

export const PERSPECTIVAS_BSC = [
  'Financeira',
  'Clientes',
  'Processos Internos',
  'Aprendizado e Crescimento',
] as const;

export type PerspectivaBsc = typeof PERSPECTIVAS_BSC[number];

export const PERSPECTIVAS_BSC_COLORS: Record<PerspectivaBsc, string> = {
  'Financeira': 'bg-green-100 text-green-700 border-green-300',
  'Clientes': 'bg-blue-100 text-blue-700 border-blue-300',
  'Processos Internos': 'bg-purple-100 text-purple-700 border-purple-300',
  'Aprendizado e Crescimento': 'bg-orange-100 text-orange-700 border-orange-300',
};

// ============ SWOT QUADRANTES ============

export const SWOT_QUADRANTES = {
  forcas: { prefix: 'FOR', label: 'Forças', color: 'bg-green-50' },
  fraquezas: { prefix: 'FRA', label: 'Fraquezas', color: 'bg-red-50' },
  oportunidades: { prefix: 'OPO', label: 'Oportunidades', color: 'bg-blue-50' },
  ameacas: { prefix: 'AME', label: 'Ameaças', color: 'bg-yellow-50' },
} as const;

export type SwotQuadrante = keyof typeof SWOT_QUADRANTES;

// ============ NÍVEIS DE RISCO ============

export const NIVEIS_RISCO = {
  Baixo: { 
    color: 'bg-green-100 text-green-700 border-green-300', 
    range: [0, 2] 
  },
  Médio: { 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300', 
    range: [3, 4] 
  },
  Alto: { 
    color: 'bg-red-100 text-red-700 border-red-300', 
    range: [5, Infinity] 
  },
} as const;

export type NivelRisco = keyof typeof NIVEIS_RISCO;

// ============ STATUS DE TRATAMENTO DE RISCO ============

export const STATUS_TRATAMENTO_RISCO = {
  Aceitar: { 
    label: 'Aceitar', 
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: 'CheckCircle2'
  },
  Tratar: { 
    label: 'Tratar', 
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: 'AlertCircle'
  },
  Transferir: { 
    label: 'Transferir', 
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: 'Send'
  },
} as const;

export type StatusTratamentoRisco = keyof typeof STATUS_TRATAMENTO_RISCO;

// ============ TIPOS DE DOCUMENTOS ============

export const TIPOS_DOCUMENTOS = [
  'Procedimento',
  'Instrução de Trabalho',
  'Formulário',
  'Manual',
  'Política',
  'Registro',
  'Outros',
] as const;

export type TipoDocumento = typeof TIPOS_DOCUMENTOS[number];

// ============ STATUS DE FORNECEDOR ============

export const STATUS_FORNECEDOR = {
  'Em Avaliação': { color: 'bg-yellow-100 text-yellow-700' },
  'Homologado': { color: 'bg-green-100 text-green-700' },
  'Suspenso': { color: 'bg-red-100 text-red-700' },
  'Descredenciado': { color: 'bg-gray-100 text-gray-700' },
} as const;

export type StatusFornecedor = keyof typeof STATUS_FORNECEDOR;

// ============ LOCALSTORAGE KEYS ============

export const STORAGE_KEYS = {
  // Contexto Estratégico
  STRATEGIC_DATA: 'strategic-planning-data',
  YEARS_DATA: 'strategic-planning-years',

  // KPI
  KPI_DATA: 'sisteq_kpi_indicadores',

  // Fornecedores (chaves reais usadas em useFornecedores.tsx)
  FORNECEDORES_DATA: 'fornecedores',
  FORNECEDORES_CONFIG: 'fornecedores_config',
  FORNECEDORES_ROF: 'fornecedores_rofs',
  FORNECEDORES_AVALIACOES: 'fornecedores_avaliacoes',

  // Processos
  PROCESSOS_DATA: 'sisteq-processos-mapeamento',
  PROCESSOS_LISTA: 'sisteq-processos',

  // Configurações (chaves reais usadas em Usuarios/Departamentos/Funcoes)
  CONFIG_USUARIOS: 'usuarios',
  CONFIG_DEPARTAMENTOS: 'departamentos',
  CONFIG_FUNCOES: 'funcoes',

  // Documentos (chaves reais por categoria)
  DOCS_INTERNOS: 'sisteq-docs-internos',
  DOCS_CLIENTES: 'sisteq-docs-clientes',
  DOCS_EXTERNOS: 'sisteq-docs-externos',
  DOCS_LICENCAS: 'sisteq-docs-licencas',
  DOCS_CERTIDOES: 'sisteq-docs-certidoes',
  TIPOS_DOCS_INTERNOS: 'sisteq-tipos-docs-internos',
  TIPOS_DOCS_CLIENTES: 'sisteq-tipos-docs-clientes',
  TIPOS_DOCS_EXTERNOS: 'sisteq-tipos-externos',
  TIPOS_LICENCAS: 'sisteq-tipos-licencas',
  TIPOS_CERTIDOES: 'sisteq-tipos-certidoes',

  // Recursos Humanos (chaves reais usadas nos módulos de RH)
  COLABORADORES: 'sisteq-colaboradores',
  INTEGRACAO: 'sisteq-integracao-colaboradores',
  FICHAS_INTEGRACAO: 'sisteq-fichas-integracao',
  AVALIACAO_EXPERIENCIA: 'sisteq-config-avaliacao-experiencia',
  CONFIG_EXPERIENCIA: 'sisteq-configuracao-experiencia',
  AVALIACAO_DESEMPENHO: 'sisteq-configuracao-desempenho',
  DESCRICAO_FUNCOES: 'sisteq-descricao-funcoes',
  MATRIZ_ATIVIDADES: 'sisteq-matriz-atividades',
  MATRIZ_QUALIFICACOES: 'sisteq-matriz-qualificacoes',
  PLANO_QUALIFICACAO: 'planos-qualificacao',

  // Comunicação
  PLANO_COMUNICACAO: 'planoComunicacao',

  // Preferências
  USER_PREFERENCES: 'user-preferences',

  // RBAC e auditoria
  RBAC: 'sisteq-rbac',
  AUDIT_LOG: 'sisteq-audit-log',
} as const;

// ============ DEBOUNCE TIMES ============

export const DEBOUNCE_TIMES = {
  SEARCH: 300,
  AUTOSAVE: 800,
  RESIZE: 150,
  SCROLL: 100,
} as const;

// ============ PAGINATION ============

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

// ============ DATE FORMATS ============

export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  MONTH_YEAR: 'MM/YYYY',
} as const;

// ============ VALIDATION LIMITS ============

export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_TEXT_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_FILE_SIZE_MB: 10,
  MIN_NOME_LENGTH: 3,
  MAX_NOME_LENGTH: 100,
} as const;

// ============ TOAST DURATIONS ============

export const TOAST_DURATIONS = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;
