import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { useFornecedores } from '../../hooks/useFornecedores';
import { getCriticidadeColor, calcularIQF, getIQFColor, getIQFGaugeColor } from '../../utils/fornecedor-helpers';
import { MetricCard } from '../../components/ui/metric-card';
import { Star, Users, AlertTriangle } from 'lucide-react';

export function FornecedorRanking() {
  const { fornecedores, rofs, recebimentos, configuracao } = useFornecedores();

  const fornecedoresComIQF = fornecedores
    .map(f => {
      const rofsDoParceiro = rofs.filter(r => r.fornecedorId === f.id);
      const recebimentosDoParceiro = recebimentos.filter(r => r.fornecedorId === f.id);
      const iqf = calcularIQF(f, rofsDoParceiro, configuracao.metaAvaliacaoPorTipo, recebimentosDoParceiro);
      return { ...f, iqf };
    })
    .filter(f => f.notaMedia !== undefined || f.iqf !== null)
    .sort((a, b) => {
      const scoreA = a.iqf?.score ?? ((a.notaMedia || 0) / 5) * 100;
      const scoreB = b.iqf?.score ?? ((b.notaMedia || 0) / 5) * 100;
      return scoreB - scoreA;
    });

  // K1: Stat cards data
  const totalClassificados = fornecedoresComIQF.length;
  const iqfMedio = totalClassificados > 0
    ? Math.round(fornecedoresComIQF.reduce((acc, f) => acc + (f.iqf?.score ?? 0), 0) / totalClassificados)
    : 0;
  const melhorIQF = totalClassificados > 0
    ? Math.max(...fornecedoresComIQF.map(f => f.iqf?.score ?? 0))
    : 0;
  const piorIQF = totalClassificados > 0
    ? Math.min(...fornecedoresComIQF.filter(f => f.iqf).map(f => f.iqf!.score))
    : 0;

  const getTendenciaIcon = (fornecedor: any) => {
    const avaliacoes = fornecedor.avaliacoes;
    if (avaliacoes.length < 2) return <Minus className="w-4 h-4 text-gray-400" />;

    const ultima = avaliacoes[avaliacoes.length - 1].notaFinal;
    const penultima = avaliacoes[avaliacoes.length - 2].notaFinal;

    if (ultima > penultima) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (ultima < penultima) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // K3: Semantic progress bar color
  const getProgressBarColor = (nota: number) => {
    if (nota >= 4) return 'bg-emerald-500';
    if (nota >= 3) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Ranking de Fornecedores
        </h1>
        <p className="text-gray-500 mt-1.5" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Classificação por desempenho geral (IQF)
        </p>
      </div>

      {/* K1: Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Classificados"
          value={totalClassificados}
          icon={Users}
          variant="info"
        />
        <MetricCard
          label="IQF Médio"
          value={iqfMedio}
          icon={Award}
          variant="purple"
        />
        <MetricCard
          label="Melhor IQF"
          value={melhorIQF}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          label="Pior IQF"
          value={piorIQF || '--'}
          icon={AlertTriangle}
          variant={piorIQF > 0 && piorIQF < 60 ? 'danger' : 'warning'}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="px-4 py-3 text-center text-xs text-gray-500 w-20" style={{ fontWeight: 500 }}>Posição</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500" style={{ fontWeight: 500 }}>Fornecedor</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Criticidade</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>IQF</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Média Geral</th>
              <th className="px-4 py-3 text-center text-xs text-gray-500" style={{ fontWeight: 500 }}>Tendência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fornecedoresComIQF.map((fornecedor, idx) => {
              const iqfColor = fornecedor.iqf ? getIQFColor(fornecedor.iqf.score) : null;
              return (
                <tr key={fornecedor.id} className={`hover:bg-gray-50/50 transition-colors ${idx < 3 ? 'bg-amber-50/20' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto ${
                      idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-amber-600' : 'bg-gray-900'
                    }`}>
                      <span className="text-white text-xs" style={{ fontWeight: 600 }}>{idx + 1}º</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{fornecedor.razaoSocial}</p>
                      <p className="text-xs text-gray-400">{fornecedor.nomeFantasia}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${getCriticidadeColor(fornecedor.criticidade)}`} style={{ fontWeight: 500 }}>
                      {fornecedor.criticidade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fornecedor.iqf ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <svg width="28" height="18" viewBox="0 0 28 18">
                            <path d="M 2 16 A 12 12 0 0 1 26 16" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
                            <path d="M 2 16 A 12 12 0 0 1 26 16" fill="none" stroke={getIQFGaugeColor(fornecedor.iqf.score)} strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${Math.PI * 12}`} strokeDashoffset={`${Math.PI * 12 - (fornecedor.iqf.score / 100) * Math.PI * 12}`} />
                          </svg>
                          <span className={`${
                            fornecedor.iqf.score >= 80 ? 'text-emerald-600' : fornecedor.iqf.score >= 60 ? 'text-amber-600' : 'text-red-600'
                          }`} style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                            {fornecedor.iqf.score}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${iqfColor?.bg} ${iqfColor?.text} border ${iqfColor?.border}`} style={{ fontWeight: 600 }}>
                          {iqfColor?.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-full max-w-[120px] bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${getProgressBarColor(fornecedor.notaMedia || 0)} h-full rounded-full`}
                          style={{ width: `${((fornecedor.notaMedia || 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`min-w-[3rem] ${
                        (fornecedor.notaMedia || 0) >= 4 ? 'text-emerald-600' : (fornecedor.notaMedia || 0) >= 3 ? 'text-amber-600' : 'text-red-600'
                      }`} style={{ fontSize: '1rem', fontWeight: 600 }}>
                        {fornecedor.notaMedia?.toFixed(1) ?? '--'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getTendenciaIcon(fornecedor)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {fornecedoresComIQF.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum fornecedor avaliado ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}