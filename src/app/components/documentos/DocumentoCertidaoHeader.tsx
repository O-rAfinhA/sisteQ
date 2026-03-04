import { 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock,
  XCircle,
  Edit2,
  Download,
  AlertTriangle,
  FileCheck2,
  Building2,
  Hash
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DocumentoCertidao } from '../../pages/DocumentosCertidoes';
import { capitalizarTitulo } from '../../utils/formatters';

interface DocumentoCertidaoHeaderProps {
  documento: DocumentoCertidao;
  tipoNome?: string;
  onEditar?: () => void;
  onBaixarAnexo?: () => void;
}

// Função para obter informações do status
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'Regular':
      return {
        icon: CheckCircle2,
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Regular'
      };
    case 'Vence em 15 dias':
      return {
        icon: AlertTriangle,
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Vence em 15 dias'
      };
    case 'Irregular':
      return {
        icon: XCircle,
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Irregular'
      };
    case 'Em Regularização':
      return {
        icon: Clock,
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Em Regularização'
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
    default:
      return {
        icon: FileCheck2,
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: status
      };
  }
};

export function DocumentoCertidaoHeader({ documento, tipoNome, onEditar, onBaixarAnexo }: DocumentoCertidaoHeaderProps) {
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
            <div className={`flex-shrink-0 w-16 h-16 bg-blue-50 border-blue-200 border-2 rounded-xl flex items-center justify-center shadow-sm`}>
              <FileCheck2 className="w-8 h-8 text-blue-600" />
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
              
              {/* Órgão Emissor */}
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span className="text-lg font-semibold text-blue-700">{documento.orgaoEmissor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de metadados */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-6 border-t border-gray-100">
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Protocolo</p>
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{documento.numeroProtocolo}</p>
            </div>
          </div>

          {tipoNome && (
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Tipo</p>
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{tipoNome}</p>
            </div>
          )}

          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Responsável</p>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{documento.responsavel}</p>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Emissão</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                {documento.dataEmissao}
              </p>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Vencimento</p>
            <div className="flex items-center gap-1.5">
              <Calendar className={`w-3.5 h-3.5 ${statusInfo.textColor} flex-shrink-0`} />
              <p className={`text-sm ${statusInfo.textColor}`} style={{ fontWeight: 600 }}>
                {documento.dataVencimento}
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
          {onEditar && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white/80 backdrop-blur-sm gap-1.5"
              onClick={onEditar}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </Button>
          )}
          {onBaixarAnexo && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white/80 backdrop-blur-sm gap-1.5"
              onClick={onBaixarAnexo}
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </Button>
          )}
          <Badge variant="outline" className="text-xs bg-white/80 backdrop-blur-sm">
            Certidão
          </Badge>
        </div>
      </div>

      {/* Linha de gradiente decorativa no bottom */}
      <div className={`h-1 w-full ${statusInfo.color}`}></div>
    </div>
  );
}