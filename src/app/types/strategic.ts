// Tipos para o módulo de Planejamento Estratégico

export type PerspectivaBsc = 'financeira' | 'clientes' | 'processos' | 'aprendizado';
export type OrigemPlanoAcao = 'SWOT' | 'Mudança' | 'Objetivo' | 'Outros';
export type OrigemPA = 
  | 'NC Interna' 
  | 'Falha de processo' 
  | 'Produto/serviço NC'
  | 'Auditoria Interna'
  | 'Auditoria Externa'
  | 'Cliente'
  | 'Reclamação de Cliente'
  | 'Indicador de desempenho'
  | 'Fornecedor'
  | 'Meio Ambiente'
  | 'Segurança e Saúde'
  | 'Risco'
  | 'Outros';

export type StatusProcesso = 'Rascunho' | 'Ativo' | 'Arquivado';
export type TipoProcesso = 'Estratégico' | 'Operacional' | 'Suporte';

// Interface para Revisão de Risco
export interface RevisaoRisco {
  numeroRevisao: string; // R1, R2, R3, etc
  data: string;
  impacto: 1 | 2 | 3;
  probabilidade: 1 | 2 | 3;
  classificacao: number;
  nivel: 'Baixo' | 'Médio' | 'Alto';
  observacoes?: string;
  dataRevisao?: string;
  impactoResidual?: 1 | 2 | 3;
  probabilidadeResidual?: 1 | 2 | 3;
  observacoesRevisao?: string;
  [key: string]: any;
}

// Interface para Risco
export interface Risco {
  id: string;
  codigo: string; // RSC-001, RSC-002, etc
  departamento: string;
  processo: string;
  descricaoRisco: string;
  controlesExistentes: string[];
  impactoInicial: 1 | 2 | 3;
  probabilidadeInicial: 1 | 2 | 3;
  classificacaoInicial: number;
  nivelInicial: 'Baixo' | 'Médio' | 'Alto';
  status: 'Aceitar' | 'Tratar' | 'Transferir';
  planoAcaoVinculado?: string; // Número PA (ex: PA001)
  transferidoPara?: string;
  observacaoTransferencia?: string;
  impactoResidual?: 1 | 2 | 3;
  probabilidadeResidual?: 1 | 2 | 3;
  classificacaoResidual?: number;
  nivelResidual?: 'Baixo' | 'Médio' | 'Alto';
  dataReavaliacao?: string;
  observacoesReavaliacao?: string;
  ultimaRevisao: string; // Data da última revisão
  dataCriacao: string; // Data de criação do risco
  revisaoAtual: string; // R1, R2, R3, etc
  historicoRevisoes: RevisaoRisco[]; // Histórico completo de todas as revisões
  revisoes?: RevisaoRisco[];
  dataRegistro?: string;
  descricaoControle?: string;
  responsavel?: string;
  [key: string]: any;
}

export interface ValorOrganizacional {
  id: string;
  valor: string;
  explicacao: string;
}

export interface PoliticaBscItem {
  id: string;
  perspectiva: PerspectivaBsc;
  descricao: string;
}

export interface ObjetivoBscItem {
  id: string;
  numeroObjetivo: string; // OBJ1, OBJ2, OBJ3, etc
  perspectiva: PerspectivaBsc;
  descricao: string;
  indicadorProjeto: string;
  resultadoAtual: string;
  meta: string;
  prazoInicio: string; // Data de início/definição do objetivo
  prazo: string; // Data limite/conclusão
  politicaVinculadaId?: string; // ID da política BSC vinculada
  planoAcaoVinculado?: string; // Número PE (ex: PE001)
}

export interface DirecionamentoEstrategico {
  missao: string;
  visao: string;
  valores: ValorOrganizacional[];
  // Política da Qualidade
  politicaQualidade: string; // Política textual
  politicaBsc: PoliticaBscItem[]; // Desdobramento da Política em formato BSC
  escopoCertificacao: string; // Escopo de Certificação
  exclusaoRequisito: string; // Exclusão de Requisito
  // Objetivos Estratégicos (apenas BSC)
  objetivosBsc: ObjetivoBscItem[];
}

export interface ItemComRelevancia {
  id: string;
  nome: string;
  nivelRelevancia: 1 | 2 | 3; // 1=Baixa, 2=Média, 3=Alta
}

export interface CenarioOrganizacional {
  historicoEmpresa: string;
  produtosServicos: string;
  regiaoAtuacao: string;
  canaisVenda: string;
  principaisClientes: ItemComRelevancia[];
  principaisFornecedores: ItemComRelevancia[];
  principaisConcorrentes: ItemComRelevancia[];
}

export type SwotQuadrante = 'forcas' | 'fraquezas' | 'oportunidades' | 'ameacas';

export interface SwotItem {
  id: string;
  numeroSwot: string; // FOR1, FOR2, FRA1, FRA2, OPO1, OPO2, AME1, AME2
  quadrante: SwotQuadrante;
  descricao: string;
  nivelRelevancia: 1 | 2 | 3; // 1=Baixo, 2=Médio, 3=Alto
  tomarAcao: boolean;
  planoAcaoVinculado?: string; // Número PE (ex: PE001)
  criadoEm: string;
}

