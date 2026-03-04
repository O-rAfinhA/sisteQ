import { Processo } from '../../types/strategic';
import { Plus, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface RiscosTabProps {
  processo: Processo;
}

export function RiscosTab({ processo }: RiscosTabProps) {
  const riscos = processo.riscos || [];

  const getRiscoColor = (nivel: string) => {
    switch (nivel) {
      case 'Crítico':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Alto':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Médio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baixo':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Riscos do Processo
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Riscos identificados e vinculados a este processo
          </p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Vincular Risco
        </Button>
      </div>

      {riscos.length > 0 ? (
        <div className="grid gap-4">
          {riscos.map((risco) => (
            <div
              key={risco.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <h4 className="font-medium text-gray-900">{risco.titulo}</h4>
                    <Badge className={getRiscoColor(risco.nivelRisco)}>
                      {risco.nivelRisco}
                    </Badge>
                  </div>
                  
                  {risco.descricao && (
                    <p className="text-sm text-gray-600 mb-3">{risco.descricao}</p>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Categoria:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {risco.categoria}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Probabilidade:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {risco.probabilidade}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Impacto:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {risco.impacto}
                      </span>
                    </div>
                  </div>

                  {risco.acoesMitigacao && risco.acoesMitigacao.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Ações de Mitigação:
                      </p>
                      <p className="text-sm text-gray-600">{risco.acoesMitigacao}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum risco vinculado
            </h4>
            <p className="text-gray-600 mb-6">
              Vincule riscos identificados para este processo.
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Vincular Primeiro Risco
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}