import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileCheck,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Settings
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MetricCard } from '../components/ui/metric-card';
import { toast } from 'sonner';
import { TipoDocumento } from './config/TiposDocumentos';
import { getTipoBadge, getDocStatusBadge, type DocStatusConfig } from '../utils/doc-helpers';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getFromStorage } from '../utils/helpers';

const STORAGE_KEY = 'sisteq-docs-licencas';

export interface DocumentoLicenca {
  id: string;
  codigo: string; // Gerado automaticamente baseado no prefixo do tipo
  tipoId: string; // ID do tipo de documento configurado
  nomeDocumento: string;
  numeroLicenca: string; // Número oficial da licença/alvará
  orgaoEmissor: string; // Prefeitura, ANVISA, Corpo de Bombeiros, etc.
  dataEmissao: string;
  dataVencimento: string;
  processoRelacionado: string; // ID do processo
  responsavel: string; // Quem acompanha o vencimento
  status: 'Vigente' | 'Vence em 30 dias' | 'Vencida' | 'Em Renovação' | 'Aguardando Validação';
  observacoes: string;
  validadoPor?: string;
  dataValidacao?: string;
  arquivoNome?: string;
  arquivoTipo?: string;
  arquivoBase64?: string;
  arquivoTamanho?: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

export default function DocumentosLicencas() {
  const navigate = useNavigate();

  // Mapa de status → configuração de Badge (local by design)
  const DOC_STATUS_MAP: Record<string, DocStatusConfig> = {
    'Vigente': { label: 'Vigente', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    'Vence em 30 dias': { label: 'Vence em 30 dias', className: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
    'Vencida': { label: 'Vencida', className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    'Em Renovação': { label: 'Em Renovação', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
    'Aguardando Validação': { label: 'Aguardando Validação', className: 'bg-purple-100 text-purple-800 border-purple-200', icon: Clock },
  };

  const [documentos, setDocumentos] = useLocalStorage<DocumentoLicenca[]>(STORAGE_KEY, []);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroOrgao, setFiltroOrgao] = useState<string>('todos');

  useEffect(() => {
    setTiposDocumentos(getFromStorage<any[]>('sisteq-tipos-licencas', []));
  }, []);

  const handleExcluir = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta licença?')) {
      setDocumentos(prev => prev.filter(d => d.id !== id));
      toast.success('Licença excluída com sucesso!');
    }
  };

  const orgaos = Array.from(new Set(documentos.map(d => d.orgaoEmissor))).sort();

  const documentosFiltrados = documentos.filter(doc => {
    const matchBusca = doc.nomeDocumento.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.numeroLicenca.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.orgaoEmissor.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || doc.tipoId === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || doc.status === filtroStatus;
    const matchOrgao = filtroOrgao === 'todos' || doc.orgaoEmissor === filtroOrgao;
    
    return matchBusca && matchTipo && matchStatus && matchOrgao;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Licenças e Obrigações Legais
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Alvarás, licenças, certificados e autorizações legais
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-8">
          <Button
            variant="outline"
            onClick={() => navigate('/documentos/tipos')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurar Tipos
          </Button>
          <Button
            onClick={() => navigate('/documentos/licencas/novo')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Licença
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Vigentes"
          value={documentos.filter(d => d.status === 'Vigente').length}
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          label="Vence em 30 dias"
          value={documentos.filter(d => d.status === 'Vence em 30 dias').length}
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCard
          label="Vencidas"
          value={documentos.filter(d => d.status === 'Vencida').length}
          icon={XCircle}
          variant="danger"
        />
        <MetricCard
          label="Em Renovação"
          value={documentos.filter(d => d.status === 'Em Renovação').length}
          icon={Clock}
          variant="info"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-gray-900 text-sm" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Nome, código, número..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Órgão Emissor</label>
            <select value={filtroOrgao} onChange={(e) => setFiltroOrgao(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors">
              <option value="todos">Todos os órgãos</option>
              {orgaos.map(orgao => (<option key={orgao} value={orgao}>{orgao}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Tipo</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors">
              <option value="todos">Todos os tipos</option>
              {tiposDocumentos.map(tipo => (<option key={tipo.id} value={tipo.id}>{tipo.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors">
              <option value="todos">Todos</option>
              <option value="Vigente">Vigente</option>
              <option value="Vence em 30 dias">Vence em 30 dias</option>
              <option value="Vencida">Vencida</option>
              <option value="Em Renovação">Em Renovação</option>
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
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Código</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 w-1/4" style={{ fontWeight: 500 }}>Nome do Documento</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Número Licença</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Órgão Emissor</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Vencimento</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <FileCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Nenhuma licença encontrada</p>
                      <p className="text-sm mt-1">Cadastre alvarás e licenças clicando no botão acima</p>
                    </td>
                  </tr>
                ) : (
                  documentosFiltrados.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-900">
                          {doc.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{doc.nomeDocumento}</p>
                          {doc.responsavel && (
                            <p className="text-sm text-gray-500 mt-1">Resp.: {doc.responsavel}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-sm text-green-600">
                          {doc.numeroLicenca}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {doc.orgaoEmissor}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getTipoBadge(doc.tipoId, tiposDocumentos)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {doc.dataVencimento}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getDocStatusBadge(doc.status, DOC_STATUS_MAP)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/documentos/licencas/${doc.id}/visualizar`)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/documentos/licencas/${doc.id}/editar`)}
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
          <span className="font-medium text-gray-900">{documentos.length}</span> licenças
        </p>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>{documentos.filter(d => d.status === 'Vigente').length} Vigentes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>{documentos.filter(d => d.status === 'Vence em 30 dias').length} Vencendo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>{documentos.filter(d => d.status === 'Vencida').length} Vencidas</span>
          </div>
        </div>
      </div>
    </div>
  );
}