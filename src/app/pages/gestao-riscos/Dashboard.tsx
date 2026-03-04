import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStrategic } from '../../context/StrategicContext';
import { Risco } from '../../types/strategic';
import { MetricCard } from '../../components/ui/metric-card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  ShieldAlert, AlertTriangle, TrendingUp, CheckCircle2, Send,
  BarChart3, ChevronRight, Eye, Edit, Building2, Calendar, FileText
} from 'lucide-react';
import { calcularClassificacao, getNivelColor } from '../../utils/risk-helpers';

export function RiscosDashboard() {
  const navigate = useNavigate();
  const { dados } = useStrategic();
  const riscos = dados.riscos || [];
  const [riscoSelecionado, setRiscoSelecionado] = useState<Risco | null>(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);

  const handleVerDetalhes = (risco: Risco) => {
    setRiscoSelecionado(risco);
    setIsDetalhesOpen(true);
  };

  const handleEditar = () => {
    setIsDetalhesOpen(false);
    if (riscoSelecionado) {
      navigate(`/gestao-riscos/registro?editarRisco=${riscoSelecionado.id}`);
    }
  };

  // Estatísticas
  const totalRiscos = riscos.length;
  const riscosAlto = riscos.filter(r => {
    const { nivel } = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial);
    return nivel === 'Alto';
  }).length;
  const riscosMedio = riscos.filter(r => {
    const { nivel } = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial);
    return nivel === 'Médio';
  }).length;
  const riscosBaixo = riscos.filter(r => {
    const { nivel } = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial);
    return nivel === 'Baixo';
  }).length;
  const riscosAceitos = riscos.filter(r => r.status === 'Aceitar').length;
  const riscosTratados = riscos.filter(r => r.status === 'Tratar').length;
  const riscosTransferidos = riscos.filter(r => r.status === 'Transferir').length;

  const departamentos = ['Produção', 'Comercial', 'TI', 'Qualidade', 'RH', 'Financeiro', 'Logística'];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Dashboard de Riscos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Visão geral dos riscos identificados e suas classificações.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-8">
          <Button 
            onClick={() => navigate('/gestao-riscos/registro')}
            className="gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            Novo Risco
          </Button>
        </div>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total de Riscos"
          value={totalRiscos}
          icon={ShieldAlert}
          variant="info"
        />
        <MetricCard
          label="Risco Alto"
          value={riscosAlto}
          icon={AlertTriangle}
          variant="danger"
          trendLabel={totalRiscos > 0 ? `${Math.round((riscosAlto / totalRiscos) * 100)}% do total` : undefined}
          trend={riscosAlto > 0 ? 'down' : undefined}
        />
        <MetricCard
          label="Risco Médio"
          value={riscosMedio}
          icon={TrendingUp}
          variant="warning"
          trendLabel={totalRiscos > 0 ? `${Math.round((riscosMedio / totalRiscos) * 100)}% do total` : undefined}
          trend="neutral"
        />
        <MetricCard
          label="Risco Baixo"
          value={riscosBaixo}
          icon={CheckCircle2}
          variant="success"
          trendLabel={totalRiscos > 0 ? `${Math.round((riscosBaixo / totalRiscos) * 100)}% do total` : undefined}
          trend={riscosBaixo > 0 ? 'up' : undefined}
        />
      </div>

      {/* ═══ STATUS DOS RISCOS ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Aceitos"
          value={riscosAceitos}
          icon={CheckCircle2}
          variant="success"
          trendLabel={totalRiscos > 0 ? `${Math.round((riscosAceitos / totalRiscos) * 100)}% do total` : undefined}
          trend="neutral"
        />
        <MetricCard
          label="Em Tratamento"
          value={riscosTratados}
          icon={AlertTriangle}
          variant="info"
          trendLabel={totalRiscos > 0 ? `${Math.round((riscosTratados / totalRiscos) * 100)}% do total` : undefined}
          trend="neutral"
        />
        <MetricCard
          label="Transferidos"
          value={riscosTransferidos}
          icon={Send}
          variant="purple"
          trendLabel={totalRiscos > 0 ? `${Math.round((riscosTransferidos / totalRiscos) * 100)}% do total` : undefined}
          trend="neutral"
        />
      </div>

      {/* ═══ DISTRIBUIÇÃO ═══ */}
      <div className="grid grid-cols-2 gap-4">
        {/* Por Departamento */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                Distribuição por Departamento
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {departamentos.map(dept => {
              const count = riscos.filter(r => r.departamento === dept).length;
              const percentage = riscos.length > 0 ? (count / riscos.length) * 100 : 0;
              
              return count > 0 ? (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-600">{dept}</span>
                    <span className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              ) : null;
            })}
            {riscos.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum risco cadastrado</p>
            )}
          </div>
        </div>

        {/* Por Nível */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                Distribuição por Nível
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {[
              { label: 'Baixo', sublabel: 'Classificação 1–2', count: riscosBaixo, bg: 'bg-emerald-50', badge: 'bg-emerald-500', text: 'text-emerald-600' },
              { label: 'Médio', sublabel: 'Classificação 3–4', count: riscosMedio, bg: 'bg-amber-50', badge: 'bg-amber-500', text: 'text-amber-600' },
              { label: 'Alto', sublabel: 'Classificação 6–9', count: riscosAlto, bg: 'bg-red-50', badge: 'bg-red-500', text: 'text-red-600' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between p-3.5 ${item.bg} rounded-xl`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${item.badge} rounded-lg flex items-center justify-center`}>
                    <span className="text-white" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.count}</span>
                  </div>
                  <div>
                    <p className="text-gray-900" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.label}</p>
                    <p className="text-xs text-gray-500">{item.sublabel}</p>
                  </div>
                </div>
                <p className={`${item.text}`} style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {riscos.length > 0 ? Math.round((item.count / riscos.length) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RISCOS CRÍTICOS RECENTES ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              Riscos Críticos Recentes
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gray-500 text-sm gap-1"
            onClick={() => navigate('/gestao-riscos/registro')}
          >
            Ver Todos
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-6">
          {riscos.filter(r => {
            const { nivel } = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial);
            return nivel === 'Alto';
          }).slice(0, 5).length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="text-sm text-gray-500">Nenhum risco crítico identificado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {riscos.filter(r => {
                const { nivel } = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial);
                return nivel === 'Alto';
              }).slice(0, 5).map((risco) => {
                const { nivel } = calcularClassificacao(risco.impactoInicial, risco.probabilidadeInicial);
                return (
                  <div key={risco.id} className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer" onClick={() => handleVerDetalhes(risco)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs bg-red-50 text-red-700 border-red-200" style={{ fontWeight: 500 }}>
                            {nivel}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs bg-gray-50 text-gray-600 border-gray-200" style={{ fontWeight: 500 }}>
                            {risco.status}
                          </span>
                          <span className="text-xs text-gray-400">{risco.departamento}</span>
                        </div>
                        <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 450 }}>{risco.descricaoRisco}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Processo: {risco.processo}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ DIALOG: DETALHES DO RISCO ═══ */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gray-400" />
              Detalhes do Risco
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre o risco selecionado.
            </DialogDescription>
          </DialogHeader>
          {riscoSelecionado && (
            <div className="space-y-5 pt-2">
              {/* Header badges */}
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${getNivelColor(calcularClassificacao(riscoSelecionado.impactoInicial, riscoSelecionado.probabilidadeInicial).nivel)}`} style={{ fontWeight: 500 }}>
                  {calcularClassificacao(riscoSelecionado.impactoInicial, riscoSelecionado.probabilidadeInicial).nivel}
                </span>
                <Badge variant="outline">{riscoSelecionado.status}</Badge>
                <span className="text-sm text-gray-500" style={{ fontWeight: 500 }}>{riscoSelecionado.codigo}</span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Departamento
                  </p>
                  <p className="text-sm text-gray-900">{riscoSelecionado.departamento}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Data de Registro
                  </p>
                  <p className="text-sm text-gray-900">{riscoSelecionado.dataRegistro}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Descrição do Risco
                </p>
                <p className="text-sm text-gray-900">{riscoSelecionado.descricaoRisco}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Processo Relacionado</p>
                <p className="text-sm text-gray-900">{riscoSelecionado.processo}</p>
              </div>

              {/* Classificação */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Impacto</p>
                  <p className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{riscoSelecionado.impactoInicial}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Probabilidade</p>
                  <p className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{riscoSelecionado.probabilidadeInicial}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Classificação</p>
                  <p className="text-gray-900" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {calcularClassificacao(riscoSelecionado.impactoInicial, riscoSelecionado.probabilidadeInicial).valor}
                  </p>
                </div>
              </div>

              {riscoSelecionado.descricaoControle && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Descrição do Controle</p>
                  <p className="text-sm text-gray-900">{riscoSelecionado.descricaoControle}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-1">Responsável</p>
                <p className="text-sm text-gray-900">{riscoSelecionado.responsavel}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setIsDetalhesOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={handleEditar} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Editar Risco
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
