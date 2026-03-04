import { useState, useMemo } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, CheckCircle2, Clock, AlertCircle, ListTodo, Users, Building2, TrendingUp, Calendar, Eye, X, Pencil } from 'lucide-react';
import { formatarData } from '../utils/formatters';
import { TarefaAcao, PlanoAcaoEstrategico } from '../types/strategic';
import { useNavigate } from 'react-router';
import { TarefaViewDialog } from '../components/TarefaViewDialog';
import { TarefaEditDialog } from '../components/TarefaEditDialog';
import { MetricCard } from '../components/ui/metric-card';

interface TarefaConsolidada extends TarefaAcao {
  numeroPE: string; // PE001, PE002
  numeroTarefa: string; // TE1, TE2, TE3...
  acaoDescricao: string; // Descrição da ação (PE)
  planoId: string;
}

type FiltroStatus = 'todas' | 'concluidas' | 'em-dia' | 'atrasadas' | 'vencem-7dias' | 'vencem-15dias' | 'vencem-30dias' | 'vencem-90dias';

export default function TarefasConsolidadasPage() {
  const { dados, updatePlanoAcao } = useStrategic();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');
  const [filtroDepartamento, setFiltroDepartamento] = useState<string | null>(null);
  const [filtroResponsavel, setFiltroResponsavel] = useState<string | null>(null);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaConsolidada | null>(null);
  const [tarefaEditada, setTarefaEditada] = useState<TarefaConsolidada | null>(null);
  const navigate = useNavigate();

  // Consolidar apenas as tarefas dos PE (Plano Estratégico)
  const tarefasConsolidadas = useMemo(() => {
    const tarefas: TarefaConsolidada[] = [];
    let contador = 1; // Contador para E1, E2, E3...
    
    // Adicionar tarefas do PE (Plano Estratégico)
    dados.planosAcao.forEach(plano => {
      plano.tarefas.forEach(tarefa => {
        tarefas.push({
          ...tarefa,
          numeroPE: plano.numeroPE, // PE001, PE002
          numeroTarefa: `TE${contador}`, // TE1, TE2, TE3...
          acaoDescricao: plano.acao,
          planoId: plano.id,
        });
        contador++;
      });
    });
    
    // Ordenar por prazo (mais próximo primeiro)
    return tarefas.sort((a, b) => {
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    });
  }, [dados.planosAcao]);

  // Filtrar tarefas baseado na busca
  const tarefasFiltradas = useMemo(() => {
    if (!busca.trim()) return tarefasConsolidadas;
    
    const buscaLower = busca.toLowerCase();
    return tarefasConsolidadas.filter(tarefa => 
      tarefa.descricao.toLowerCase().includes(buscaLower) ||
      tarefa.responsavel?.toLowerCase().includes(buscaLower) ||
      tarefa.departamento?.toLowerCase().includes(buscaLower) ||
      tarefa.numeroPE.toLowerCase().includes(buscaLower) ||
      tarefa.acaoDescricao.toLowerCase().includes(buscaLower)
    );
  }, [tarefasConsolidadas, busca]);

  // Estatísticas por departamento
  const estatisticasPorDepartamento = useMemo(() => {
    const stats = new Map<string, { total: number; concluidas: number; atrasadas: number; emDia: number }>();
    
    tarefasConsolidadas.forEach(tarefa => {
      const dept = tarefa.departamento || 'Sem Departamento';
      const stat = stats.get(dept) || { total: 0, concluidas: 0, atrasadas: 0, emDia: 0 };
      
      stat.total++;
      if (tarefa.concluida) {
        stat.concluidas++;
      } else if (tarefa.prazo) {
        const hoje = new Date();
        const prazo = new Date(tarefa.prazo);
        if (prazo < hoje) {
          stat.atrasadas++;
        } else {
          stat.emDia++;
        }
      }
      
      stats.set(dept, stat);
    });
    
    return Array.from(stats.entries())
      .map(([dept, stat]) => ({ 
        departamento: dept, 
        ...stat,
        percentualConclusao: stat.total > 0 ? Math.round((stat.concluidas / stat.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [tarefasConsolidadas]);

  // Estatísticas por responsável
  const estatisticasPorResponsavel = useMemo(() => {
    const stats = new Map<string, { total: number; concluidas: number; atrasadas: number; emDia: number }>();
    
    tarefasConsolidadas.forEach(tarefa => {
      const resp = tarefa.responsavel || 'Sem Responsável';
      const stat = stats.get(resp) || { total: 0, concluidas: 0, atrasadas: 0, emDia: 0 };
      
      stat.total++;
      if (tarefa.concluida) {
        stat.concluidas++;
      } else if (tarefa.prazo) {
        const hoje = new Date();
        const prazo = new Date(tarefa.prazo);
        if (prazo < hoje) {
          stat.atrasadas++;
        } else {
          stat.emDia++;
        }
      }
      
      stats.set(resp, stat);
    });
    
    return Array.from(stats.entries())
      .map(([responsavel, stat]) => ({ 
        responsavel, 
        ...stat,
        percentualConclusao: stat.total > 0 ? Math.round((stat.concluidas / stat.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [tarefasConsolidadas]);

  // Estatísticas gerais
  const estatisticasGerais = useMemo(() => {
    const total = tarefasConsolidadas.length;
    const concluidas = tarefasConsolidadas.filter(t => t.concluida).length;
    const hoje = new Date();
    const atrasadas = tarefasConsolidadas.filter(t => 
      !t.concluida && t.prazo && new Date(t.prazo) < hoje
    ).length;
    const emDia = tarefasConsolidadas.filter(t => 
      !t.concluida && t.prazo && new Date(t.prazo) >= hoje
    ).length;
    
    // Calcular tarefas que vencem em períodos específicos
    const vencem7dias = tarefasConsolidadas.filter(t => {
      if (t.concluida || !t.prazo) return false;
      const prazo = new Date(t.prazo);
      const dias7 = new Date();
      dias7.setDate(dias7.getDate() + 7);
      return prazo >= hoje && prazo <= dias7;
    }).length;

    const vencem15dias = tarefasConsolidadas.filter(t => {
      if (t.concluida || !t.prazo) return false;
      const prazo = new Date(t.prazo);
      const dias15 = new Date();
      dias15.setDate(dias15.getDate() + 15);
      return prazo >= hoje && prazo <= dias15;
    }).length;

    const vencem30dias = tarefasConsolidadas.filter(t => {
      if (t.concluida || !t.prazo) return false;
      const prazo = new Date(t.prazo);
      const dias30 = new Date();
      dias30.setDate(dias30.getDate() + 30);
      return prazo >= hoje && prazo <= dias30;
    }).length;

    const vencem90dias = tarefasConsolidadas.filter(t => {
      if (t.concluida || !t.prazo) return false;
      const prazo = new Date(t.prazo);
      const dias90 = new Date();
      dias90.setDate(dias90.getDate() + 90);
      return prazo >= hoje && prazo <= dias90;
    }).length;
    
    return { total, concluidas, atrasadas, emDia, vencem7dias, vencem15dias, vencem30dias, vencem90dias };
  }, [tarefasConsolidadas]);

  // Toggle tarefa
  const toggleTarefa = (tarefa: TarefaConsolidada) => {
    const plano = dados.planosAcao.find(p => p.id === tarefa.planoId);
    if (!plano) return;

    const tarefasAtualizadas = plano.tarefas.map(t =>
      t.id === tarefa.id ? { 
        ...t, 
        concluida: !t.concluida,
        dataConclusao: !t.concluida ? new Date().toISOString() : undefined
      } : t
    );

    updatePlanoAcao(tarefa.planoId, { tarefas: tarefasAtualizadas });
  };

  // Verificar se está atrasada
  const isAtrasada = (tarefa: TarefaConsolidada) => {
    if (tarefa.concluida || !tarefa.prazo) return false;
    return new Date(tarefa.prazo) < new Date();
  };

  // Navegar para PE
  const verPlano = (tarefa: TarefaConsolidada) => {
    navigate(`/gestao-estrategica/plano-acao?planoId=${tarefa.planoId}`);
  };

  // Salvar tarefa editada
  const salvarTarefaEditada = (tarefaAtualizada: Partial<TarefaAcao> & { id: string }) => {
    if (!tarefaEditada) return;

    const plano = dados.planosAcao.find(p => p.id === tarefaEditada.planoId);
    if (!plano) return;

    const tarefasAtualizadas = plano.tarefas.map(t =>
      t.id === tarefaAtualizada.id ? { ...t, ...tarefaAtualizada } : t
    );

    updatePlanoAcao(tarefaEditada.planoId, { tarefas: tarefasAtualizadas });
  };

  // Aplicar filtros combinados
  const tarefasComFiltros = useMemo(() => {
    let resultado = tarefasFiltradas;

    // Filtro por status
    if (filtroStatus !== 'todas') {
      const hoje = new Date();
      resultado = resultado.filter(tarefa => {
        if (filtroStatus === 'concluidas') return tarefa.concluida;
        if (filtroStatus === 'atrasadas') return !tarefa.concluida && tarefa.prazo && new Date(tarefa.prazo) < hoje;
        if (filtroStatus === 'em-dia') return !tarefa.concluida && tarefa.prazo && new Date(tarefa.prazo) >= hoje;
        if (filtroStatus === 'vencem-7dias') return !tarefa.concluida && tarefa.prazo && new Date(tarefa.prazo) >= hoje && new Date(tarefa.prazo) <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (filtroStatus === 'vencem-15dias') return !tarefa.concluida && tarefa.prazo && new Date(tarefa.prazo) >= hoje && new Date(tarefa.prazo) <= new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000);
        if (filtroStatus === 'vencem-30dias') return !tarefa.concluida && tarefa.prazo && new Date(tarefa.prazo) >= hoje && new Date(tarefa.prazo) <= new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (filtroStatus === 'vencem-90dias') return !tarefa.concluida && tarefa.prazo && new Date(tarefa.prazo) >= hoje && new Date(tarefa.prazo) <= new Date(hoje.getTime() + 90 * 24 * 60 * 60 * 1000);
        return true;
      });
    }

    // Filtro por departamento
    if (filtroDepartamento) {
      resultado = resultado.filter(tarefa => {
        const dept = tarefa.departamento || 'Sem Departamento';
        return dept === filtroDepartamento;
      });
    }

    // Filtro por responsável
    if (filtroResponsavel) {
      resultado = resultado.filter(tarefa => {
        const resp = tarefa.responsavel || 'Sem Responsável';
        return resp === filtroResponsavel;
      });
    }

    return resultado;
  }, [tarefasFiltradas, filtroStatus, filtroDepartamento, filtroResponsavel]);

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroStatus('todas');
    setFiltroDepartamento(null);
    setFiltroResponsavel(null);
    setBusca('');
  };

  // Verificar se há filtros ativos
  const temFiltrosAtivos = filtroStatus !== 'todas' || filtroDepartamento !== null || filtroResponsavel !== null || busca.trim() !== '';

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>Gestão de Tarefas</h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Visualização consolidada de todas as tarefas dos Planos Estratégicos (PE).
        </p>
      </div>

      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total de Tarefas"
          value={estatisticasGerais.total}
          icon={ListTodo}
          variant="default"
          onClick={() => { setFiltroStatus('todas'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'todas' && !filtroDepartamento && !filtroResponsavel}
        />
        <MetricCard
          label="Concluídas"
          value={estatisticasGerais.concluidas}
          icon={CheckCircle2}
          variant="success"
          onClick={() => { setFiltroStatus('concluidas'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'concluidas'}
          trendLabel={`${estatisticasGerais.total > 0 ? Math.round((estatisticasGerais.concluidas / estatisticasGerais.total) * 100) : 0}% do total`}
          trend="neutral"
        />
        <MetricCard
          label="Em Dia"
          value={estatisticasGerais.emDia}
          icon={Clock}
          variant="info"
          onClick={() => { setFiltroStatus('em-dia'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'em-dia'}
          trendLabel={`${estatisticasGerais.total > 0 ? Math.round((estatisticasGerais.emDia / estatisticasGerais.total) * 100) : 0}% do total`}
          trend="neutral"
        />
        <MetricCard
          label="Atrasadas"
          value={estatisticasGerais.atrasadas}
          icon={AlertCircle}
          variant="danger"
          onClick={() => { setFiltroStatus('atrasadas'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'atrasadas'}
          trendLabel={`${estatisticasGerais.total > 0 ? Math.round((estatisticasGerais.atrasadas / estatisticasGerais.total) * 100) : 0}% do total`}
          trend="neutral"
        />
      </div>

      {/* Cards de Prazos de Vencimento */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Vencem em 7 dias"
          value={estatisticasGerais.vencem7dias}
          icon={Clock}
          variant="warning"
          onClick={() => { setFiltroStatus('vencem-7dias'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'vencem-7dias'}
        />
        <MetricCard
          label="Vencem em 15 dias"
          value={estatisticasGerais.vencem15dias}
          icon={Clock}
          variant="warning"
          onClick={() => { setFiltroStatus('vencem-15dias'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'vencem-15dias'}
        />
        <MetricCard
          label="Vencem em 30 dias"
          value={estatisticasGerais.vencem30dias}
          icon={Clock}
          variant="warning"
          onClick={() => { setFiltroStatus('vencem-30dias'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'vencem-30dias'}
        />
        <MetricCard
          label="Vencem em 90 dias"
          value={estatisticasGerais.vencem90dias}
          icon={Clock}
          variant="warning"
          onClick={() => { setFiltroStatus('vencem-90dias'); setFiltroDepartamento(null); setFiltroResponsavel(null); }}
          active={filtroStatus === 'vencem-90dias'}
        />
      </div>

      {/* Mini Dashboards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Dashboard por Departamento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Tarefas por Departamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {estatisticasPorDepartamento.map((stat, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setFiltroDepartamento(stat.departamento);
                    setFiltroStatus('todas');
                    setFiltroResponsavel(null);
                  }}
                  className="w-full text-left"
                >
                  <div className={`p-3 bg-gray-50 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                    filtroDepartamento === stat.departamento ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{stat.departamento}</span>
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                        {stat.total} tarefas
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${stat.percentualConclusao}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-10 text-right">
                        {stat.percentualConclusao}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-green-600 font-medium">
                        ✓ {stat.concluidas} concluídas
                      </span>
                      {stat.emDia > 0 && (
                        <span className="text-blue-600 font-medium">
                          ⏱ {stat.emDia} em dia
                        </span>
                      )}
                      {stat.atrasadas > 0 && (
                        <span className="text-red-600 font-medium">
                          ⚠ {stat.atrasadas} atrasadas
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {estatisticasPorDepartamento.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-8">
                  Nenhuma tarefa encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard por Responsável */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Tarefas por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {estatisticasPorResponsavel.map((stat, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setFiltroResponsavel(stat.responsavel);
                    setFiltroStatus('todas');
                    setFiltroDepartamento(null);
                  }}
                  className="w-full text-left"
                >
                  <div className={`p-3 bg-gray-50 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                    filtroResponsavel === stat.responsavel ? 'border-purple-400 ring-2 ring-purple-200 bg-purple-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{stat.responsavel}</span>
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                        {stat.total} tarefas
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${stat.percentualConclusao}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-10 text-right">
                        {stat.percentualConclusao}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-green-600 font-medium">
                        ✓ {stat.concluidas} concluídas
                      </span>
                      {stat.emDia > 0 && (
                        <span className="text-blue-600 font-medium">
                          ⏱ {stat.emDia} em dia
                        </span>
                      )}
                      {stat.atrasadas > 0 && (
                        <span className="text-red-600 font-medium">
                          ⚠ {stat.atrasadas} atrasadas
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {estatisticasPorResponsavel.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-8">
                  Nenhuma tarefa encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner de Filtros Ativos */}
      {temFiltrosAtivos && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Filtros ativos:</span>
              {filtroStatus !== 'todas' && (
                <Badge className="bg-white text-gray-700 border border-gray-300">
                  Status: {
                    filtroStatus === 'concluidas' ? 'Concluídas' :
                    filtroStatus === 'em-dia' ? 'Em Dia' :
                    filtroStatus === 'atrasadas' ? 'Atrasadas' :
                    filtroStatus === 'vencem-7dias' ? 'Vencem em 7 dias' :
                    filtroStatus === 'vencem-15dias' ? 'Vencem em 15 dias' :
                    filtroStatus === 'vencem-30dias' ? 'Vencem em 30 dias' :
                    filtroStatus === 'vencem-90dias' ? 'Vencem em 90 dias' :
                    ''
                  }
                </Badge>
              )}
              {filtroDepartamento && (
                <Badge className="bg-white text-gray-700 border border-gray-300">
                  Departamento: {filtroDepartamento}
                </Badge>
              )}
              {filtroResponsavel && (
                <Badge className="bg-white text-gray-700 border border-gray-300">
                  Responsável: {filtroResponsavel}
                </Badge>
              )}
              {busca && (
                <Badge className="bg-white text-gray-700 border border-gray-300">
                  Busca: "{busca}"
                </Badge>
              )}
              <span className="text-sm text-gray-600">
                ({tarefasComFiltros.length} {tarefasComFiltros.length === 1 ? 'tarefa' : 'tarefas'} encontrada{tarefasComFiltros.length !== 1 && 's'})
              </span>
            </div>
            <Button
              onClick={limparFiltros}
              variant="outline"
              size="sm"
              className="gap-2 bg-white hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      )}

      {/* Campo de Busca e Filtros */}
      <div className="mb-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por descrição, responsável, departamento, PE..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select 
            value={filtroStatus} 
            onValueChange={(value) => setFiltroStatus(value as FiltroStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="concluidas">Concluídas</SelectItem>
              <SelectItem value="em-dia">Em Dia</SelectItem>
              <SelectItem value="atrasadas">Atrasadas</SelectItem>
              <SelectItem value="vencem-7dias">Vencem 7 dias</SelectItem>
              <SelectItem value="vencem-15dias">Vencem 15 dias</SelectItem>
              <SelectItem value="vencem-30dias">Vencem 30 dias</SelectItem>
              <SelectItem value="vencem-90dias">Vencem 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filtroDepartamento || 'todos'} 
            onValueChange={(value) => setFiltroDepartamento(value === 'todos' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {estatisticasPorDepartamento.map((stat) => (
                <SelectItem key={stat.departamento} value={stat.departamento}>
                  {stat.departamento}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filtroResponsavel || 'todos'} 
            onValueChange={(value) => setFiltroResponsavel(value === 'todos' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {estatisticasPorResponsavel.map((stat) => (
                <SelectItem key={stat.responsavel} value={stat.responsavel}>
                  {stat.responsavel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <Card>
        <CardContent className="p-0">
          {tarefasComFiltros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ListTodo className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center">
                {busca ? 'Nenhuma tarefa encontrada com os filtros aplicados.' : 'Nenhuma tarefa cadastrada ainda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs text-gray-500 w-10" style={{ fontWeight: 500 }}></th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>PE</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Descrição</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Responsável</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Departamento</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Prazo</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                    <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tarefasComFiltros.map((tarefa) => {
                    const atrasada = isAtrasada(tarefa);
                    
                    return (
                      <tr 
                        key={`${tarefa.planoId}-${tarefa.id}`} 
                        className={`hover:bg-gray-50 transition-colors ${
                          tarefa.concluida ? 'bg-green-50' : atrasada ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={tarefa.concluida}
                            onCheckedChange={() => toggleTarefa(tarefa)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => verPlano(tarefa)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <div className="flex flex-col items-start leading-tight">
                              <span className="text-sm font-bold">{tarefa.numeroTarefa}</span>
                              <span className="text-xs font-medium text-gray-500">{tarefa.numeroPE}</span>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <p className={`text-sm ${tarefa.concluida ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {tarefa.descricao}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {tarefa.acaoDescricao}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">
                            {tarefa.responsavel || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tarefa.departamento ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {tarefa.departamento}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tarefa.prazo ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className={`text-sm ${atrasada ? 'text-red-600' : 'text-gray-700'}`} style={atrasada ? { fontWeight: 600 } : undefined}>
                                {formatarData(tarefa.prazo)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tarefa.concluida ? (
                            <Badge className="bg-green-100 text-green-700" variant="secondary">
                              Concluída
                            </Badge>
                          ) : atrasada ? (
                            <Badge className="bg-red-100 text-red-700" variant="secondary">
                              Atrasada
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700" variant="secondary">
                              Em Dia
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTarefaSelecionada(tarefa)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTarefaEditada(tarefa)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização de Tarefa */}
      {tarefaSelecionada && (
        <TarefaViewDialog
          open={!!tarefaSelecionada}
          onOpenChange={(open) => !open && setTarefaSelecionada(null)}
          tarefa={tarefaSelecionada}
        />
      )}

      {/* Dialog de Edição de Tarefa */}
      {tarefaEditada && (
        <TarefaEditDialog
          open={!!tarefaEditada}
          onOpenChange={(open) => !open && setTarefaEditada(null)}
          tarefa={tarefaEditada}
          salvarTarefaEditada={salvarTarefaEditada}
        />
      )}
    </div>
  );
}