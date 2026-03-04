import { PlanoAcoes } from '../types/strategic';
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
import { AlertTriangle, ExternalLink, Edit } from 'lucide-react';
import { formatarData } from '../utils/formatters';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '../config/routes';

interface PADetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pa: PlanoAcoes | null;
}

// Mapeamento de cores para status
const STATUS_COLORS = {
  'nao-iniciado': 'bg-gray-100 text-gray-800 border-gray-200',
  'em-andamento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'concluido': 'bg-green-100 text-green-800 border-green-200',
  'atrasado': 'bg-red-100 text-red-800 border-red-200',
  'em-avaliacao-eficacia': 'bg-purple-100 text-purple-800 border-purple-200',
};

// Mapeamento de cores para origem
const ORIGEM_COLORS = {
  'NC Interna': 'bg-red-100 text-red-700 border-red-200',
  'Falha de processo': 'bg-orange-100 text-orange-700 border-orange-200',
  'Produto/serviço NC': 'bg-pink-100 text-pink-700 border-pink-200',
  'Auditoria Interna': 'bg-purple-100 text-purple-700 border-purple-200',
  'Auditoria Externa': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Cliente': 'bg-blue-100 text-blue-700 border-blue-200',
  'Reclamação de Cliente': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Indicador de desempenho': 'bg-teal-100 text-teal-700 border-teal-200',
  'Fornecedor': 'bg-green-100 text-green-700 border-green-200',
  'Meio Ambiente': 'bg-lime-100 text-lime-700 border-lime-200',
  'Segurança e Saúde': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Risco': 'bg-amber-100 text-amber-700 border-amber-200',
  'Outros': 'bg-gray-100 text-gray-700 border-gray-200',
};

export function PADetailsDialog({ open, onOpenChange, pa }: PADetailsDialogProps) {
  const navigate = useNavigate();

  if (!pa) {
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

  const handleEditar = () => {
    onOpenChange(false);
    navigate(ROUTES.ACOES_CORRETIVAS.PLANO_ACAO);
  };

  const statusColor = STATUS_COLORS[pa.statusAcompanhamento as keyof typeof STATUS_COLORS] || STATUS_COLORS['nao-iniciado'];
  const origemColor = ORIGEM_COLORS[pa.origem as keyof typeof ORIGEM_COLORS] || ORIGEM_COLORS['Outros'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                {pa.numeroPE}
              </DialogTitle>
              <DialogDescription className="mt-2">
                Detalhes do Plano de Ação Corretiva
              </DialogDescription>
            </div>
            <Badge className={`${statusColor} border`}>
              {pa.statusAcompanhamento === 'nao-iniciado' ? 'Não Iniciado' :
               pa.statusAcompanhamento === 'em-andamento' ? 'Em Andamento' :
               pa.statusAcompanhamento === 'concluido' ? 'Concluído' :
               pa.statusAcompanhamento === 'atrasado' ? 'Atrasado' :
               'Avaliação de Eficácia'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Origem */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <Label className="text-sm font-semibold text-gray-600">Origem</Label>
            <div className="mt-2 flex items-center gap-2">
              <Badge className={`${origemColor} border`}>
                {pa.origem}
              </Badge>
            </div>
          </div>

          {/* Descrição da Não Conformidade */}
          <div>
            <Label className="text-base font-semibold">Descrição da Não Conformidade / Problema</Label>
            <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{pa.descricaoNaoConformidade}</p>
          </div>

          {/* Ação Imediata */}
          <div className="border-t pt-6">
            <Label className="text-base font-semibold">Ação Imediata</Label>
            <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{pa.acaoImediata}</p>
          </div>

          {/* Causa Raiz */}
          <div className="border-t pt-6">
            <Label className="text-base font-semibold">Causa Raiz</Label>
            <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{pa.causaRaiz}</p>
          </div>

          {/* Tarefas */}
          {pa.tarefas && pa.tarefas.length > 0 && (
            <div className="border-t pt-6">
              <Label className="text-base font-semibold">Tarefas da Ação Corretiva</Label>
              <div className="mt-2 space-y-2">
                {pa.tarefas.map((tarefa, index) => (
                  <div key={tarefa.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{tarefa.descricao}</p>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                          <span>Responsável: {tarefa.responsavel}</span>
                          <span>Prazo: {formatarData(tarefa.prazo)}</span>
                          {tarefa.concluida && (
                            <Badge className="bg-green-100 text-green-700 text-xs">Concluída</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações de Prazos */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border-t pt-6">
            <div>
              <Label className="text-sm text-gray-600">Data de Início</Label>
              <p className="mt-1 font-medium text-sm">{formatarData(pa.dataInicio)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Prazo Final</Label>
              <p className="mt-1 font-medium text-sm">{formatarData(pa.prazoFinal)}</p>
            </div>
          </div>

          {/* Resultado/Eficácia (se concluído) */}
          {pa.eficaz !== undefined && (
            <div className="border-t pt-6">
              <Label className="text-base font-semibold">Eficácia da Ação</Label>
              <div className="mt-2">
                <Badge className={pa.eficaz ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {pa.eficaz ? 'Eficaz' : 'Não Eficaz'}
                </Badge>
                {pa.evidenciaEficacia && (
                  <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">{pa.evidenciaEficacia}</p>
                )}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="default" 
              onClick={handleEditar}
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
    </Dialog>
  );
}
