import { useState, useMemo } from 'react';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Target,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useKPI } from '../hooks/useKPI';
import { Indicador, StatusIndicador } from '../types/kpi';
import { ModalLancamentoMensal } from '../components/kpi/ModalLancamentoMensal';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { formatarNumero } from '../utils/formatters';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MESES_COMPLETOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function MatrizKPI() {
  const { indicadores, updateIndicador, marcarComoDesconsiderado } = useKPI();
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [departamentoExpandido, setDepartamentoExpandido] = useState<Record<string, boolean>>({});
  const [mostrarFormulas, setMostrarFormulas] = useState(false);
  const [indicadorParaLancamento, setIndicadorParaLancamento] = useState<Indicador | null>(null);
  const [mesParaLancamento, setMesParaLancamento] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const navigate = useNavigate();

  // Agrupar indicadores por departamento
  const indicadoresPorDepartamento = useMemo(() => {
    const grupos: Record<string, Indicador[]> = {};
    
    // Remover duplicatas antes de agrupar (baseado no ID)
    const uniqueMap = new Map<string, Indicador>();
    indicadores.forEach(ind => {
      if (!uniqueMap.has(ind.id)) {
        uniqueMap.set(ind.id, ind);
      }
    });
    
    const indicadoresUnicos = Array.from(uniqueMap.values());
    
    indicadoresUnicos.forEach(ind => {
      if (!grupos[ind.departamento]) {
        grupos[ind.departamento] = [];
      }
      grupos[ind.departamento].push(ind);
    });

    return grupos;
  }, [indicadores]);

  // Inicializar todos expandidos
  useMemo(() => {
    const inicial: Record<string, boolean> = {};
    Object.keys(indicadoresPorDepartamento).forEach(dep => {
      inicial[dep] = true;
    });
    setDepartamentoExpandido(inicial);
  }, [indicadoresPorDepartamento]);

  const toggleDepartamento = (departamento: string) => {
    setDepartamentoExpandido(prev => ({
      ...prev,
      [departamento]: !prev[departamento]
    }));
  };

  // Determinar quais meses devem ser exibidos baseado na periodicidade
  const getMesesVisiveis = (periodicidade: Indicador['periodicidade']): number[] => {
    switch (periodicidade) {
      case 'Anual':
        return [12]; // Apenas dezembro
      case 'Semestral':
        return [6, 12]; // Junho e dezembro
      case 'Trimestral':
        return [3, 6, 9, 12]; // Março, junho, setembro e dezembro
      case 'Bimestral':
        return [2, 4, 6, 8, 10, 12]; // A cada 2 meses
      case 'Mensal':
      default:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Todos os meses
    }
  };

  const getResultadoMes = (indicador: Indicador, mes: number): number | null => {
    const resultado = indicador.historicoResultados?.find(
      h => h.mes === mes && h.ano === anoSelecionado
    );
    return resultado?.valor ?? null;
  };

  const getStatusCelula = (indicador: Indicador, valor: number | null): 'vazio' | 'dentro' | 'atencao' | 'fora' => {
    if (valor === null) return 'vazio';

    const { meta, tendencia, limiteMinimo, limiteMaximo } = indicador;
    const margemTolerancia = meta * 0.05;

    let status: 'dentro' | 'atencao' | 'fora' = 'dentro';

    if (tendencia === 'Crescente') {
      if (valor >= meta) status = 'dentro';
      else if (valor >= meta - margemTolerancia) status = 'atencao';
      else status = 'fora';
    } else if (tendencia === 'Decrescente') {
      if (valor <= meta) status = 'dentro';
      else if (valor <= meta + margemTolerancia) status = 'atencao';
      else status = 'fora';
    } else {
      if (limiteMinimo !== undefined && limiteMaximo !== undefined) {
        if (valor >= limiteMinimo && valor <= limiteMaximo) status = 'dentro';
        else {
          const rangeTolerancia = (limiteMaximo - limiteMinimo) * 0.1;
          if (valor >= limiteMinimo - rangeTolerancia && valor <= limiteMaximo + rangeTolerancia) {
            status = 'atencao';
          } else {
            status = 'fora';
          }
        }
      } else {
        if (Math.abs(valor - meta) <= margemTolerancia) status = 'dentro';
        else if (Math.abs(valor - meta) <= margemTolerancia * 2) status = 'atencao';
        else status = 'fora';
      }
    }

    return status;
  };

  const getMelhorResultado = (indicador: Indicador): number | null => {
    const resultados = indicador.historicoResultados
      ?.filter(h => h.ano === anoSelecionado)
      .map(h => h.valor) || [];

    if (resultados.length === 0) return null;

    if (indicador.tendencia === 'Crescente') {
      return Math.max(...resultados);
    } else if (indicador.tendencia === 'Decrescente') {
      return Math.min(...resultados);
    } else {
      return resultados.reduce((melhor, atual) => {
        const distMelhor = Math.abs(melhor - indicador.meta);
        const distAtual = Math.abs(atual - indicador.meta);
        return distAtual < distMelhor ? atual : melhor;
      });
    }
  };

  const handleCelulaClick = (indicador: Indicador, mes: number) => {
    setIndicadorParaLancamento(indicador);
    setMesParaLancamento(mes);
  };

  const handleSalvarLancamento = (valor: number, observacao?: string) => {
    if (!indicadorParaLancamento || mesParaLancamento === null) return;

    const historicoAtualizado = [...(indicadorParaLancamento.historicoResultados || [])];
    const indiceExistente = historicoAtualizado.findIndex(
      h => h.mes === mesParaLancamento && h.ano === anoSelecionado
    );

    // Resultado com a meta atual
    const novoResultado = {
      mes: mesParaLancamento,
      ano: anoSelecionado,
      valor,
      observacao,
      meta: indicadorParaLancamento.meta, // Salvar meta atual
    };

    if (indiceExistente >= 0) {
      historicoAtualizado[indiceExistente] = novoResultado;
    } else {
      historicoAtualizado.push(novoResultado);
    }

    const resultadosAno = historicoAtualizado.filter(h => h.ano === anoSelecionado);
    let resultadoAcumulado = valor;

    if (resultadosAno.length > 0) {
      if (indicadorParaLancamento.tipoConsolidacao === 'Média') {
        resultadoAcumulado = resultadosAno.reduce((acc, h) => acc + h.valor, 0) / resultadosAno.length;
      } else if (indicadorParaLancamento.tipoConsolidacao === 'Somatório') {
        resultadoAcumulado = resultadosAno.reduce((acc, h) => acc + h.valor, 0);
      } else {
        const ordenado = resultadosAno.sort((a, b) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          return b.mes - a.mes;
        });
        resultadoAcumulado = ordenado[0].valor;
      }
    }

    // Salvar o ID do indicador antes de fechar o modal
    const indicadorId = indicadorParaLancamento.id;

    // Atualizar o indicador
    updateIndicador(indicadorId, {
      historicoResultados: historicoAtualizado,
      resultadoAtual: valor,
      resultadoAcumulado
    });

    // Fechar o modal imediatamente
    setIndicadorParaLancamento(null);
    setMesParaLancamento(null);

    // Verificar alertas APÓS o estado ser atualizado e o modal fechado
    setTimeout(() => {
      // Buscar o indicador atualizado do estado
      const indicadorAtualizado = indicadores.find(ind => ind.id === indicadorId);
      if (indicadorAtualizado) {
        verificarAlertaTresMeses(indicadorAtualizado);
      }
    }, 100);
  };

  const calcularStatusMes = (valor: number, meta: number, tendencia: Indicador['tendencia'], limiteMinimo?: number, limiteMaximo?: number): StatusIndicador => {
    if (meta === undefined || meta === 0) return 'Fora da Meta';
    
    const margemTolerancia = meta * 0.05; // 5% de tolerância

    // Verificar de acordo com a tendência
    if (tendencia === 'Crescente') {
      if (valor >= meta) return 'Dentro da Meta';
      if (valor >= meta - margemTolerancia) return 'Atenção';
      return 'Fora da Meta';
    }

    if (tendencia === 'Decrescente') {
      if (valor <= meta) return 'Dentro da Meta';
      if (valor <= meta + margemTolerancia) return 'Atenção';
      return 'Fora da Meta';
    }

    // Estável - usa limites se definidos
    if (limiteMinimo !== undefined && limiteMaximo !== undefined) {
      if (valor >= limiteMinimo && valor <= limiteMaximo) {
        return 'Dentro da Meta';
      }
      const rangeTolerancia = (limiteMaximo - limiteMinimo) * 0.1;
      if (valor >= limiteMinimo - rangeTolerancia && valor <= limiteMaximo + rangeTolerancia) {
        return 'Atenção';
      }
      return 'Fora da Meta';
    }

    // Estável sem limites - usa margem padrão
    if (Math.abs(valor - meta) <= margemTolerancia) {
      return 'Dentro da Meta';
    }
    if (Math.abs(valor - meta) <= margemTolerancia * 2) {
      return 'Atenção';
    }
    return 'Fora da Meta';
  };

  const verificarAlertaTresMeses = (indicador: Indicador) => {
    if (indicador.historicoResultados.length < 3) return;
    
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
      const todosForaDaMeta = ultimosTresMeses.every(mes => {
        const statusMes = calcularStatusMes(mes.valor, indicador.meta, indicador.tendencia, indicador.limiteMinimo, indicador.limiteMaximo);
        return statusMes === 'Fora da Meta';
      });
      
      if (todosForaDaMeta) {
        // Verificar se este alerta já foi desconsiderado anteriormente
        const mesRecente = ultimosTresMeses[0];
        const jaDesconsiderado = indicador.alertasDesconsiderados?.some(alerta => {
          const alertaMesRecente = alerta.meses[0];
          return alertaMesRecente && 
                 alertaMesRecente.mes === mesRecente.mes && 
                 alertaMesRecente.ano === mesRecente.ano;
        });
        
        // Só exibir o alerta se não foi desconsiderado
        if (!jaDesconsiderado) {
          mostrarAlertaTresMeses(indicador);
        }
      }
    }
  };

  const mostrarAlertaTresMeses = (indicador: Indicador) => {
    const handleAbrirPA = () => {
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
      toast.dismiss();
    };

    const handleDesconsiderar = () => {
      if (confirm('Tem certeza que deseja desconsiderar este alerta? O indicador está em situação crítica há 3 meses consecutivos.')) {
        toast.dismiss();
        toast.success('Alerta desconsiderado.');
        marcarComoDesconsiderado(indicador.id);
      }
    };

    toast(
      <div className="flex flex-col gap-3 p-2">
        <div className="flex items-start gap-3">
          <div className="bg-red-100 rounded-full p-2 shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm text-red-900 mb-1" style={{ fontWeight: 700 }}>
              ⚠️ ATENÇÃO!!
            </h3>
            <p className="text-xs text-red-800 leading-relaxed">
              <strong>{indicador.nome}</strong> - Terceiro mês consecutivo fora da meta requer maior aprofundamento em sua análise e abertura de um Plano de Ação!
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAbrirPA}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            Abrir Plano de Ação
          </button>
          <button
            onClick={handleDesconsiderar}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
          >
            Desconsiderar
          </button>
        </div>
      </div>,
      {
        duration: 15000,
        style: {
          background: '#fee2e2',
          border: '2px solid #dc2626',
          padding: '8px',
          minWidth: '400px'
        }
      }
    );
  };

  const formatarValor = (valor: number | null | undefined, unidade: string): string => {
    if (valor === null || valor === undefined) return '-';
    const valorFormatado = formatarNumero(valor, { decimaisMin: 0, decimaisMax: 2 });
    return unidade.toLowerCase() === 'r$' ? `R$ ${valorFormatado}` : valorFormatado;
  };

  const getTendenciaIcon = (tendencia: Indicador['tendencia']) => {
    switch (tendencia) {
      case 'Crescente': return <TrendingUp className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />;
      case 'Decrescente': return <TrendingDown className="w-3.5 h-3.5 text-red-600" strokeWidth={2.5} />;
      case 'Estável': return <Minus className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.5} />;
    }
  };

  const CelulaIndicador = ({ indicador, mes }: { indicador: Indicador; mes: number }) => {
    // Verificar se este mês deve ser exibido baseado na periodicidade
    const mesesVisiveis = getMesesVisiveis(indicador.periodicidade);
    const mesVisivel = mesesVisiveis.includes(mes);
    
    // Se o mês não é visível para esta periodicidade, renderizar célula bloqueada
    if (!mesVisivel) {
      return (
        <div
          className="relative h-14 bg-gray-100 border-l-2 border-gray-200"
          style={{ opacity: 0.3 }}
        >
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-gray-400">-</span>
          </div>
        </div>
      );
    }
    
    const valor = getResultadoMes(indicador, mes);
    const status = getStatusCelula(indicador, valor);
    const cellKey = `${indicador.id}-${mes}`;
    const isHovered = hoveredCell === cellKey;

    // Verificar se há PA aberto ou alerta desconsiderado para este mês
    const resultado = indicador.historicoResultados?.find(
      h => h.mes === mes && h.ano === anoSelecionado
    );
    const temPA = resultado?.planoAcaoNumero !== undefined;
    
    // Verificar se este mês está em um alerta desconsiderado E é o mês mais recente (3º mês)
    // O mês ignorado é sempre o primeiro do array meses (mais recente dos 3 consecutivos)
    const mesIgnorado = indicador.alertasDesconsiderados?.some(alerta => {
      const mesRecente = alerta.meses[0]; // Primeiro elemento = 3º mês mais recente
      return mesRecente && mesRecente.mes === mes && mesRecente.ano === anoSelecionado;
    });
    
    // Verificar se tem observação/análise
    const temObservacao = resultado?.observacao && resultado.observacao.trim() !== '';
    
    // Calcular status do mês APENAS se tiver valor
    let statusMes: StatusIndicador | null = null;
    let foraDaMeta = false;
    
    if (valor !== null) {
      statusMes = calcularStatusMes(valor, indicador.meta, indicador.tendencia, indicador.limiteMinimo, indicador.limiteMaximo);
      foraDaMeta = statusMes === 'Fora da Meta';
    }
    
    // Determinar a cor da bolinha (em ordem de prioridade):
    // 1. Verde: tem PA vinculado
    // 2. Preto: alerta foi ignorado NESTE mês específico (3º mês)
    // 3. Laranja: fora da meta + TEM observação + SEM PA
    // 4. Vermelho: fora da meta + NÃO tem observação + SEM PA
    // 5. Cinza: dentro da meta ou atenção
    // 6. Sem bolinha: célula vazia (sem lançamento)
    
    let corBolinha = '';
    let tituloBolinha = '';
    let mostrarBolinha = false;
    
    // Só mostrar bolinha se houver valor lançado
    if (valor !== null) {
      mostrarBolinha = true;
      
      if (temPA) {
        corBolinha = '#10b981'; // Verde
        tituloBolinha = `PA ${resultado?.planoAcaoNumero} aberto`;
      } else if (mesIgnorado) {
        corBolinha = '#000000'; // Preto
        tituloBolinha = 'Alerta desconsiderado';
      } else if (foraDaMeta && !temPA) {
        if (temObservacao) {
          corBolinha = '#f59e0b'; // Laranja
          tituloBolinha = 'Fora da meta - com análise';
        } else {
          corBolinha = '#ef4444'; // Vermelho
          tituloBolinha = 'Fora da meta - sem análise';
        }
      } else if (statusMes === 'Dentro da Meta') {
        corBolinha = '#9ca3af'; // Cinza
        tituloBolinha = 'Dentro da meta';
      } else if (statusMes === 'Atenção') {
        corBolinha = '#9ca3af'; // Cinza
        tituloBolinha = 'Atenção';
      }
    }

    const statusConfig = {
      vazio: { 
        bg: '#f9fafb', 
        texto: '#9ca3af', 
        borda: '#e5e7eb',
        icone: null 
      },
      dentro: { 
        bg: '#d1fae5', 
        texto: '#10b981', 
        borda: '#a7f3d0',
        icone: CheckCircle2 
      },
      atencao: { 
        bg: '#fef3c7', 
        texto: '#f59e0b', 
        borda: '#fde68a',
        icone: Target 
      },
      fora: { 
        bg: '#fee2e2', 
        texto: '#ef4444', 
        borda: '#fecaca',
        icone: AlertCircle 
      }
    };

    const config = statusConfig[status];
    const Icone = config.icone;

    return (
      <div
        className="relative group cursor-pointer transition-all duration-150 h-14"
        style={{
          backgroundColor: config.bg,
          borderLeft: `2px solid ${config.borda}`
        }}
        onClick={() => handleCelulaClick(indicador, mes)}
        onMouseEnter={() => setHoveredCell(cellKey)}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {/* Bolinha de status PA/Alerta - Canto Superior Direito */}
        {mostrarBolinha && (
          <div
            className="absolute top-0 right-0 w-2 h-2 rounded-full z-10"
            style={{
              backgroundColor: corBolinha,
            }}
            title={tituloBolinha}
          />
        )}

        <div className="flex flex-col items-center justify-center h-full">
          {valor !== null ? (
            <>
              <span 
                className="text-xs font-bold leading-none"
                style={{ color: config.texto }}
              >
                {formatarValor(valor, indicador.unidadeMedida)}
              </span>
              {Icone && (
                <Icone 
                  className={`w-3 h-3 mt-1 transition-transform ${isHovered ? 'scale-125' : ''}`}
                  style={{ color: config.texto }}
                  strokeWidth={2.5}
                />
              )}
            </>
          ) : (
            <span className="text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">
              {isHovered ? 'Clique para lançar' : '-'}
            </span>
          )}
        </div>

        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
              <div className="font-semibold text-[11px]">
                {MESES_COMPLETOS[mes - 1]}
                {valor !== null && ` - ${formatarValor(valor, indicador.unidadeMedida)}`}
                {temPA && ` • ${resultado?.planoAcaoNumero}`}
                {mesIgnorado && ' • Alerta desconsiderado'}
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
              Matriz de Indicadores
            </h1>
            <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Lançamento e acompanhamento mensal de KPIs
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-8">
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-gray-300 transition-all text-sm"
              style={{ fontWeight: 500 }}
            >
              {[2024, 2025, 2026, 2027].map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => setMostrarFormulas(!mostrarFormulas)}
              className="gap-2"
            >
              {mostrarFormulas ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {mostrarFormulas ? 'Ocultar' : 'Mostrar'} Fórmulas
            </Button>

            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Legenda Compacta */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              <div>
                <div className="text-xs font-semibold text-gray-900">Dentro da Meta</div>
                <div className="text-[10px] text-gray-600">Resultado alcançado</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
              <div>
                <div className="text-xs font-semibold text-gray-900">Atenção</div>
                <div className="text-[10px] text-gray-600">Próximo à meta</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" strokeWidth={2.5} />
              <div>
                <div className="text-xs font-semibold text-gray-900">Fora da Meta</div>
                <div className="text-[10px] text-gray-600">Requer atenção</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-md shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">PA Aberto</div>
                <div className="text-[10px] text-gray-600">Plano de Ação vinculado</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-black border-2 border-white shadow-md shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Alerta Ignorado</div>
                <div className="text-[10px] text-gray-600">3º mês desconsiderado</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-md shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Com Análise</div>
                <div className="text-[10px] text-gray-600">Fora da meta + observação</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-md shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Sem Análise</div>
                <div className="text-[10px] text-gray-600">Fora da meta sem observação</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-md shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Normal</div>
                <div className="text-[10px] text-gray-600">Dentro, atenção ou vazio</div>
              </div>
            </div>
          </div>
        </div>

        {/* Matriz de Indicadores */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            {Object.keys(indicadoresPorDepartamento).length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>Nenhum indicador cadastrado</h3>
                <p className="text-sm text-gray-500">Cadastre indicadores na Central de Indicadores</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 min-w-[240px]" style={{ fontWeight: 500 }}>
                      Indicador
                    </th>
                    <th className="px-2 py-3 text-center text-[11px] text-gray-500 w-12" style={{ fontWeight: 500 }}>Un.</th>
                    {MESES.map(mes => (
                      <th key={mes} className="px-2 py-3 text-center text-[10px] text-gray-500 w-20" style={{ fontWeight: 500 }}>
                        {mes}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-[11px] text-blue-600 w-20 bg-blue-50/50" style={{ fontWeight: 500 }}>
                      Meta
                    </th>
                    <th className="px-3 py-3 text-center text-[11px] text-indigo-600 w-20 bg-indigo-50/50" style={{ fontWeight: 500 }}>
                      Melhor
                    </th>
                    <th className="px-2 py-3 text-center text-[11px] text-gray-500 w-12" style={{ fontWeight: 500 }}>
                      <TrendingUp className="w-3.5 h-3.5 mx-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(indicadoresPorDepartamento).flatMap(([departamento, inds]) => [
                    <tr key={`dept-${departamento}`} className="bg-gray-50 border-y border-gray-200">
                      <td
                        colSpan={16}
                        className="px-4 py-2.5 text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors text-sm"
                        style={{ fontWeight: 500 }}
                        onClick={() => toggleDepartamento(departamento)}
                      >
                        <div className="flex items-center gap-2">
                          {departamentoExpandido[departamento] ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" strokeWidth={2.5} />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" strokeWidth={2.5} />
                          )}
                          {departamento}
                          <Badge variant="outline" className="ml-2 text-[10px] bg-white">
                            {inds.length}
                          </Badge>
                        </div>
                      </td>
                    </tr>,
                    
                    ...(departamentoExpandido[departamento] ? inds.map((indicador, idx) => (
                      <tr
                        key={`row-${departamento}-${indicador.id}-${idx}`}
                        className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 text-xs leading-tight">
                              {indicador.nome}
                            </span>
                            {indicador.codigo && (
                              <span className="text-[10px] text-gray-500 mt-0.5">{indicador.codigo}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center text-[10px] text-gray-600 font-medium">
                          {indicador.unidadeMedida}
                        </td>
                        {MESES.map((_, mesIdx) => {
                          const mes = mesIdx + 1;
                          return (
                            <td key={mes} className="p-0">
                              <CelulaIndicador indicador={indicador} mes={mes} />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center text-xs bg-blue-50 text-blue-900" style={{ fontWeight: 700 }}>
                          {formatarValor(indicador.meta, indicador.unidadeMedida)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs bg-indigo-50 text-indigo-900" style={{ fontWeight: 700 }}>
                          {formatarValor(getMelhorResultado(indicador), indicador.unidadeMedida)}
                        </td>
                        <td className="px-2 py-2 text-center bg-gray-50/50">
                          {getTendenciaIcon(indicador.tendencia)}
                        </td>
                      </tr>
                    )) : [])
                  ])}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Painel de Fórmulas */}
        {mostrarFormulas && indicadores.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-gray-900 mb-4" style={{ fontSize: '1rem', fontWeight: 700 }}>Fórmulas de Cálculo</h3>
            <div className="space-y-3">
              {indicadores.map(ind => (
                <div key={ind.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{ind.nome}</p>
                      <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded border border-gray-200">
                        {ind.formulaCalculo}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-600">
                        <span>Fonte: <strong>{ind.fonteDados}</strong></span>
                        <span>Consolidação: <strong>{ind.tipoConsolidacao}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Lançamento */}
        <ModalLancamentoMensal
          open={indicadorParaLancamento !== null}
          onClose={() => {
            setIndicadorParaLancamento(null);
            setMesParaLancamento(null);
          }}
          indicador={indicadorParaLancamento}
          mes={mesParaLancamento}
          ano={anoSelecionado}
          onSave={handleSalvarLancamento}
        />
    </div>
  );
}