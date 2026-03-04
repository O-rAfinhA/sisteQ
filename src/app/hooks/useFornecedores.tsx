import { useState, useEffect, useRef } from 'react';
import { Fornecedor, ROF, Avaliacao, ConfiguracaoFornecedores, Recebimento, PedidoCompra } from '../types/fornecedor';
import { getFromStorage } from '../utils/helpers';

const STORAGE_KEY_FORNECEDORES = 'fornecedores';
const STORAGE_KEY_ROFS = 'fornecedores_rofs';
const STORAGE_KEY_AVALIACOES = 'fornecedores_avaliacoes';
const STORAGE_KEY_CONFIG = 'fornecedores_config';
const STORAGE_KEY_RECEBIMENTOS = 'fornecedores_recebimentos';
const STORAGE_KEY_PEDIDOS = 'fornecedores_pedidos';

const configuracaoPadrao: ConfiguracaoFornecedores = {
  periodicidadePadraoCritico: 'Semestral',
  periodicidadePadraoNaoCritico: 'Anual',
  permitirAvaliacaoPersonalizada: true,
  notaMinimaAceitavel: 3,
  
  // Tipos de Fornecedores
  tiposFornecedor: [
    'Matéria-Prima',
    'Serviços',
    'Equipamentos',
    'Consultoria',
    'Transportes',
    'Produtos Químicos',
    'Materiais',
    'Outros'
  ],
  
  // Meta de avaliação por tipo (nota de 1 a 5)
  metaAvaliacaoPorTipo: {
    'Matéria-Prima': 4.0,
    'Serviços': 3.5,
    'Equipamentos': 4.0,
    'Consultoria': 3.5,
    'Transportes': 3.5,
    'Produtos Químicos': 4.5,
    'Materiais': 3.5,
    'Outros': 3.0
  },
  
  // Documentos por tipo de fornecedor
  documentosPorTipo: {
    'Matéria-Prima': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Licenças Ambientais',
      'Certificados de Qualidade',
      'Ficha Técnica do Produto'
    ],
    'Serviços': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Licenças Aplicáveis',
      'Seguro Aplicável',
      'Atestados de Capacidade Técnica'
    ],
    'Equipamentos': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Certificados do Produto',
      'Manual Técnico',
      'Garantia'
    ],
    'Consultoria': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Atestados de Capacidade Técnica',
      'Currículo dos Consultores',
      'Seguro Profissional'
    ],
    'Transportes': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'ANTT Válida',
      'Seguro de Carga',
      'Atestados de Capacidade Técnica',
      'Licenças de Veículos'
    ],
    'Produtos Químicos': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Licenças Ambientais',
      'FISPQ (Ficha de Informações de Segurança)',
      'Certificados de Análise',
      'Autorização de Funcionamento ANVISA',
      'Laudo de Qualidade'
    ],
    'Materiais': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Certificados de Qualidade',
      'Laudos Técnicos',
      'Garantia'
    ],
    'Outros': [
      'CNPJ Ativo',
      'Certidões Válidas',
      'Licenças Aplicáveis'
    ]
  },
  
  criteriosHomologacao: [
    'Capacidade produtiva',
    'Reconhecimento de mercado',
    'Amostra do produto',
    'Avaliação do primeiro serviço',
    'Prazo de entrega prometido'
  ],
  habilitarPedidoCompras: true
};

