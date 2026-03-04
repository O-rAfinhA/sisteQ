import { useNavigate } from 'react-router';
import { useStrategic } from '../../context/StrategicContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { MetricCard } from '../../components/ui/metric-card';
import { 
  ShieldAlert, 
  Plus, 
  Eye, 
  CheckCircle2,
  AlertCircle,
  Send
} from 'lucide-react';

import { calcularClassificacao, getNivelColor, getStatusColor } from '../../utils/risk-helpers';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Aceitar':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'Tratar':
      return <AlertCircle className="w-3.5 h-3.5" />;
    case 'Transferir':
      return <Send className="w-3.5 h-3.5" />;
    default:
      return null;
  }
};

export function RiscosTratamento() {
  const navigate = useNavigate();
  const { dados } = useStrategic();
  const riscos = dados.riscos || [];

  const riscosAceitos = riscos.filter(r => r.status === 'Aceitar');
  const riscosTratados = riscos.filter(r => r.status === 'Tratar');
  const riscosTransferidos = riscos.filter(r => r.status === 'Transferir');

  const renderRiscoCard = (risco: any) => {
    const { nivel } = calcularClassificacao(risco.impactoInicial, risco.probabilidadeInicial);
    
    return (
      <div key={risco.id} className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{risco.codigo}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${getNivelColor(nivel)}`} style={{ fontWeight: 500 }}>
                {nivel}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs ${getStatusColor(risco.status)}`} style={{ fontWeight: 500 }}>
                {getStatusIcon(risco.status)}
                {risco.status}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-1.5">{risco.descricaoRisco}</p>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>Departamento: <span className="text-gray-600" style={{ fontWeight: 500 }}>{risco.departamento}</span></span>
              <span>Processo: <span className="text-gray-600" style={{ fontWeight: 500 }}>{risco.processo}</span></span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => navigate(`/gestao-riscos/registro?editarRisco=${risco.id}`)}
          >
            <Eye className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
        
        {risco.status === 'Tratar' && risco.planoAcaoVinculado && (
          <div 
            className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100/70 transition-colors"
            onClick={() => navigate(`/acoes-corretivas/plano-acao?editPlanoNumero=${risco.planoAcaoVinculado}`)}
          >
            <p className="text-xs text-blue-500" style={{ fontWeight: 500 }}>Plano de Ação Vinculado</p>
            <p className="text-sm text-blue-700 mt-0.5" style={{ fontWeight: 600 }}>{risco.planoAcaoVinculado}</p>
          </div>
        )}
        
        {risco.status === 'Transferir' && risco.transferidoPara && (
          <div className="mt-3 p-3 bg-violet-50 rounded-lg border border-violet-100">
            <p className="text-xs text-violet-500" style={{ fontWeight: 500 }}>Transferido para</p>
            <p className="text-sm text-violet-700 mt-0.5">{risco.transferidoPara}</p>
            {risco.observacaoTransferencia && (
              <p className="text-xs text-violet-500 mt-1">{risco.observacaoTransferencia}</p>
            )}
          </div>
        )}
        
        {risco.controlesExistentes && risco.controlesExistentes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1.5" style={{ fontWeight: 500 }}>Controles Existentes</p>
            <div className="flex flex-wrap gap-1">
              {risco.controlesExistentes.map((controle: string, idx: number) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200">
                  {controle}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, items: any[], emptyText: string) => {
    if (items.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              {title}
            </h3>
            <span className="text-xs text-gray-400 ml-1">({items.length})</span>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {items.map(renderRiscoCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
            Plano de Tratamento de Riscos
          </h1>
          <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Gerencie as estratégias de tratamento para cada risco identificado.
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
          label="Riscos Aceitos"
          value={riscosAceitos.length}
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          label="Em Tratamento"
          value={riscosTratados.length}
          icon={AlertCircle}
          variant="info"
        />
        <MetricCard
          label="Transferidos"
          value={riscosTransferidos.length}
          icon={Send}
          variant="purple"
        />
      </div>

      {/* ═══ RISK SECTIONS ═══ */}
      {renderSection(
        'Riscos em Tratamento',
        <AlertCircle className="w-4 h-4 text-blue-500" />,
        riscosTratados,
        'Nenhum risco em tratamento'
      )}

      {renderSection(
        'Riscos Aceitos',
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        riscosAceitos,
        'Nenhum risco aceito'
      )}

      {renderSection(
        'Riscos Transferidos',
        <Send className="w-4 h-4 text-violet-500" />,
        riscosTransferidos,
        'Nenhum risco transferido'
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {riscos.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-900 mb-1" style={{ fontSize: '1rem', fontWeight: 600 }}>
              Nenhum risco cadastrado
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Comece cadastrando riscos para gerenciar seu plano de tratamento.
            </p>
            <Button 
              onClick={() => navigate('/gestao-riscos/registro')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Risco
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}