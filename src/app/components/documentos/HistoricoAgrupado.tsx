// Componente de Histórico Agrupado por Versão v2.1
import { GitBranch } from 'lucide-react';
import { LogAuditoria, HistoricoVersao } from '../../pages/DocumentosInternos';
import { Badge } from '../ui/badge';
import { getIconeAcao, getCorAcao } from '../../utils/doc-helpers';
import { formatarDataHoraCompleta } from '../../utils/formatters';

interface HistoricoAgrupadoProps {
  historico: HistoricoVersao[];
  logsAuditoria: LogAuditoria[];
  versaoAtual: string;
}

export function HistoricoAgrupado({ historico, logsAuditoria, versaoAtual }: HistoricoAgrupadoProps) {
  // Agrupar logs por versão
  const agruparLogsPorVersao = () => {
    // Criar lista de todas as versões (atual + histórico)
    const todasVersoes = [
      { versao: versaoAtual, data: new Date().toISOString(), responsavel: '', alteracoes: '', status: 'Vigente' },
      ...historico
    ];

    // Agrupar logs por versão
    return todasVersoes.map((versaoInfo, index) => {
      const logsVersao = logsAuditoria.filter(log => log.versao === versaoInfo.versao);
      
      return {
        ...versaoInfo,
        isAtual: index === 0,
        logs: logsVersao.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
      };
    });
  };

  const versoesAgrupadas = agruparLogsPorVersao();

  if (versoesAgrupadas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum histórico disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {versoesAgrupadas.map((versaoData, vIndex) => {
        const { versao, logs, isAtual, alteracoes, status } = versaoData;

        return (
          <div 
            key={versao} 
            className={`
              border rounded-lg overflow-hidden
              ${isAtual ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-white'}
            `}
          >
            {/* Header da Versão */}
            <div className={`
              p-4 border-b flex items-center justify-between
              ${isAtual ? 'bg-blue-100/50 border-blue-200' : 'bg-gray-50 border-gray-200'}
            `}>
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isAtual ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'}
                `}>
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg" style={{ fontWeight: 700 }}>Versão {versao}</h3>
                    {isAtual && <Badge className="bg-blue-500 text-white text-xs">Atual</Badge>}
                    {!isAtual && (
                      <Badge variant="outline" className="text-xs">
                        {status}
                      </Badge>
                    )}
                  </div>
                  {alteracoes && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Alterações:</span> {alteracoes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline de Eventos da Versão */}
            <div className="p-4">
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log, logIndex) => {
                    const isLast = logIndex === logs.length - 1;
                    
                    return (
                      <div key={log.id} className="relative flex gap-3">
                        {/* Linha conectora */}
                        {!isLast && (
                          <div className="absolute left-[15px] top-8 w-0.5 h-[calc(100%+0.75rem)] bg-gray-200" />
                        )}

                        {/* Ícone */}
                        <div className={`
                          relative z-10 flex-shrink-0 w-8 h-8 rounded-full border-2 
                          flex items-center justify-center
                          ${getCorAcao(log.acao)}
                        `}>
                          {getIconeAcao(log.acao)}
                        </div>

                        {/* Conteúdo Consolidado */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {log.acao}
                                </span>
                                {log.statusAnterior && (
                                  <span className="text-xs text-gray-500">
                                    {log.statusAnterior} → {log.statusNovo}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                <span className="font-medium">{log.responsavel}</span>
                                {' • '}
                                <span>{formatarDataHoraCompleta(log.dataHora)}</span>
                              </div>
                              {log.comentario && (
                                <div className="mt-2 text-sm text-gray-700 italic bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                                  "{log.comentario}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Sem eventos registrados para esta versão
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Legenda */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Sobre o Histórico</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Cada versão mostra o ciclo completo desde criação até aprovação</li>
          <li>• Os comentários registrados em devoluções e aprovações são preservados</li>
          <li>• Versões obsoletas são mantidas apenas para registro histórico e auditoria</li>
        </ul>
      </div>
    </div>
  );
}