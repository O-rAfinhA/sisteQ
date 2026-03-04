import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, X, Target, TrendingUp, Users, Cog, GraduationCap, Edit2, Eye, Link as LinkIcon } from 'lucide-react';
import { MetricCard } from '../components/ui/metric-card';
import { toast } from 'sonner';
import { PerspectivaBsc, PoliticaBscItem, ObjetivoBscItem } from '../types/strategic';
import { ObjetivoDialog } from '../components/ObjetivoDialog';
import { PAEDetailsDialog } from '../components/PAEDetailsDialog';
import { ObjetivoBscDetailsDialog } from '../components/ObjetivoBscDetailsDialog';
import { formatarData } from '../utils/formatters';

const perspectivasConfig = {
  financeira: { label: 'Financeira', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  clientes: { label: 'Clientes', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  processos: { label: 'Processos Internos', icon: Cog, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  aprendizado: { label: 'Aprendizado e Crescimento', icon: GraduationCap, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
};

export default function ObjetivosEstrategicos() {
  const { dados, addObjetivoBsc, updateObjetivoBsc, removeObjetivoBsc } = useStrategic();
  
  // Estados para Dialogs
  const [isPAEDetailsOpen, setIsPAEDetailsOpen] = useState(false);
  const [selectedPAE, setSelectedPAE] = useState<any>(null);
  const [isObjetivoDetailsOpen, setIsObjetivoDetailsOpen] = useState(false);
  const [selectedObjetivo, setSelectedObjetivo] = useState<ObjetivoBscItem | null>(null);

  const getPoliticasPorPerspectiva = (perspectiva: PerspectivaBsc): PoliticaBscItem[] => {
    return dados.direcionamento.politicaBsc.filter(p => p.perspectiva === perspectiva);
  };

  const getPlanoAcaoNome = (numeroPE?: string) => {
    if (!numeroPE) return null;
    const plano = dados.planosAcao.find(p => p.numeroPE === numeroPE);
    return plano ? { numeroPE: plano.numeroPE, id: plano.id, acao: plano.acao } : null;
  };

  const calcularResumo = () => {
    const total = dados.direcionamento.objetivosBsc.length;
    const porPerspectiva = {
      financeira: dados.direcionamento.objetivosBsc.filter(o => o.perspectiva === 'financeira').length,
      clientes: dados.direcionamento.objetivosBsc.filter(o => o.perspectiva === 'clientes').length,
      processos: dados.direcionamento.objetivosBsc.filter(o => o.perspectiva === 'processos').length,
      aprendizado: dados.direcionamento.objetivosBsc.filter(o => o.perspectiva === 'aprendizado').length,
    };
    const comPE = dados.direcionamento.objetivosBsc.filter(o => o.planoAcaoVinculado).length;
    
    return { total, porPerspectiva, comPE };
  };

  const resumo = calcularResumo();

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Objetivos Estratégicos
        </h1>
        <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Defina e gerencie os objetivos estratégicos organizados por perspectivas BSC.
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="Total de Objetivos"
          value={resumo.total}
          icon={Target}
          variant="default"
        />
        <MetricCard
          label="Financeira"
          value={resumo.porPerspectiva.financeira}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          label="Clientes"
          value={resumo.porPerspectiva.clientes}
          icon={Users}
          variant="info"
        />
        <MetricCard
          label="Processos"
          value={resumo.porPerspectiva.processos}
          icon={Cog}
          variant="purple"
        />
        <MetricCard
          label="Aprendizado"
          value={resumo.porPerspectiva.aprendizado}
          icon={GraduationCap}
          variant="warning"
        />
      </div>

      {/* Objetivos por Perspectiva */}
      <div className="space-y-6">
        {(['financeira', 'clientes', 'processos', 'aprendizado'] as PerspectivaBsc[]).map((perspectiva) => {
          const config = perspectivasConfig[perspectiva];
          const Icon = config.icon;
          const objetivos = dados.direcionamento.objetivosBsc.filter(o => o.perspectiva === perspectiva);
          const politicasDaPerspectiva = getPoliticasPorPerspectiva(perspectiva);
          
          return (
            <Card key={perspectiva} className={`${config.borderColor}`}>
              <CardHeader className={config.bgColor}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-6 h-6 ${config.color}`} />
                  <div>
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <CardDescription>
                      {objetivos.length} objetivo(s) cadastrado(s)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Layout de 2 colunas: Desdobramento à esquerda | Objetivos à direita */}
                <div className="grid grid-cols-[35%_65%] gap-4">
                  {/* Coluna Esquerda: Desdobramento da Política */}
                  <div className={`border-r-2 ${config.borderColor} pr-4`}>
                    <div className="sticky top-4">
                      <h4 className="text-xs text-gray-500 mb-3" style={{ fontWeight: 500 }}>Desdobramento da Política</h4>
                      {politicasDaPerspectiva.length > 0 ? (
                        <div className="space-y-2">
                          {politicasDaPerspectiva.map((politica) => (
                            <div key={politica.id} className={`p-3 ${config.bgColor} rounded-lg border ${config.borderColor}`}>
                              <p className="text-sm text-gray-700 leading-relaxed">{politica.descricao}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-xs text-gray-400">Nenhum desdobramento definido</p>
                          <p className="text-xs text-gray-400 mt-1">Cadastre em Direcionamento Estratégico</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Coluna Direita: Objetivos Específicos */}
                  <div className="pl-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Objetivos Específicos ({objetivos.length})</h4>
                      <ObjetivoDialog
                        mode="new"
                        perspectiva={perspectiva}
                        perspectivaLabel={config.label}
                        politicas={politicasDaPerspectiva}
                        onSave={(objetivo) => {
                          addObjetivoBsc(objetivo);
                        }}
                        trigger={
                          <Button size="sm" className="gap-2 h-8">
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar
                          </Button>
                        }
                      />
                    </div>
                    
                    {objetivos.length > 0 ? (
                      <div className="space-y-2">
                        {objetivos.map((objetivo) => {
                          const politicaVinc = dados.direcionamento.politicaBsc.find(p => p.id === objetivo.politicaVinculadaId);
                          const planoNome = getPlanoAcaoNome(objetivo.planoAcaoVinculado);
                          return (
                            <div key={objetivo.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="inline-flex items-center justify-center min-w-[55px] px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                                    {objetivo.numeroObjetivo}
                                  </span>
                                  <div className="flex items-start gap-1.5 flex-1">
                                    <Target className={`w-3.5 h-3.5 mt-0.5 ${config.color} flex-shrink-0`} />
                                    <span className="font-medium text-sm leading-tight">{objetivo.descricao}</span>
                                  </div>
                                </div>
                                <div className="flex gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      setSelectedObjetivo(objetivo);
                                      setIsObjetivoDetailsOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  <ObjetivoDialog
                                    mode="edit"
                                    perspectiva={perspectiva}
                                    perspectivaLabel={config.label}
                                    politicas={politicasDaPerspectiva}
                                    objetivo={objetivo}
                                    onSave={(updates) => {
                                      updateObjetivoBsc(objetivo.id, updates);
                                    }}
                                    trigger={
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      if (confirm('Deseja realmente remover este objetivo?')) {
                                        removeObjetivoBsc(objetivo.id);
                                        toast.success('Objetivo removido com sucesso!');
                                      }
                                    }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              
                              {(objetivo.indicadorProjeto || objetivo.resultadoAtual || objetivo.meta || objetivo.prazoInicio || objetivo.prazo) && (
                                <div className="ml-14 mb-2 space-y-1">
                                  {objetivo.indicadorProjeto && (
                                    <div className="text-xs">
                                      <span className="text-gray-500 font-medium">Indicador: </span>
                                      <span className="text-gray-700">{objetivo.indicadorProjeto}</span>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                      {objetivo.resultadoAtual && (
                                        <div>
                                          <span className="text-gray-500 font-medium">Resultado Atual: </span>
                                          <span className="text-gray-700">{objetivo.resultadoAtual}</span>
                                        </div>
                                      )}
                                      {objetivo.meta && (
                                        <div>
                                          <span className="text-gray-500 font-medium">Meta: </span>
                                          <span className="text-gray-700" style={{ fontWeight: 500 }}>{objetivo.meta}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {objetivo.prazoInicio && (
                                        <div>
                                          <span className="text-gray-500 font-medium">Início: </span>
                                          <span className="text-gray-700">{formatarData(objetivo.prazoInicio)}</span>
                                        </div>
                                      )}
                                      {objetivo.prazo && (
                                        <div>
                                          <span className="text-gray-500 font-medium">Prazo: </span>
                                          <span className="text-gray-700">{formatarData(objetivo.prazo)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {planoNome && (
                                <div className="flex gap-2 text-xs ml-14 pt-2 border-t">
                                  <button
                                    onClick={() => {
                                      const plano = dados.planosAcao.find(p => p.id === planoNome.id);
                                      setSelectedPAE(plano);
                                      setIsPAEDetailsOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                  >
                                    <LinkIcon className="w-3 h-3" />
                                    <span className="font-medium">{planoNome.numeroPE}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">Nenhum objetivo cadastrado</p>
                        <p className="text-xs mt-1">Clique em "Adicionar" acima</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* PAE Details Dialog */}
      <PAEDetailsDialog
        open={isPAEDetailsOpen}
        onOpenChange={setIsPAEDetailsOpen}
        pae={selectedPAE}
      />

      {/* Objetivo BSC Details Dialog */}
      <ObjetivoBscDetailsDialog
        open={isObjetivoDetailsOpen}
        onOpenChange={setIsObjetivoDetailsOpen}
        objetivo={selectedObjetivo}
      />
    </div>
  );
}