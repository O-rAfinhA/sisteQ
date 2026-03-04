export type TipoFornecedor = 
  | 'Matéria-Prima'
  | 'Serviços'
  | 'Equipamentos'
  | 'Consultoria'
  | 'Outros';

export type StatusFornecedor = 
  | 'Homologado'
  | 'Em Homologação'
  | 'Homologado com Restrição'
  | 'Bloqueado'
  | 'Inativo'
  | 'Reprovado';

export type Criticidade = 'Crítico' | 'Não Crítico';

export type StatusHomologacao = 
  | 'Pendente'
  | 'Em Análise'
  | 'Homologado'
  | 'Homologado com Restrição'
  | 'Reprovado';

export type NivelAvaliacao = 'Inadequado' | 'Parcialmente Adequado' | 'Adequado';

export type PeriodicidadeAvaliacao = 'Semestral' | 'Anual' | 'Personalizado';

export type TipoROF = 
  | 'Documental'
  | 'Atendimento'
  | 'Produto/Serviço NC'
  | 'Outros';

export type GravidadeROF = 'Baixa' | 'Média' | 'Alta';

export type StatusROF = 'Aberta' | 'Em Tratamento' | 'Concluída' | 'Cancelada';

export type QualidadeRecebimento = 'Aprovado' | 'Aceito Condicional' | 'Rejeitado';
export type AcaoImediataRecebimento = 'Comunicação Informal' | 'Notificação Formal' | 'Suspensão Temporária' | 'Outra';

export type StatusPedido = 'Em Aberto' | 'Recebido' | 'Cancelado';

export interface ItemPedido {
  id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

export interface PedidoCompra {
  id: string;
  numero: number;
  fornecedorId: string;
  fornecedorNome: string;
  dataPedido: string;
  dataPrevistaEntrega: string;
  valorEstimado: number;
  tipo?: string;
  descricao: string;
  itens?: ItemPedido[];
  responsavel: string;
  status: StatusPedido;
  observacoes?: string;
  recebimentoId?: string;
  recebimentoNumero?: number;
  dataCriacao: string;
}

export interface Recebimento {
  id: string;
  numero: number;
  fornecedorId: string;
  fornecedorNome: string;
  pedidoCompra: string;
  notaFiscal: string;
  dataPrevista: string;
  dataRecebimento: string;
  valorTotal: number;
  qualidade: QualidadeRecebimento;
  responsavel: string;
  observacoes?: string;
  // ROF vinculada (criada automaticamente quando qualidade ≠ Aprovado)
  rofId?: string;
  rofNumero?: string;
  // ROF inline data (salvo junto com recebimento)
  rofData?: {
    tipo: TipoROF;
    gravidade: GravidadeROF;
    descricao: string;
    acaoImediata: AcaoImediataRecebimento;
    responsavel: string;
    evidenciaNome?: string;
    evidenciaBase64?: string;
  };
  // Laudo de recebimento (upload opcional)
  laudoNome?: string;
  laudoBase64?: string;
  dataCriacao: string;
  // Vínculo estrutural com Pedido de Compra interno
  pedidoCompraId?: string;
  pedidoCompraNumero?: number;
}

export interface Fornecedor {
  id: string;
  
  // Dados Gerais
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  
  // Contato
  telefone: string;
  email: string;
  site?: string;
  contatoPrincipal?: string;
  
  // Classificação
  tipo: (TipoFornecedor | string)[];
  departamentoVinculado: string;
  criticidade: Criticidade;
  status: StatusFornecedor;
  
  // Homologação
  homologacao?: DadosHomologacao;
  
  // Avaliações
  avaliacoes: Avaliacao[];
  periodicidadeAvaliacao: PeriodicidadeAvaliacao;
  diasPersonalizados?: number;
  proximaAvaliacao?: string; // Data ISO
  notaMedia?: number;
  
  // ROFs
  rofs: string[]; // IDs das ROFs
  
  // Histórico de Bloqueios/Desbloqueios
  historicoBloqueios?: RegistroBloqueio[];
  
  // Metadados
  dataCadastro: string;
  dataUltimaAtualizacao: string;
  ativo: boolean;
}

export interface DadosHomologacao {
  status: StatusHomologacao;
  dataInicio?: string;
  dataConclusao?: string;
  responsavel?: string;
  
  // Etapa 1 - Análise Documental
  analiseDocumental: {
    [key: string]: {
      status: 'Aplicável' | 'Não Aplicável';
      conforme: boolean;
      nomeArquivo?: string;
      dataUpload?: string;
      dataValidade?: string;
      observacao?: string;
    };
  };
  
  // Etapa 2 - Critérios
  criterios: {
    capacidadeProdutiva: NivelAvaliacao | null;
    reconhecimentoMercado: NivelAvaliacao | null;
    amostraProduto: NivelAvaliacao | null;
    avaliacaoPrimeiroServico: NivelAvaliacao | null;
    prazoEntrega: NivelAvaliacao | null;
  };
  
  // Observações por critério (obrigatório quando Parcialmente Adequado ou Inadequado)
  observacoesCriterios?: {
    [key: string]: string;
  };

  // Status calculado automaticamente pelo sistema (regras objetivas)
  statusCalculado?: string;
  
  // Etapa 3 - Decisão
  decisao?: {
    resultado: 'Homologado' | 'Homologado com Restrição' | 'Reprovado';
    responsavel: string;
    observacao: string;
    data: string;
  };
}

export interface Avaliacao {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  data: string;
  responsavel: string;
  
  // Critérios (1 a 5)
  criterios: {
    qualidade: number;
    prazo: number;
    atendimento: number;
    conformidadeDocumental: number;
  };
  
  notaFinal: number; // Média automática
  observacao?: string;
}

export interface ROF {
  id: string;
  numero: string; // Ex: ROF001, ROF002
  fornecedorId: string;
  fornecedorNome: string;
  
  tipo: TipoROF;
  gravidade: GravidadeROF;
  descricao: string;
  evidenciaUrl?: string;
  acaoImediata?: string;
  
  responsavel: string;
  dataAbertura: string;
  status: StatusROF;
  
  // Plano de Ação vinculado
  planoAcaoId?: string;
  planoAcaoNumero?: string;
  
  dataFechamento?: string;
}

export interface ConfiguracaoFornecedores {
  periodicidadePadraoCritico: PeriodicidadeAvaliacao;
  periodicidadePadraoNaoCritico: PeriodicidadeAvaliacao;
  diasPersonalizadosCritico?: number;
  diasPersonalizadosNaoCritico?: number;
  permitirAvaliacaoPersonalizada: boolean;
  notaMinimaAceitavel: number;
  
  // Tipos de Fornecedores
  tiposFornecedor: string[];
  
  // Meta de avaliação por tipo de fornecedor (nota de 1 a 5)
  metaAvaliacaoPorTipo: {
    [tipo: string]: number;
  };
  
  // Documentos por tipo de fornecedor
  documentosPorTipo: {
    [tipo: string]: string[];
  };
  
  criteriosHomologacao: string[];
  // Configuração global: habilitar Pedido de Compras interno
  habilitarPedidoCompras: boolean;
}

export interface RegistroBloqueio {
  data: string;
  motivo: string;
  responsavel: string;
  acao: 'Bloqueio' | 'Desbloqueio';
}
