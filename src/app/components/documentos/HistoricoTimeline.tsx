// Componente de Timeline para Histórico de Aprovação
import { Clock } from 'lucide-react';
import { LogAuditoria } from '../../pages/DocumentosInternos';
import { getIconeAcao, getCorAcao } from '../../utils/doc-helpers';
import { formatarDataHora } from '../../utils/formatters';

interface HistoricoTimelineProps {
  logs: LogAuditoria[];
}

export function HistoricoTimeline({ logs }: HistoricoTimelineProps) {
  // Ordenar logs do mais recente para o mais antigo
  const logsSorted = [...logs].sort((a, b) => 
    new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  );

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum registro de auditoria disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logsSorted.map((log, index) => {
        const { data: dataFormatada, hora: horaFormatada } = formatarDataHora(log.dataHora);
        const isLast = index === logsSorted.length - 1;

        return (
          <div key={log.id} className="relative flex gap-4">
            {/* Linha conectora */}
            {!isLast && (
              <div className="absolute left-[19px] top-12 w-0.5 h-[calc(100%+1rem)] bg-gray-200" />
            )}

            {/* Ícone */}
            <div className={`
              relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 
              flex items-center justify-center
              ${getCorAcao(log.acao)}
            `}>
              {getIconeAcao(log.acao)}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{log.acao}</h4>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Por: <span className="font-medium text-gray-900">{log.responsavel}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{dataFormatada}</p>
                    <p className="text-xs text-gray-500">{horaFormatada}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  {log.statusAnterior && (
                    <>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                        {log.statusAnterior}
                      </span>
                      <span>→</span>
                    </>
                  )}
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {log.statusNovo}
                  </span>
                  {log.versao && (
                    <span className="ml-auto text-xs text-gray-500">
                      Versão: {log.versao}
                    </span>
                  )}
                </div>

                {/* Comentário */}
                {log.comentario && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-700 italic">
                      "{log.comentario}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}