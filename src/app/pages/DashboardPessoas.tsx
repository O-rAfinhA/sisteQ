import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Users, UserCheck, UserX, Award, Target, Clock, CheckCircle2, XCircle, Calendar, Filter, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { MetricCard } from '../components/ui/metric-card';
import { Button } from '../components/ui/button';
import { formatarDataPtBr } from '../utils/formatters';
import { getFromStorage } from '../utils/helpers';

interface DashboardData {
  totalColaboradores: number;
  ativos: number;
  inativos: number;
  integracoesPendentes: number;
  integracoesCompletas: number;
  avaliacoesExperienciaAprovadas: number;
  avaliacoesExperienciaReprovadas: number;
  avaliacoesDesempenhoExcelente: number;
  avaliacoesDesempenhoBom: number;
  avaliacoesDesempenhoRegular: number;
  avaliacoesDesempenhoInsatisfatorio: number;
  funcoesCadastradas: number;
  fichasIntegracaoCadastradas: number;
}

interface ColaboradorRecente {
  id: string;
  nome: string;
  funcao: string;
  dataAdmissao: string;
  status: string;
  integracaoCompleta: boolean;
  avaliacaoExperiencia: 'aprovado' | 'reprovado' | 'pendente';
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

export function DashboardPessoas() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalColaboradores: 0,
    ativos: 0,
    inativos: 0,
    integracoesPendentes: 0,
    integracoesCompletas: 0,
    avaliacoesExperienciaAprovadas: 0,
    avaliacoesExperienciaReprovadas: 0,
    avaliacoesDesempenhoExcelente: 0,
    avaliacoesDesempenhoBom: 0,
    avaliacoesDesempenhoRegular: 0,
    avaliacoesDesempenhoInsatisfatorio: 0,
    funcoesCadastradas: 0,
    fichasIntegracaoCadastradas: 0
  });

  const [colaboradoresRecentes, setColaboradoresRecentes] = useState<ColaboradorRecente[]>([]);
  const [periodo, setPeriodo] = useState<'7' | '30' | '90' | 'todos'>('30');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [periodo]);

  const loadDashboardData = () => {
    setLoading(true);
    
    try {
      // Carregar colaboradores
      const colaboradores = getFromStorage<any[]>('sisteq-colaboradores', []);

      // Carregar funções
      const funcoes = getFromStorage<any[]>('sisteq-funcoes', []);

      // Carregar fichas de integração
      const fichas = getFromStorage<any[]>('sisteq-fichas-integracao', []);

      // Filtrar por período
      const dataLimite = periodo === 'todos' ? null : new Date();
      if (dataLimite) {
        dataLimite.setDate(dataLimite.getDate() - parseInt(periodo));
      }

      const colaboradoresFiltrados = dataLimite
        ? colaboradores.filter((c: any) => new Date(c.dataAdmissao) >= dataLimite)
        : colaboradores;

      // Estatísticas básicas
      const totalColaboradores = colaboradores.length;
      const ativos = colaboradores.filter((c: any) => c.status === 'ativo').length;
      const inativos = colaboradores.filter((c: any) => c.status !== 'ativo').length;

      // Integração
      let integracoesCompletas = 0;
      let integracoesPendentes = 0;

      colaboradores.forEach((col: any) => {
        const regs = getFromStorage<any[]>(`sisteq-integracao-${col.id}`, []);
        if (regs.length > 0) {
          integracoesCompletas++;
        } else {
          integracoesPendentes++;
        }
      });

      // Avaliações de Experiência
      let aprovadas = 0;
      let reprovadas = 0;

      colaboradores.forEach((col: any) => {
        const avs = getFromStorage<any[]>(`sisteq-avaliacao-experiencia-${col.id}`, []);
        avs.forEach((av: any) => {
          if (av.percentualAprovacao >= 70) { // Considerando 70% como padrão
            aprovadas++;
          } else {
            reprovadas++;
          }
        });
      });

      // Avaliações de Desempenho
      let excelente = 0;
      let bom = 0;
      let regular = 0;
      let insatisfatorio = 0;

      colaboradores.forEach((col: any) => {
        const avs = getFromStorage<any[]>(`sisteq-avaliacao-desempenho-${col.id}`, []);
        avs.forEach((av: any) => {
          switch (av.classificacao) {
            case 'excelente':
              excelente++;
              break;
            case 'bom':
              bom++;
              break;
            case 'regular':
              regular++;
              break;
            case 'insatisfatorio':
              insatisfatorio++;
              break;
          }
        });
      });

      setDashboardData({
        totalColaboradores,
        ativos,
        inativos,
        integracoesPendentes,
        integracoesCompletas,
        avaliacoesExperienciaAprovadas: aprovadas,
        avaliacoesExperienciaReprovadas: reprovadas,
        avaliacoesDesempenhoExcelente: excelente,
        avaliacoesDesempenhoBom: bom,
        avaliacoesDesempenhoRegular: regular,
        avaliacoesDesempenhoInsatisfatorio: insatisfatorio,
        funcoesCadastradas: funcoes.length,
        fichasIntegracaoCadastradas: fichas.length
      });

      // Colaboradores recentes (últimos 5)
      const recentes = colaboradores
        .sort((a: any, b: any) => new Date(b.dataAdmissao).getTime() - new Date(a.dataAdmissao).getTime())
        .slice(0, 5)
        .map((col: any) => {
          const registros = getFromStorage<any[]>(`sisteq-integracao-${col.id}`, []);
          const integracaoCompleta = registros.length > 0;

          const avs = getFromStorage<any[]>(`sisteq-avaliacao-experiencia-${col.id}`, []);
          let avaliacaoExperiencia: 'aprovado' | 'reprovado' | 'pendente' = 'pendente';
          
          if (avs.length > 0) {
            const ultimaAv = avs[avs.length - 1];
            avaliacaoExperiencia = ultimaAv.percentualAprovacao >= 70 ? 'aprovado' : 'reprovado';
          }

          return {
            id: col.id,
            nome: col.nomeCompleto,
            funcao: col.funcao,
            dataAdmissao: col.dataAdmissao,
            status: col.status,
            integracaoCompleta,
            avaliacaoExperiencia
          };
        });

      setColaboradoresRecentes(recentes);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dados para gráficos
  const dadosColaboradores = [
    { name: 'Ativos', value: dashboardData.ativos, color: COLORS.success },
    { name: 'Inativos', value: dashboardData.inativos, color: COLORS.danger }
  ];

  const dadosIntegracao = [
    { name: 'Completas', value: dashboardData.integracoesCompletas, color: COLORS.success },
    { name: 'Pendentes', value: dashboardData.integracoesPendentes, color: COLORS.warning }
  ];

  const dadosExperiencia = [
    { name: 'Aprovados', value: dashboardData.avaliacoesExperienciaAprovadas, color: COLORS.success },
    { name: 'Reprovados', value: dashboardData.avaliacoesExperienciaReprovadas, color: COLORS.danger }
  ];

  const dadosDesempenho = [
    { name: 'Excelente', value: dashboardData.avaliacoesDesempenhoExcelente },
    { name: 'Bom', value: dashboardData.avaliacoesDesempenhoBom },
    { name: 'Regular', value: dashboardData.avaliacoesDesempenhoRegular },
    { name: 'Insatisfatório', value: dashboardData.avaliacoesDesempenhoInsatisfatorio }
  ];

  const coresDesempenho = [COLORS.success, COLORS.primary, COLORS.warning, COLORS.danger];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Dashboard Pessoas
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Visão geral de colaboradores, integrações e avaliações
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-8">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          <Button
            onClick={loadDashboardData}
            disabled={loading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total de Colaboradores"
          value={dashboardData.totalColaboradores}
          icon={Users}
          variant="info"
          trendLabel={`${dashboardData.ativos} ativos · ${dashboardData.inativos} inativos`}
          trend="neutral"
        />
        <MetricCard
          label="Integrações Completas"
          value={dashboardData.integracoesCompletas}
          icon={CheckCircle2}
          variant="success"
          trendLabel={`${dashboardData.integracoesPendentes} pendentes`}
          trend={dashboardData.integracoesCompletas > dashboardData.integracoesPendentes ? 'up' : 'down'}
        />
        <MetricCard
          label="Experiências Aprovadas"
          value={dashboardData.avaliacoesExperienciaAprovadas}
          icon={Award}
          variant="warning"
          trendLabel={`${dashboardData.avaliacoesExperienciaReprovadas} reprovadas`}
          trend={dashboardData.avaliacoesExperienciaAprovadas > dashboardData.avaliacoesExperienciaReprovadas ? 'up' : 'neutral'}
        />
        <MetricCard
          label="Desempenho Excelente"
          value={dashboardData.avaliacoesDesempenhoExcelente}
          icon={Target}
          variant="purple"
          trendLabel={`${dashboardData.avaliacoesDesempenhoBom} bom · ${dashboardData.avaliacoesDesempenhoRegular} regular`}
          trend="up"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Colaboradores */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <Users className="w-4 h-4 text-gray-400" />
            Status dos Colaboradores
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dadosColaboradores}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosColaboradores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Integrações */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <CheckCircle2 className="w-4 h-4 text-gray-400" />
            Status das Integrações
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dadosIntegracao}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosIntegracao.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Avaliações de Experiência */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <Award className="w-4 h-4 text-gray-400" />
            Avaliações de Experiência
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosExperiencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {dadosExperiencia.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avaliações de Desempenho */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <Target className="w-4 h-4 text-gray-400" />
            Avaliações de Desempenho
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosDesempenho}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {dadosDesempenho.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={coresDesempenho[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Colaboradores Recentes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-gray-900 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <Clock className="w-4 h-4 text-gray-400" />
            Colaboradores Recentes
          </h3>
        </div>
        
        {colaboradoresRecentes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Nome</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Função</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Admissão</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Integração</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Experiência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colaboradoresRecentes.map((col) => (
                  <tr key={col.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm" style={{ fontWeight: 500 }}>
                          {col.nome.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{col.nome}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {col.funcao}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatarDataPtBr(col.dataAdmissao)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        col.status === 'ativo' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      }`} style={{ fontWeight: 500 }}>
                        {col.status === 'ativo' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {col.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {col.integracaoCompleta ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ fontWeight: 500 }}>
                          <CheckCircle2 className="w-3 h-3" />
                          Completa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200" style={{ fontWeight: 500 }}>
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {col.avaliacaoExperiencia === 'aprovado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ fontWeight: 500 }}>
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado
                        </span>
                      ) : col.avaliacaoExperiencia === 'reprovado' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200" style={{ fontWeight: 500 }}>
                          <XCircle className="w-3 h-3" />
                          Reprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200" style={{ fontWeight: 500 }}>
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum colaborador cadastrado</p>
          </div>
        )}
      </div>

      {/* Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/recursos-humanos/colaboradores"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Colaboradores</div>
            <div className="text-xs text-gray-500">Gerenciar cadastros</div>
          </div>
        </Link>

        <Link
          to="/recursos-humanos/integracao"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Integração</div>
            <div className="text-xs text-gray-500">Gerenciar integrações</div>
          </div>
        </Link>

        <Link
          to="/recursos-humanos/avaliacao-experiencia"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
        >
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Experiência</div>
            <div className="text-xs text-gray-500">Avaliar contratos</div>
          </div>
        </Link>

        <Link
          to="/recursos-humanos/avaliacao-desempenho"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
        >
          <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="text-sm text-gray-900" style={{ fontWeight: 500 }}>Desempenho</div>
            <div className="text-xs text-gray-500">Avaliar performance</div>
          </div>
        </Link>
      </div>
    </div>
  );
}