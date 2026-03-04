// Componente de Tabela para Histórico de Versões v2.1
import { FileText, User, Calendar, GitBranch } from 'lucide-react';
import { HistoricoVersao } from '../../pages/DocumentosInternos';
import { Badge } from '../ui/badge';
import { formatarData, formatarHora } from '../../utils/formatters';

interface HistoricoVersoesProps {
  historico: HistoricoVersao[];
}

export function HistoricoVersoes({ historico }: HistoricoVersoesProps) {
  // Ordenar histórico do mais recente para o mais antigo
  const historicoSorted = [...historico].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  if (historico.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma versão registrada</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50/60">
            <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
              Versão
            </th>
            <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
              Data
            </th>
            <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
              Responsável
            </th>
            <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
              Descrição das Alterações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {historicoSorted.map((versao, index) => {
            const isVersaoAtual = index === 0;
            
            return (
              <tr 
                key={`${versao.versao}-${versao.data}`}
                className={`
                  hover:bg-gray-50 transition-colors
                  ${isVersaoAtual ? 'bg-blue-50/30' : ''}
                `}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      v{versao.versao}
                    </span>
                    {isVersaoAtual && (
                      <Badge className="bg-blue-500 text-white text-xs">Atual</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatarData(versao.data)}
                    </div>
                    <div className="text-xs text-gray-500 ml-6">
                      {formatarHora(versao.data)}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    {versao.responsavel}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-700">
                    {versao.alteracoes || (
                      <span className="text-gray-400 italic">Sem descrição</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legenda */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Sobre o Histórico de Versões</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Cada versão representa uma evolução do documento</li>
          <li>• A descrição das alterações ajuda a rastrear o que mudou entre versões</li>
          <li>• Versões obsoletas são mantidas apenas para registro histórico</li>
        </ul>
      </div>
    </div>
  );
}