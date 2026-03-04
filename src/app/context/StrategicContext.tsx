/**
 * Strategic Context - Gerenciamento de estado global
 * 
 * OTIMIZAÇÕES IMPLEMENTADAS:
 * 1. Debouncing do localStorage (800ms) para evitar salvamentos excessivos
 * 2. useMemo e useCallback em todas as funções para evitar re-renders
 * 3. Lógica de migração extraída para arquivo separado (/utils/dataMigration.ts)
 * 4. Helper functions para reduzir complexidade
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { DadosEstrategicos, DirecionamentoEstrategico, CenarioOrganizacional, SwotItem, ParteInteressada, PlanoAcaoEstrategico, PlanoAcoes, ObjetivoBscItem, Risco, Processo, VersaoProcesso } from '../types/strategic';
import { dataHojeISO } from '../utils/formatters';
import { migrateOldData } from '../utils/dataMigration';
import { useDebounce } from '../hooks/useDebounce';
import { generateId } from '../utils/helpers';

interface StrategicContextType {
  dados: DadosEstrategicos;
  anoAtual: string;
  anosDisponiveis: string[];
  selecionarAno: (ano: string) => void;
  criarAnoEmBranco: (ano: string) => void;
  copiarAno: (anoOrigem: string, anoDestino: string) => void;
  removerAno: (ano: string) => void;
  updateDirecionamento: (direcionamento: DirecionamentoEstrategico) => void;
  updateCenario: (cenario: CenarioOrganizacional) => void;
  addSwotItem: (item: Omit<SwotItem, 'id' | 'criadoEm' | 'numeroSwot'>) => void;
  updateSwotItem: (id: string, item: Partial<SwotItem>) => void;
  deleteSwotItem: (id: string) => void;
  addParteInteressada: (parte: Omit<ParteInteressada, 'id' | 'criadoEm'>) => void;
  updateParteInteressada: (id: string, parte: Partial<ParteInteressada>) => void;
  deleteParteInteressada: (id: string) => void;
  addObjetivoBsc: (objetivo: Omit<ObjetivoBscItem, 'id' | 'numeroObjetivo'>) => void;
  updateObjetivoBsc: (id: string, updates: Partial<ObjetivoBscItem>) => void;
  removeObjetivoBsc: (id: string) => void;
  addPlanoAcao: (plano: Omit<PlanoAcaoEstrategico, 'id' | 'criadoEm' | 'numeroPE'>) => PlanoAcaoEstrategico;
  updatePlanoAcao: (id: string, plano: Partial<PlanoAcaoEstrategico>) => void;
  deletePlanoAcao: (id: string) => void;
  addPlanoAcoes: (plano: Omit<PlanoAcoes, 'id' | 'criadoEm' | 'numeroPE'>) => PlanoAcoes;
  updatePlanoAcoes: (id: string, plano: Partial<PlanoAcoes>) => void;
  deletePlanoAcoes: (id: string) => void;
  addRisco: (risco: Omit<Risco, 'id' | 'codigo' | 'dataCriacao' | 'ultimaRevisao' | 'revisaoAtual' | 'historicoRevisoes'>) => Risco;
  updateRisco: (id: string, risco: Partial<Risco>) => void;
  deleteRisco: (id: string) => void;
  addProcesso: (processo: Omit<Processo, 'id' | 'codigo' | 'dataCriacao' | 'ultimaAtualizacao' | 'versaoAtual' | 'versoes'> & { codigo?: string }) => Processo;
  updateProcesso: (id: string, processo: Partial<Processo>) => void;
  deleteProcesso: (id: string) => void;
  publicarNovaVersaoProcesso: (id: string, resumoAlteracoes: string) => void;
}

// Persistir o contexto globalmente para sobreviver a re-avaliações de módulo durante HMR.
// Sem isso, createContext() cria um novo objeto a cada hot reload, causando mismatch
// entre provider (novo contexto) e consumers (contexto antigo).
const CONTEXT_KEY = '__STRATEGIC_CONTEXT__';
const StrategicContext: React.Context<StrategicContextType | undefined> =
  (globalThis as any)[CONTEXT_KEY] ||
  ((globalThis as any)[CONTEXT_KEY] = createContext<StrategicContextType | undefined>(undefined));

const STORAGE_KEY = 'strategic-planning-data';
const YEARS_STORAGE_KEY = 'strategic-planning-years';

const initialData: DadosEstrategicos = {
  direcionamento: {
    missao: '',
    visao: '',
    valores: [],
    politicaQualidade: '',
    politicaBsc: [],
    escopoCertificacao: '',
    exclusaoRequisito: '',
    objetivosBsc: [],
  },
  cenario: {
    historicoEmpresa: '',
    produtosServicos: '',
    regiaoAtuacao: '',
    canaisVenda: '',
    principaisClientes: [],
    principaisFornecedores: [],
    principaisConcorrentes: [],
  },
  swotItems: [],
  partesInteressadas: [],
  planosAcao: [],
  planosAcoes: [],
  riscos: [],
  processos: [],
};

interface YearsData {
  [year: string]: DadosEstrategicos;
}

interface StorageStructure {
  anoAtual: string;
  anos: YearsData;
}

const isStorageAvailable = () => {
  if (typeof window === 'undefined') return false;
  const ls: any = (window as any).localStorage;
  return !!ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function' && typeof ls.removeItem === 'function';
};

const isPlainObject = (value: any): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isDadosEstrategicosLike = (value: any): value is DadosEstrategicos => {
  if (!isPlainObject(value)) return false;
  if (!isPlainObject(value.direcionamento)) return false;
  if (!isPlainObject(value.cenario)) return false;
  if (!Array.isArray(value.swotItems)) return false;
  if (!Array.isArray(value.partesInteressadas)) return false;
  if (!Array.isArray(value.planosAcao)) return false;
  if (!Array.isArray(value.planosAcoes)) return false;
  if (!Array.isArray(value.riscos)) return false;
  if (!Array.isArray(value.processos)) return false;
  return true;
};

const normalizeStorageStructure = (value: any, currentYear: string): StorageStructure | null => {
  if (!isPlainObject(value)) return null;
  const rawAnoAtual = typeof value.anoAtual === 'string' ? value.anoAtual.trim() : '';
  if (!isPlainObject(value.anos)) return null;

  const anos: YearsData = {};
  for (const [year, data] of Object.entries(value.anos)) {
    if (typeof year !== 'string') continue;
    const y = year.trim();
    if (!y) continue;
    if (!isDadosEstrategicosLike(data)) continue;
    anos[y] = data;
  }

  const years = Object.keys(anos);
  if (years.length === 0) return null;

  const anoAtual =
    rawAnoAtual && anos[rawAnoAtual]
      ? rawAnoAtual
      : anos[currentYear]
        ? currentYear
        : years.slice().sort().at(-1) || currentYear;

  return { anoAtual, anos };
};

const parseStorageStructure = (raw: string | null, currentYear: string): StorageStructure | null => {
  if (!raw) return null;
  try {
    return normalizeStorageStructure(JSON.parse(raw), currentYear);
  } catch {
    return null;
  }
};

const initializeYearsData = (): StorageStructure => {
  const currentYear = new Date().getFullYear().toString();
  if (!isStorageAvailable()) {
    return {
      anoAtual: currentYear,
      anos: { [currentYear]: initialData },
    };
  }

  try {
    const savedYears = localStorage.getItem(YEARS_STORAGE_KEY);
    const parsedYears = parseStorageStructure(savedYears, currentYear);
    if (parsedYears) return parsedYears;
    if (savedYears) {
      try {
        localStorage.removeItem(YEARS_STORAGE_KEY);
      } catch {
      }
    }

    const oldData = localStorage.getItem(STORAGE_KEY);
    
    if (oldData) {
      const parsed = JSON.parse(oldData);
      const migratedData = migrateOldData(parsed);
      
      const yearsStructure: StorageStructure = {
        anoAtual: currentYear,
        anos: { [currentYear]: migratedData },
      };
      
      localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify(yearsStructure));
      localStorage.removeItem(STORAGE_KEY);
      return yearsStructure;
    }

    return {
      anoAtual: currentYear,
      anos: { [currentYear]: initialData },
    };
  } catch (error) {
    console.error('Erro ao inicializar dados de anos:', error);
    return {
      anoAtual: currentYear,
      anos: { [currentYear]: initialData },
    };
  }
};

export function StrategicProvider({ children }: { children: ReactNode }) {
  // Inicializa uma única vez — evita 3× parse de localStorage
  const [initialStorage] = useState<StorageStructure>(() => initializeYearsData());

  const [anoAtual, setAnoAtual] = useState<string>(() => initialStorage.anoAtual);
  
  const [dados, setDados] = useState<DadosEstrategicos>(
    () => initialStorage.anos[initialStorage.anoAtual] || initialData
  );

  const [anosData, setAnosData] = useState<YearsData>(() => initialStorage.anos);

  const debouncedDados = useDebounce(dados, 800);
  const debouncedAnoAtual = useDebounce(anoAtual, 300);
  const pendingServerSaveRef = useRef<Promise<void> | null>(null);
  const abortSaveRef = useRef<AbortController | null>(null);
  const skipPersistWritesRef = useRef(0);

  useEffect(() => {
    const handleReset = (evt: Event) => {
      const persist = !(evt instanceof CustomEvent) || evt.detail?.persist !== false;
      const currentYear = new Date().getFullYear().toString();
      const nextYears: YearsData = { [currentYear]: initialData };
      setAnoAtual(currentYear);
      setDados(initialData);
      setAnosData(nextYears);
      if (!persist) skipPersistWritesRef.current = Math.max(skipPersistWritesRef.current, 3);
      if (persist && isStorageAvailable()) {
        try {
          localStorage.setItem(
            YEARS_STORAGE_KEY,
            JSON.stringify({
              anoAtual: currentYear,
              anos: nextYears,
            }),
          );
          localStorage.removeItem(STORAGE_KEY);
        } catch {
        }
      }
    };
    window.addEventListener('sisteq:reset', handleReset);
    return () => window.removeEventListener('sisteq:reset', handleReset);
  }, []);

  useEffect(() => {
    (globalThis as any).__SISTEQ_FLUSH_WRITES__ = async () => {
      const p = pendingServerSaveRef.current;
      if (!p) return;
      await p.catch(() => undefined);
    };
    return () => {
      try {
        delete (globalThis as any).__SISTEQ_FLUSH_WRITES__;
      } catch {
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/strategic/years', { method: 'GET', credentials: 'same-origin' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const data = json?.data;
        const nextAnoAtual = typeof data?.anoAtual === 'string' ? data.anoAtual : null;
        const nextAnos = data?.anos && typeof data.anos === 'object' ? (data.anos as YearsData) : null;
        if (!nextAnoAtual || !nextAnos) return;
        if (cancelled) return;
        const normalized = normalizeStorageStructure({ anoAtual: nextAnoAtual, anos: nextAnos }, new Date().getFullYear().toString());
        if (!normalized) return;
        setAnoAtual(normalized.anoAtual);
        setAnosData(normalized.anos);
        setDados(normalized.anos[normalized.anoAtual] || initialData);
        if (isStorageAvailable()) {
          try {
            localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify(normalized));
          } catch {
          }
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isStorageAvailable()) return;
    if (skipPersistWritesRef.current > 0) {
      skipPersistWritesRef.current -= 1;
      return;
    }
    const updated: StorageStructure = {
      anoAtual: debouncedAnoAtual,
      anos: {
        ...anosData,
        [debouncedAnoAtual]: debouncedDados,
      },
    };
    
    setAnosData(updated.anos);
    try {
      localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
    }

    try {
      if (abortSaveRef.current) abortSaveRef.current.abort();
    } catch {
    }
    const controller = new AbortController();
    abortSaveRef.current = controller;
    const savePromise = (async () => {
      try {
        const res = await fetch('/api/strategic/years', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
          signal: controller.signal,
        });
        if (!res.ok) return;
        await res.json().catch(() => null);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    })();
    pendingServerSaveRef.current = savePromise;
    savePromise.finally(() => {
      if (pendingServerSaveRef.current === savePromise) pendingServerSaveRef.current = null;
    });
  }, [debouncedDados, debouncedAnoAtual]);

  const selecionarAno = useCallback((ano: string) => {
    if (anosData[ano]) {
      setAnoAtual(ano);
      setDados(anosData[ano]);
    }
  }, [anosData]);

  const criarAnoEmBranco = useCallback((ano: string) => {
    if (anosData[ano]) {
      throw new Error(`Ano ${ano} já existe`);
    }
    
    const novosAnos = { ...anosData, [ano]: initialData };
    setAnosData(novosAnos);
    setAnoAtual(ano);
    setDados(initialData);
    
    if (isStorageAvailable()) {
      localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify({
        anoAtual: ano,
        anos: novosAnos,
      }));
    }
  }, [anosData]);

  const copiarAno = useCallback((anoOrigem: string, anoDestino: string) => {
    if (!anosData[anoOrigem]) {
      throw new Error(`Ano origem ${anoOrigem} não existe`);
    }
    if (anosData[anoDestino]) {
      throw new Error(`Ano destino ${anoDestino} já existe`);
    }

    const dadosCopiados = JSON.parse(JSON.stringify(anosData[anoOrigem]));
    const novosAnos = { ...anosData, [anoDestino]: dadosCopiados };
    
    setAnosData(novosAnos);
    setAnoAtual(anoDestino);
    setDados(dadosCopiados);
    
    if (isStorageAvailable()) {
      localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify({
        anoAtual: anoDestino,
        anos: novosAnos,
      }));
    }
  }, [anosData]);

  const removerAno = useCallback((ano: string) => {
    const anosArray = Object.keys(anosData);
    if (anosArray.length <= 1) {
      throw new Error('Não é possível remover o último ano');
    }

    const { [ano]: removed, ...restantes } = anosData;
    const novosAnos = Object.keys(restantes).sort().reverse();
    const novoAnoAtual = ano === anoAtual ? novosAnos[0] : anoAtual;

    setAnosData(restantes);
    if (ano === anoAtual) {
      setAnoAtual(novoAnoAtual);
      setDados(restantes[novoAnoAtual]);
    }
    
    if (isStorageAvailable()) {
      localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify({
        anoAtual: novoAnoAtual,
        anos: restantes,
      }));
    }
  }, [anosData, anoAtual]);

  const anosDisponiveis = useMemo(() => 
    Object.keys(anosData).sort().reverse(),
    [anosData]
  );

  const updateDirecionamento = useCallback((direcionamento: DirecionamentoEstrategico) => {
    setDados(prev => ({ ...prev, direcionamento }));
  }, []);

  const updateCenario = useCallback((cenario: CenarioOrganizacional) => {
    setDados(prev => ({ ...prev, cenario }));
  }, []);

  const addSwotItem = useCallback((item: Omit<SwotItem, 'id' | 'criadoEm' | 'numeroSwot'>) => {
    setDados(prev => {
      const prefixos: Record<string, string> = {
        'forcas': 'FOR',
        'fraquezas': 'FRA',
        'oportunidades': 'OPO',
        'ameacas': 'AME',
      };
      
      const prefixo = prefixos[item.quadrante];
      const itemsDoQuadrante = prev.swotItems.filter(i => i.quadrante === item.quadrante);
      const proximoNumero = itemsDoQuadrante.length + 1;
      const numeroSwot = `${prefixo}${proximoNumero}`;
      
      const newItem: SwotItem = {
        ...item,
        id: generateId(),
        numeroSwot,
        criadoEm: new Date().toISOString(),
      };
      
      return {
        ...prev,
        swotItems: [...prev.swotItems, newItem],
      };
    });
  }, []);

  const updateSwotItem = useCallback((id: string, updates: Partial<SwotItem>) => {
    setDados(prev => ({
      ...prev,
      swotItems: prev.swotItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  const deleteSwotItem = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      swotItems: prev.swotItems.filter(item => item.id !== id),
    }));
  }, []);

  const addParteInteressada = useCallback((parte: Omit<ParteInteressada, 'id' | 'criadoEm'>) => {
    const newParte: ParteInteressada = {
      ...parte,
      id: generateId(),
      criadoEm: new Date().toISOString(),
    };
    setDados(prev => ({
      ...prev,
      partesInteressadas: [...prev.partesInteressadas, newParte],
    }));
  }, []);

  const updateParteInteressada = useCallback((id: string, updates: Partial<ParteInteressada>) => {
    setDados(prev => ({
      ...prev,
      partesInteressadas: prev.partesInteressadas.map(parte =>
        parte.id === id ? { ...parte, ...updates } : parte
      ),
    }));
  }, []);

  const deleteParteInteressada = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      partesInteressadas: prev.partesInteressadas.filter(parte => parte.id !== id),
    }));
  }, []);

  const addObjetivoBsc = useCallback((objetivo: Omit<ObjetivoBscItem, 'id' | 'numeroObjetivo'>) => {
    setDados(prev => {
      const proximoNumero = prev.direcionamento.objetivosBsc.length + 1;
      const numeroObjetivo = `OBJ${proximoNumero}`;
      
      const novoObjetivo: ObjetivoBscItem = {
        ...objetivo,
        id: generateId(),
        numeroObjetivo,
      };
      
      return {
        ...prev,
        direcionamento: {
          ...prev.direcionamento,
          objetivosBsc: [...prev.direcionamento.objetivosBsc, novoObjetivo],
        },
      };
    });
  }, []);

  const updateObjetivoBsc = useCallback((id: string, updates: Partial<ObjetivoBscItem>) => {
    setDados(prev => ({
      ...prev,
      direcionamento: {
        ...prev.direcionamento,
        objetivosBsc: prev.direcionamento.objetivosBsc.map(objetivo =>
          objetivo.id === id ? { ...objetivo, ...updates } : objetivo
        ),
      },
    }));
  }, []);

  const removeObjetivoBsc = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      direcionamento: {
        ...prev.direcionamento,
        objetivosBsc: prev.direcionamento.objetivosBsc.filter(objetivo => objetivo.id !== id),
      },
    }));
  }, []);

  const addPlanoAcao = useCallback((plano: Omit<PlanoAcaoEstrategico, 'id' | 'criadoEm' | 'numeroPE'>) => {
    let createdPlano = undefined as unknown as PlanoAcaoEstrategico;
    
    setDados(prev => {
      const proximoNumero = prev.planosAcao.length + 1;
      const numeroPE = `PE${proximoNumero.toString().padStart(3, '0')}`;
      
      createdPlano = {
        ...plano,
        id: generateId(),
        numeroPE,
        criadoEm: new Date().toISOString(),
      } as any;
      
      return {
        ...prev,
        planosAcao: [...prev.planosAcao, createdPlano],
      };
    });

    return createdPlano;
  }, []);

  const updatePlanoAcao = useCallback((id: string, updates: Partial<PlanoAcaoEstrategico>) => {
    setDados(prev => ({
      ...prev,
      planosAcao: prev.planosAcao.map(plano =>
        plano.id === id ? { ...plano, ...updates } : plano
      ),
    }));
  }, []);

  const deletePlanoAcao = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      planosAcao: prev.planosAcao.filter(plano => plano.id !== id),
    }));
  }, []);

  const addPlanoAcoes = useCallback((plano: Omit<PlanoAcoes, 'id' | 'criadoEm' | 'numeroPE'>) => {
    let createdPlano = undefined as unknown as PlanoAcoes;
    
    setDados(prev => {
      const proximoNumero = (prev.planosAcoes || []).length + 1;
      const numeroPE = `PA${proximoNumero.toString().padStart(3, '0')}`;
      
      createdPlano = {
        ...plano,
        id: generateId(),
        numeroPE,
        criadoEm: new Date().toISOString(),
      } as any;
      
      return {
        ...prev,
        planosAcoes: [...(prev.planosAcoes || []), createdPlano],
      };
    });

    return createdPlano;
  }, []);

  const updatePlanoAcoes = useCallback((id: string, updates: Partial<PlanoAcoes>) => {
    setDados(prev => ({
      ...prev,
      planosAcoes: (prev.planosAcoes || []).map(plano =>
        plano.id === id ? { ...plano, ...updates } : plano
      ),
    }));
  }, []);

  const deletePlanoAcoes = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      planosAcoes: (prev.planosAcoes || []).filter(plano => plano.id !== id),
    }));
  }, []);

  const addRisco = useCallback((risco: Omit<Risco, 'id' | 'codigo' | 'dataCriacao' | 'ultimaRevisao' | 'revisaoAtual' | 'historicoRevisoes'>) => {
    let createdRisco = undefined as unknown as Risco;
    
    setDados(prev => {
      const proximoNumero = (prev.riscos || []).length + 1;
      const codigo = `RIS${proximoNumero.toString().padStart(3, '0')}`;
      
      createdRisco = {
        ...risco,
        id: generateId(),
        codigo,
        dataCriacao: dataHojeISO(),
        ultimaRevisao: dataHojeISO(),
        revisaoAtual: 'R1',
        historicoRevisoes: [],
      } as any;
      
      return {
        ...prev,
        riscos: [...(prev.riscos || []), createdRisco],
      };
    });

    return createdRisco;
  }, []);

  const updateRisco = useCallback((id: string, updates: Partial<Risco>) => {
    setDados(prev => ({
      ...prev,
      riscos: (prev.riscos || []).map(risco =>
        risco.id === id ? { ...risco, ...updates } : risco
      ),
    }));
  }, []);

  const deleteRisco = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      riscos: (prev.riscos || []).filter(risco => risco.id !== id),
    }));
  }, []);

  const addProcesso = useCallback((processo: Omit<Processo, 'id' | 'codigo' | 'dataCriacao' | 'ultimaAtualizacao' | 'versaoAtual' | 'versoes'> & { codigo?: string }) => {
    let createdProcesso = undefined as unknown as Processo;
    
    setDados(prev => {
      // Se o processo já vem com um código (do mapeamento), usar ele
      // Caso contrário, gerar código automático MP baseado na quantidade de processos
      let codigo: string;
      if (processo.codigo) {
        codigo = processo.codigo;
      } else {
        const proximoNumero = (prev.processos || []).length + 1;
        codigo = `MP${proximoNumero.toString().padStart(2, '0')}`;
      }
      
      createdProcesso = {
        ...processo,
        id: generateId(),
        codigo,
        dataCriacao: dataHojeISO(),
        ultimaAtualizacao: dataHojeISO(),
        versaoAtual: '1.0',
        versoes: [],
      } as any;
      
      return {
        ...prev,
        processos: [...(prev.processos || []), createdProcesso],
      };
    });

    return createdProcesso;
  }, []);

  const updateProcesso = useCallback((id: string, updates: Partial<Processo>) => {
    setDados(prev => ({
      ...prev,
      processos: (prev.processos || []).map(processo =>
        processo.id === id ? { ...processo, ...updates } : processo
      ),
    }));
  }, []);

  const deleteProcesso = useCallback((id: string) => {
    setDados(prev => ({
      ...prev,
      processos: (prev.processos || []).filter(processo => processo.id !== id),
    }));
  }, []);

  const publicarNovaVersaoProcesso = useCallback((id: string, resumoAlteracoes: string) => {
    setDados(prev => ({
      ...prev,
      processos: (prev.processos || []).map(processo => {
        if (processo.id === id) {
          const partes = processo.versaoAtual.split('.');
          const versaoMaior = parseInt(partes[0]);
          const versaoMenor = parseInt(partes[1] || '0');
          const novaVersaoStr = `${versaoMaior}.${versaoMenor + 1}`;
          const novaData = dataHojeISO();
          
          const novaVersao: VersaoProcesso = {
            id: generateId(),
            versao: processo.versaoAtual,
            dataPublicacao: processo.ultimaAtualizacao,
            publicadoPor: processo.responsavel || 'Sistema',
            mudancas: resumoAlteracoes,
            atividades: processo.atividades,
          };
          
          return {
            ...processo,
            ultimaAtualizacao: novaData,
            versaoAtual: novaVersaoStr,
            versoes: [...processo.versoes, novaVersao],
          };
        }
        return processo;
      }),
    }));
  }, []);

  const contextValue = useMemo(() => ({
    dados,
    anoAtual,
    anosDisponiveis,
    selecionarAno,
    criarAnoEmBranco,
    copiarAno,
    removerAno,
    updateDirecionamento,
    updateCenario,
    addSwotItem,
    updateSwotItem,
    deleteSwotItem,
    addParteInteressada,
    updateParteInteressada,
    deleteParteInteressada,
    addObjetivoBsc,
    updateObjetivoBsc,
    removeObjetivoBsc,
    addPlanoAcao,
    updatePlanoAcao,
    deletePlanoAcao,
    addPlanoAcoes,
    updatePlanoAcoes,
    deletePlanoAcoes,
    addRisco,
    updateRisco,
    deleteRisco,
    addProcesso,
    updateProcesso,
    deleteProcesso,
    publicarNovaVersaoProcesso,
  }), [
    dados,
    anoAtual,
    anosDisponiveis,
    selecionarAno,
    criarAnoEmBranco,
    copiarAno,
    removerAno,
    updateDirecionamento,
    updateCenario,
    addSwotItem,
    updateSwotItem,
    deleteSwotItem,
    addParteInteressada,
    updateParteInteressada,
    deleteParteInteressada,
    addObjetivoBsc,
    updateObjetivoBsc,
    removeObjetivoBsc,
    addPlanoAcao,
    updatePlanoAcao,
    deletePlanoAcao,
    addPlanoAcoes,
    updatePlanoAcoes,
    deletePlanoAcoes,
    addRisco,
    updateRisco,
    deleteRisco,
    addProcesso,
    updateProcesso,
    deleteProcesso,
    publicarNovaVersaoProcesso,
  ]);

  return (
    <StrategicContext.Provider value={contextValue}>
      {children}
    </StrategicContext.Provider>
  );
}

export function useStrategic() {
  const context = useContext(StrategicContext);
  if (!context) {
    throw new Error('useStrategic must be used within a StrategicProvider');
  }
  return context;
}
