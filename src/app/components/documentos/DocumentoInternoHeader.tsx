import { capitalizarTitulo, formatarDataPtBr } from '../../utils/formatters';
import { 
  User, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock,
  FileEdit,
  ArrowLeftCircle,
  XCircle,
  FileX,
  Shield,
  FileDown
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DocumentoInterno } from '../../pages/DocumentosInternos';

interface DocumentoInternoHeaderProps {
  documento: DocumentoInterno;
  tipoNome?: string;
  onExportarPDF?: () => void;
  isAnexoMode?: boolean;
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
    case 'Em Aprovação':
      return {
        icon: Clock,
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Em Aprovação'
      };
    case 'Rascunho':
      return {
        icon: FileEdit,
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Rascunho'
      };
    case 'Em Revisão':
      return {
        icon: ArrowLeftCircle,
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Em Revisão'
      };
    case 'Reprovado':
      return {
        icon: XCircle,
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Reprovado'
      };
    case 'Obsoleto':
      return {
        icon: FileX,
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Obsoleto'
      };
    default:
      return {
        icon: FileEdit,
        color: 'bg-gray-500',
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: status
      };
  }
};

export function DocumentoInternoHeader({ documento, tipoNome, onExportarPDF, isAnexoMode }: DocumentoInternoHeaderProps) {
  const statusInfo = getStatusInfo(documento.status);
  const StatusIcon = statusInfo.icon;
  const tituloFormatado = capitalizarTitulo(documento.nome);

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-8">
        {/* Código e Título */}
        <div className="mb-6">
          <div className="flex items-start gap-4 mb-2">
            {/* Ícone do código em destaque */}
            <div className={`flex-shrink-0 w-16 h-16 ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 rounded-xl flex items-center justify-center shadow-sm`}>
              <span className={`text-lg ${statusInfo.textColor}`} style={{ fontWeight: 700 }}>
                {documento.codigo.split('-')[0]}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Código grande e título */}
              <div className="flex items-baseline gap-3 mb-2">
                <h1 className="text-4xl text-gray-900 tracking-tight" style={{ fontWeight: 700 }}>
                  {documento.codigo}
                </h1>
                <span className="text-2xl text-gray-400">—</span>
                <h2 className="text-4xl text-gray-800" style={{ fontWeight: 700 }}>
                  {tituloFormatado}
                </h2>
              </div>
              
              {/* Descrição se existir */}
              {documento.descricao && (
                <p className="text-base text-gray-600 mt-2 max-w-4xl">
                  {documento.descricao}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Grid de metadados */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 pt-6 border-t border-gray-100">
          {/* Código */}
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Código</p>
            <p className="text-sm font-mono text-gray-900" style={{ fontWeight: 600 }}>{documento.codigo}</p>
          </div>

          {/* Versão */}
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Versão</p>
            <p className="text-sm text-blue-600" style={{ fontWeight: 600 }}>v{documento.versao}</p>
          </div>

          {/* Departamento */}
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Departamento</p>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{documento.departamento}</p>
            </div>
          </div>

          {/* Responsável */}
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Responsável</p>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>{documento.responsavel}</p>
            </div>
          </div>

          {/* Aprovador */}
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Aprovação</p>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 500 }}>
                {documento.aprovacao?.aprovadorResponsavel || documento.aprovacao?.aprovadorSolicitado || 'Pendente'}
              </p>
            </div>
          </div>

          {/* Data de Emissão */}
          <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Emissão</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                {formatarDataPtBr(documento.dataEmissao)}
              </p>
            </div>
          </div>

          {/* Data de Validade */}
          {documento.dataValidade && (
            <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1" style={{ fontWeight: 500 }}>Validade</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
                  {formatarDataPtBr(documento.dataValidade)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge - Destacado */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Status:</span>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border-2 shadow-sm`}>
              <StatusIcon className={`w-5 h-5 ${statusInfo.textColor}`} />
              <span className={`text-base ${statusInfo.textColor}`} style={{ fontWeight: 700 }}>
                {statusInfo.label}
              </span>
            </div>
            
            {/* Informações adicionais de aprovação */}
            {documento.status === 'Vigente' && documento.aprovacao?.dataAprovacao && (
              <div className="ml-4 text-sm text-gray-600">
                <span className="font-medium">Aprovado em:</span>{' '}
                {formatarDataPtBr(documento.aprovacao.dataAprovacao)}
              </div>
            )}
            
            {documento.status === 'Em Aprovação' && documento.aprovacao?.dataEnvioAprovacao && (
              <div className="ml-4 text-sm text-gray-600">
                <span className="font-medium">Enviado em:</span>{' '}
                {formatarDataPtBr(documento.aprovacao.dataEnvioAprovacao)}
              </div>
            )}
          </div>
        </div>

        {/* Tipo do documento - discreto no canto */}
        {tipoNome && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* Botões de ação */}
            {onExportarPDF && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white/80 backdrop-blur-sm gap-1.5"
                onClick={onExportarPDF}
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </Button>
            )}
            <Badge variant="outline" className="text-xs bg-white/80 backdrop-blur-sm">
              {tipoNome}
            </Badge>
          </div>
        )}
      </div>

      {/* Linha de gradiente decorativa no bottom */}
      <div className={`h-1 w-full ${statusInfo.color}`}></div>
    </div>
  );
}
