import { Processo } from '../../types/strategic';
import { Plus, FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatarDataPtBr } from '../../utils/formatters';

interface DocumentosTabProps {
  processo: Processo;
}

export function DocumentosTab({ processo }: DocumentosTabProps) {
  const documentos = processo.documentos || [];

  const getTipoDocumentoColor = (tipo: string) => {
    switch (tipo) {
      case 'Procedimento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Instrução':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Formulário':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Outro':
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
            Documentos do Processo
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Documentos, procedimentos e instruções vinculados
          </p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="w-4 h-4" />
          Vincular Documento
        </Button>
      </div>

      {documentos.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Título
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Versão
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Última Atualização
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documentos.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {doc.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{doc.titulo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge className={getTipoDocumentoColor(doc.tipo)}>
                      {doc.tipo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-600">{doc.versao}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {formatarDataPtBr(doc.dataAtualizacao)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum documento vinculado
            </h4>
            <p className="text-gray-600 mb-6">
              Vincule documentos, procedimentos e instruções relacionados a este processo.
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Vincular Primeiro Documento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}