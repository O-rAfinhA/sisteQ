import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  UserSquare,
  BookOpen,
  FileCheck,
  FileCheck2,
  XCircle,
  Calendar,
  RefreshCcw,
  Ban,
  LayoutDashboard
} from 'lucide-react';
import { MetricCard } from '../components/ui/metric-card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DocumentoInterno } from './DocumentosInternos';
import { DocumentoCliente } from './DocumentosClientesNovo';
import { DocumentoExterno } from './DocumentosExternosNovo';
import { DocumentoLicenca } from './DocumentosLicencas';
import { DocumentoCertidao } from './DocumentosCertidoes';

import { getFromStorage } from '../utils/helpers';

const COLORS = {
  vigente: '#10b981',
  emRevisao: '#3b82f6',
  rascunho: '#f59e0b',
  obsoleto: '#6b7280',
  vencido: '#ef4444',
  atencao: '#f97316'
};

export default function DashboardDocumentos() {
  const navigate = useNavigate();
  const [docsInternos, setDocsInternos] = useState<DocumentoInterno[]>([]);
  const [docsClientes, setDocsClientes] = useState<DocumentoCliente[]>([]);
  const [docsExternos, setDocsExternos] = useState<DocumentoExterno[]>([]);
  const [docsLicencas, setDocsLicencas] = useState<DocumentoLicenca[]>([]);
  const [docsCertidoes, setDocsCertidoes] = useState<DocumentoCertidao[]>([]);
  const [processos, setProcessos] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    setDocsInternos(getFromStorage<DocumentoInterno[]>('sisteq-docs-internos', []));
    setDocsClientes(getFromStorage<DocumentoCliente[]>('sisteq-docs-clientes', []));
    setDocsExternos(getFromStorage<DocumentoExterno[]>('sisteq-docs-externos', []));
    setDocsLicencas(getFromStorage<DocumentoLicenca[]>('sisteq-docs-licencas', []));
    setDocsCertidoes(getFromStorage<DocumentoCertidao[]>('sisteq-docs-certidoes', []));
    setProcessos(getFromStorage<any[]>('sisteq-processos', []));
  };

  // --- Helpers de Data ---
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    // Tenta formato ISO YYYY-MM-DD
    if (dateStr.includes('-')) {
      const [ano, mes, dia] = dateStr.split('-').map(Number);
      return new Date(ano, mes - 1, dia);
    }
    // Tenta formato BR DD/MM/YYYY
    if (dateStr.includes('/')) {
      const [dia, mes, ano] = dateStr.split('/').map(Number);
      return new Date(ano, mes - 1, dia);
    }
    return null;
  };

  const calcularDiasAteVencimento = (dataVencimento: string, dataReferencia?: string): number => {
    let vencimento = parseDate(dataVencimento);
    
    // Fallback para Documentos Internos sem validade explícita: 1 ano após emissão
    if (!vencimento && dataReferencia) {
       const emissao = parseDate(dataReferencia);
       if (emissao) {
         vencimento = new Date(emissao);
         vencimento.setFullYear(vencimento.getFullYear() + 1);
       }
    }

    if (!vencimento) return 999;

    const hoje = new Date();
    // Zerar horas para comparação de data apenas
    hoje.setHours(0,0,0,0);
    vencimento.setHours(0,0,0,0);

    const diffTime = vencimento.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isVencido = (dataVencimento: string, dataRef?: string): boolean => {
    return calcularDiasAteVencimento(dataVencimento, dataRef) < 0;
  };

  const isVencendoEm = (dataVencimento: string, dias: number, dataRef?: string): boolean => {
    const diasRestantes = calcularDiasAteVencimento(dataVencimento, dataRef);
    return diasRestantes >= 0 && diasRestantes <= dias;
  };

  // --- CÁLCULOS DAS MÉTRICAS ---

  // 1. Visão Geral
  const totalInternos = docsInternos.length;
  const totalClientes = docsClientes.length;
  const totalExternos = docsExternos.length;
  const totalLicencas = docsLicencas.length;
  const totalCertidoes = docsCertidoes.length;
  const totalGeral = totalInternos + totalClientes + totalExternos + totalLicencas + totalCertidoes;

  // 2. Alertas Específicos (Prompt Requirements)
  
  // "Internos em revisão"
  const internosEmRevisao = docsInternos.filter(d => d.status === 'Em Revisão' || d.status === 'Em Aprovação').length;

  // "Internos vencendo revisão" (Vigentes que vencem em 30 dias)
  const internosVencendoRevisao = docsInternos.filter(d => 
    d.status === 'Vigente' && isVencendoEm(d.dataValidade || '', 30, d.dataEmissao)
  ).length;

  // "Externos vencendo validade" (Vigentes que vencem em 30 dias)
  const externosVencendoValidade = docsExternos.filter(d => 
    d.status === 'Vigente' && isVencendoEm(d.dataVigencia, 30)
  ).length;

  // "Certidões vencidas"
  const certidoesVencidasTotal = docsCertidoes.filter(d => isVencido(d.dataVencimento)).length;
  
  // "Licenças vencidas"
  const licencasVencidasTotal = docsLicencas.filter(d => isVencido(d.dataVencimento)).length;

  // "Documentos obsoletos" (Total Geral)
  const totalObsoletos = 
    docsInternos.filter(d => d.status === 'Obsoleto').length +
    docsExternos.filter(d => d.status === 'Obsoleta').length +
    docsClientes.filter(d => d.status === 'Desatualizado').length +
    docsLicencas.filter(d => d.status === 'Vencida' || (d.status as any) === 'Cancelada').length; // Simplificação para licenças

  // Agregado de Vencidos (Crítico)
  const totalCriticoVencidos = certidoesVencidasTotal + licencasVencidasTotal;

  // 3. Status Agregados para Gráficos
  const statusPorCategoria = [
    {
      categoria: 'Internos',
      vigentes: docsInternos.filter(d => d.status === 'Vigente').length,
      emRevisao: internosEmRevisao, // Inclui Aprovação
      rascunho: docsInternos.filter(d => d.status === 'Rascunho').length,
      obsoletos: docsInternos.filter(d => d.status === 'Obsoleto').length,
    },
    {
      categoria: 'Clientes',
      vigentes: docsClientes.filter(d => d.status === 'Válido').length,
      emRevisao: docsClientes.filter(d => d.status === 'Em Análise').length,
      rascunho: 0,
      obsoletos: docsClientes.filter(d => d.status === 'Desatualizado').length,
    },
    {
      categoria: 'Externos',
      vigentes: docsExternos.filter(d => d.status === 'Vigente').length,
      emRevisao: docsExternos.filter(d => d.status === 'Em Revisão').length,
      rascunho: 0,
      obsoletos: docsExternos.filter(d => d.status === 'Obsoleta').length,
    },
    {
      categoria: 'Licenças',
      vigentes: docsLicencas.filter(d => d.status === 'Vigente').length,
      emRevisao: docsLicencas.filter(d => d.status === 'Em Renovação').length,
      rascunho: 0,
      obsoletos: docsLicencas.filter(d => d.status === 'Vencida').length,
    },
  ];

  // Distribuição Geral
  const distribuicaoStatus = [
    { name: 'Vigentes', value: statusPorCategoria.reduce((acc, cat) => acc + cat.vigentes, 0), color: COLORS.vigente },
    { name: 'Em Revisão', value: statusPorCategoria.reduce((acc, cat) => acc + cat.emRevisao, 0), color: COLORS.emRevisao },
    { name: 'Rascunho', value: statusPorCategoria.reduce((acc, cat) => acc + cat.rascunho, 0), color: COLORS.rascunho },
    { name: 'Obsoletos', value: statusPorCategoria.reduce((acc, cat) => acc + cat.obsoletos, 0), color: COLORS.obsoleto },
  ].filter(item => item.value > 0);

  // Licenças/Certidões Próximas
  const proximosVencimentos = [
    ...docsLicencas.map(d => ({ ...d, tipo: 'Licença', origem: 'Licenças' })),
    ...docsCertidoes.map(d => ({ ...d, tipo: 'Certidão', origem: 'Certidões' })),
    ...docsExternos.map(d => ({ ...d, nomeDocumento: d.nomeDocumento, dataVencimento: d.dataVigencia, tipo: 'Externo', origem: 'Externos' }))
  ]
  .filter(d => !isVencido(d.dataVencimento))
  .sort((a, b) => calcularDiasAteVencimento(a.dataVencimento) - calcularDiasAteVencimento(b.dataVencimento))
  .slice(0, 5);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Dashboard de Documentos
        </h1>
        <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Visão executiva de controle, validade e governança do SGQ
        </p>
      </div>

      {/* BLOCO 1 - CATEGORIAS (MetricCards clicáveis) */}
      <div>
        <h2 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          Categorias
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Internos"
            value={totalInternos}
            icon={FileText}
            variant="info"
            onClick={() => navigate('/documentos/internos')}
          />
          <MetricCard
            label="Externos"
            value={totalExternos}
            icon={BookOpen}
            variant="purple"
            onClick={() => navigate('/documentos/externos')}
          />
          <MetricCard
            label="Clientes"
            value={totalClientes}
            icon={UserSquare}
            variant="info"
            onClick={() => navigate('/documentos/clientes')}
          />
          <MetricCard
            label="Licenças"
            value={totalLicencas}
            icon={FileCheck}
            variant="success"
            onClick={() => navigate('/documentos/licencas')}
          />
          <MetricCard
            label="Certidões"
            value={totalCertidoes}
            icon={FileCheck2}
            variant="success"
            onClick={() => navigate('/documentos/certidoes')}
          />
          <MetricCard
            label="Total Geral"
            value={totalGeral}
            icon={LayoutDashboard}
            variant="default"
          />
        </div>
      </div>

      {/* BLOCO 2 - ALERTAS E INDICADORES CRÍTICOS */}
      <div>
        <h2 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          <AlertTriangle className="w-4 h-4 text-gray-400" />
          Painel de Controle e Alertas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Internos em Revisão"
            value={internosEmRevisao}
            icon={RefreshCcw}
            variant="info"
            trendLabel="Fluxo de aprovação"
            trend="neutral"
          />
          <MetricCard
            label="Revisão Vencendo"
            value={internosVencendoRevisao}
            icon={Clock}
            variant={internosVencendoRevisao > 0 ? 'warning' : 'default'}
            trendLabel="Internos (30 dias)"
            trend="neutral"
          />
          <MetricCard
            label="Externos a Vencer"
            value={externosVencendoValidade}
            icon={BookOpen}
            variant={externosVencendoValidade > 0 ? 'warning' : 'default'}
            trendLabel="Normas/Regulamentos"
            trend="neutral"
          />
          <MetricCard
            label="Vencidos (Legal)"
            value={totalCriticoVencidos}
            icon={XCircle}
            variant={totalCriticoVencidos > 0 ? 'danger' : 'default'}
            trendLabel="Licenças e Certidões"
            trend="neutral"
          />
          <MetricCard
            label="Total Obsoletos"
            value={totalObsoletos}
            icon={Ban}
            variant="default"
            trendLabel="Arquivo morto"
            trend="neutral"
          />
        </div>
      </div>

      {/* BLOCO 3 - GRÁFICOS E LISTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            Status da Documentação
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusPorCategoria}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Legend />
              <Bar dataKey="vigentes" fill={COLORS.vigente} name="Vigentes" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="emRevisao" fill={COLORS.emRevisao} name="Em Revisão" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="rascunho" fill={COLORS.rascunho} name="Rascunho" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="obsoletos" fill={COLORS.obsoleto} name="Obsoletos" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Próximos Vencimentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            <Calendar className="w-4 h-4 text-gray-400" />
            Próximos Vencimentos
          </h3>
          <div className="space-y-3">
            {proximosVencimentos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Tudo em dia! Nenhum vencimento próximo.
              </div>
            ) : (
              proximosVencimentos.map((doc, idx) => {
                const dias = calcularDiasAteVencimento(doc.dataVencimento);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-white border-gray-200">
                          {doc.tipo}
                        </Badge>
                        <span className="text-xs text-gray-500 truncate">
                          {doc.codigo || (doc as any).numeroLicenca || (doc as any).numeroProtocolo || ''}
                        </span>
                      </div>
                      <p
                        className="text-sm text-gray-900 truncate"
                        style={{ fontWeight: 500 }}
                        title={doc.nomeDocumento || (doc as any).nome || ''}
                      >
                        {doc.nomeDocumento || (doc as any).nome || ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm ${dias <= 30 ? 'text-red-600' : 'text-amber-600'}`} style={{ fontWeight: 600 }}>
                        {dias} dias
                      </span>
                      <p className="text-[10px] text-gray-500">Restantes</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {proximosVencimentos.length > 0 && (
            <Button variant="ghost" className="w-full mt-4 text-xs text-gray-500" onClick={() => navigate('/documentos/licencas')}>
              Ver calendário completo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
