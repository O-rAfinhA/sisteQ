import { 
  User, 
  Building2,
  Calendar, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  FileText,
  Hash
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { DocumentoExterno } from '../../pages/DocumentosExternosNovo';
import { capitalizarTitulo, formatarDataPtBr } from '../../utils/formatters';

interface DocumentoExternoHeaderProps {
  documento: DocumentoExterno;
}

// Função para obter informações do status
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'Vigente':
      return {
        icon: CheckCircle2,
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Vigente'
      };
    case 'Em Revisão':
      return {
        icon: Clock,
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Em Revisão'
      };
    case 'Obsoleta':
      return {
        icon: XCircle,
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Obsoleta'
      };
    case 'Aguardando Validação':
      return {
        icon: AlertTriangle,
        color: 'bg-purple-500',
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        label: 'Aguardando Validação'
      };
    case 'Desatualizada':
      return {
        icon: AlertTriangle,
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Desatualizada'
      };
    default:
      return {
        icon: FileText,
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: status
      };
  }
};

export function DocumentoExternoHeader({ documento }: DocumentoExternoHeaderProps) {
  const statusInfo = getStatusInfo(documento.status);
  const StatusIcon = statusInfo.icon;
  const tituloFormatado = capitalizarTitulo(documento.nomeDocumento);

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-8">
        {/* Código e Título */}
        <div className="mb-6">
          <div className="flex items-start gap-4 mb-2">
            {/* Ícone do código em destaque */}
            <div className={`flex-shrink-0 w-16 h-16 bg-teal-50 border-teal-200 border-2 rounded-xl flex items-center justify-center shadow-sm`}>
              <ExternalLink className="w-8 h-8 text-teal-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Código e título */}
              <div className="flex items-baseline gap-3 mb-2">
                <h1 className="text-4xl text-gray-900 tracking-tight" style={{ fontWeight: 700 }}>
                  {documento.codigo}
                </h1>
                <span className="text-2xl text-gray-400">—</span>
                <h2 className="text-4xl text-gray-800" style={{ fontWeight: 700 }}>
                  {tituloFormatado}
                </h2>
              </div>
              
              {/* Fornecedor/Origem */}
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-5 h-5 text-teal-500" />
                <span className="text-lg font-semibold text-teal-700">{documento.orgaoEmissor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de metadados */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-6 border-t border-gray-100">
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Código</p>
            <p className="text-sm font-mono text-gray-900" style={{ fontWeight: 600 }}>{documento.codigo}</p>
          </div>
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Número Oficial</p>
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{documento.numeroOficial}</p>
            </div>
          </div>
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Revisão</p>
            <p className="text-sm text-teal-600" style={{ fontWeight: 600 }}>{documento.revisaoConhecida || 'N/A'}</p>
          </div>
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Tipo</p>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{documento.tipoId}</p>
            </div>
          </div>
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Responsável</p>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{documento.responsavelMonitoramento}</p>
            </div>
          </div>
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Publicação</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                {formatarDataPtBr(documento.dataPublicacao)}
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Status:</span>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 shadow-sm`}>
              <StatusIcon className={`w-5 h-5 ${statusInfo.textColor}`} />
              <span className={`text-base ${statusInfo.textColor}`} style={{ fontWeight: 700 }}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Botões de ação no canto superior direito */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-white/80 backdrop-blur-sm">
            Documento Externo
          </Badge>
        </div>
      </div>

      {/* Linha de gradiente decorativa no bottom */}
      <div className={`h-1 w-full ${statusInfo.color}`}></div>
    </div>
  );
}
