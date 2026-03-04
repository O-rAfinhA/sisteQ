import { useState, useEffect } from 'react';
import { Indicador, StatusIndicador, ResumoKPI } from '../types/kpi';
import { getFromStorage } from '../utils/helpers';

const STORAGE_KEY = 'sisteq_kpi_indicadores';

export function useKPI() {
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIndicadores();
  }, []);

  const loadIndicadores = () => {
    try {
      const parsed = getFromStorage<Indicador[]>(STORAGE_KEY, []);
      if (parsed.length > 0) {
        // Remover duplicatas completas baseado no ID
        const uniqueMap = new Map<string, Indicador>();
        parsed.forEach((ind: Indicador) => {
          const existing = uniqueMap.get(ind.id);
          if (!existing) {
            uniqueMap.set(ind.id, ind);
          } else {
            const existingDate = new Date(existing.dataUltimaAtualizacao || existing.dataCriacao);
            const currentDate = new Date(ind.dataUltimaAtualizacao || ind.dataCriacao);
            if (currentDate > existingDate) {
              uniqueMap.set(ind.id, ind);
            }
          }
        });

        let uniqueIndicadores = Array.from(uniqueMap.values());

        // Migrar códigos de IND para KPI
        let migrated = false;
        uniqueIndicadores = uniqueIndicadores.map(ind => {
          if (ind.codigo && ind.codigo.startsWith('IND')) {
            migrated = true;
            return { ...ind, codigo: ind.codigo.replace('IND', 'KPI') };
          }
          return ind;
        });

        // Se havia duplicatas ou migração, salvar a versão limpa
        if (uniqueIndicadores.length !== parsed.length || migrated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIndicadores));
        }

        setIndicadores(uniqueIndicadores);
      }
    } catch (error) {
      console.error('Erro ao carregar indicadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveIndicadores = (novosIndicadores: Indicador[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novosIndicadores));
      setIndicadores(novosIndicadores);
    } catch (error) {
      console.error('Erro ao salvar indicadores:', error);
    }
  };

  const addIndicador = (indicador: Omit<Indicador, 'id' | 'dataCriacao' | 'dataUltimaAtualizacao'>) => {
    // Encontrar o maior número de ID existente
    const maxNum = indicadores.reduce((max, ind) => {
      if (ind.id && ind.id.startsWith('KPI')) {
        const num = parseInt(ind.id.substring(3));
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    const novoIndicador: Indicador = {
      ...indicador,
      id: `KPI${String(maxNum + 1).padStart(3, '0')}`,
      dataCriacao: new Date().toISOString(),
      dataUltimaAtualizacao: new Date().toISOString(),
    };
    saveIndicadores([...indicadores, novoIndicador]);
    return novoIndicador;
  };

  const updateIndicador = (id: string, data: Partial<Indicador>) => {
    const updated = indicadores.map(ind =>
      ind.id === id
        ? { ...ind, ...data, dataUltimaAtualizacao: new Date().toISOString() }
        : ind
    );
    saveIndicadores(updated);
  };

  const deleteIndicador = (id: string) => {
    saveIndicadores(indicadores.filter(ind => ind.id !== id));
  };

  const calcularStatus = (indicador: Indicador): StatusIndicador => {
    const { resultadoAtual, meta, tendencia, limiteMinimo, limiteMaximo } = indicador;

    // Margem de tolerância padrão (5%)
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

    // Estável - usa limites se definidos
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

    // Estável sem limites - usa margem padrão
    if (Math.abs(resultadoAtual - meta) <= margemTolerancia) {
      return 'Dentro da Meta';
    }
    if (Math.abs(resultadoAtual - meta) <= margemTolerancia * 2) {
      return 'Atenção';
    }
    return 'Fora da Meta';
  };

  const getResumo = (indicadoresFiltrados: Indicador[]): ResumoKPI => {
    const total = indicadoresFiltrados.length;
    const dentroMeta = indicadoresFiltrados.filter(ind => calcularStatus(ind) === 'Dentro da Meta').length;
    const atencao = indicadoresFiltrados.filter(ind => calcularStatus(ind) === 'Atenção').length;
    const foraMeta = indicadoresFiltrados.filter(ind => calcularStatus(ind) === 'Fora da Meta').length;

    return {
      totalIndicadores: total,
      dentroMeta,
      atencao,
      foraMeta,
      percentualDentroMeta: total > 0 ? (dentroMeta / total) * 100 : 0,
      percentualAtencao: total > 0 ? (atencao / total) * 100 : 0,
      percentualForaMeta: total > 0 ? (foraMeta / total) * 100 : 0,
    };
  };

  const marcarComoDesconsiderado = (indicadorId: string) => {
    const indicador = indicadores.find(ind => ind.id === indicadorId);
    if (!indicador) return;

    // Obter os 3 meses mais recentes fora da meta
    const historico = [...indicador.historicoResultados].sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });

    const ultimosTresMeses = historico.slice(0, 3).map(h => ({ mes: h.mes, ano: h.ano }));

    // TODO: Obter nome do usuário logado do contexto ou localStorage
    const usuarioNome = 'Usuário Atual'; // Placeholder

    const novoAlerta = {
      data: new Date().toISOString(),
      usuario: usuarioNome,
      meses: ultimosTresMeses,
    };

    const alertasAtualizados = [...(indicador.alertasDesconsiderados || []), novoAlerta];

    updateIndicador(indicadorId, {
      alertasDesconsiderados: alertasAtualizados,
    });
  };

  return {
    indicadores,
    loading,
    addIndicador,
    updateIndicador,
    deleteIndicador,
    calcularStatus,
    getResumo,
    marcarComoDesconsiderado,
  };
}