import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Filter,
  FileEdit,
  Paperclip,
  CheckCircle2,
  Clock,
  XCircle,
  FileX,
  User,
  Building2,
  ArrowLeftCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { MetricCard } from '../components/ui/metric-card';
import { TipoDocumento } from './config/TiposDocumentos';
import { getDocStatusBadge, type DocStatusConfig } from '../utils/doc-helpers';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getFromStorage } from '../utils/helpers';

// v2.3.3 - Fixed tipo de documento integration and storage keys

const STORAGE_KEY = 'sisteq-docs-internos';

export interface HistoricoVersao {
  versao: string;
  data: string;
  responsavel: string;
  alteracoes: string;
  status: 'Rascunho' | 'Em Aprovação' | 'Vigente' | 'Em Revisão' | 'Reprovado' | 'Obsoleto';
}

export interface AprovacaoInfo {
  aprovadorSolicitado?: string;
  dataEnvioAprovacao?: string;
  aprovadorResponsavel?: string;
  dataAprovacao?: string;
  comentarioAprovacao?: string;
}

export interface LogAuditoria {
  id: string;
  dataHora: string;
  acao: 'Criação' | 'Edição' | 'Envio para Aprovação' | 'Aprovação' | 'Devolução para Revisão' | 'Reprovação' | 'Mudança de Status';
  responsavel: string;
  statusAnterior?: string;
  statusNovo: string;
  comentario?: string;
  versao?: string;
}

export interface DocumentoInterno {
  id: string;
  codigo: string;
  tipoId: string;
  nome: string;
  descricao: string;
  departamento: string;
  responsavel: string;
  processoRelacionado: string; // ID do processo
  versao: string;
  status: 'Rascunho' | 'Em Aprovação' | 'Vigente' | 'Em Revisão' | 'Reprovado' | 'Obsoleto';
  dataEmissao: string;
  dataValidade?: string;
  conteudoHtml?: string;
  arquivoNome?: string;
  arquivoTipo?: string;
  arquivoBase64?: string;
  arquivoTamanho?: number;
  historico: HistoricoVersao[];
  aprovacao?: AprovacaoInfo;
  logsAuditoria?: LogAuditoria[]; // Log oculto de todas as ações
  dataCriacao: string;
  dataAtualizacao: string;
}

export default function DocumentosInternos() {
  const navigate = useNavigate();

  // Mapa de status → configuração de Badge (local by design)
  const DOC_STATUS_MAP: Record<string, DocStatusConfig> = {
    'Vigente': { label: 'Vigente', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    'Em Aprovação': { label: 'Em Aprovação', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
    'Rascunho': { label: 'Rascunho', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileEdit },
    'Em Revisão': { label: 'Em Revisão', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ArrowLeftCircle },
    'Reprovado': { label: 'Reprovado', className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    'Obsoleto': { label: 'Obsoleto', className: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileX },
  };

  const [documentos, setDocumentos] = useLocalStorage<DocumentoInterno[]>(STORAGE_KEY, []);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('todos');

  useEffect(() => {
    const tipos = getFromStorage<any>('sisteq-tipos-docs-internos', []);
    setTiposDocumentos(Array.isArray(tipos) ? tipos : []);
  }, []);

  const handleExcluir = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      setDocumentos(prev => prev.filter(d => d.id !== id));
      toast.success('Documento excluído com sucesso!');
    }
  };

  const getNomeTipo = (tipoId: string): string => {
    const tipo = tiposDocumentos.find(t => t.id === tipoId);
    return tipo?.nome || 'N/A';
  };

  const getModoTipo = (tipoId: string): 'editor' | 'anexo' => {
    const tipo = tiposDocumentos.find(t => t.id === tipoId);
    return tipo?.modo || 'editor';
  };

  const departamentos = Array.from(new Set(documentos.map(d => d.departamento))).sort();

  const documentosFiltrados = documentos.filter(doc => {
    const matchBusca = doc.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.descricao.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || doc.tipoId === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || doc.status === filtroStatus;
    const matchDepartamento = filtroDepartamento === 'todos' || doc.departamento === filtroDepartamento;
    
    return matchBusca && matchTipo && matchStatus && matchDepartamento;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Documentos Internos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Procedimentos, instruções, manuais e fluxos de processos
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate('/documentos/internos/novo')}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Plus className="w-4 h-4" />
          Novo Documento
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total"
          value={documentos.length}
          icon={FileText}
          variant="default"
        />
        <MetricCard
          label="Vigentes"
          value={documentos.filter(d => d.status === 'Vigente').length}
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          label="Em Aprovação"
          value={documentos.filter(d => d.status === 'Em Aprovação').length}
          icon={Clock}
          variant="warning"
        />
        <MetricCard
          label="Obsoletos"
          value={documentos.filter(d => d.status === 'Obsoleto').length}
          icon={XCircle}
          variant="default"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-gray-900 text-sm" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Campo de Busca */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Nome, código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro Tipo */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
              Tipo de Documento
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            >
              <option value="todos">Todos os tipos</option>
              {tiposDocumentos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            >
              <option value="todos">Todos</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Em Aprovação">Em Aprovação</option>
              <option value="Vigente">Vigente</option>
              <option value="Obsoleto">Obsoleto</option>
            </select>
          </div>

          {/* Filtro Departamento */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>
              Departamento
            </label>
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            >
              <option value="todos">Todos</option>
              {departamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Versão
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Responsável
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Nenhum documento encontrado</p>
                      <p className="text-sm mt-1">Crie seu primeiro documento interno clicando no botão acima</p>
                    </td>
                  </tr>
                ) : (
                  documentosFiltrados.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {getModoTipo(doc.tipoId) === 'editor' ? (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileEdit className="w-5 h-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Paperclip className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-gray-500 mb-1">
                              {doc.codigo}
                            </p>
                            <p className="text-gray-900 mb-1" style={{ fontWeight: 600 }}>
                              {doc.nome}
                            </p>
                            {doc.descricao && (
                              <p className="text-sm text-gray-600 line-clamp-1">
                                {doc.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          v{doc.versao}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {doc.responsavel}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {doc.departamento}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getDocStatusBadge(doc.status, DOC_STATUS_MAP)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/documentos/internos/${doc.id}/visualizar`)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/documentos/internos/${doc.id}/editar`)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluir(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Rodapé com estatísticas */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <p>
          Exibindo <span className="font-medium text-gray-900">{documentosFiltrados.length}</span> de{' '}
          <span className="font-medium text-gray-900">{documentos.length}</span> documentos
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>{documentos.filter(d => d.status === 'Vigente').length} Vigentes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>{documentos.filter(d => d.status === 'Em Aprovação').length} Em Aprovação</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>{documentos.filter(d => d.status === 'Rascunho').length} Rascunhos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
