import { useState, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  TrendingDown, 
  Search,
  BarChart3,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useKPI } from '../hooks/useKPI';
import { Indicador, StatusIndicador, TipoIndicador } from '../types/kpi';
import { MetricCard } from '../components/ui/metric-card';
import { ModalKPI } from '../components/kpi/ModalKPI';
import { DrawerKPI } from '../components/kpi/DrawerKPI';
import { formatarNumero } from '../utils/formatters';

export function KPI() {
  const { indicadores, loading, calcularStatus, getResumo, addIndicador, updateIndicador, deleteIndicador } = useKPI();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear());
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('Todos');
  const [filtroTipo, setFiltroTipo] = useState<TipoIndicador | 'Todos'>('Todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [indicadorSelecionado, setIndicadorSelecionado] = useState<Indicador | null>(null);

  // Extrair departamentos únicos
  const departamentos = useMemo(() => {
    const deps = [...new Set(indicadores.map(ind => ind.departamento))];
    return ['Todos', ...deps.sort()];
  }, [indicadores]);

  // Aplicar filtros
  const indicadoresFiltrados = useMemo(() => {
    // Remover duplicatas antes de filtrar (baseado no ID)
    const uniqueMap = new Map<string, Indicador>();
    indicadores.forEach(ind => {
      if (!uniqueMap.has(ind.id)) {
        uniqueMap.set(ind.id, ind);
      }
    });
    
    const indicadoresUnicos = Array.from(uniqueMap.values());
    
    return indicadoresUnicos.filter(ind => {
      const matchSearch = ind.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ind.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDepartamento = filtroDepartamento === 'Todos' || ind.departamento === filtroDepartamento;
      const matchTipo = filtroTipo === 'Todos' || ind.tipoIndicador === filtroTipo;
      
      return matchSearch && matchDepartamento && matchTipo;
    });
  }, [indicadores, searchTerm, filtroDepartamento, filtroTipo]);

  const resumo = useMemo(() => getResumo(indicadoresFiltrados), [indicadoresFiltrados, getResumo]);

  const handleNovoIndicador = () => {
    setIndicadorSelecionado(null);
    setModalAberto(true);
  };

  const handleEditarIndicador = (indicador: Indicador) => {
    setIndicadorSelecionado(indicador);
    setModalAberto(true);
  };

  const handleVisualizarIndicador = (indicador: Indicador) => {
    setIndicadorSelecionado(indicador);
    setDrawerAberto(true);
  };

  const handleSalvarIndicador = (data: Partial<Indicador>) => {
    if (indicadorSelecionado) {
      updateIndicador(indicadorSelecionado.id, data);
    } else {
      addIndicador(data as Omit<Indicador, 'id' | 'dataCriacao' | 'dataUltimaAtualizacao'>);
    }
    setModalAberto(false);
    setIndicadorSelecionado(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Carregando indicadores...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Central de Indicadores
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Monitoramento de KPIs e metas estratégicas
          </p>
        </div>
        <Button onClick={handleNovoIndicador} className="gap-2 flex-shrink-0 ml-8">
          <Plus className="w-4 h-4" />
          Novo Indicador
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={filtroAno}
          onChange={(e) => setFiltroAno(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {[2024, 2025, 2026].map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>

        <select
          value={filtroDepartamento}
          onChange={(e) => setFiltroDepartamento(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {departamentos.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoIndicador | 'Todos')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="Todos">Todos os Tipos</option>
          <option value="Sem Definição">Sem Definição</option>
          <option value="Estratégico">Estratégico</option>
          <option value="Tático">Tático</option>
          <option value="Operacional">Operacional</option>
        </select>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total de Indicadores"
          value={resumo.totalIndicadores}
          icon={BarChart3}
          variant="info"
        />
        <MetricCard
          label="Dentro da Meta"
          value={resumo.dentroMeta}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          label="Em Atenção"
          value={resumo.atencao}
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricCard
          label="Fora da Meta"
          value={resumo.foraMeta}
          icon={TrendingDown}
          variant="danger"
        />
      </div>

      {/* Tabela de Indicadores */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {indicadoresFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Nenhum indicador encontrado
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm || filtroDepartamento !== 'Todos' || filtroTipo !== 'Todos'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro indicador'}
            </p>
            {!searchTerm && filtroDepartamento === 'Todos' && filtroTipo === 'Todos' && (
              <Button onClick={handleNovoIndicador} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeiro Indicador
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Indicador
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Departamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Periodicidade
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Meta
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Unidade
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {indicadoresFiltrados.map((indicador) => {
                  return (
                    <tr 
                      key={indicador.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{indicador.nome}</span>
                          {indicador.codigo && (
                            <span className="text-xs text-gray-500">{indicador.codigo}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {indicador.tipoIndicador}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {indicador.departamento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {indicador.periodicidade}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                        {indicador.meta !== undefined ? formatarNumero(indicador.meta) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {indicador.unidadeMedida}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVisualizarIndicador(indicador);
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditarIndicador(indicador);
                            }}
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Deseja realmente excluir este indicador?')) {
                                deleteIndicador(indicador.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <ModalKPI
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setIndicadorSelecionado(null);
        }}
        indicador={indicadorSelecionado}
        onSave={handleSalvarIndicador}
        indicadoresExistentes={indicadores}
      />

      <DrawerKPI
        open={drawerAberto}
        onClose={() => {
          setDrawerAberto(false);
          setIndicadorSelecionado(null);
        }}
        indicador={indicadorSelecionado}
        onEdit={handleEditarIndicador}
        calcularStatus={calcularStatus}
      />
    </div>
  );
}