import { Processo } from '../../types/strategic';
import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';

interface IndicadoresTabProps {
  processo: Processo;
}

export function IndicadoresTab({ processo }: IndicadoresTabProps) {
  const indicadores = processo.indicadores || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Indicadores de Desempenho (KPI)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Indicadores vinculados a este processo
          </p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Vincular Indicador
        </Button>
      </div>

      {indicadores.length > 0 ? (
        <div className="grid gap-4">
          {indicadores.map((indicador) => (
            <div
              key={indicador.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium text-gray-900">{indicador.nome}</h4>
                  </div>
                  
                  {indicador.descricao && (
                    <p className="text-sm text-gray-600 mb-3">{indicador.descricao}</p>
                  )}

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Unidade:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {indicador.unidade}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Meta:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {indicador.meta}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Frequência:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {indicador.frequencia}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Responsável:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {indicador.responsavel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum indicador vinculado
            </h4>
            <p className="text-gray-600 mb-6">
              Vincule indicadores de desempenho (KPI) para monitorar este processo.
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Vincular Primeiro Indicador
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}