export interface ParteInteressada {
  id: string;
  nome: string;
  expectativa: string;
  atendimento: string;
  criadoEm: string;
}

export interface TarefaAcao {
  id: string;
  descricao: string;
  responsavel: string;
  departamento?: string;
  prazo: string;
  concluida: boolean;
  dataConclusao?: string; // Data em que a tarefa foi marcada como concluída
}

export interface AcompanhamentoPAE {
  id: string;
  descricao: string;
  responsavel: string;
  dataHora: string;
}

export interface PlanoAcaoEstrategico {
  id: string;
  numeroPE: string; // PE001, PE002, etc
  origemTipo: OrigemPlanoAcao; // SWOT, Mudança, Objetivo ou Outros
  acao: string;
  tarefas: TarefaAcao[];
  investimento: number;
  dataInicio: string; // Data de início editável
  prazoFinal: string;
  statusAcompanhamento: 'nao-iniciado' | 'em-andamento' | 'concluido' | 'atrasado' | 'planejamento';
  acompanhamentos: AcompanhamentoPAE[];
  criadoEm: string; // Timestamp de criação (não editável)
  [key: string]: any;
}

// Interface específica para Plano de Ações (PA) - Ações Corretivas
export interface PlanoAcoes {
  id: string;
  numeroPE: string; // PA001, PA002, etc (mantém numeroPE internamente, mas exibe como PA)
  origem: OrigemPA; // Origem específica para ações corretivas
  indicadorId?: string; // ID do indicador vinculado (quando origem for 'Indicador de desempenho')
  descricaoNaoConformidade: string; // Descrição da Não Conformidade
  acaoImediata: string; // Ação Imediata
  causaRaiz: string; // Causa Raiz
  tarefas: TarefaAcao[]; // Tarefas da ação corretiva (a seção "Ação Corretiva")
  investimento: number;
  dataInicio: string;
  prazoFinal: string;
  statusAcompanhamento: 'nao-iniciado' | 'em-andamento' | 'concluido' | 'atrasado' | 'em-avaliacao-eficacia' | 'planejamento';
  acompanhamentos: AcompanhamentoPAE[];
  acaoImplantada?: boolean; // Ação foi implantada?
  dataImplantacao?: string; // Data em que foi marcada como implantada
  dataVerificacaoEficacia?: string; // Data de verificação da eficácia (pré-preenchida com +30 dias)
  eficaz?: boolean; // A ação foi eficaz? (só aparece após a data de verificação)
  evidenciaEficacia?: string; // Evidência da eficácia (só aparece quando eficaz for preenchido)
  criadoEm: string;
  [key: string]: any;
}

export interface DadosEstrategicos {
  direcionamento: DirecionamentoEstrategico;
  cenario: CenarioOrganizacional;
  swotItems: SwotItem[];
  partesInteressadas: ParteInteressada[];
  planosAcao: PlanoAcaoEstrategico[]; // PE - Planos Estratégicos
  planosAcoes: PlanoAcoes[]; // PA - Planos de Ações (Ações Corretivas)
  riscos: Risco[]; // Riscos cadastrados
  processos: Processo[]; // Processos cadastrados
}

// ====== MÓDULO DE PROCESSOS ======

export interface VersaoProcesso {
  id: string;
  versao: string; // "1.0", "2.0", etc
  dataPublicacao: string;
  publicadoPor: string;
  mudancas: string;
  atividades: AtividadeProcesso[];
}

export interface AtividadeProcesso {
  id: string;
  nome: string;
  descricao?: string;
  responsavel: string;
  tempoEstimado?: string;
  ordem: number;
}

export interface IndicadorProcesso {
  id: string;
  nome: string;
  descricao?: string;
  unidade: string;
  meta: string;
  frequencia: string;
  responsavel: string;
}

export interface RiscoProcesso {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: string;
  probabilidade: string;
  impacto: string;
  nivelRisco: string;
  acoesMitigacao?: string;
}

export interface DocumentoProcesso {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  versao: string;
  dataAtualizacao: string;
}

export interface RegistroProcesso {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  responsavel: string;
  status: string;
  data: string;
}

export interface Processo {
  id: string;
  codigo: string; // MP01, MP02, MP03, etc (Mapa de Processos)
  nome: string;
  departamento: string;
  responsavel?: string;
  status: StatusProcesso;
  tipo: TipoProcesso;
  versaoAtual: string; // "1.0", "2.0", etc
  ultimaAtualizacao: string;
  dataCriacao: string;
  
  // Visão Geral
  objetivo?: string;
  atividades: AtividadeProcesso[];
  
  // Fluxo do Processo
  entradas?: string[]; // Lista de entradas do processo
  saidas?: string[]; // Lista de saídas do processo
  
  // Estrutura
  funcoes?: string[]; // Lista de funções/cargos envolvidos
  recursos?: string[]; // Lista de recursos/infraestrutura
  
  // Vinculações (arrays com objetos completos para facilitar exibição)
  indicadores?: IndicadorProcesso[];
  riscos?: RiscoProcesso[];
  documentos?: DocumentoProcesso[];
  registros?: RegistroProcesso[];
  
  // Histórico
  versoes: VersaoProcesso[];
  [key: string]: any;
}