export function useFornecedores() {
  // Inicialização lazy: lê do localStorage durante a criação do state (síncrono, sem flash)
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() =>
    getFromStorage<Fornecedor[]>(STORAGE_KEY_FORNECEDORES, [])
  );
  const [rofs, setRofs] = useState<ROF[]>(() =>
    getFromStorage<ROF[]>(STORAGE_KEY_ROFS, [])
  );
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>(() =>
    getFromStorage<Avaliacao[]>(STORAGE_KEY_AVALIACOES, [])
  );
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>(() =>
    getFromStorage<Recebimento[]>(STORAGE_KEY_RECEBIMENTOS, [])
  );
  const [configuracao, setConfiguracao] = useState<ConfiguracaoFornecedores>(() => {
    const configData = getFromStorage<ConfiguracaoFornecedores | null>(STORAGE_KEY_CONFIG, null);
    if (configData) {
      return {
        ...configuracaoPadrao,
        ...configData,
        metaAvaliacaoPorTipo: {
          ...configuracaoPadrao.metaAvaliacaoPorTipo,
          ...(configData.metaAvaliacaoPorTipo || {})
        }
      };
    }
    return configuracaoPadrao;
  });
  const [pedidos, setPedidos] = useState<PedidoCompra[]>(() =>
    getFromStorage<PedidoCompra[]>(STORAGE_KEY_PEDIDOS, [])
  );

  // Guard: impede que os efeitos de salvamento disparem no primeiro render
  const isLoadedRef = useRef(false);
  useEffect(() => {
    isLoadedRef.current = true;
  }, []);

  // Salvar fornecedores
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY_FORNECEDORES, JSON.stringify(fornecedores));
  }, [fornecedores]);

  // Salvar ROFs
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY_ROFS, JSON.stringify(rofs));
  }, [rofs]);

  // Salvar avaliações
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY_AVALIACOES, JSON.stringify(avaliacoes));
  }, [avaliacoes]);

  // Salvar recebimentos
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY_RECEBIMENTOS, JSON.stringify(recebimentos));
  }, [recebimentos]);

  // Salvar configuração
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configuracao));
  }, [configuracao]);

  // Salvar pedidos
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(pedidos));
  }, [pedidos]);

  // Gerar próximo número ROF
  const gerarNumeroROF = (): string => {
    const numeros = rofs
      .map(r => parseInt(r.numero.replace('ROF', '')))
      .filter(n => !isNaN(n));
    const maiorNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    return `ROF${String(maiorNumero + 1).padStart(3, '0')}`;
  };

  // CRUD Fornecedores
  const addFornecedor = (fornecedor: Omit<Fornecedor, 'id' | 'dataCadastro' | 'dataUltimaAtualizacao' | 'ativo' | 'avaliacoes' | 'rofs'>) => {
    const novoFornecedor: Fornecedor = {
      ...fornecedor,
      id: crypto.randomUUID(),
      dataCadastro: new Date().toISOString(),
      dataUltimaAtualizacao: new Date().toISOString(),
      ativo: true,
      avaliacoes: [],
      rofs: []
    };
    setFornecedores(prev => [...prev, novoFornecedor]);
    return novoFornecedor;
  };

  const updateFornecedor = (id: string, dados: Partial<Fornecedor>) => {
    setFornecedores(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, ...dados, dataUltimaAtualizacao: new Date().toISOString() }
          : f
      )
    );
  };

  const deleteFornecedor = (id: string) => {
    setFornecedores(prev => prev.filter(f => f.id !== id));
  };

  const getFornecedorById = (id: string): Fornecedor | undefined => {
    return fornecedores.find(f => f.id === id);
  };

  // CRUD ROFs
  const addROF = (rof: Omit<ROF, 'id' | 'numero' | 'dataAbertura'>) => {
    const novaROF: ROF = {
      ...rof,
      id: crypto.randomUUID(),
      numero: gerarNumeroROF(),
      dataAbertura: new Date().toISOString()
    };
    setRofs(prev => [...prev, novaROF]);
    
    // Adicionar ROF ao fornecedor
    updateFornecedor(rof.fornecedorId, {
      rofs: [...(getFornecedorById(rof.fornecedorId)?.rofs || []), novaROF.id]
    });
    
    return novaROF;
  };

  const updateROF = (id: string, dados: Partial<ROF>) => {
    setRofs(prev =>
      prev.map(r => (r.id === id ? { ...r, ...dados } : r))
    );
  };

  const deleteROF = (id: string) => {
    const rof = rofs.find(r => r.id === id);
    if (rof) {
      // Remover do fornecedor
      const fornecedor = getFornecedorById(rof.fornecedorId);
      if (fornecedor) {
        updateFornecedor(fornecedor.id, {
          rofs: fornecedor.rofs.filter(rofId => rofId !== id)
        });
      }
    }
    setRofs(prev => prev.filter(r => r.id !== id));
  };

  const getROFsByFornecedor = (fornecedorId: string): ROF[] => {
    return rofs.filter(r => r.fornecedorId === fornecedorId);
  };

  // CRUD Avaliações
  const addAvaliacao = (avaliacao: Omit<Avaliacao, 'id' | 'notaFinal'>) => {
    const notaFinal = (
      avaliacao.criterios.qualidade +
      avaliacao.criterios.prazo +
      avaliacao.criterios.atendimento +
      avaliacao.criterios.conformidadeDocumental
    ) / 4;

    const novaAvaliacao: Avaliacao = {
      ...avaliacao,
      id: crypto.randomUUID(),
      notaFinal: Math.round(notaFinal * 10) / 10
    };

    setAvaliacoes(prev => [...prev, novaAvaliacao]);

    // Atualizar fornecedor
    const fornecedor = getFornecedorById(avaliacao.fornecedorId);
    if (fornecedor) {
      const todasAvaliacoes = [...fornecedor.avaliacoes, novaAvaliacao];
      const notaMedia = todasAvaliacoes.reduce((acc, a) => acc + a.notaFinal, 0) / todasAvaliacoes.length;
      
      // Calcular próxima avaliação
      let proximaAvaliacao: string | undefined;
      const dataAtual = new Date(avaliacao.data);
      
      if (fornecedor.periodicidadeAvaliacao === 'Semestral') {
        dataAtual.setMonth(dataAtual.getMonth() + 6);
        proximaAvaliacao = dataAtual.toISOString();
      } else if (fornecedor.periodicidadeAvaliacao === 'Anual') {
        dataAtual.setFullYear(dataAtual.getFullYear() + 1);
        proximaAvaliacao = dataAtual.toISOString();
      } else if (fornecedor.periodicidadeAvaliacao === 'Personalizado' && fornecedor.diasPersonalizados) {
        dataAtual.setDate(dataAtual.getDate() + fornecedor.diasPersonalizados);
        proximaAvaliacao = dataAtual.toISOString();
      }

      updateFornecedor(avaliacao.fornecedorId, {
        avaliacoes: todasAvaliacoes,
        notaMedia: Math.round(notaMedia * 10) / 10,
        proximaAvaliacao
      });
    }

    return novaAvaliacao;
  };

  const getAvaliacoesByFornecedor = (fornecedorId: string): Avaliacao[] => {
    return avaliacoes.filter(a => a.fornecedorId === fornecedorId);
  };

  const updateAvaliacao = (id: string, dados: Partial<Avaliacao>) => {
    setAvaliacoes(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        
        const avaliacaoAtualizada = { ...a, ...dados };
        
        // Recalcular nota final se os critérios mudaram
        if (dados.criterios) {
          const notaFinal = (
            avaliacaoAtualizada.criterios.qualidade +
            avaliacaoAtualizada.criterios.prazo +
            avaliacaoAtualizada.criterios.atendimento +
            avaliacaoAtualizada.criterios.conformidadeDocumental
          ) / 4;
          avaliacaoAtualizada.notaFinal = Math.round(notaFinal * 10) / 10;
        }
        
        return avaliacaoAtualizada;
      })
    );

    // Atualizar fornecedor
    const avaliacao = avaliacoes.find(a => a.id === id);
    if (avaliacao) {
      const fornecedor = getFornecedorById(avaliacao.fornecedorId);
      if (fornecedor) {
        const todasAvaliacoes = fornecedor.avaliacoes.map(a => 
          a.id === id ? { ...a, ...dados } : a
        );
        const notaMedia = todasAvaliacoes.reduce((acc, a) => acc + a.notaFinal, 0) / todasAvaliacoes.length;
        
        updateFornecedor(avaliacao.fornecedorId, {
          avaliacoes: todasAvaliacoes,
          notaMedia: Math.round(notaMedia * 10) / 10
        });
      }
    }
  };

  const deleteAvaliacao = (id: string) => {
    const avaliacao = avaliacoes.find(a => a.id === id);
    if (avaliacao) {
      // Remover do fornecedor
      const fornecedor = getFornecedorById(avaliacao.fornecedorId);
      if (fornecedor) {
        const avaliacoesAtualizadas = fornecedor.avaliacoes.filter(a => a.id !== id);
        const notaMedia = avaliacoesAtualizadas.length > 0
          ? avaliacoesAtualizadas.reduce((acc, a) => acc + a.notaFinal, 0) / avaliacoesAtualizadas.length
          : 0;
        
        updateFornecedor(avaliacao.fornecedorId, {
          avaliacoes: avaliacoesAtualizadas,
          notaMedia: Math.round(notaMedia * 10) / 10
        });
      }
    }
    setAvaliacoes(prev => prev.filter(a => a.id !== id));
  };

  // Configurações
  const updateConfiguracao = (dados: Partial<ConfiguracaoFornecedores>) => {
    setConfiguracao(prev => ({ ...prev, ...dados }));
  };

  // CRUD Recebimentos
  const gerarNumeroRecebimento = (): number => {
    if (recebimentos.length === 0) return 1;
    return Math.max(...recebimentos.map(r => r.numero)) + 1;
  };

  const addRecebimento = (dados: Omit<Recebimento, 'id' | 'numero' | 'dataCriacao' | 'rofId' | 'rofNumero'>): Recebimento => {
    const novoRecebimento: Recebimento = {
      ...dados,
      id: crypto.randomUUID(),
      numero: gerarNumeroRecebimento(),
      dataCriacao: new Date().toISOString()
    };

    // Se qualidade ≠ Aprovado, criar ROF automaticamente
    if (dados.qualidade !== 'Aprovado' && dados.rofData) {
      const novaROF = addROF({
        fornecedorId: dados.fornecedorId,
        fornecedorNome: dados.fornecedorNome,
        tipo: dados.rofData.tipo,
        gravidade: dados.rofData.gravidade,
        descricao: dados.rofData.descricao,
        acaoImediata: dados.rofData.acaoImediata,
        responsavel: dados.rofData.responsavel,
        status: 'Aberta'
      });
      novoRecebimento.rofId = novaROF.id;
      novoRecebimento.rofNumero = novaROF.numero;
    }

    setRecebimentos(prev => [...prev, novoRecebimento]);
    return novoRecebimento;
  };

  const updateRecebimento = (id: string, dados: Partial<Recebimento>) => {
    setRecebimentos(prev =>
      prev.map(r => (r.id === id ? { ...r, ...dados } : r))
    );
  };

  const deleteRecebimento = (id: string) => {
    setRecebimentos(prev => prev.filter(r => r.id !== id));
  };

  const getRecebimentosByFornecedor = (fornecedorId: string): Recebimento[] => {
    return recebimentos.filter(r => r.fornecedorId === fornecedorId);
  };

  // CRUD Pedidos
  const gerarNumeroPedido = (): number => {
    if (pedidos.length === 0) return 1;
    return Math.max(...pedidos.map(p => p.numero)) + 1;
  };

  const addPedido = (dados: Omit<PedidoCompra, 'id' | 'numero' | 'dataCriacao'>): PedidoCompra => {
    const novoPedido: PedidoCompra = {
      ...dados,
      id: crypto.randomUUID(),
      numero: gerarNumeroPedido(),
      dataCriacao: new Date().toISOString()
    };

    setPedidos(prev => [...prev, novoPedido]);
    return novoPedido;
  };

  const updatePedido = (id: string, dados: Partial<PedidoCompra>) => {
    setPedidos(prev =>
      prev.map(p => (p.id === id ? { ...p, ...dados } : p))
    );
  };

  const deletePedido = (id: string) => {
    setPedidos(prev => prev.filter(p => p.id !== id));
  };

  const getPedidosByFornecedor = (fornecedorId: string): PedidoCompra[] => {
    return pedidos.filter(p => p.fornecedorId === fornecedorId);
  };

  // Estatísticas
  const getEstatisticas = () => {
    const total = fornecedores.length;
    const criticos = fornecedores.filter(f => f.criticidade === 'Crítico').length;
    const emHomologacao = fornecedores.filter(f => f.status === 'Em Homologação').length;
    const bloqueados = fornecedores.filter(f => f.status === 'Bloqueado').length;

    // Avaliações vencidas
    const hoje = new Date();
    const avaliacoesVencidas = fornecedores.filter(f => {
      if (!f.proximaAvaliacao) return false;
      return new Date(f.proximaAvaliacao) < hoje;
    }).length;

    // Avaliações próximas de vencer (dentro de 30 dias)
    const avaliacoesProximas = fornecedores.filter(f => {
      if (!f.proximaAvaliacao) return false;
      const prox = new Date(f.proximaAvaliacao);
      const diff = Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;

    // Avaliações pendentes (homologado mas sem próxima avaliação agendada)
    const avaliacoesPendentes = fornecedores.filter(f => {
      if (f.proximaAvaliacao) return false;
      return (
        f.status === 'Homologado' || 
        f.status === 'Homologado com Restrição' || 
        f.avaliacoes.length > 0
      );
    }).length;

    // ROFs abertas
    const rofsAbertas = rofs.filter(r => r.status === 'Aberta' || r.status === 'Em Tratamento').length;

    // Documentos vencidos (contar fornecedores com pelo menos 1 doc vencido)
    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);
    let documentosVencidos = 0;
    let fornecedoresComDocsVencidos = 0;
    let fornecedoresComDocsPendentes = 0;
    fornecedores.forEach(f => {
      if (f.homologacao?.analiseDocumental) {
        const docs = Object.values(f.homologacao.analiseDocumental);
        const aplicaveis = docs.filter(d => d.status === 'Aplicável');
        
        let temDocVencido = false;
        let temDocPendente = false;
        
        aplicaveis.forEach(doc => {
          if (doc.dataValidade) {
            const validade = new Date(doc.dataValidade);
            validade.setHours(0, 0, 0, 0);
            if (validade < hojeDate) {
              documentosVencidos++;
              temDocVencido = true;
            }
          }
          if (!doc.conforme) {
            temDocPendente = true;
          }
        });
        
        if (temDocVencido) fornecedoresComDocsVencidos++;
        if (temDocPendente && !temDocVencido) fornecedoresComDocsPendentes++;
      }
    });

    return {
      total,
      criticos,
      emHomologacao,
      bloqueados,
      avaliacoesVencidas,
      avaliacoesProximas,
      avaliacoesPendentes,
      documentosVencidos,
      fornecedoresComDocsVencidos,
      fornecedoresComDocsPendentes,
      rofsAbertas
    };
  };

  return {
    fornecedores,
    rofs,
    avaliacoes,
    recebimentos,
    pedidos,
    configuracao,
    addFornecedor,
    updateFornecedor,
    deleteFornecedor,
    getFornecedorById,
    addROF,
    updateROF,
    deleteROF,
    getROFsByFornecedor,
    addAvaliacao,
    getAvaliacoesByFornecedor,
    updateAvaliacao,
    deleteAvaliacao,
    addRecebimento,
    updateRecebimento,
    deleteRecebimento,
    getRecebimentosByFornecedor,
    updateConfiguracao,
    getEstatisticas,
    addPedido,
    updatePedido,
    deletePedido,
    getPedidosByFornecedor
  };
}