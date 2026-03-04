import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Search, AlertTriangle, TrendingUp, X, Plus, HelpCircle, ClipboardList, Target, Award, Circle, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { generateId, getFromStorage } from '../utils/helpers';
import { Colaborador } from '../types/config';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

// Tipos
interface Atividade {
  id: string;
  nome: string;
  processo: string;
  ordem: number;
}

interface QualificacaoColaborador {
  colaboradorId: string;
  atividadeId: string;
  nivel: 1 | 2 | 3 | 4;
  dataUltimaAtualizacao: string;
}

interface ProcessoGrupo {
  nome: string;
  atividades: Atividade[];
}

const NIVEIS_CONFIG = {
  1: { 
    label: 'Não qualificado', 
    cor: '#f3f4f6',
    corTexto: '#9ca3af',
    corBorda: '#e5e7eb',
    icone: Circle,
    badge: 'bg-gray-100 text-gray-600 border-gray-300'
  },
  2: { 
    label: 'Em qualificação', 
    cor: '#fef3c7',
    corTexto: '#f59e0b',
    corBorda: '#fde68a',
    icone: Target,
    badge: 'bg-amber-100 text-amber-700 border-amber-300'
  },
  3: { 
    label: 'Executa sem auxílio', 
    cor: '#dbeafe',
    corTexto: '#3b82f6',
    corBorda: '#bfdbfe',
    icone: CheckCircle2,
    badge: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  4: { 
    label: 'Executa e treina', 
    cor: '#d1fae5',
    corTexto: '#10b981',
    corBorda: '#a7f3d0',
    icone: Award,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  }
};

export function MatrizQualificacao() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [qualificacoes, setQualificacoes] = useState<QualificacaoColaborador[]>([]);
  const [processos, setProcessos] = useState<ProcessoGrupo[]>([]);
  
  // Filtros
  const [filtroFuncao, setFiltroFuncao] = useState<string>('todos');
  const [filtroProcesso, setFiltroProcesso] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'com-gap' | 'sem-gap'>('todos');
  const [busca, setBusca] = useState('');

  // UI States
  const [showCriarAtividade, setShowCriarAtividade] = useState(false);
  const [isClosingCriarAtividade, setIsClosingCriarAtividade] = useState(false);
  const [showAjuda, setShowAjuda] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{colaboradorId: string, atividadeId: string} | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [showFormularioPlano, setShowFormularioPlano] = useState(false);
  const [isClosingFormularioPlano, setIsClosingFormularioPlano] = useState(false);

  // Formulário
  const [novaAtividade, setNovaAtividade] = useState({
    nome: '',
    processo: ''
  });

  const [formularioPlano, setFormularioPlano] = useState({
    colaboradorId: '',
    atividadeId: '',
    prazoQualificacao: '',
    responsavelInstrutor: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const fecharModalCriarAtividade = useCallback(() => {
    if (isClosingCriarAtividade) return;
    setIsClosingCriarAtividade(true);
    window.setTimeout(() => {
      setShowCriarAtividade(false);
      setIsClosingCriarAtividade(false);
    }, 200);
  }, [isClosingCriarAtividade]);

  const resetFormularioPlano = useCallback(() => {
    setFormularioPlano({
      colaboradorId: '',
      atividadeId: '',
      prazoQualificacao: '',
      responsavelInstrutor: '',
      observacoes: ''
    });
  }, []);

  const fecharModalFormularioPlano = useCallback(() => {
    if (isClosingFormularioPlano) return;
    setIsClosingFormularioPlano(true);
    window.setTimeout(() => {
      setShowFormularioPlano(false);
      setIsClosingFormularioPlano(false);
      resetFormularioPlano();
    }, 200);
  }, [isClosingFormularioPlano, resetFormularioPlano]);

  useEffect(() => {
    if (!showCriarAtividade) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      fecharModalCriarAtividade();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showCriarAtividade, fecharModalCriarAtividade]);

  useEffect(() => {
    if (!showFormularioPlano) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      fecharModalFormularioPlano();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showFormularioPlano, fecharModalFormularioPlano]);

  const carregarDados = () => {
    const cols = getFromStorage<Colaborador[]>('sisteq-colaboradores', []);
    setColaboradores(cols.filter((c: Colaborador) => c.status === 'ativo'));

    const ativs = getFromStorage<Atividade[]>('sisteq-matriz-atividades', criarAtividadesIniciais());
    setAtividades(ativs);

    const quals = getFromStorage<QualificacaoColaborador[]>('sisteq-matriz-qualificacoes', []);
    setQualificacoes(quals);

    agruparPorProcesso(ativs);
  };

  const criarAtividadesIniciais = (): Atividade[] => {
    const atividadesIniciais: Atividade[] = [
      { id: 'ativ-001', nome: 'Prospecção', processo: 'COMERCIAL', ordem: 1 },
      { id: 'ativ-002', nome: 'Elaboração de Proposta', processo: 'COMERCIAL', ordem: 2 },
      { id: 'ativ-003', nome: 'Negociação', processo: 'COMERCIAL', ordem: 3 },
      { id: 'ativ-004', nome: 'Fechamento', processo: 'COMERCIAL', ordem: 4 },
      
      { id: 'ativ-005', nome: 'Solicitação de Compra', processo: 'COMPRAS', ordem: 1 },
      { id: 'ativ-006', nome: 'Avaliação de Fornecedor', processo: 'COMPRAS', ordem: 2 },
      { id: 'ativ-007', nome: 'Negociação', processo: 'COMPRAS', ordem: 3 },
      { id: 'ativ-008', nome: 'Recebimento', processo: 'COMPRAS', ordem: 4 },
      
      { id: 'ativ-009', nome: 'Teste de Equipamento', processo: 'LABORATÓRIO', ordem: 1 },
      { id: 'ativ-010', nome: 'Calibração', processo: 'LABORATÓRIO', ordem: 2 },
      { id: 'ativ-011', nome: 'Análise de Qualidade', processo: 'LABORATÓRIO', ordem: 3 },
      { id: 'ativ-012', nome: 'Embalagem', processo: 'LABORATÓRIO', ordem: 4 },
      
      { id: 'ativ-013', nome: 'Operação de Máquinas', processo: 'PRODUÇÃO', ordem: 1 },
      { id: 'ativ-014', nome: 'Controle de Processo', processo: 'PRODUÇÃO', ordem: 2 },
      { id: 'ativ-015', nome: 'Inspeção', processo: 'PRODUÇÃO', ordem: 3 },
      
      { id: 'ativ-016', nome: 'Planejamento Estratégico', processo: 'DIREÇÃO', ordem: 1 },
      { id: 'ativ-017', nome: 'Gestão de Indicadores', processo: 'DIREÇÃO', ordem: 2 },
      { id: 'ativ-018', nome: 'Análise Crítica', processo: 'DIREÇÃO', ordem: 3 }
    ];

    localStorage.setItem('sisteq-matriz-atividades', JSON.stringify(atividadesIniciais));
    return atividadesIniciais;
  };

  const agruparPorProcesso = (ativs: Atividade[]) => {
    const grupos = ativs.reduce((acc, ativ) => {
      if (!acc[ativ.processo]) {
        acc[ativ.processo] = [];
      }
      acc[ativ.processo].push(ativ);
      return acc;
    }, {} as Record<string, Atividade[]>);

    const processosOrdenados = Object.entries(grupos)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nome, atividades]) => ({
        nome,
        atividades: atividades.sort((a, b) => a.ordem - b.ordem)
      }));

    setProcessos(processosOrdenados);
  };

  const getNivelQualificacao = (colaboradorId: string, atividadeId: string): number => {
    const qual = qualificacoes.find(
      q => q.colaboradorId === colaboradorId && q.atividadeId === atividadeId
    );
    return qual?.nivel || 1;
  };

  const setNivelQualificacao = (colaboradorId: string, atividadeId: string, nivel: 1 | 2 | 3 | 4) => {
    const novasQualificacoes = [...qualificacoes];
    const index = novasQualificacoes.findIndex(
      q => q.colaboradorId === colaboradorId && q.atividadeId === atividadeId
    );

    const novaQual: QualificacaoColaborador = {
      colaboradorId,
      atividadeId,
      nivel,
      dataUltimaAtualizacao: new Date().toISOString()
    };

    if (index >= 0) {
      novasQualificacoes[index] = novaQual;
    } else {
      novasQualificacoes.push(novaQual);
    }

    setQualificacoes(novasQualificacoes);
    localStorage.setItem('sisteq-matriz-qualificacoes', JSON.stringify(novasQualificacoes));
    setSelectedCell(null);
    toast.success('Nível atualizado');
  };

  const atividadeEmRisco = (atividadeId: string): boolean => {
    const qualificados = qualificacoes.filter(
      q => q.atividadeId === atividadeId && (q.nivel === 3 || q.nivel === 4)
    );
    return qualificados.length < 2;
  };

  const calcularEstatisticasColaborador = (colaboradorId: string) => {
    const qualsDoColaborador = qualificacoes.filter(q => q.colaboradorId === colaboradorId);
    const gaps = qualsDoColaborador.filter(q => q.nivel <= 2).length;
    const qualificados = qualsDoColaborador.filter(q => q.nivel >= 3).length;
    
    return { gaps, qualificados };
  };

  const estatisticasGerais = useMemo(() => {
    const totalAtividades = atividades.length;
    const atividadesComRisco = atividades.filter(a => atividadeEmRisco(a.id)).length;
    const totalQualificacoes = qualificacoes.filter(q => q.nivel >= 3).length;
    const totalPossivel = colaboradores.length * atividades.length;
    const percentualGeral = totalPossivel > 0 ? Math.round((totalQualificacoes / totalPossivel) * 100) : 0;
    const totalGaps = qualificacoes.filter(q => q.nivel <= 2).length;

    // Contar planos de qualificação gerados da MQ
    const planos = getFromStorage<any[]>('planos-qualificacao', []);
    const planosGerados = planos.filter((p: any) => p.origem === 'Matriz de Qualificação').length;

    return { totalAtividades, atividadesComRisco, percentualGeral, totalGaps, planosGerados };
  }, [atividades, qualificacoes, colaboradores]);

  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter(col => {
      if (filtroFuncao !== 'todos' && col.funcao !== filtroFuncao) return false;
      if (busca && !col.nomeCompleto.toLowerCase().includes(busca.toLowerCase())) return false;
      
      if (filtroStatus !== 'todos') {
        const stats = calcularEstatisticasColaborador(col.id);
        if (filtroStatus === 'com-gap' && stats.gaps === 0) return false;
        if (filtroStatus === 'sem-gap' && stats.gaps > 0) return false;
      }

      return true;
    });
  }, [colaboradores, filtroFuncao, busca, filtroStatus, qualificacoes]);

  const atividadesFiltradas = useMemo(() => {
    if (filtroProcesso === 'todos') return atividades;
    return atividades.filter(a => a.processo === filtroProcesso);
  }, [atividades, filtroProcesso]);

  const funcoesUnicas = useMemo(() => {
    return Array.from(new Set(colaboradores.map(c => c.funcao))).sort();
  }, [colaboradores]);

  const processosUnicos = useMemo(() => {
    return Array.from(new Set(atividades.map(a => a.processo))).sort();
  }, [atividades]);

  const adicionarAtividade = () => {
    if (!novaAtividade.nome || !novaAtividade.processo) {
      toast.error('Preencha todos os campos');
      return;
    }

    const atividadesDoProcesso = atividades.filter(a => a.processo === novaAtividade.processo);
    const novaOrdem = atividadesDoProcesso.length + 1;

    const atividade: Atividade = {
      id: generateId('ativ-'),
      nome: novaAtividade.nome,
      processo: novaAtividade.processo,
      ordem: novaOrdem
    };

    const novasAtividades = [...atividades, atividade];
    setAtividades(novasAtividades);
    localStorage.setItem('sisteq-matriz-atividades', JSON.stringify(novasAtividades));
    agruparPorProcesso(novasAtividades);

    setNovaAtividade({ nome: '', processo: '' });
    fecharModalCriarAtividade();
    toast.success('Atividade adicionada');
  };

  const gerarPlanoQualificacao = (colaboradorId: string, atividadeId: string) => {
    const colaborador = colaboradores.find(c => c.id === colaboradorId);
    const atividade = atividades.find(a => a.id === atividadeId);
    const nivelAtual = getNivelQualificacao(colaboradorId, atividadeId);

    if (!colaborador || !atividade) return;

    // Buscar planos existentes para gerar numeração PE
    const planos = getFromStorage<any[]>('planos-qualificacao', []);
    
    // Gerar número PE sequencial
    const maxNum = planos.reduce((max: number, p: any) => {
      const num = parseInt(p.numeroPE.replace('PE-', ''));
      return num > max ? num : max;
    }, 0);
    const numeroPE = `PE-${String(maxNum + 1).padStart(4, '0')}`;

    // Determinar descrição do nível
    const descricaoNivel = nivelAtual === 1 ? 'Não qualificado' : 'Em qualificação';

    // Criar plano na estrutura correta do PlanoQualificacao
    const novoPlano = {
      id: generateId(),
      numeroPE,
      nome: `Qualificação: ${atividade.nome} - ${colaborador.nomeCompleto}`,
      motivo: 'Qualificação MQ',
      tipo: 'Qualificação Interno',
      instituicao: '',
      previsaoData: '',
      status: 'Planejado',
      dataConclusao: '',
      prazoAvaliacaoEficacia: '',
      necessitaAvaliacaoEficacia: true,
      eficaz: null,
      evidencia: '',
      dataAvaliacao: '',
      avaliadorNome: '',
      pessoas: [colaboradorId],
      dataCriacao: new Date().toISOString(),
      // Campos extras para rastreamento
      origem: 'Matriz de Qualificação',
      atividadeId,
      atividadeNome: atividade.nome,
      processo: atividade.processo,
      nivelAtual,
      nivelEsperado: 3
    };

    planos.push(novoPlano);
    localStorage.setItem('planos-qualificacao', JSON.stringify(planos));

    toast.success('Plano de Qualificação gerado com sucesso!');
    setSelectedCell(null);
  };

  const CelulaQualificacao = ({ colaboradorId, atividadeId }: { colaboradorId: string, atividadeId: string }) => {
    const nivel = getNivelQualificacao(colaboradorId, atividadeId);
    const config = NIVEIS_CONFIG[nivel as 1 | 2 | 3 | 4];
    const isSelected = selectedCell?.colaboradorId === colaboradorId && selectedCell?.atividadeId === atividadeId;
    const isHovered = hoveredCell === `${colaboradorId}-${atividadeId}`;
    const temGap = nivel <= 2;
    const Icone = config.icone;

    // Verificar se existe plano de qualificação vinculado
    const planosVinc = getFromStorage<any[]>('planos-qualificacao', []);
    const temPlanoVinculado = planosVinc.some((p: any) => 
      p.origem === 'Matriz de Qualificação' && 
      p.atividadeId === atividadeId && 
      p.pessoas?.includes(colaboradorId)
    );

    return (
      <div
        className={`relative group cursor-pointer transition-all duration-150 h-14 ${ 
          isSelected ? 'ring-2 ring-offset-1 ring-blue-500 z-10' : ''
        }`}
        style={{ 
          backgroundColor: config.cor,
          borderLeft: `2px solid ${config.corBorda}`
        }}
        onClick={() => setSelectedCell({ colaboradorId, atividadeId })}
        onMouseEnter={() => setHoveredCell(`${colaboradorId}-${atividadeId}`)}
        onMouseLeave={() => setHoveredCell(null)}
      >
        <div className="flex items-center justify-center h-full">
          <Icone 
            className={`w-4 h-4 transition-transform ${isHovered ? 'scale-125' : ''}`} 
            style={{ color: config.corTexto }}
            strokeWidth={2.5}
          />
        </div>

        {/* Tooltip */}
        {isHovered && !isSelected && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
              <div className="font-semibold text-[11px]">{config.label}</div>
              {temPlanoVinculado && (
                <div className="text-[10px] text-green-300 mt-0.5">✓ Plano gerado</div>
              )}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de GAP ou Plano Vinculado */}
        {temGap && !isSelected && (
          <div className="absolute -top-0.5 -right-0.5">
            <div 
              className={`w-2 h-2 rounded-full border border-white shadow-sm ${
                temPlanoVinculado ? 'bg-green-500' : 'bg-amber-500'
              }`}
              title={temPlanoVinculado ? 'Plano de Qualificação gerado' : 'Gap de qualificação'}
            ></div>
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
              Matriz de Qualificação
            </h1>
            <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Mapeamento de competências por colaborador
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-8">
            <Button
              variant="outline"
              onClick={() => setShowAjuda(true)}
              className="gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Ajuda
            </Button>
            <Button
              onClick={() => setShowCriarAtividade(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Atividade
            </Button>
          </div>
        </div>

        {/* KPIs Compactos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{estatisticasGerais.totalAtividades}</span>
            </div>
            <div className="text-xs font-medium text-gray-600">Total de Atividades</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-2xl text-red-600" style={{ fontWeight: 700 }}>{estatisticasGerais.atividadesComRisco}</span>
            </div>
            <div className="text-xs font-medium text-gray-600">Atividades em Risco</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Menos de 2 qualificados</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl text-emerald-600" style={{ fontWeight: 700 }}>{estatisticasGerais.percentualGeral}%</span>
            </div>
            <div className="text-xs font-medium text-gray-600">Cobertura Geral</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Qualificações ativas</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl text-amber-600" style={{ fontWeight: 700 }}>{estatisticasGerais.totalGaps}</span>
            </div>
            <div className="text-xs font-medium text-gray-600">GAPs Identificados</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Necessitam ação</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-2xl text-green-600" style={{ fontWeight: 700 }}>{estatisticasGerais.planosGerados}</span>
            </div>
            <div className="text-xs font-medium text-gray-600">Planos Gerados</div>
            <div className="text-[10px] text-gray-500 mt-0.5">MQ</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar colaborador..."
                className="w-56"
              />
            </div>

            <select
              value={filtroFuncao}
              onChange={(e) => setFiltroFuncao(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="todos">Todas as Funções</option>
              {funcoesUnicas.map(func => (
                <option key={func} value={func}>{func}</option>
              ))}
            </select>

            <select
              value={filtroProcesso}
              onChange={(e) => setFiltroProcesso(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="todos">Todos os Processos</option>
              {processosUnicos.map(proc => (
                <option key={proc} value={proc}>{proc}</option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="todos">Todos os Status</option>
              <option value="com-gap">Com GAP</option>
              <option value="sem-gap">Sem GAP</option>
            </select>
          </div>
        </div>

        {/* Legenda */}
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center gap-5 flex-wrap">
            <span className="font-semibold text-gray-900 text-xs">Níveis:</span>
            {Object.entries(NIVEIS_CONFIG).map(([nivel, config]) => {
              const Icone = config.icone;
              return (
                <div key={nivel} className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{ 
                      backgroundColor: config.cor,
                      borderColor: config.corBorda
                    }}
                  >
                    <Icone className="w-4 h-4" style={{ color: config.corTexto }} strokeWidth={2.5} />
                  </div>
                  <span className="text-xs text-gray-700">
                    <span className="font-semibold">{nivel}</span> - {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Matriz Heat Map */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header da Matriz - VERTICAL COM SUBDIVISÃO */}
              <div className="flex border-b-2 border-gray-200 bg-gray-50/60">
                <div className="w-56 flex-shrink-0 px-3 py-2 text-sm text-gray-900 border-r-2 border-gray-200 flex items-end" style={{ fontWeight: 500 }}>
                  Colaborador
                </div>
                <div className="flex-1 flex">
                  {atividadesFiltradas.map((atividade) => {
                    const emRisco = atividadeEmRisco(atividade.id);
                    
                    return (
                      <div
                        key={atividade.id}
                        className={`flex-1 min-w-[50px] max-w-[50px] border-r border-gray-200 relative ${
                          emRisco ? 'bg-red-50' : ''
                        }`}
                      >
                        {/* Ícone de Risco no topo absoluto */}
                        {emRisco && (
                          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                          </div>
                        )}
                        
                        {/* Container dividido em 2 subcolunas (SEM linha visível) */}
                        <div className="flex h-40">
                          {/* Subcoluna 1: ATIVIDADE (esquerda) - texto de BAIXO para CIMA */}
                          <div className="w-1/2 flex items-end justify-center py-3 px-0.5">
                            <div 
                              className="text-[11px] font-normal text-gray-900"
                              style={{ 
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)'
                              }}
                            >
                              {atividade.nome}
                            </div>
                          </div>
                          
                          {/* Subcoluna 2: PROCESSO (direita) - texto de BAIXO para CIMA */}
                          <div className="w-1/2 flex items-end justify-center py-3 px-0.5">
                            <div 
                              className="text-[9px] font-normal text-gray-400"
                              style={{ 
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)'
                              }}
                            >
                              {atividade.processo}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Header da coluna de contadores (direita) */}
                <div className="w-48 flex-shrink-0 px-3 py-2 text-sm text-gray-900 border-l-2 border-gray-200" style={{ fontWeight: 500 }}>
                  <div className="flex items-end gap-2 h-full pb-1">
                    {[2, 3, 4].map((nivel) => {
                      const config = NIVEIS_CONFIG[nivel as 2 | 3 | 4];
                      const Icone = config.icone;
                      return (
                        <div 
                          key={nivel}
                          className="flex items-center justify-center w-8 h-8 rounded-lg"
                          style={{
                            backgroundColor: config.cor,
                            borderColor: config.corBorda
                          }}
                        >
                          <Icone className="w-4 h-4" style={{ color: config.corTexto }} strokeWidth={2.5} />
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-center w-8 h-8">
                      <span className="text-sm font-bold text-gray-500">Σ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corpo da Matriz */}
              {colaboradoresFiltrados.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Nenhum colaborador encontrado</p>
                </div>
              ) : (
                <>
                  {colaboradoresFiltrados.map((colaborador, idx) => {
                    const stats = calcularEstatisticasColaborador(colaborador.id);
                    
                    // Calcular contadores por nível para este colaborador (apenas níveis 2, 3, 4)
                    const contadoresPorNivel = [2, 3, 4].map(nivel => {
                      return qualificacoes.filter(
                        q => q.colaboradorId === colaborador.id && q.nivel === nivel
                      ).length;
                    });
                    
                    // Total de qualificações (níveis 2 + 3 + 4)
                    const totalQualificacoes = contadoresPorNivel.reduce((sum, count) => sum + count, 0);
                    
                    return (
                      <div
                        key={colaborador.id}
                        className={`flex ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}
                      >
                        {/* Info Colaborador */}
                        <div className="w-56 flex-shrink-0 px-3 h-14 border-r-2 border-gray-200 flex items-center border-b border-gray-200">
                          <div className="flex items-start gap-2 w-full">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                              {colaborador.nomeCompleto.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs text-gray-900 truncate leading-tight">
                                {colaborador.nomeCompleto}
                              </div>
                              <div className="text-[10px] text-gray-600 truncate mt-0.5">
                                {colaborador.funcao}
                              </div>
                              <div className="text-[9px] text-gray-400 truncate">
                                {colaborador.departamento}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Células de Qualificação */}
                        <div className="flex-1 flex">
                          {atividadesFiltradas.map((atividade) => (
                            <div key={atividade.id} className="flex-1 min-w-[50px] max-w-[50px] border-r border-gray-200 border-b border-gray-200">
                              <CelulaQualificacao 
                                colaboradorId={colaborador.id}
                                atividadeId={atividade.id}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Contadores do Colaborador (direita) - Níveis 2, 3, 4 + Total */}
                        <div className="w-48 flex-shrink-0 px-3 h-14 border-l-2 border-gray-200 flex items-center gap-2 border-b border-gray-200">
                          {[2, 3, 4].map((nivel, index) => {
                            const config = NIVEIS_CONFIG[nivel as 2 | 3 | 4];
                            const count = contadoresPorNivel[index];
                            
                            return (
                              <div 
                                key={nivel}
                                className="flex items-center justify-center px-2 py-1 rounded-md border min-w-[32px]"
                                style={{
                                  backgroundColor: config.cor,
                                  borderColor: config.corBorda
                                }}
                              >
                                <span className="text-[11px] font-bold text-gray-900">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                          {/* Total - sem cor de fundo */}
                          <div className="flex items-center justify-center px-1.5 py-0.5 min-w-[28px]">
                            <span className="text-[11px] font-extrabold text-gray-900">
                              {totalQualificacoes}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Rodapé: Contadores por Atividade */}
                  <div className="flex bg-gray-50/60 border-t-2 border-gray-200">
                    <div className="w-56 flex-shrink-0 px-3 py-3 border-r-2 border-gray-200">
                      <div className="flex flex-col gap-1">
                        {[2, 3, 4].map((nivel) => {
                          const config = NIVEIS_CONFIG[nivel as 2 | 3 | 4];
                          const Icone = config.icone;
                          return (
                            <div 
                              key={nivel}
                              className="flex items-center gap-1.5 px-1.5 py-1 rounded h-7"
                              style={{
                                backgroundColor: config.cor,
                                borderColor: config.corBorda
                              }}
                            >
                              <Icone className="w-3 h-3" style={{ color: config.corTexto }} strokeWidth={2.5} />
                              <span className="text-[9px] font-medium text-gray-700">{config.label}</span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-1.5 px-1.5 py-1 h-7">
                          <span className="text-[9px] font-bold text-gray-500">Σ</span>
                          <span className="text-[9px] font-medium text-gray-700">Total</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex">
                      {atividadesFiltradas.map((atividade) => {
                        // Calcular contadores por nível para esta atividade (apenas níveis 2, 3, 4)
                        const contadoresPorNivel = [2, 3, 4].map(nivel => {
                          return qualificacoes.filter(
                            q => q.atividadeId === atividade.id && q.nivel === nivel
                          ).length;
                        });
                        
                        // Total de qualificações (níveis 2 + 3 + 4)
                        const totalQualificacoes = contadoresPorNivel.reduce((sum, count) => sum + count, 0);
                        
                        return (
                          <div 
                            key={atividade.id}
                            className="flex-1 min-w-[50px] max-w-[50px] border-r border-gray-200 py-3"
                          >
                            <div className="flex flex-col items-center gap-1">
                              {[2, 3, 4].map((nivel, index) => {
                                const config = NIVEIS_CONFIG[nivel as 2 | 3 | 4];
                                const count = contadoresPorNivel[index];
                                
                                return (
                                  <div 
                                    key={nivel}
                                    className="flex items-center justify-center px-1.5 rounded min-w-[28px] h-7"
                                    style={{
                                      backgroundColor: config.cor,
                                      borderColor: config.corBorda
                                    }}
                                  >
                                    <span className="text-[10px] font-bold text-gray-900">
                                      {count}
                                    </span>
                                  </div>
                                );
                              })}
                              {/* Total - sem cor de fundo */}
                              <div className="flex items-center justify-center px-1.5 min-w-[28px] h-7">
                                <span className="text-[11px] font-extrabold text-gray-900">
                                  {totalQualificacoes}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Espaço vazio alinhado com a coluna de contadores */}
                    <div className="w-48 flex-shrink-0 border-l-2 border-gray-200"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* Modal de Seleção de Nível */}
      {selectedCell && (() => {
        const colaborador = colaboradores.find(c => c.id === selectedCell.colaboradorId);
        const atividade = atividades.find(a => a.id === selectedCell.atividadeId);
        const nivelAtual = getNivelQualificacao(selectedCell.colaboradorId, selectedCell.atividadeId);
        const temGap = nivelAtual <= 2;

        if (!colaborador || !atividade) return null;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg text-gray-900 mb-1" style={{ fontWeight: 600 }}>{colaborador.nomeCompleto}</h3>
                    <p className="text-gray-500 text-sm">{atividade.nome}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs" style={{ fontWeight: 500 }}>
                      {atividade.processo}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="mb-5">
                  <label className="block text-sm text-gray-900 mb-3" style={{ fontWeight: 600 }}>
                    Nível de qualificação:
                  </label>
                  <div className="space-y-2">
                    {Object.entries(NIVEIS_CONFIG).map(([nivel, config]) => {
                      const Icone = config.icone;
                      const isAtual = parseInt(nivel) === nivelAtual;
                      
                      return (
                        <button
                          key={nivel}
                          onClick={() => setNivelQualificacao(
                            selectedCell.colaboradorId,
                            selectedCell.atividadeId,
                            parseInt(nivel) as 1 | 2 | 3 | 4
                          )}
                          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                            isAtual 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center border"
                              style={{ 
                                backgroundColor: config.cor,
                                borderColor: config.corBorda
                              }}
                            >
                              <Icone className="w-5 h-5" style={{ color: config.corTexto }} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{nivel}</span>
                                <span className="text-sm font-medium text-gray-700">{config.label}</span>
                              </div>
                              {isAtual && (
                                <div className="text-xs text-blue-600 font-medium mt-0.5">
                                  ✓ Nível atual
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ação de GAP */}
                {temGap && (
                  <button
                    onClick={() => {
                      setFormularioPlano({
                        colaboradorId: selectedCell.colaboradorId,
                        atividadeId: selectedCell.atividadeId,
                        prazoQualificacao: '',
                        responsavelInstrutor: '',
                        observacoes: ''
                      });
                      setShowFormularioPlano(true);
                      setSelectedCell(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all text-sm shadow-sm"
                    style={{ fontWeight: 500 }}
                  >
                    <Zap className="w-4 h-4" />
                    Gerar Plano de Qualificação
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Nova Atividade */}
      {showCriarAtividade && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isClosingCriarAtividade ? 'opacity-0' : 'opacity-100'}`}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            fecharModalCriarAtividade();
          }}
        >
          <div className={`bg-white rounded-xl shadow-lg p-6 max-w-md w-full transition-opacity duration-200 ${isClosingCriarAtividade ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>Nova Atividade</h3>
              <button
                onClick={fecharModalCriarAtividade}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-900 mb-2" style={{ fontWeight: 600 }}>Nome da Atividade *</label>
                <input
                  type="text"
                  value={novaAtividade.nome}
                  onChange={(e) => setNovaAtividade({ ...novaAtividade, nome: e.target.value })}
                  placeholder="Ex: Operação de Máquinas"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900 mb-2" style={{ fontWeight: 600 }}>Processo *</label>
                <select
                  value={novaAtividade.processo}
                  onChange={(e) => setNovaAtividade({ ...novaAtividade, processo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Selecione um processo</option>
                  {processosUnicos.map(proc => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                  <option value="NOVO">+ Criar Novo Processo</option>
                </select>
              </div>

              {novaAtividade.processo === 'NOVO' && (
                <div>
                  <label className="block text-sm text-gray-900 mb-2" style={{ fontWeight: 600 }}>Nome do Novo Processo</label>
                  <input
                    type="text"
                    onChange={(e) => setNovaAtividade({ ...novaAtividade, processo: e.target.value.toUpperCase() })}
                    placeholder="Ex: MANUTENÇÃO"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  onClick={fecharModalCriarAtividade}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarAtividade}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm shadow-sm"
                  style={{ fontWeight: 500 }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajuda */}
      {showAjuda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg text-gray-900" style={{ fontWeight: 700 }}>Como usar a Matriz de Qualificação</h3>
              <button
                onClick={() => setShowAjuda(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-sm text-gray-700">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-gray-900 mb-2 flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <Target className="w-4 h-4 text-blue-600" />
                  Objetivo
                </h4>
                <p>Mapear competências dos colaboradores nas atividades da empresa. Em organizações menores, colaboradores tendem a ter múltiplas qualificações; em maiores, são mais especializados.</p>
              </div>

              <div>
                <h4 className="text-gray-900 mb-3" style={{ fontWeight: 600 }}>🎯 Níveis de Qualificação</h4>
                <ul className="space-y-2 ml-4">
                  {Object.entries(NIVEIS_CONFIG).map(([nivel, config]) => {
                    const Icone = config.icone;
                    return (
                      <li key={nivel} className="flex items-start gap-3">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0"
                          style={{ 
                            backgroundColor: config.cor,
                            borderColor: config.corBorda
                          }}
                        >
                          <Icone className="w-4 h-4" style={{ color: config.corTexto }} strokeWidth={2.5} />
                        </div>
                        <div>
                          <strong>{nivel} - {config.label}:</strong> 
                          <span className="text-gray-600 ml-1">
                            {nivel === '1' && 'Sem conhecimento'}
                            {nivel === '2' && 'Em treinamento'}
                            {nivel === '3' && 'Autônomo'}
                            {nivel === '4' && 'Treina outros'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <h4 className="text-gray-900 mb-2 flex items-center gap-2" style={{ fontWeight: 600 }}>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Alertas
                </h4>
                <ul className="space-y-1.5 ml-4 text-sm">
                  <li><strong className="text-red-600">Risco:</strong> Atividade com menos de 2 pessoas qualificadas</li>
                  <li><strong className="text-amber-600">GAP:</strong> Bolinha laranja indica necessidade de qualificação</li>
                </ul>
              </div>

              <div>
                <h4 className="text-gray-900 mb-2" style={{ fontWeight: 600 }}>💡 Como Usar</h4>
                <ol className="space-y-1.5 ml-4 list-decimal text-sm">
                  <li>Clique em qualquer célula para definir o nível</li>
                  <li>Use filtros para focar em grupos específicos</li>
                  <li>Gere planos para colaboradores com GAP</li>
                  <li>Monitore atividades em risco</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-5 border-t border-gray-200">
              <button
                onClick={() => setShowAjuda(false)}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm shadow-sm"
                style={{ fontWeight: 500 }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulário Plano de Qualificação */}
      {showFormularioPlano && (() => {
        const colaborador = colaboradores.find(c => c.id === formularioPlano.colaboradorId);
        const atividade = atividades.find(a => a.id === formularioPlano.atividadeId);
        const nivelAtual = getNivelQualificacao(formularioPlano.colaboradorId, formularioPlano.atividadeId);

        if (!colaborador || !atividade) return null;

        const handleSubmit = () => {
          if (!formularioPlano.prazoQualificacao || !formularioPlano.responsavelInstrutor) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
          }

          // Buscar planos existentes para gerar numeração PQ
          const planos = getFromStorage<any[]>('planos-qualificacao', []);
          
          // Gerar número PQ sequencial
          const maxNum = planos.reduce((max: number, p: any) => {
            const num = parseInt(p.numeroPQ?.replace('PQ', '') || p.numeroPE?.replace('PE-', '') || '0');
            return num > max ? num : max;
          }, 0);
          const numeroPQ = `PQ${String(maxNum + 1).padStart(3, '0')}`;

          // Criar plano na estrutura correta do PlanoQualificacao
          const novoPlano = {
            id: generateId(),
            numeroPQ,
            nome: `Qualificação: ${atividade.nome} - ${colaborador.nomeCompleto}`,
            motivo: 'Qualificação MQ',
            tipo: 'Qualificação Interno',
            instituicao: formularioPlano.responsavelInstrutor, // ✅ Preenche com o responsável/instrutor
            previsaoData: formularioPlano.prazoQualificacao,
            status: 'Em Andamento',
            dataConclusao: '',
            prazoAvaliacaoEficacia: '',
            necessitaAvaliacaoEficacia: true,
            eficaz: null,
            evidencia: '',
            dataAvaliacao: '',
            avaliadorNome: '',
            pessoas: [formularioPlano.colaboradorId],
            pessoasExternas: [],
            dataCriacao: new Date().toISOString(),
            // Campos extras para rastreamento
            origem: 'Matriz de Qualificação',
            atividadeId: formularioPlano.atividadeId,
            atividadeNome: atividade.nome,
            processo: atividade.processo,
            nivelAtual,
            nivelEsperado: 3,
            responsavelInstrutor: formularioPlano.responsavelInstrutor,
            observacoes: formularioPlano.observacoes
          };

          planos.push(novoPlano);
          localStorage.setItem('planos-qualificacao', JSON.stringify(planos));

          toast.success('Plano de Qualificação gerado com sucesso!');
          fecharModalFormularioPlano();
        };

        return (
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isClosingFormularioPlano ? 'opacity-0' : 'opacity-100'}`}
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget) return;
              fecharModalFormularioPlano();
            }}
          >
            <div className={`bg-white rounded-xl shadow-lg max-w-lg w-full overflow-hidden transition-opacity duration-200 ${isClosingFormularioPlano ? 'opacity-0' : 'opacity-100'}`}>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <h3 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>Gerar Plano de Qualificação</h3>
                    </div>
                    <p className="text-gray-500 text-sm">Preencha os detalhes do plano de qualificação</p>
                  </div>
                  <button
                    onClick={fecharModalFormularioPlano}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Informações do GAP */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-gray-900 mb-3 text-sm" style={{ fontWeight: 600 }}>Detalhes da Qualificação</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600">Colaborador:</span>
                      <span className="font-medium text-gray-900">{colaborador.nomeCompleto}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600">Atividade:</span>
                      <span className="font-medium text-gray-900">{atividade.nome}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600">Processo:</span>
                      <span className="font-medium text-gray-900">{atividade.processo}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-gray-600">Nível Atual:</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${NIVEIS_CONFIG[nivelAtual as 1 | 2 | 3 | 4].badge}`}>
                        {NIVEIS_CONFIG[nivelAtual as 1 | 2 | 3 | 4].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Formulário */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                      Prazo para Qualificação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formularioPlano.prazoQualificacao}
                      onChange={(e) => setFormularioPlano({ ...formularioPlano, prazoQualificacao: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Data prevista para conclusão da qualificação</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                      Responsável por Instruir <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formularioPlano.responsavelInstrutor}
                      onChange={(e) => setFormularioPlano({ ...formularioPlano, responsavelInstrutor: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    >
                      <option value="">Selecione um colaborador</option>
                      {colaboradores
                        .filter(c => c.id !== formularioPlano.colaboradorId)
                        .map(c => (
                          <option key={c.id} value={c.nomeCompleto}>
                            {c.nomeCompleto} - {c.funcao}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Quem acompanhará e instruirá o colaborador</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                      Observações
                    </label>
                    <textarea
                      value={formularioPlano.observacoes}
                      onChange={(e) => setFormularioPlano({ ...formularioPlano, observacoes: e.target.value })}
                      placeholder="Informações adicionais sobre a qualificação..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={fecharModalFormularioPlano}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all text-sm shadow-sm"
                    style={{ fontWeight: 500 }}
                  >
                    Gerar Plano
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
