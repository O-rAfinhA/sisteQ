import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStrategic } from '../../context/StrategicContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { MetricCard } from '../../components/ui/metric-card';
import { 
  ShieldAlert, 
  Plus, 
  Eye,
  Calendar,
  Search,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';

import { calcularClassificacao, getNivelColor } from '../../utils/risk-helpers';
import { formatarDataPtBr } from '../../utils/formatters';

export function RiscosHistorico() {
  const navigate = useNavigate();
  const { dados } = useStrategic();
  const riscos = dados.riscos || [];
  const [busca, setBusca] = useState('');

  const riscosComRevisoes = riscos.filter(r => r.revisoes && r.revisoes.length > 0);

  const riscosFiltrados = riscosComRevisoes.filter(risco => {
    const termoBusca = busca.toLowerCase();
    return (
      risco.codigo.toLowerCase().includes(termoBusca) ||
      risco.descricaoRisco.toLowerCase().includes(termoBusca) ||
      risco.departamento.toLowerCase().includes(termoBusca) ||
      risco.processo.toLowerCase().includes(termoBusca)
    );
  });

  const getTendenciaIcon = (nivelAnterior: string, nivelAtual: string) => {
    const niveis = { 'Baixo': 1, 'Médio': 2, 'Alto': 3 };
    const anterior = niveis[nivelAnterior as keyof typeof niveis];
    const atual = niveis[nivelAtual as keyof typeof niveis];
    
    if (atual < anterior) {
      return <TrendingDown className="w-4 h-4 text-emerald-600" />;
    } else if (atual > anterior) {
      return <TrendingUp className="w-4 h-4 text-red-600" />;
    } else {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const melhorados = riscosComRevisoes.filter(r => {
    if (!r.revisoes || r.revisoes.length === 0) return false;
    const ultimaRevisao = r.revisoes[r.revisoes.length - 1];
    const nivelInicial = calcularClassificacao(r.impactoInicial, r.probabilidadeInicial).nivel;
    const nivelAtual = calcularClassificacao(
      ultimaRevisao.impactoResidual ?? r.impactoInicial,
      ultimaRevisao.probabilidadeResidual ?? r.probabilidadeInicial,
    ).nivel;
    const niveis = { 'Baixo': 1, 'Médio': 2, 'Alto': 3 };
    return niveis[nivelAtual] < niveis[nivelInicial];
  }).length;

  const totalRevisoes = riscosComRevisoes.reduce((acc, r) => acc + (r.revisoes?.length || 0), 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Histórico de Revisões
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Acompanhe as reavaliações e atualizações dos riscos ao longo do tempo.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/gestao-riscos/registro')}
          className="gap-2 flex-shrink-0 ml-8"
        >
          <Plus className="w-4 h-4" />
          Novo Risco
        </Button>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Riscos Reavaliados"
          value={riscosComRevisoes.length}
          icon={Calendar}
          variant="info"
        />
        <MetricCard
          label="Melhorados"
          value={melhorados}
          icon={TrendingDown}
          variant="success"
        />
        <MetricCard
          label="Total de Revisões"
          value={totalRevisoes}
          icon={ShieldAlert}
          variant="warning"
        />
      </div>

      {/* ═══ BUSCA ═══ */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar por código, descrição, departamento ou processo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ═══ LISTA DE RISCOS COM HISTÓRICO ═══ */}
      {riscosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              {riscosComRevisoes.length === 0 ? 'Nenhuma revisão registrada' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-sm text-gray-400">
              {riscosComRevisoes.length === 0 
                ? 'As revisões de riscos aparecerão aqui quando forem realizadas'
                : 'Tente ajustar os termos de busca'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {riscosFiltrados.map((risco) => {
            const nivelInicial = calcularClassificacao(risco.impactoInicial, risco.probabilidadeInicial);
            const ultimaRevisao = risco.revisoes && risco.revisoes.length > 0 
              ? risco.revisoes[risco.revisoes.length - 1] 
              : null;
            const nivelAtual = ultimaRevisao 
              ? calcularClassificacao(
                  ultimaRevisao.impactoResidual ?? risco.impactoInicial,
                  ultimaRevisao.probabilidadeResidual ?? risco.probabilidadeInicial,
                )
              : nivelInicial;

            return (
              <div key={risco.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Card header */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{risco.codigo}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${getNivelColor(nivelInicial.nivel)}`} style={{ fontWeight: 500 }}>
                          Inicial: {nivelInicial.nivel}
                        </span>
                        {ultimaRevisao && (
                          <>
                            {getTendenciaIcon(nivelInicial.nivel, nivelAtual.nivel)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${getNivelColor(nivelAtual.nivel)}`} style={{ fontWeight: 500 }}>
                              Atual: {nivelAtual.nivel}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{risco.descricaoRisco}</p>
                      <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                        <span>Departamento: <span className="text-gray-600" style={{ fontWeight: 500 }}>{risco.departamento}</span></span>
                        <span>Processo: <span className="text-gray-600" style={{ fontWeight: 500 }}>{risco.processo}</span></span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => navigate('/gestao-riscos/registro')}
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
                
                {/* Revisões */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <h4 className="text-sm text-gray-500" style={{ fontWeight: 500 }}>
                      Histórico de Revisões ({risco.revisoes?.length || 0})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {risco.revisoes?.map((revisao, idx) => {
                      const nivelRevisao = calcularClassificacao(
                        revisao.impactoResidual ?? risco.impactoInicial,
                        revisao.probabilidadeResidual ?? risco.probabilidadeInicial,
                      );
                      return (
                        <div key={idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-200 text-gray-600" style={{ fontWeight: 500 }}>
                                Revisão {idx + 1}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${getNivelColor(nivelRevisao.nivel)}`} style={{ fontWeight: 500 }}>
                                {nivelRevisao.nivel}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {revisao.dataRevisao ? formatarDataPtBr(revisao.dataRevisao) : '-'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-xs text-gray-400">Impacto Residual:</span>
                              <span className="ml-2 text-gray-900" style={{ fontWeight: 500 }}>{revisao.impactoResidual ?? '-'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Probabilidade Residual:</span>
                              <span className="ml-2 text-gray-900" style={{ fontWeight: 500 }}>{revisao.probabilidadeResidual ?? '-'}</span>
                            </div>
                          </div>
                          {revisao.observacoesRevisao && (
                            <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                <span className="text-gray-400" style={{ fontWeight: 500 }}>Observações:</span>{' '}
                                {revisao.observacoesRevisao}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
