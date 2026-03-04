import { useState, useEffect } from 'react';
import { X, Save, Calendar, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Indicador } from '../../types/kpi';
import { useNavigate } from 'react-router';
import { formatarNumero } from '../../utils/formatters';

interface ModalLancamentoMensalProps {
  open: boolean;
  onClose: () => void;
  indicador: Indicador | null;
  mes: number | null;
  ano: number;
  onSave: (valor: number, observacao?: string) => void;
}

const MESES_COMPLETOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function ModalLancamentoMensal({
  open,
  onClose,
  indicador,
  mes,
  ano,
  onSave
}: ModalLancamentoMensalProps) {
  const [valor, setValor] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (open && indicador && mes !== null) {
      // Carregar valor existente se houver
      const resultadoExistente = indicador.historicoResultados?.find(
        h => h.mes === mes && h.ano === ano
      );
      
      if (resultadoExistente) {
        setValor(String(resultadoExistente.valor));
        setObservacao(resultadoExistente.observacao || '');
      } else {
        setValor('');
        setObservacao('');
      }
    }
  }, [open, indicador, mes, ano]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico)) {
      alert('Por favor, insira um valor numérico válido');
      return;
    }

    onSave(valorNumerico, observacao.trim() || undefined);
    setValor('');
    setObservacao('');
  };

  const handleClose = () => {
    setValor('');
    setObservacao('');
    onClose();
  };

  if (!open || !indicador || mes === null) return null;

  const mesNome = MESES_COMPLETOS[mes - 1];
  const resultadoExistente = indicador.historicoResultados?.find(
    h => h.mes === mes && h.ano === ano
  );

  const calcularDiferenca = (): { percentual: number; absoluto: number } | null => {
    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico)) return null;

    const diferenca = valorNumerico - indicador.meta;
    const percentual = (diferenca / indicador.meta) * 100;

    return {
      percentual,
      absoluto: diferenca
    };
  };

  const diferenca = calcularDiferenca();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>
                Lançar Resultado
              </h2>
              <p className="text-xs text-gray-500">
                {mesNome} de {ano}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all rounded-lg p-1.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Informações do Indicador - Compacto */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-blue-900 mb-1" style={{ fontWeight: 600 }}>{indicador.nome}</p>
                <p className="text-xs text-blue-700">{indicador.departamento}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 font-medium">Meta</p>
                <p className="text-lg font-black text-blue-900">
                  {indicador.meta !== undefined ? formatarNumero(indicador.meta) : '-'} <span className="text-sm font-normal">{indicador.unidadeMedida}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Grid: Resultado + Comparação */}
          <div className="grid grid-cols-2 gap-4">
            {/* Esquerda: Campo de Resultado */}
            <div className="flex flex-col">
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>
                Qual foi o resultado? *
              </label>
              <div className="flex gap-3 items-stretch h-full">
                <input
                  type="text"
                  required
                  value={valor}
                  onChange={(e) => {
                    const v = e.target.value.replace(',', '.');
                    setValor(v);
                  }}
                  className="flex-1 px-5 py-4 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-2xl text-center" style={{ fontWeight: 600 }}
                  placeholder="0"
                  autoFocus
                />
                <div className="flex items-center justify-center px-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 text-base min-w-[70px]" style={{ fontWeight: 500 }}>
                  {indicador.unidadeMedida}
                </div>
              </div>
            </div>

            {/* Direita: Comparação com a Meta */}
            <div className="flex flex-col">
              <label className="block text-sm text-gray-700 mb-2 invisible" style={{ fontWeight: 500 }}>
                Placeholder
              </label>
              {diferenca ? (
                <div className={`flex-1 border rounded-xl p-4 flex flex-col justify-center ${
                  diferenca.absoluto > 0
                    ? indicador.tendencia === 'Crescente' 
                      ? 'bg-emerald-50 border-emerald-300' 
                      : 'bg-red-50 border-red-300'
                    : diferenca.absoluto < 0
                      ? indicador.tendencia === 'Crescente'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-emerald-50 border-emerald-300'
                      : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-700 mb-1" style={{ fontWeight: 500 }}>
                        Diferença
                      </p>
                      <p className={`text-lg font-black ${
                        diferenca.absoluto > 0
                          ? indicador.tendencia === 'Crescente' 
                            ? 'text-emerald-700' 
                            : 'text-red-700'
                          : diferenca.absoluto < 0
                            ? indicador.tendencia === 'Crescente'
                              ? 'text-red-700'
                              : 'text-emerald-700'
                            : 'text-blue-700'
                      }`}>
                        {diferenca.absoluto > 0 ? '+' : ''}{formatarNumero(diferenca.absoluto, { decimaisMin: 0, decimaisMax: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-700 mb-1" style={{ fontWeight: 500 }}>
                        Percentual
                      </p>
                      <p className={`text-lg font-black ${
                        diferenca.percentual > 0
                          ? indicador.tendencia === 'Crescente' 
                            ? 'text-emerald-700' 
                            : 'text-red-700'
                          : diferenca.percentual < 0
                            ? indicador.tendencia === 'Crescente'
                              ? 'text-red-700'
                              : 'text-emerald-700'
                            : 'text-blue-700'
                      }`}>
                        {diferenca.percentual > 0 ? '+' : ''}{formatarNumero(diferenca.percentual, { decimaisMin: 1, decimaisMax: 1 })}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 border border-gray-200 rounded-xl p-4 flex items-center justify-center bg-gray-50">
                  <p className="text-xs text-gray-400">Digite um valor para ver a comparação</p>
                </div>
              )}
            </div>
          </div>

          {/* Análise do Resultado */}
          <div>
            <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>
              Análise do Resultado
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm resize-none"
              placeholder="Adicione comentários sobre o resultado"
            />
            
            {/* Botão Abrir PA */}
            <button
              type="button"
              onClick={() => {
                const resultadoAtual = parseFloat(valor) || 0;
                const meta = indicador.meta !== undefined ? indicador.meta : 0;
                const unidade = indicador.unidadeMedida || '';
                
                const params = new URLSearchParams({
                  origem: 'indicador',
                  indicadorId: indicador.id,
                  indicadorNome: indicador.nome,
                  resultadoAtual: String(resultadoAtual),
                  meta: String(meta),
                  mes: String(mes),
                  ano: String(ano),
                });
                
                if (unidade.trim()) {
                  params.append('unidadeMedida', unidade);
                }
                
                navigate(`/acoes-corretivas/plano-acao?${params.toString()}`);
                handleClose();
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold text-sm shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Abrir Plano de Ação
            </button>
          </div>

          {/* Histórico - Resumido */}
          {indicador.historicoResultados && indicador.historicoResultados.length > 0 && (
            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 500 }}>
                Últimos 3 Resultados
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] text-gray-600" style={{ fontWeight: 500 }}>Mês</th>
                      <th className="px-3 py-2 text-right text-[10px] text-gray-600" style={{ fontWeight: 500 }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {indicador.historicoResultados
                      .filter(h => h.ano === ano)
                      .sort((a, b) => b.mes - a.mes)
                      .slice(0, 3)
                      .map((resultado, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 text-gray-700 font-medium">
                            {MESES_COMPLETOS[resultado.mes - 1]}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900" style={{ fontWeight: 600 }}>
                            {formatarNumero(resultado.valor)} {indicador.unidadeMedida}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button 
            type="button" 
            onClick={handleClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit} 
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all text-sm shadow-sm"
            style={{ fontWeight: 500 }}
          >
            <Save className="w-4 h-4" />
            {resultadoExistente ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}