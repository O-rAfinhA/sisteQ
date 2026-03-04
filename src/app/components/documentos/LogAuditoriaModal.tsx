import { X, Clock, User, FileText, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { LogAuditoria } from '../../pages/DocumentosInternos';
import { ACAO_AUDITORIA_CORES } from '../../utils/doc-helpers';
import { formatarDataHora } from '../../utils/formatters';

interface LogAuditoriaModalProps {
  logs: LogAuditoria[];
  onClose: () => void;
}

export function LogAuditoriaModal({ logs, onClose }: LogAuditoriaModalProps) {
  const getAcaoBadge = (acao: LogAuditoria['acao']) => {
    const cores = ACAO_AUDITORIA_CORES;
    return (
      <Badge className={cores[acao] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {acao}
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Log de Auditoria do Documento
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Histórico completo de todas as ações realizadas neste documento
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum log registrado</p>
              <p className="text-sm mt-1">As ações do documento aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => {
                const { data, hora } = formatarDataHora(log.dataHora);
                
                return (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Cabeçalho do Log */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getAcaoBadge(log.acao)}
                            {log.versao && (
                              <span className="text-xs text-gray-500">
                                v{log.versao}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {data} às {hora}
                          </p>
                        </div>
                      </div>
                      
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Responsável */}
                    <div className="flex items-center gap-2 mb-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Responsável:</span>
                      <span className="font-medium text-gray-900">{log.responsavel}</span>
                    </div>

                    {/* Mudança de Status */}
                    {log.statusAnterior && (
                      <div className="flex items-center gap-2 mb-2 text-sm bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="outline" className="text-xs">
                          {log.statusAnterior}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <Badge variant="outline" className="text-xs">
                          {log.statusNovo}
                        </Badge>
                      </div>
                    )}

                    {/* Comentário */}
                    {log.comentario && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm">
                        <p className="text-gray-700 italic">"{log.comentario}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Total de registros: <span className="font-medium text-gray-900">{logs.length}</span>
            </span>
            <Button onClick={onClose} variant="outline" size="sm">
              Fechar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}