export type TipoIndicador = 'Estratégico' | 'Tático' | 'Operacional' | 'Sem Definição';
export type PeriodicidadeIndicador = 'Mensal' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';
export type TipoConsolidacao = 'Média' | 'Somatório' | 'Último Valor';
export type TendenciaIndicador = 'Crescente' | 'Decrescente' | 'Estável';
export type StatusIndicador = 'Dentro da Meta' | 'Atenção' | 'Fora da Meta';

export interface ResultadoMensal {
  mes: number;
  ano: number;
  valor: number;
  observacao?: string;
  evidenciaUrl?: string;
  meta?: number; // Meta que existia naquele mês
  planoAcaoId?: string; // PA vinculado a este resultado
  planoAcaoNumero?: string; // Número do PA (ex: PA001)
}

export interface AlertaDesconsiderado {
  data: string; // Data em que foi desconsiderado
  usuario: string; // Nome do usuário que desconsiderou
  meses: { mes: number; ano: number }[]; // Meses consecutivos que geraram o alerta
}

export interface Indicador {
  id: string;
  codigo?: string;
  nome: string;
  departamento: string;
  processoId?: string;
  processoNome?: string;
  responsavel: string;
  
  // Estrutura técnica
  unidadeMedida: string;
  periodicidade: PeriodicidadeIndicador;
  tipoConsolidacao: TipoConsolidacao;
  formulaCalculo: string;
  fonteDados: string;
  tipoIndicador: TipoIndicador;
  
  // Meta e critério
  meta: number;
  limiteMinimo?: number;
  limiteMaximo?: number;
  tendencia: TendenciaIndicador;
  
  // Resultados
  resultadoAtual: number;
  resultadoAcumulado: number;
  historicoResultados: ResultadoMensal[];
  
  // Análise
  analiseCritica?: string;
  observacoes?: string;
  
  // Alertas
  alertasDesconsiderados?: AlertaDesconsiderado[]; // Histórico de alertas desconsiderados
  
  // Metadados
  dataCriacao: string;
  dataUltimaAtualizacao: string;
  ativo: boolean;
}

export interface ResumoKPI {
  totalIndicadores: number;
  dentroMeta: number;
  atencao: number;
  foraMeta: number;
  percentualDentroMeta: number;
  percentualAtencao: number;
  percentualForaMeta: number;
}