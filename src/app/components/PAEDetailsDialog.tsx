import { useState } from 'react';
import { PlanoAcaoEstrategico } from '../types/strategic';
import { useStrategic } from '../context/StrategicContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { CheckCircle2, Circle, Clock, Target, Edit, MessageSquare } from 'lucide-react';
import { formatarData, formatarMoeda, formatarDataHoraCompleta } from '../utils/formatters';
import { calcularProgressoTarefas, calcularProgressoPrazo } from '../utils/plano-helpers';
import { useNavigate } from 'react-router';
import { SwotItemDetailsDialog } from './SwotItemDetailsDialog';
import { ObjetivoBscDetailsDialog } from './ObjetivoBscDetailsDialog';

interface PAEDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pae: PlanoAcaoEstrategico | null;
}

export function PAEDetailsDialog({ open, onOpenChange, pae }: PAEDetailsDialogProps) {
  const navigate = useNavigate();
  const { dados } = useStrategic();
  const [selectedSwotItem, setSelectedSwotItem] = useState<any>(null);
  const [selectedObjetivo, setSelectedObjetivo] = useState<any>(null);
  const [isSwotDialogOpen, setIsSwotDialogOpen] = useState(false);
  const [isObjetivoDialogOpen, setIsObjetivoDialogOpen] = useState(false);

  if (!pae) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
            <DialogDescription>Aguarde enquanto carregamos os detalhes do plano de ação.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Buscar itens SWOT vinculados a este PE
  const swotVinculados = dados.swotItems.filter(item => item.planoAcaoVinculado === pae.numeroPE);
  
  // Buscar objetivos vinculados a este PE
  const objetivosVinculados = dados.direcionamento.objetivosBsc.filter(obj => obj.planoAcaoVinculado === pae.numeroPE);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'nao-iniciado': { label: 'Não Iniciado', className: 'bg-gray-100 text-gray-700' },
      'em-andamento': { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700' },
      'concluido': { label: 'Concluído', className: 'bg-green-100 text-green-700' },
      'atrasado': { label: 'Atrasado', className: 'bg-red-100 text-red-700' },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap['nao-iniciado'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getOrigemBadge = (origem: string) => {
    const origemMap = {
      'SWOT': 'bg-purple-100 text-purple-700',
      'Mudança': 'bg-orange-100 text-orange-700',
      'Objetivo': 'bg-blue-100 text-blue-700',
      'Outros': 'bg-gray-100 text-gray-700',
    };
    const className = origemMap[origem as keyof typeof origemMap] || 'bg-gray-100 text-gray-700';
    return <Badge className={className}>{origem}</Badge>;
  };

  const tarefasConcluidas = pae.tarefas.filter(t => t.concluida).length;
  const progresso = calcularProgressoTarefas(pae.tarefas);

  // Calcular progresso de prazo
  const progressoPrazo = calcularProgressoPrazo(pae.dataInicio, pae.prazoFinal);

  const handleEdit = () => {
    onOpenChange(false);
    navigate(`/gestao-estrategica/plano-acao?editPlanoId=${pae.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{pae.numeroPE}</DialogTitle>
              <DialogDescription className="mt-2">
                Detalhes do Plano de Ação Estratégico
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {getOrigemBadge(pae.origemTipo)}
              {getStatusBadge(pae.statusAcompanhamento)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Ação */}
          <div>
            <Label className="text-base font-semibold">Ação</Label>
            <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{pae.acao}</p>
          </div>

          {/* Informações Gerais */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm text-gray-600">Data Início</Label>
              <p className="mt-1 font-medium">{formatarData(pae.dataInicio)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Prazo Final</Label>
              <p className="mt-1 font-medium">{formatarData(pae.prazoFinal)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Progresso de Prazo</Label>
              <div className="mt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        progressoPrazo > 100 ? 'bg-red-500' : 
                        progressoPrazo > 80 ? 'bg-orange-500' : 
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(progressoPrazo, 2)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{progressoPrazo}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Prazo decorrido: {progressoPrazo}%
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Investimento</Label>
              <p className="mt-1 font-medium">{formatarMoeda(pae.investimento)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Progresso de Tarefas</Label>
              <div className="mt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{progresso}%</span>
                </div>
                <p className="text-xs text-gray-500">{tarefasConcluidas}/{pae.tarefas.length} concluídas</p>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Criado em</Label>
              <p className="mt-1 font-medium">{formatarData(pae.criadoEm)}</p>
            </div>
          </div>

          {/* Tarefas */}
          <div>
            <Label className="text-base font-semibold">
              Tarefas ({tarefasConcluidas}/{pae.tarefas.length})
            </Label>
            <div className="mt-3 space-y-2">
              {pae.tarefas.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma tarefa cadastrada</p>
              ) : (
                pae.tarefas.map(tarefa => (
                  <div 
                    key={tarefa.id} 
                    className={`p-3 border rounded-lg ${
                      tarefa.concluida ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {tarefa.concluida ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${tarefa.concluida ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {tarefa.descricao}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {tarefa.responsavel && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Responsável:</span> {tarefa.responsavel}
                            </span>
                          )}
                          {tarefa.departamento && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Depto:</span> {tarefa.departamento}
                            </span>
                          )}
                          {tarefa.prazo && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatarData(tarefa.prazo)}
                            </span>
                          )}
                          {tarefa.concluida && tarefa.dataConclusao && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              ✓ Concluída em {formatarData(tarefa.dataConclusao.split('T')[0])}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Acompanhamentos */}
          {pae.acompanhamentos && pae.acompanhamentos.length > 0 && (
            <div className="border-t pt-6">
              <Label className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Acompanhamentos ({pae.acompanhamentos.length})
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Histórico de atualizações do plano de ação
              </p>
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {pae.acompanhamentos
                  .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
                  .map((acomp) => (
                    <div key={acomp.id} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-gray-900">{acomp.descricao}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-gray-700">
                          {acomp.responsavel}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatarDataHoraCompleta(acomp.dataHora)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Vínculos */}
          {(swotVinculados.length > 0 || objetivosVinculados.length > 0) && (
            <div className="border-t pt-6">
              <Label className="text-base font-semibold">Vínculos</Label>
              <div className="mt-3 space-y-3">
                {/* Itens SWOT */}
                {swotVinculados.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-2">Análise SWOT:</p>
                    <div className="flex flex-wrap gap-2">
                      {swotVinculados.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedSwotItem(item);
                            setIsSwotDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors cursor-pointer border border-purple-200"
                        >
                          {item.numeroSwot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Objetivos Estratégicos */}
                {objetivosVinculados.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-2">Objetivos Estratégicos:</p>
                    <div className="flex flex-wrap gap-2">
                      {objetivosVinculados.map(obj => (
                        <button
                          key={obj.id}
                          onClick={() => {
                            setSelectedObjetivo(obj);
                            setIsObjetivoDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer border border-blue-200"
                        >
                          <Target className="w-3 h-3" />
                          {obj.numeroObjetivo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Dialogs de detalhes */}
      <SwotItemDetailsDialog
        open={isSwotDialogOpen}
        onOpenChange={setIsSwotDialogOpen}
        item={selectedSwotItem}
      />

      <ObjetivoBscDetailsDialog
        open={isObjetivoDialogOpen}
        onOpenChange={setIsObjetivoDialogOpen}
        objetivo={selectedObjetivo}
      />
    </Dialog>
  );
}