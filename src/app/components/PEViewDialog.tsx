import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { PlanoAcaoEstrategico } from '../types/strategic';
import { formatarData, formatarMoeda } from '../utils/formatters';
import { CheckCircle2, Circle, Calendar, DollarSign, Target, Clock, Building2, User, ListChecks, X } from 'lucide-react';
import { Button } from './ui/button';
import { getDepartamentoPorUsuario } from '../types/config';

const STATUS_CONFIG = {
  'nao-iniciado': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700' },
  'em-andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
  'concluido': { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  'atrasado': { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
};

const ORIGEM_CONFIG = {
  'SWOT': { label: 'SWOT', color: 'bg-blue-100 text-blue-700' },
  'Mudança': { label: 'Mudança', color: 'bg-purple-100 text-purple-700' },
  'Objetivo': { label: 'Objetivo', color: 'bg-green-100 text-green-700' },
  'Outros': { label: 'Outros', color: 'bg-gray-100 text-gray-700' },
};

interface PEViewDialogProps {
  plano: PlanoAcaoEstrategico | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PEViewDialog({ plano, open, onOpenChange }: PEViewDialogProps) {
  if (!plano) return null;

  const statusConfig = STATUS_CONFIG[plano.statusAcompanhamento];
  const origemConfig = ORIGEM_CONFIG[plano.origemTipo];
  const tarefasConcluidas = plano.tarefas.filter(t => t.concluida).length;
  const totalTarefas = plano.tarefas.length;
  const progresso = totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;

  // Calcular progresso de prazo
  const dataInicio = new Date(plano.dataInicio);
  const dataFinal = new Date(plano.prazoFinal);
  const dataHoje = new Date();
  
  const totalDias = Math.max(1, Math.ceil((dataFinal.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
  const diasDecorridos = Math.ceil((dataHoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
  const progressoPrazo = Math.min(100, Math.max(0, Math.round((diasDecorridos / totalDias) * 100)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                  {plano.numeroPE}
                </DialogTitle>
                <Badge className={origemConfig.color} variant="secondary">
                  {origemConfig.label}
                </Badge>
                <Badge className={statusConfig.color} variant="secondary">
                  {statusConfig.label}
                </Badge>
              </div>
              <DialogDescription className="text-gray-600 text-sm">
                Visualização do Plano Estratégico
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Ação */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Ação</label>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-gray-900 font-medium">{plano.acao}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-700 font-medium mb-1">Investimento</p>
                      <p className="text-lg text-blue-900 truncate" style={{ fontWeight: 700 }}>{formatarMoeda(plano.investimento)}</p>
                    </div>
                    <DollarSign className="w-7 h-7 text-blue-300 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-indigo-700 font-medium mb-1">Tarefas</p>
                      <p className="text-lg text-indigo-900" style={{ fontWeight: 700 }}>{tarefasConcluidas}/{totalTarefas}</p>
                    </div>
                    <Target className="w-7 h-7 text-indigo-300 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-purple-700 font-medium mb-1">Prazo</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full transition-all ${
                              progressoPrazo > 100 ? 'bg-red-500' : 
                              progressoPrazo > 80 ? 'bg-orange-500' : 
                              'bg-purple-500'
                            }`}
                            style={{ width: `${Math.min(progressoPrazo, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-purple-900 min-w-[35px]">{progressoPrazo}%</span>
                      </div>
                    </div>
                    <Clock className="w-7 h-7 text-purple-300 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-green-700 font-medium mb-1">Progresso</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-green-900 min-w-[35px]">{progresso}%</span>
                      </div>
                    </div>
                    <ListChecks className="w-7 h-7 text-green-300 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Data de Início
              </label>
              <Card>
                <CardContent className="p-3">
                  <p className="text-gray-900 font-medium">{formatarData(plano.dataInicio)}</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                Prazo Final
              </label>
              <Card>
                <CardContent className="p-3">
                  <p className="text-gray-900 font-medium">{formatarData(plano.prazoFinal)}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tarefas */}
          {plano.tarefas.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-indigo-600" />
                Tarefas ({tarefasConcluidas}/{totalTarefas})
              </label>
              <div className="space-y-2">
                {plano.tarefas.map((tarefa) => (
                  <Card key={tarefa.id} className={tarefa.concluida ? 'bg-green-50 border-green-200' : 'bg-white'}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {tarefa.concluida ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${tarefa.concluida ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                            {tarefa.descricao}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {tarefa.responsavel && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <User className="w-3.5 h-3.5 text-blue-500" />
                                <span>{tarefa.responsavel}</span>
                              </div>
                            )}
                            {tarefa.departamento && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Building2 className="w-3.5 h-3.5 text-purple-500" />
                                <span>{tarefa.departamento}</span>
                              </div>
                            )}
                            {tarefa.prazo && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Calendar className="w-3.5 h-3.5 text-red-500" />
                                <span>{formatarData(tarefa.prazo)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Acompanhamentos */}
          {plano.acompanhamentos && plano.acompanhamentos.length > 0 && (
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">Acompanhamentos</label>
              <div className="space-y-2">
                {plano.acompanhamentos.map((acomp) => (
                  <Card key={acomp.id} className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{acomp.descricao}</p>
                          {acomp.responsavel && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
                              <User className="w-3.5 h-3.5 text-amber-600" />
                              <span>{acomp.responsavel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t mt-6">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}