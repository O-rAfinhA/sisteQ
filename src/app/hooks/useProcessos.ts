import { useState, useEffect } from 'react';
import { getFromStorage } from '../utils/helpers';

export interface ProcessoSimples {
  id: string;
  codigo: string;
  setor: string;
}

const STORAGE_KEY = 'sisteq-processos-mapeamento';

export function useProcessos() {
  const [processos, setProcessos] = useState<ProcessoSimples[]>([]);

  useEffect(() => {
    carregarProcessos();
  }, []);

  const carregarProcessos = () => {
    try {
      const dados = getFromStorage<any[]>(STORAGE_KEY, []);
      const processosSimplificados: ProcessoSimples[] = dados.map((p: any) => ({
        id: p.id,
        codigo: p.codigoMP || `MP${String(p.numero).padStart(2, '0')}`,
        setor: p.setor
      }));
      setProcessos(processosSimplificados);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      setProcessos([]);
    }
  };

  return { processos, recarregar: carregarProcessos };
}