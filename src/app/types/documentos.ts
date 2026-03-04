export interface Documento {
  id: string;
  codigo: string; // Ex: PS-001, FLX-002
  nome: string;
  tipoId: string; // ID do tipo de documento
  versao: string;
  departamento: string;
  responsavel: string;
  dataEmissao: string;
  dataRevisao: string;
  status: 'vigente' | 'em-revisao' | 'obsoleto';
  descricao: string;
  // Para documentos modo editor
  conteudoHtml?: string;
  // Para documentos modo anexo
  arquivoNome?: string;
  arquivoTipo?: string;
  arquivoTamanho?: number;
  arquivoBase64?: string;
  [key: string]: any;
}
