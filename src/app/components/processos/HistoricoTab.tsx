import { Processo } from '../../types/strategic';
import { History, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { formatarDataPtBr } from '../../utils/formatters';

interface HistoricoTabProps {
  processo: Processo;
}

export function HistoricoTab({ processo }: HistoricoTabProps) {
  const versoes = processo.versoes || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Histórico de Versões
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Todas as versões publicadas deste processo
        </p>
      </div>

      {versoes.length > 0 ? (
        <div className="space-y-4">
          {versoes.map((versao, index) => (
            <div
              key={versao.id}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <History className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Versão {versao.versao}
                      </h4>
                      {index === 0 && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        Publicado em {formatarDataPtBr(versao.dataPublicacao)}
                      </span>
                      <span>•</span>
                      <span>por {versao.publicadoPor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {versao.mudancas && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Mudanças nesta versão:
                  </h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {versao.mudancas}
                  </p>
                </div>
              )}

              {versao.atividades && versao.atividades.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Atividades ({versao.atividades.length}):
                  </h5>
                  <div className="space-y-2">
                    {versao.atividades.map((atividade, idx) => (
                      <div
                        key={atividade.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="text-gray-500 font-mono">#{idx + 1}</span>
                        <span className="text-gray-700">{atividade.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
          <div className="text-center">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma versão publicada
            </h4>
            <p className="text-gray-600">
              O histórico de versões será exibido após a primeira publicação.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}