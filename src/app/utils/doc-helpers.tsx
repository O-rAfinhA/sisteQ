/**
 * Helpers compartilhados do módulo de Documentos
 * Elimina duplicação entre HistoricoTimeline, HistoricoAgrupado e LogAuditoriaModal
 */

import { CheckCircle, XCircle, Clock, Send, ArrowLeftCircle, FileEdit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LogAuditoria } from '../pages/DocumentosInternos';
import { Badge } from '../components/ui/badge';

// ============ TIPO BADGE DE DOCUMENTOS ============

/**
 * Interface mínima para tipos de documento usados no badge
 */
interface TipoDocBase {
  id: string;
  nome: string;
  cor?: string;
}

/**
 * Retorna um Badge com nome e cor do tipo de documento.
 * Usado em DocumentosClientesNovo, DocumentosExternosNovo, DocumentosLicencas e DocumentosCertidoes
 */
export function getTipoBadge(tipoId: string, tiposDocumentos: TipoDocBase[]) {
  const tipo = tiposDocumentos.find(t => t.id === tipoId);
  if (tipo) {
    return <Badge className={tipo.cor}>{tipo.nome}</Badge>;
  }
  return <Badge variant="outline">Tipo Desconhecido</Badge>;
}

// ============ STATUS BADGE DE DOCUMENTOS ============

/**
 * Configuração de um status para renderização como Badge
 * Cada módulo de documento define seu próprio mapa local (by design)
 */
export interface DocStatusConfig {
  label: string;
  className: string;
  icon?: LucideIcon;
}

/**
 * Renderiza um Badge de status a partir de um mapa de configurações.
 * Centraliza a lógica de renderização, mantendo as configurações locais em cada módulo.
 * Usado em DocumentosInternos, DocumentosClientesNovo, DocumentosExternosNovo,
 * DocumentosLicencas, DocumentosCertidoes e HistoricoVersoes
 */
export function getDocStatusBadge(
  status: string,
  statusMap: Record<string, DocStatusConfig>
): JSX.Element {
  const config = statusMap[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  const Icon = config.icon;
  return (
    <Badge className={`${config.className}${Icon ? ' gap-1' : ''}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

// ============ ÍCONES DE AÇÃO DE AUDITORIA ============

/**
 * Retorna o ícone JSX correspondente à ação de auditoria
 */
export function getIconeAcao(acao: LogAuditoria['acao'], size = 'w-5 h-5') {
  switch (acao) {
    case 'Criação':
    case 'Edição':
      return <FileEdit className={size} />;
    case 'Envio para Aprovação':
      return <Send className={size} />;
    case 'Aprovação':
      return <CheckCircle className={size} />;
    case 'Devolução para Revisão':
      return <ArrowLeftCircle className={size} />;
    case 'Reprovação':
      return <XCircle className={size} />;
    case 'Mudança de Status':
    default:
      return <Clock className={size} />;
  }
}

// ============ CORES DE AÇÃO DE AUDITORIA ============

/**
 * Config de cores para ações de auditoria de documentos
 */
export const ACAO_AUDITORIA_CORES: Record<string, string> = {
  'Aprovação': 'bg-green-100 text-green-700 border-green-300',
  'Reprovação': 'bg-red-100 text-red-700 border-red-300',
  'Devolução para Revisão': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Envio para Aprovação': 'bg-blue-100 text-blue-700 border-blue-300',
  'Criação': 'bg-purple-100 text-purple-700 border-purple-300',
  'Edição': 'bg-gray-100 text-gray-700 border-gray-300',
  'Mudança de Status': 'bg-orange-100 text-orange-800 border-orange-200',
};

/**
 * Retorna classes Tailwind para a cor de uma ação de auditoria
 */
export function getCorAcao(acao: string): string {
  return ACAO_AUDITORIA_CORES[acao] || 'bg-gray-100 text-gray-700 border-gray-300';
}