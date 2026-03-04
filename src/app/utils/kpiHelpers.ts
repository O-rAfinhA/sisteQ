import { Indicador, StatusIndicador } from '../types/kpi';
import { formatarNumero } from './formatters';

/**
 * Calcula o percentual de atingimento da meta
 */
export function calcularPercentualMeta(resultado: number, meta: number): number {
  if (meta === 0) return 0;
  return (resultado / meta) * 100;
}

/**
 * Formata valor com unidade de medida
 */
export function formatarValorComUnidade(valor: number, unidade: string): string {
  const valorFormatado = formatarNumero(valor, { decimaisMin: 0, decimaisMax: 2 });

  // Unidades que ficam antes do valor
  if (unidade.toLowerCase() === 'r$') {
    return `R$ ${valorFormatado}`;
  }

  // Unidades que ficam depois do valor
  return `${valorFormatado} ${unidade}`;
}

/**
 * Retorna classe CSS baseada no status
 */
export function getStatusClassName(status: StatusIndicador): string {
  const classes = {
    'Dentro da Meta': 'bg-green-100 text-green-700 border-green-200',
    'Atenção': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Fora da Meta': 'bg-red-100 text-red-700 border-red-200',
  };
  return classes[status];
}

/**
 * Retorna cor para gráficos baseada no status
 */
export function getStatusColor(status: StatusIndicador): string {
  const colors = {
    'Dentro da Meta': '#22c55e',
    'Atenção': '#eab308',
    'Fora da Meta': '#ef4444',
  };
  return colors[status];
}

/**
 * Calcula o resultado acumulado baseado no tipo de consolidação
 */
export function calcularResultadoAcumulado(
  indicador: Indicador
): number {
  const { historicoResultados, tipoConsolidacao } = indicador;

  if (!historicoResultados || historicoResultados.length === 0) {
    return indicador.resultadoAtual;
  }

  switch (tipoConsolidacao) {
    case 'Média': {
      const soma = historicoResultados.reduce((acc, h) => acc + h.valor, 0);
      return soma / historicoResultados.length;
    }
    case 'Somatório': {
      return historicoResultados.reduce((acc, h) => acc + h.valor, 0);
    }
    case 'Último Valor': {
      const historico = [...historicoResultados].sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano;
        return b.mes - a.mes;
      });
      return historico[0]?.valor || indicador.resultadoAtual;
    }
    default:
      return indicador.resultadoAtual;
  }
}

/**
 * Valida se um indicador está completo
 */
export function validarIndicador(indicador: Partial<Indicador>): {
  valido: boolean;
  erros: string[];
} {
  const erros: string[] = [];

  if (!indicador.nome?.trim()) {
    erros.push('Nome do indicador é obrigatório');
  }

  if (!indicador.departamento?.trim()) {
    erros.push('Departamento é obrigatório');
  }

  if (!indicador.responsavel?.trim()) {
    erros.push('Responsável é obrigatório');
  }

  if (!indicador.unidadeMedida?.trim()) {
    erros.push('Unidade de medida é obrigatória');
  }

  if (!indicador.formulaCalculo?.trim()) {
    erros.push('Forma de cálculo é obrigatória');
  }

  if (!indicador.fonteDados?.trim()) {
    erros.push('Fonte de dados é obrigatória');
  }

  if (indicador.meta === undefined || indicador.meta === null) {
    erros.push('Meta é obrigatória');
  }

  if (!indicador.periodicidade) {
    erros.push('Periodicidade é obrigatória');
  }

  if (!indicador.tipoConsolidacao) {
    erros.push('Tipo de consolidação é obrigatório');
  }

  if (!indicador.tendencia) {
    erros.push('Tendência esperada é obrigatória');
  }

  if (!indicador.tipoIndicador) {
    erros.push('Tipo de indicador é obrigatório');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Gera código automático para indicador
 */
export function gerarCodigoIndicador(
  departamento: string,
  sequencial: number
): string {
  const prefixo = departamento
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const numero = String(sequencial).padStart(3, '0');
  return `IND-${prefixo}-${numero}`;
}

/**
 * Exporta indicadores para CSV
 */
export function exportarIndicadoresCSV(indicadores: Indicador[]): string {
  const headers = [
    'Código',
    'Nome',
    'Departamento',
    'Responsável',
    'Tipo',
    'Unidade',
    'Meta',
    'Resultado Atual',
    'Resultado Acumulado',
    'Status',
  ];

  const rows = indicadores.map(ind => {
    const status = calcularStatus(ind);
    return [
      ind.codigo || '',
      ind.nome,
      ind.departamento,
      ind.responsavel,
      ind.tipoIndicador,
      ind.unidadeMedida,
      ind.meta,
      ind.resultadoAtual,
      ind.resultadoAcumulado,
      status,
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csv;
}

/**
 * Função auxiliar para calcular status (cópia da lógica do hook)
 */
function calcularStatus(indicador: Indicador): StatusIndicador {
  const { resultadoAtual, meta, tendencia, limiteMinimo, limiteMaximo } = indicador;
  const margemTolerancia = meta * 0.05;

  if (tendencia === 'Crescente') {
    if (resultadoAtual >= meta) return 'Dentro da Meta';
    if (resultadoAtual >= meta - margemTolerancia) return 'Atenção';
    return 'Fora da Meta';
  }

  if (tendencia === 'Decrescente') {
    if (resultadoAtual <= meta) return 'Dentro da Meta';
    if (resultadoAtual <= meta + margemTolerancia) return 'Atenção';
    return 'Fora da Meta';
  }

  if (limiteMinimo !== undefined && limiteMaximo !== undefined) {
    if (resultadoAtual >= limiteMinimo && resultadoAtual <= limiteMaximo) {
      return 'Dentro da Meta';
    }
    const rangeTolerancia = (limiteMaximo - limiteMinimo) * 0.1;
    if (
      resultadoAtual >= limiteMinimo - rangeTolerancia &&
      resultadoAtual <= limiteMaximo + rangeTolerancia
    ) {
      return 'Atenção';
    }
    return 'Fora da Meta';
  }

  if (Math.abs(resultadoAtual - meta) <= margemTolerancia) {
    return 'Dentro da Meta';
  }
  if (Math.abs(resultadoAtual - meta) <= margemTolerancia * 2) {
    return 'Atenção';
  }
  return 'Fora da Meta';
}