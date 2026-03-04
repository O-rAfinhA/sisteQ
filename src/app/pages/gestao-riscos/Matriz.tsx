import { useState } from 'react';
import { Risco } from '../../types/strategic';
import { useNavigate } from 'react-router';
import { useStrategic } from '../../context/StrategicContext';
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
import { ShieldAlert, Eye, Edit, Building2, Calendar, FileText, Filter, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import { calcularClassificacao, getNivelColor } from '../../utils/risk-helpers';

export function RiscosMatriz() {
  const navigate = useNavigate();
  const { dados } = useStrategic();
  const riscos = dados.riscos || [];
  const [riscoSelecionado, setRiscoSelecionado] = useState<Risco | null>(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>('todos');
  const [filtroNivel, setFiltroNivel] = useState<string>('todos');

  const departamentos = Array.from(new Set(riscos.map(r => r.departamento))).sort();
  
  const riscosFiltrados = riscos.filter(risco => {
    const { nivel } = calcularClassificacao(risco.impactoInicial, risco.probabilidadeInicial);
    
    if (filtroStatus !== 'todos' && risco.status !== filtroStatus) return false;
    if (filtroDepartamento !== 'todos' && risco.departamento !== filtroDepartamento) return false;
    if (filtroNivel !== 'todos' && nivel !== filtroNivel) return false;
    
    return true;
  });

  const handleVerDetalhes = (risco: Risco, e: React.MouseEvent) => {
    e.stopPropagation();
    setRiscoSelecionado(risco);
    setIsDetalhesOpen(true);
  };

  const handleEditar = () => {
    setIsDetalhesOpen(false);
    if (riscoSelecionado) {
      navigate(`/gestao-riscos/registro?editarRisco=${riscoSelecionado.id}`);
    }
  };

  const getRiscosNaCell = (impacto: number, probabilidade: number) => {
    return riscosFiltrados.filter(r => r.impactoInicial === impacto && r.probabilidadeInicial === probabilidade);
  };

  const getCellColor = (impacto: number, probabilidade: number) => {
    const { nivel } = calcularClassificacao(impacto, probabilidade);
    switch (nivel) {
      case 'Baixo':
        return 'bg-emerald-50/60 hover:bg-emerald-50';
      case 'Médio':
        return 'bg-amber-50/60 hover:bg-amber-50';
      case 'Alto':
        return 'bg-red-50/60 hover:bg-red-50';
    }
  };

  const temFiltros = filtroStatus !== 'todos' || filtroDepartamento !== 'todos' || filtroNivel !== 'todos';

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ PAGE HEADER ═══ */}
      <div>
        <h1 className="text-gray-900 tracking-tight" style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 }}>
          Matriz de Riscos
        </h1>
        <p className="text-gray-500 mt-1.5 max-w-xl" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
          Visualização dos riscos organizados por impacto e probabilidade.
        </p>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Riscos Altos"
          value={riscos.filter(r => calcularClassificacao(r.impactoInicial, r.probabilidadeInicial).nivel === 'Alto').length}
          icon={AlertTriangle}
          variant="danger"
        />
        <MetricCard
          label="Riscos Médios"
          value={riscos.filter(r => calcularClassificacao(r.impactoInicial, r.probabilidadeInicial).nivel === 'Médio').length}
          icon={TrendingUp}
          variant="warning"
        />
        <MetricCard
          label="Riscos Baixos"
          value={riscos.filter(r => calcularClassificacao(r.impactoInicial, r.probabilidadeInicial).nivel === 'Baixo').length}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm" style={{ fontWeight: 500 }}>Filtros</span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Tratar">Tratar</SelectItem>
                <SelectItem value="Aceitar">Aceitar</SelectItem>
                <SelectItem value="Transferir">Transferir</SelectItem>
                <SelectItem value="Eliminar">Eliminar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroDepartamento} onValueChange={setFiltroDepartamento}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os departamentos</SelectItem>
                {departamentos.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroNivel} onValueChange={setFiltroNivel}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os níveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os níveis</SelectItem>
                <SelectItem value="Baixo">Baixo</SelectItem>
                <SelectItem value="Médio">Médio</SelectItem>
                <SelectItem value="Alto">Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {temFiltros && (
            <Button variant="ghost" size="sm" className="text-xs text-gray-400" onClick={() => { setFiltroStatus('todos'); setFiltroDepartamento('todos'); setFiltroNivel('todos'); }}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ═══ LEGENDA ═══ */}
      <div className="flex gap-6 items-center justify-center">
        {[
          { label: 'Baixo (1–2)', color: 'bg-emerald-500' },
          { label: 'Médio (3–4)', color: 'bg-amber-500' },
          { label: 'Alto (6–9)', color: 'bg-red-500' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 ${item.color} rounded`}></div>
            <span className="text-sm text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ═══ MATRIZ ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-gray-900" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            Matriz de Impacto × Probabilidade
          </h3>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 p-3 bg-gray-50 text-sm text-gray-500 w-32" style={{ fontWeight: 500 }}></th>
                {[
                  { num: 1, label: 'Improvável' },
                  { num: 2, label: 'Possível' },
                  { num: 3, label: 'Provável' },
                ].map(p => (
                  <th key={p.num} className="border border-gray-200 p-3 bg-gray-50 text-sm text-gray-700" style={{ fontWeight: 500 }}>
                    Probabilidade {p.num}
                    <br />
                    <span className="text-xs text-gray-400" style={{ fontWeight: 400 }}>({p.label})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[3, 2, 1].map((impacto) => (
                <tr key={impacto}>
                  <td className="border border-gray-200 p-3 bg-gray-50 text-sm text-gray-700" style={{ fontWeight: 500 }}>
                    Impacto {impacto}
                    <br />
                    <span className="text-xs text-gray-400" style={{ fontWeight: 400 }}>
                      ({impacto === 1 ? 'Baixo' : impacto === 2 ? 'Médio' : 'Alto'})
                    </span>
                  </td>
                  {[1, 2, 3].map((probabilidade) => {
                    const riscosNaCell = getRiscosNaCell(impacto, probabilidade);
                    const { nivel, valor } = calcularClassificacao(impacto, probabilidade);
                    return (
                      <td 
                        key={probabilidade} 
                        className={`border border-gray-200 p-3 ${getCellColor(impacto, probabilidade)} transition-colors`}
                      >
                        <div className="min-h-[120px]">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${getNivelColor(nivel)}`} style={{ fontWeight: 500 }}>
                              {nivel} ({valor})
                            </span>
                            <span className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
                              {riscosNaCell.length} {riscosNaCell.length === 1 ? 'risco' : 'riscos'}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {riscosNaCell.map((risco) => (
                              <div 
                                key={risco.id}
                                className="p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                                onClick={(e) => handleVerDetalhes(risco, e)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-900 truncate" style={{ fontWeight: 500 }}>
                                      {risco.codigo}
                                    </p>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                      {risco.descricaoRisco}
                                    </p>
                                  </div>
                                  <Eye className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ DIALOG: DETALHES ═══ */}
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
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs ${getNivelColor(calcularClassificacao(riscoSelecionado.impactoInicial, riscoSelecionado.probabilidadeInicial).nivel)}`} style={{ fontWeight: 500 }}>
                  {calcularClassificacao(riscoSelecionado.impactoInicial, riscoSelecionado.probabilidadeInicial).nivel}
                </span>
                <Badge variant="outline">{riscoSelecionado.status}</Badge>
                <span className="text-sm text-gray-500" style={{ fontWeight: 500 }}>{riscoSelecionado.codigo}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Departamento</p>
                  <p className="text-sm text-gray-900">{riscoSelecionado.departamento}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Data de Registro</p>
                  <p className="text-sm text-gray-900">{riscoSelecionado.dataRegistro}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Descrição do Risco</p>
                <p className="text-sm text-gray-900">{riscoSelecionado.descricaoRisco}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Processo Relacionado</p>
                <p className="text-sm text-gray-900">{riscoSelecionado.processo}</p>
              </div>

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

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setIsDetalhesOpen(false)}>Fechar</Button>
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