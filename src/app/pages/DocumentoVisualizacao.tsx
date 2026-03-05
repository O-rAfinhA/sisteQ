import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { 
  ArrowLeft, 
  FileEdit, 
  Paperclip, 
  FileDown, 
  User, 
  Building2, 
  Calendar, 
  File,
  Download,
  History,
  GitBranch,
  Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { TiptapEditor } from '../components/documentos/TiptapEditor';
import { TipoDocumento } from './config/TiposDocumentos';
import { DocumentoInterno } from './DocumentosInternos';
import { DocumentoCliente } from './DocumentosClientesNovo';
import { DocumentoExterno } from './DocumentosExternosNovo';
import { DocumentoLicenca } from './DocumentosLicencas';
import { DocumentoCertidao } from './DocumentosCertidoes';
import { toast } from 'sonner';
import { exportarDocumentoParaPDF } from '../utils/pdfExporter';
import { formatarTamanhoArquivo } from '../utils/formatters';
import { getFromStorage } from '../utils/helpers';
import { DocumentoInternoHeader } from '../components/documentos/DocumentoInternoHeader';
import { DocumentoClienteHeader } from '../components/documentos/DocumentoClienteHeader';
import { DocumentoExternoHeader } from '../components/documentos/DocumentoExternoHeader';
import { DocumentoLicencaHeader } from '../components/documentos/DocumentoLicencaHeader';
import { DocumentoCertidaoHeader } from '../components/documentos/DocumentoCertidaoHeader';
import { HistoricoVersoes } from '../components/documentos/HistoricoVersoes';
import { HistoricoAgrupado } from '../components/documentos/HistoricoAgrupado';

export default function DocumentoVisualizacao() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [documento, setDocumento] = useState<any | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento | null>(null);
  const [activeTab, setActiveTab] = useState<'versoes' | 'aprovacao'>('versoes');

  // Detectar categoria baseado na URL
  const getStorageKeyAndBasePath = () => {
    const path = location.pathname;
    if (path.includes('/documentos/internos/')) {
      return { 
        storageKey: 'sisteq-docs-internos', 
        basePath: '/documentos/internos',
        tiposStorageKey: 'sisteq-tipos-documentos'
      };
    } else if (path.includes('/documentos/clientes/')) {
      return { 
        storageKey: 'sisteq-docs-clientes', 
        basePath: '/documentos/clientes',
        tiposStorageKey: 'sisteq-tipos-docs-clientes'
      };
    } else if (path.includes('/documentos/externos/')) {
      return { 
        storageKey: 'sisteq-docs-externos', 
        basePath: '/documentos/externos',
        tiposStorageKey: 'sisteq-tipos-externos'
      };
    } else if (path.includes('/documentos/licencas/')) {
      return { 
        storageKey: 'sisteq-docs-licencas', 
        basePath: '/documentos/licencas',
        tiposStorageKey: 'sisteq-tipos-licencas'
      };
    } else if (path.includes('/documentos/certidoes/')) {
      return { 
        storageKey: 'sisteq-docs-certidoes', 
        basePath: '/documentos/certidoes',
        tiposStorageKey: 'sisteq-tipos-certidoes'
      };
    } else {
      return { 
        storageKey: 'sisteq-documentos', 
        basePath: '/documentos/controle',
        tiposStorageKey: 'sisteq-tipos-documentos'
      };
    }
  };

  useEffect(() => {
    let cancelled = false;
    try {
      const { storageKey, basePath, tiposStorageKey } = getStorageKeyAndBasePath();

      const documentos = getFromStorage<any[]>(storageKey, []);
      const doc = documentos.find(d => d.id === id);
      if (doc) {
        if (!cancelled) setDocumento(doc);
        const tipos = getFromStorage<TipoDocumento[]>(tiposStorageKey, []);
        const tipo = tipos.find(t => t.id === doc.tipoId);
        if (!cancelled) setTipoDocumento(tipo || null);
      } else {
        toast.error('Documento não encontrado');
        navigate(basePath);
      }
    } catch {
      toast.error('Falha ao carregar o documento');
      const { basePath } = getStorageKeyAndBasePath();
      navigate(basePath);
    }
    return () => {
      cancelled = true;
    };
  }, [id, navigate, location.pathname]);

  const handleVoltar = () => {
    const { basePath } = getStorageKeyAndBasePath();
    navigate(basePath);
  };

  const handleBaixarAnexo = () => {
    if (!documento || !documento.arquivoBase64 || !documento.arquivoNome) {
      toast.error('Arquivo não disponível');
      return;
    }

    const base64Part = documento.arquivoBase64.includes(',')
      ? documento.arquivoBase64.split(',')[1]
      : documento.arquivoBase64;

    const byteCharacters = atob(base64Part);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: documento.arquivoTipo });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = documento.arquivoNome;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportarPDF = () => {
    if (!documento || !documento.conteudoHtml) {
      toast.error('Conteúdo não disponível para exportação');
      return;
    }

    const tipoNome = tipoDocumento?.nome || 'Documento';
    exportarDocumentoParaPDF(documento, tipoNome);
    toast.success('PDF exportado com sucesso!');
  };

  if (!documento) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando documento...</p>
        </div>
      </div>
    );
  }

  const isAnexoMode = tipoDocumento?.modo === 'anexo';
  const { basePath } = getStorageKeyAndBasePath();
  const isDocumentoInterno = basePath === '/documentos/internos';
  const isDocumentoCliente = basePath === '/documentos/clientes';
  const isDocumentoExterno = basePath === '/documentos/externos';
  const isDocumentoLicenca = basePath === '/documentos/licencas';
  const isDocumentoCertidao = basePath === '/documentos/certidoes';

  // Verificar se é PDF
  const isPdf = documento.arquivoTipo === 'application/pdf' || 
                documento.arquivoNome?.toLowerCase().endsWith('.pdf');
  
  // Verificar se tem conteúdo HTML real (não apenas tags vazias)
  const hasHtmlContent = documento.conteudoHtml && 
                         documento.conteudoHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleVoltar}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {/* Cabeçalho do Documento - Elegante para todos os tipos */}
        {isDocumentoInterno ? (
          <DocumentoInternoHeader
            documento={documento as DocumentoInterno}
            tipoNome={tipoDocumento?.nome}
            onExportarPDF={!isAnexoMode && documento.conteudoHtml ? handleExportarPDF : undefined}
            isAnexoMode={isAnexoMode}
          />
        ) : isDocumentoCliente ? (
          <DocumentoClienteHeader
            documento={documento as DocumentoCliente}
          />
        ) : isDocumentoExterno ? (
          <DocumentoExternoHeader
            documento={documento as DocumentoExterno}
          />
        ) : isDocumentoLicenca ? (
          <DocumentoLicencaHeader
            documento={documento as DocumentoLicenca}
            tipoNome={tipoDocumento?.nome}
          />
        ) : isDocumentoCertidao ? (
          <DocumentoCertidaoHeader
            documento={documento as DocumentoCertidao}
            tipoNome={tipoDocumento?.nome}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                {isAnexoMode ? (
                  <Paperclip className="w-10 h-10 text-purple-500 flex-shrink-0" />
                ) : (
                  <FileEdit className="w-10 h-10 text-blue-500 flex-shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {documento.codigo}
                    </span>
                    {tipoDocumento && (
                      <Badge variant="outline" className="text-xs">
                        {tipoDocumento.nome}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      v{documento.versao}
                    </Badge>
                  </div>
                  <h1 className="text-gray-900 tracking-tight mb-2" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
                    {documento.nome}
                  </h1>
                  {documento.descricao && (
                    <p className="text-gray-600">{documento.descricao}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {hasHtmlContent && (
                  <Button
                    onClick={handleExportarPDF}
                    variant="outline"
                    className="gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Metadados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">Responsável</p>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <User className="w-4 h-4 text-gray-400" />
                  {documento.responsavel}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Departamento</p>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {documento.departamento}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Data de Emissão</p>
                <div className="flex items-center gap-2 text-sm text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {documento.dataEmissao}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="pt-4 border-t border-gray-200 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Status:</span>
                {documento.status === 'vigente' && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Vigente
                  </Badge>
                )}
                {documento.status === 'em-revisao' && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    Em Revisão
                  </Badge>
                )}
                {documento.status === 'obsoleto' && (
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                    Obsoleto
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo do Documento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        
        {/* Banner Explicativo */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Conteúdo do Documento</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {documento.arquivoBase64 ? 'Visualização do anexo e conteúdo' : 'Visualização em modo leitura'}
          </p>
        </div>

        <div className="space-y-8">
          {/* Seção de Anexo / Visualizador PDF */}
          {documento.arquivoBase64 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{documento.arquivoNome}</p>
                    <p className="text-xs text-gray-500">{formatarTamanhoArquivo(documento.arquivoTamanho || 0)}</p>
                  </div>
                </div>
                <Button onClick={handleBaixarAnexo} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
              </div>
              
              {isPdf ? (
                <div className="w-full bg-gray-200">
                  <iframe 
                    src={`${documento.arquivoBase64}#toolbar=0&navpanes=0&scrollbar=0`} 
                    className="w-full h-[800px] border-0" 
                    title={documento.arquivoNome}
                  />
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="bg-blue-100 p-4 rounded-full mb-4">
                    <File className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Arquivo Anexado</h3>
                  <p className="text-gray-500 max-w-sm mb-6">
                    Este documento possui um anexo que não pode ser visualizado diretamente nesta tela.
                  </p>
                  <Button onClick={handleBaixarAnexo} className="gap-2">
                    <Download className="w-4 h-4" />
                    Baixar {documento.arquivoNome}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Seção de Conteúdo HTML (Tiptap) */}
          {hasHtmlContent && (
            <div>
              {documento.arquivoBase64 && (
                <h4 className="text-gray-900 mb-4 px-1" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Texto Complementar</h4>
              )}
              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none
                  prose-headings:text-gray-900 
                  prose-p:text-gray-700 prose-p:leading-relaxed
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-ul:text-gray-700 prose-ol:text-gray-700
                  prose-li:text-gray-700
                  prose-table:border-collapse
                  prose-th:bg-gray-100 prose-th:font-semibold prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2
                  prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2
                ">
                  <TiptapEditor
                    content={documento.conteudoHtml || ''}
                    onChange={() => {}}
                    editable={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Estado Vazio */}
          {!documento.arquivoBase64 && !hasHtmlContent && (
             <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
               <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <FileEdit className="w-8 h-8 text-gray-400" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum conteúdo disponível</h3>
               <p className="text-gray-500">Este documento não possui texto ou anexos.</p>
             </div>
          )}
        </div>
      </div>

      {/* Histórico - Apenas para Documentos Internos */}
      {isDocumentoInterno && documento.logsAuditoria && documento.historico && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h3 className="text-gray-900" style={{ fontSize: '1.125rem', fontWeight: 600 }}>Histórico do Documento</h3>
            <p className="text-sm text-gray-600 mt-1">
              Rastreamento completo do ciclo de vida e revisões
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('versoes')}
              className={`
                flex items-center gap-2 px-4 py-2 border-b-2 transition-colors font-medium text-sm
                ${activeTab === 'versoes' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              <GitBranch className="w-4 h-4" />
              Histórico de Versões
            </button>
            <button
              onClick={() => setActiveTab('aprovacao')}
              className={`
                flex items-center gap-2 px-4 py-2 border-b-2 transition-colors font-medium text-sm
                ${activeTab === 'aprovacao' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              <History className="w-4 h-4" />
              Histórico de Aprovação
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="mt-6">
            {activeTab === 'versoes' ? (
              <HistoricoVersoes historico={documento.historico || []} />
            ) : (
              <HistoricoAgrupado 
                historico={documento.historico || []} 
                logsAuditoria={documento.logsAuditoria || []}
                versaoAtual={documento.versao || '1.0'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
