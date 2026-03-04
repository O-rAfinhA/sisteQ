import { formatarMoeda, formatarDataPtBr, formatarDataHoraCompleta } from '../utils/formatters';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { calcularProgressoTarefas, calcularProgressoPrazo } from '../utils/plano-helpers';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { PlanoAcoes } from '../types/strategic';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  DollarSign,
  Edit,
  FileCheck,
  History as HistoryIcon,
  ListTodo,
  ShieldAlert,
  Target,
  User,
} from 'lucide-react';

interface PlanoAcaoDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: PlanoAcoes | null;
  onEdit: (plano: PlanoAcoes) => void;
}

export function PlanoAcaoDetailsDialog({ open, onOpenChange, plano, onEdit }: PlanoAcaoDetailsDialogProps) {
  if (!plano) return null;

  // Cálculos de Progresso
  const totalTarefas = plano.tarefas.length;
  const tarefasConcluidas = plano.tarefas.filter(t => t.concluida).length;
  const progresso = calcularProgressoTarefas(plano.tarefas);

  // Cálculo de Prazo
  const progressoPrazo = calcularProgressoPrazo(plano.dataInicio, plano.prazoFinal);

  // Cores de Status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-green-100 text-green-700 border-green-200';
      case 'em-andamento': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'atrasado': return 'bg-red-100 text-red-700 border-red-200';
      case 'em-avaliacao-eficacia': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'em-andamento': return 'Em Andamento';
      case 'atrasado': return 'Atrasado';
      case 'em-avaliacao-eficacia': return 'Avaliação de Eficácia';
      case 'nao-iniciado': return 'Não Iniciado';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono text-sm bg-white">
                  {plano.numeroPE}
                </Badge>
                <Badge className={`${getStatusColor(plano.statusAcompanhamento)} border`}>
                  {getStatusLabel(plano.statusAcompanhamento)}
                </Badge>
              </div>
              <DialogTitle className="text-2xl text-gray-900 tracking-tight" style={{ fontWeight: 700 }}>
                {plano.origem === 'Risco' ? 'Tratamento de Risco' : 'Plano de Ação Corretiva'}
              </DialogTitle>
              <DialogDescription className="text-gray-500 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Criado em {formatarDataPtBr(plano.criadoEm || plano.dataInicio)}
              </DialogDescription>
            </div>

            <Button onClick={() => onEdit(plano)} className="gap-2">
              <Edit className="w-4 h-4" />
              Editar Plano
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Progresso das Ações</span>
                  <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{progresso}%</span>
                </div>
                <Progress value={progresso} className="h-2" />
                <p className="text-xs text-gray-500 mt-2">
                  {tarefasConcluidas} de {totalTarefas} tarefas concluídas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Consumo do Prazo</span>
                  <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{progressoPrazo}%</span>
                </div>
                <Progress value={progressoPrazo} className="h-2" indicatorClassName={progressoPrazo > 100 ? 'bg-red-500' : undefined} />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{formatarDataPtBr(plano.dataInicio)}</span>
                  <span>{formatarDataPtBr(plano.prazoFinal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex flex-col justify-center h-full">
                <span className="text-sm font-medium text-gray-500 mb-1">Investimento</span>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{formatarMoeda(plano.investimento)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex flex-col justify-center h-full">
                <span className="text-sm font-medium text-gray-500 mb-1">Origem</span>
                <div className="flex items-center gap-2">
                  {plano.origem === 'Risco' ? <ShieldAlert className="w-5 h-5 text-amber-600" /> : <Target className="w-5 h-5 text-blue-600" />}
                  <span className="text-lg font-semibold text-gray-900 truncate">{plano.origem}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda - Detalhes */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Definição do Problema */}
              <Card className="border-l-4 border-l-red-500 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    Definição do Problema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2" style={{ fontWeight: 500 }}>Descrição da Não Conformidade</h3>
                    <div className="bg-red-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {plano.descricaoNaoConformidade}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm text-gray-900 mb-2" style={{ fontWeight: 500 }}>Causa Raiz</h3>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 min-h-[80px]">
                        {plano.causaRaiz || <span className="text-gray-400 italic">Não definida</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm text-gray-900 mb-2" style={{ fontWeight: 500 }}>Ação Imediata</h3>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 min-h-[80px]">
                        {plano.acaoImediata || <span className="text-gray-400 italic">Não definida</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plano de Ação (Tarefas) */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <ListTodo className="w-5 h-5" />
                    Plano de Ação e Tarefas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plano.tarefas.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Nenhuma tarefa definida.</div>
                  ) : (
                    <div className="space-y-4">
                      {plano.tarefas.map((tarefa, index) => (
                        <div 
                          key={tarefa.id || index} 
                          className={`flex items-start gap-4 p-4 rounded-lg border ${tarefa.concluida ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-blue-300 transition-colors'}`}
                        >
                          <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${tarefa.concluida ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                            {tarefa.concluida && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={`font-medium ${tarefa.concluida ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                                {tarefa.descricao}
                              </h4>
                              {tarefa.prazo && (
                                <Badge variant="outline" className={`ml-2 whitespace-nowrap ${tarefa.concluida ? 'bg-green-100 text-green-700 border-green-200' : ''}`}>
                                  {formatarDataPtBr(tarefa.prazo)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {tarefa.responsavel}
                              </div>
                              {tarefa.departamento && (
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                  {tarefa.departamento}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Verificação de Eficácia */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <FileCheck className="w-5 h-5" />
                    Verificação da Eficácia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${plano.acaoImplantada ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Ação Implantada?</p>
                        <p className="text-sm text-gray-500">
                          {plano.acaoImplantada 
                            ? `Sim, em ${formatarDataPtBr(plano.dataImplantacao!)}`
                            : 'Ainda não confirmada'}
                        </p>
                      </div>
                    </div>

                    {plano.acaoImplantada && (
                      <>
                        <div className="h-px bg-gray-200 w-full ml-5 border-l border-dashed border-gray-300 h-6"></div>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${plano.eficaz !== undefined ? (plano.eficaz ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600') : 'bg-gray-200 text-gray-400'}`}>
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Resultado da Eficácia</p>
                            <p className="text-sm text-gray-500">
                              {plano.eficaz === undefined ? 'Aguardando avaliação' : 
                               plano.eficaz ? 'Ação Eficaz - Concluída com sucesso' : 'Ação Ineficaz - Necessário novo ciclo'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {plano.evidenciaEficacia && (
                      <div className="mt-4 bg-white p-4 rounded border border-purple-100">
                        <p className="text-xs text-purple-700 mb-1" style={{ fontWeight: 500 }}>Evidência Objetiva</p>
                        <p className="text-gray-700">{plano.evidenciaEficacia}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Histórico e Infos */}
            <div className="space-y-6">
              {/* Timeline de Acompanhamento */}
              <Card className="shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <HistoryIcon className="w-5 h-5" />
                    Histórico e Acompanhamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
                    {plano.acompanhamentos && plano.acompanhamentos.length > 0 ? (
                      plano.acompanhamentos.map((acomp, idx) => (
                        <div key={acomp.id || idx} className="mb-8 ml-6 relative">
                          <span className="absolute -left-[31px] mt-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></span>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">
                              {formatarDataHoraCompleta(acomp.dataHora)}
                            </span>
                            <span className="text-sm text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>
                              {acomp.responsavel}
                            </span>
                            <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                              {acomp.descricao}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="ml-6 text-sm text-gray-500 italic">Nenhum registro de acompanhamento.</div>
                    )}
                    
                    {/* Marcador de Início */}
                    <div className="ml-6 relative">
                      <span className="absolute -left-[31px] mt-1.5 w-4 h-4 rounded-full bg-gray-200 border-2 border-gray-300"></span>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          {formatarDataPtBr(plano.criadoEm || plano.dataInicio)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">Plano de Ação Criado</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
