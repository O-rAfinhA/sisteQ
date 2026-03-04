import { Processo } from '../../types/strategic';
import { Plus, ClipboardList, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatarDataPtBr } from '../../utils/formatters';

interface RegistrosTabProps {
  processo: Processo;
}

export function RegistrosTab({ processo }: RegistrosTabProps) {
  const registros = processo.registros || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Em Andamento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Concluído':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Registros e Planos de Ação
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Planos de ação vinculados a este processo
          </p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Criar Plano de Ação
        </Button>
      </div>

      {registros.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Código</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Título</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Tipo</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Responsável</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Data</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registros.map((registro) => (
                <tr key={registro.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {registro.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{registro.titulo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{registro.tipo}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{registro.responsavel}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge className={getStatusColor(registro.status)}>
                      {registro.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {formatarDataPtBr(registro.data)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
          <div className="text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum registro vinculado
            </h4>
            <p className="text-gray-600 mb-6">
              Crie planos de ação relacionados a este processo.
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Primeiro Plano de Ação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}