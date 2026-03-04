import { Edit, TrendingUp, TrendingDown, Minus, FileText, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent } from '../ui/dialog';
import { Indicador, StatusIndicador } from '../../types/kpi';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import { useKPI } from '../../hooks/useKPI';
import { formatarDataPtBr, formatarNumero } from '../../utils/formatters';
import { getStatusClassName } from '../../utils/kpiHelpers';

interface DrawerKPIProps {
  open: boolean;
  onClose: () => void;
  indicador: Indicador | null;
  onEdit: (indicador: Indicador) => void;
  calcularStatus: (indicador: Indicador) => StatusIndicador;
}

export function DrawerKPI({ open, onClose, indicador, onEdit, calcularStatus }: DrawerKPIProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();
  const { marcarComoDesconsiderado } = useKPI();
  
  if (!open || !indicador) return null;

  const status = calcularStatus(indicador);

  // getStatusClassName importado de kpiHelpers.ts

  const getTendenciaIcon = () => {
    switch (indicador.tendencia) {
      case 'Crescente': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'Decrescente': return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'Estável': return <Minus className="w-5 h-5 text-blue-600" />;
    }
  };

  // Preparar dados do gráfico
  const chartData = indicador.historicoResultados
    .slice(-12) // Últimos 12 meses
    .map(resultado => ({
      mes: `${String(resultado.mes).padStart(2, '0')}/${resultado.ano}`,
      valor: resultado.valor,
      meta: indicador.meta,
    }));

  const percentualAtingimento = indicador.meta !== 0 && indicador.meta !== undefined
    ? ((indicador.resultadoAtual / indicador.meta) * 100).toFixed(1)
    : '0';

  // Verificar se há 3 meses consecutivos fora da meta
  const verificarTresMesesConsecutivosForaDaMeta = (): boolean => {
    if (indicador.historicoResultados.length < 3) return false;
    
    // Ordenar por ano e mês (mais recente primeiro)
    const historico = [...indicador.historicoResultados].sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });

    // Pegar os 3 meses mais recentes
    const ultimosTresMeses = historico.slice(0, 3);
    
    // Verificar se são consecutivos
    let mesesConsecutivos = 0;
    for (let i = 0; i < ultimosTresMeses.length - 1; i++) {
      const atual = ultimosTresMeses[i];
      const proximo = ultimosTresMeses[i + 1];
      
      // Verificar se o mês anterior é consecutivo
      const mesAnteriorEsperado = atual.mes === 1 ? 12 : atual.mes - 1;
      const anoAnteriorEsperado = atual.mes === 1 ? atual.ano - 1 : atual.ano;
      
      if (proximo.mes === mesAnteriorEsperado && proximo.ano === anoAnteriorEsperado) {
        mesesConsecutivos++;
      } else {
        break;
      }
    }
    
    // Se há 2 transições consecutivas, significa 3 meses consecutivos
    if (mesesConsecutivos === 2) {
      // Verificar se todos os 3 meses estão fora da meta
      return ultimosTresMeses.every(mes => {
        const statusMes = calcularStatusMes(mes.valor);
        return statusMes === 'Fora da Meta';
      });
    }
    
    return false;
  };

  const calcularStatusMes = (valor: number): StatusIndicador => {
    if (indicador.meta === undefined || indicador.meta === 0) return 'Fora da Meta';
    
    const percentual = (valor / indicador.meta) * 100;
    const limiteMinimo = indicador.limiteMinimo !== undefined 
      ? (indicador.limiteMinimo / indicador.meta) * 100 
      : 90;
    
    if (percentual >= 100) return 'Dentro da Meta';
    if (percentual >= limiteMinimo) return 'Atenção';
    return 'Fora da Meta';
  };

  const tresMesesForaDaMeta = verificarTresMesesConsecutivosForaDaMeta();

  // Verificar se os 3 meses atuais já foram desconsiderados
  const verificarSeJaDesconsiderado = (): boolean => {
    if (!indicador.alertasDesconsiderados || indicador.alertasDesconsiderados.length === 0) return false;
    
    // Obter os 3 meses mais recentes
    const historico = [...indicador.historicoResultados].sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
    const ultimosTresMeses = historico.slice(0, 3);
    
    // Verificar se há um alerta desconsiderado que corresponde aos 3 meses atuais
    return indicador.alertasDesconsiderados.some(alerta => {
      if (alerta.meses.length !== 3) return false;
      
      return alerta.meses.every((mesAlerta, index) => {
        const mesAtual = ultimosTresMeses[index];
        return mesAlerta.mes === mesAtual.mes && mesAlerta.ano === mesAtual.ano;
      });
    });
  };

  const alertaAtivo = tresMesesForaDaMeta && !verificarSeJaDesconsiderado();
  const ultimoAlertaDesconsiderado = indicador.alertasDesconsiderados && indicador.alertasDesconsiderados.length > 0
    ? indicador.alertasDesconsiderados[indicador.alertasDesconsiderados.length - 1]
    : null;

  const handleAbrirPlanoAcao = () => {
    const resultadoAtual = indicador.resultadoAtual !== undefined ? indicador.resultadoAtual : 0;
    const meta = indicador.meta !== undefined ? indicador.meta : 0;
    const unidade = indicador.unidadeMedida || '';
    
    // Construir URL apenas com parâmetros válidos
    const params = new URLSearchParams({
      origem: 'indicador',
      indicadorId: indicador.id,
      indicadorNome: indicador.nome,
      resultadoAtual: String(resultadoAtual),
      meta: String(meta),
    });
    
    // Adicionar unidade apenas se não estiver vazia
    if (unidade.trim()) {
      params.append('unidadeMedida', unidade);
    }
    
    navigate(`/acoes-corretivas/plano-acao?${params.toString()}`);
    onClose();
  };

  const handleDesconsiderar = () => {
    setShowConfirmDialog(false);
    // Aqui você pode adicionar lógica para marcar como "desconsiderado" no localStorage ou backend
    marcarComoDesconsiderado(indicador.id);
    alert('Ação desconsiderada. O alerta não será mais exibido para este indicador.');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 pr-14">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-semibold text-gray-900 truncate">
                {indicador.nome}
              </h2>
              <Badge variant="outline" className={`${getStatusClassName(status)} border shrink-0`}>
                {status}
              </Badge>
            </div>
            {indicador.codigo && (
              <p className="text-sm text-gray-500">{indicador.codigo}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onEdit(indicador);
                onClose();
              }}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cards de Destaque */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">Meta</p>
              <p className="text-2xl font-semibold text-blue-900">
                {indicador.meta !== undefined ? formatarNumero(indicador.meta) : '-'}
              </p>
              <p className="text-xs text-blue-600 mt-1">{indicador.unidadeMedida || '-'}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium mb-1">Resultado Atual</p>
              <p className="text-2xl font-semibold text-purple-900">
                {indicador.resultadoAtual !== undefined ? formatarNumero(indicador.resultadoAtual) : '-'}
              </p>
              <p className="text-xs text-purple-600 mt-1">{percentualAtingimento}% da meta</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium mb-1">Acumulado</p>
              <p className="text-2xl font-semibold text-green-900">
                {indicador.resultadoAcumulado !== undefined ? formatarNumero(indicador.resultadoAcumulado) : '-'}
              </p>
              <p className="text-xs text-green-600 mt-1">{indicador.tipoConsolidacao || '-'}</p>
            </div>
          </div>

          {/* Gráfico de Evolução */}
          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução do Indicador</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="mes" 
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="meta" 
                    stroke="#94a3b8" 
                    strokeDasharray="5 5"
                    name="Meta"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Realizado"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Informações do Indicador */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Indicador</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Departamento</p>
                <p className="text-gray-900">{indicador.departamento}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Responsável</p>
                <p className="text-gray-900">{indicador.responsavel}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Tipo</p>
                <Badge variant="outline" className="bg-gray-50">
                  {indicador.tipoIndicador}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Periodicidade</p>
                <p className="text-gray-900">{indicador.periodicidade}</p>
              </div>

              {indicador.processoNome && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500 mb-1">Processo Vinculado</p>
                  <p className="text-gray-900">
                    {indicador.processoId && (
                      <span className="text-blue-600 font-medium">{indicador.processoId} - </span>
                    )}
                    {indicador.processoNome}
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 mb-1">Tendência Esperada</p>
                <div className="flex items-center gap-2">
                  {getTendenciaIcon()}
                  <span className="text-gray-900">{indicador.tendencia}</span>
                </div>
              </div>

              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500 mb-1">Forma de Cálculo</p>
                <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                  {indicador.formulaCalculo}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Fonte de Dados</p>
                <p className="text-gray-900">{indicador.fonteDados}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Unidade de Medida</p>
                <p className="text-gray-900">{indicador.unidadeMedida}</p>
              </div>

              {(indicador.limiteMinimo !== undefined || indicador.limiteMaximo !== undefined) && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500 mb-1">Limites</p>
                  <div className="flex gap-4 text-sm">
                    {indicador.limiteMinimo !== undefined && (
                      <span className="text-gray-900">
                        Mínimo: <strong>{formatarNumero(indicador.limiteMinimo)}</strong>
                      </span>
                    )}
                    {indicador.limiteMaximo !== undefined && (
                      <span className="text-gray-900">
                        Máximo: <strong>{formatarNumero(indicador.limiteMaximo)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Análise do Resultado */}
          {indicador.observacoes && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Análise do Resultado</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{indicador.observacoes}</p>
            </div>
          )}

          {/* Alerta CRÍTICO: 3 meses consecutivos fora da meta */}
          {alertaAtivo && !showConfirmDialog && (
            <div className="bg-red-600 border border-red-700 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="bg-white rounded-full p-3 shrink-0">
                  <AlertCircle className="w-8 h-8 text-red-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl text-white mb-3 flex items-center gap-2" style={{ fontWeight: 700 }}>
                    ⚠️ ATENÇÃO!!
                  </h3>
                  <div className="bg-white/95 rounded-lg p-4 mb-4">
                    <p className="text-base font-semibold text-red-900 leading-relaxed">
                      Terceiro mês consecutivo fora da meta requer maior aprofundamento em sua análise e abertura de um Plano de Ação!
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleAbrirPlanoAcao}
                      className="bg-white text-red-700 hover:bg-red-50 font-semibold shadow-lg border-2 border-white"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Abrir Plano de Ação
                    </Button>
                    <Button 
                      onClick={() => setShowConfirmDialog(true)}
                      variant="outline"
                      className="bg-transparent text-white border-2 border-white hover:bg-white/10 font-semibold"
                    >
                      Desconsiderar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dialog de Confirmação para Desconsiderar */}
          {showConfirmDialog && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg text-yellow-900 mb-2" style={{ fontWeight: 700 }}>
                    Tem certeza?
                  </h3>
                  <p className="text-sm text-yellow-800 mb-4">
                    Ao desconsiderar este alerta, você está ciente de que o indicador está em situação crítica há 3 meses consecutivos. 
                    Esta ação não poderá ser desfeita e o alerta não será mais exibido.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleDesconsiderar}
                      variant="destructive"
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Sim, Desconsiderar
                    </Button>
                    <Button 
                      onClick={() => setShowConfirmDialog(false)}
                      variant="outline"
                      size="sm"
                      className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerta se fora da meta (apenas 1 mês) */}
          {status === 'Fora da Meta' && !tresMesesForaDaMeta && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">Indicador Fora da Meta</h3>
                  <p className="text-sm text-red-700 mb-3">
                    Este indicador está fora da meta estabelecida. Recomenda-se a elaboração de um plano de ação.
                  </p>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={handleAbrirPlanoAcao}>
                    <FileText className="w-4 h-4 mr-2" />
                    Abrir Plano de Ação
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Registro de Alerta Desconsiderado */}
          {ultimoAlertaDesconsiderado && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">Registro de Aviso</h3>
                  <p className="text-sm text-amber-800">
                    <strong>Aviso de risco por não atingimento de meta foi desconsiderado</strong> por{' '}
                    <strong>{ultimoAlertaDesconsiderado.usuario}</strong> em{' '}
                    <strong>{formatarDataPtBr(ultimoAlertaDesconsiderado.data)}</strong> nos meses de{' '}
                    <strong>
                      {ultimoAlertaDesconsiderado.meses.map(m => 
                        `${String(m.mes).padStart(2, '0')}/${m.ano}`
                      ).join(', ')}
                    </strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Histórico Mensal */}
          {indicador.historicoResultados.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Resultados</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Período</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Resultado</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>Meta</th>
                      <th className="px-4 py-2 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                      <th className="px-4 py-2 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>PA</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Análise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {indicador.historicoResultados
                      .slice()
                      .sort((a, b) => {
                        if (a.ano !== b.ano) return b.ano - a.ano;
                        return b.mes - a.mes;
                      })
                      .slice(0, 12)
                      .map((resultado, index) => {
                        const metaMes = resultado.meta !== undefined ? resultado.meta : indicador.meta;
                        const statusMes = calcularStatusMes(resultado.valor);
                        const statusColor = 
                          statusMes === 'Dentro da Meta' ? 'bg-green-100' :
                          statusMes === 'Atenção' ? 'bg-yellow-100' :
                          'bg-red-100';
                        const statusIcon = 
                          statusMes === 'Dentro da Meta' ? '●' :
                          statusMes === 'Atenção' ? '●' :
                          '●';
                        const statusIconColor = 
                          statusMes === 'Dentro da Meta' ? 'text-green-600' :
                          statusMes === 'Atenção' ? 'text-yellow-600' :
                          'text-red-600';
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">
                              {String(resultado.mes).padStart(2, '0')}/{resultado.ano}
                            </td>
                            <td className="px-4 py-2 text-gray-900 font-medium text-right">
                              {formatarNumero(resultado.valor)}
                            </td>
                            <td className="px-4 py-2 text-gray-600 text-right">
                              {metaMes !== undefined && metaMes !== null ? formatarNumero(metaMes) : '-'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${statusColor}`}>
                                <span className={`text-lg ${statusIconColor}`}>{statusIcon}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {resultado.planoAcaoNumero ? (
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {resultado.planoAcaoNumero}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {resultado.observacao || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
