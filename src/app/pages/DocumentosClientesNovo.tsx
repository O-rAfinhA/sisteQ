import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  UserSquare,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Filter,
  FileText,
  AlertCircle,
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

// v2.3.3 - Fixed tipo de documento integration and storage keys

const STORAGE_KEY = 'sisteq-docs-clientes';

export interface DocumentoCliente {
  id: string;
  codigo: string;
  tipoId: string;
  cliente: string;
  codigoCliente: string;
  revisaoCliente: string;
  nomeDocumento: string;
  dataEmissao?: string;
  dataValidade?: string;
  processoRelacionado: string;
  produtoRelacionado: string;
  responsavelInterno: string;
  dataRecebimento: string;
  dataAtualizacao: string;
  status: 'Válido' | 'Desatualizado' | 'Em Análise' | 'Aguardando Validação';
  observacoes: string;
  validadoPor?: string;
  dataValidacao?: string;
  arquivoNome?: string;
  arquivoTipo?: string;
  arquivoBase64?: string;
  arquivoTamanho?: number;
  dataCriacao: string;
}

export default function DocumentosClientesNovo() {
  const navigate = useNavigate();

  // Mapa de status → configuração de Badge (local by design)
  const DOC_STATUS_MAP: Record<string, DocStatusConfig> = {
    'Válido': { label: 'Válido', className: 'bg-green-100 text-green-800 border-green-200' },
    'Desatualizado': { label: 'Desatualizado', className: 'bg-orange-100 text-orange-800 border-orange-200' },
    'Em Análise': { label: 'Em Análise', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    'Aguardando Validação': { label: 'Aguardando Validação', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  };

  const [documentos, setDocumentos] = useLocalStorage<DocumentoCliente[]>(STORAGE_KEY, []);
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroCliente, setFiltroCliente] = useState<string>('todos');

  useEffect(() => {
    setTiposDocumentos(getFromStorage<any[]>('sisteq-tipos-docs-clientes', []));
  }, []);

  const handleExcluir = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      setDocumentos(prev => prev.filter(d => d.id !== id));
      toast.success('Documento excluído com sucesso!');
    }
  };

  const clientes = Array.from(new Set(documentos.map(d => d.cliente))).sort();

  const documentosFiltrados = documentos.filter(doc => {
    const matchBusca = doc.nomeDocumento.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.codigo.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.cliente.toLowerCase().includes(busca.toLowerCase()) ||
                       doc.codigoCliente.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || doc.tipoId === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || doc.status === filtroStatus;
    const matchCliente = filtroCliente === 'todos' || doc.cliente === filtroCliente;
    
    return matchBusca && matchTipo && matchStatus && matchCliente;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Documentos de Clientes
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Desenhos, especificações, contratos e procedimentos recebidos de clientes
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
            onClick={() => navigate('/documentos/clientes/novo')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Documento
          </Button>
        </div>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total"
          value={documentos.length}
          icon={FileText}
          variant="default"
        />
        <MetricCard
          label="Válidos"
          value={documentos.filter(d => d.status === 'Válido').length}
          icon={UserSquare}
          variant="success"
        />
        <MetricCard
          label="Desatualizados"
          value={documentos.filter(d => d.status === 'Desatualizado').length}
          icon={AlertCircle}
          variant="warning"
        />
        <MetricCard
          label="Em Análise"
          value={documentos.filter(d => d.status === 'Em Análise').length}
          icon={Search}
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
              <Input placeholder="Nome, código, cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 500 }}>Cliente</label>
            <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors">
              <option value="todos">Todos os clientes</option>
              {clientes.map(cliente => (<option key={cliente} value={cliente}>{cliente}</option>))}
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
              <option value="Válido">Válido</option>
              <option value="Desatualizado">Desatualizado</option>
              <option value="Em Análise">Em Análise</option>
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
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Cliente</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 w-1/4" style={{ fontWeight: 500 }}>Nome do Documento</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Código Cliente</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Recebimento</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <UserSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Nenhum documento encontrado</p>
                      <p className="text-sm mt-1">Crie seu primeiro documento de cliente clicando no botão acima</p>
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{doc.cliente}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{doc.nomeDocumento}</p>
                          {doc.produtoRelacionado && (
                            <p className="text-sm text-gray-500 mt-1">Produto: {doc.produtoRelacionado}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{doc.codigoCliente}</p>
                          {doc.revisaoCliente && (
                            <p className="text-gray-500">Rev. {doc.revisaoCliente}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getTipoBadge(doc.tipoId, tiposDocumentos)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getDocStatusBadge(doc.status, DOC_STATUS_MAP)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {doc.dataRecebimento}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/documentos/clientes/${doc.id}/visualizar`)}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/documentos/clientes/${doc.id}/editar`)}
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
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>{documentos.filter(d => d.status === 'Válido').length} Válidos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
            <span>{documentos.filter(d => d.status === 'Desatualizado').length} Desatualizados</span>
          </div>
        </div>
      </div>
    </div>
  );
}