import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  FileText,
  Target,
  AlertCircle
} from 'lucide-react';
import { formatarData } from '../utils/formatters';

interface TarefaViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: {
    id: string;
    descricao: string;
    responsavel?: string;
    departamento?: string;
    prazo?: string;
    concluida: boolean;
    dataConclusao?: string;
    numeroPE: string;
    numeroTarefa: string;
    acaoDescricao: string;
  };
}

export function TarefaViewDialog({ open, onOpenChange, tarefa }: TarefaViewDialogProps) {
  const isAtrasada = () => {
    if (tarefa.concluida || !tarefa.prazo) return false;
    return new Date(tarefa.prazo) < new Date();
  };

  const atrasada = isAtrasada();

  const getStatusInfo = () => {
    if (tarefa.concluida) {
      return {
        label: 'Concluída',
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle2,
        iconColor: 'text-green-500'
      };
    }
    if (atrasada) {
      return {
        label: 'Atrasada',
        color: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        iconColor: 'text-red-500'
      };
    }
    return {
      label: 'Em Dia',
      color: 'bg-blue-100 text-blue-700',
      icon: Clock,
      iconColor: 'text-blue-500'
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3" style={{ fontWeight: 700 }}>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">{tarefa.numeroTarefa}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-sm font-normal">{tarefa.numeroPE}</span>
            </div>
          </DialogTitle>
          <DialogDescription>Detalhes da tarefa do plano estratégico</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${status.iconColor}`} />
            <Badge className={`${status.color} px-4 py-1 text-sm font-semibold`}>
              {status.label}
            </Badge>
          </div>

          {/* Descrição da Tarefa */}
          <Card className="border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 500 }}>Descrição da Tarefa</p>
                  <p className={`text-base ${tarefa.concluida ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {tarefa.descricao}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PE Vinculado */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-700 mb-2" style={{ fontWeight: 500 }}>Plano Estratégico (PE)</p>
                  <p className="text-sm text-gray-700">{tarefa.acaoDescricao}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">{tarefa.numeroPE}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações */}
          <div className="grid grid-cols-2 gap-4">
            {/* Responsável */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-purple-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-700 mb-1" style={{ fontWeight: 500 }}>Responsável</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tarefa.responsavel || 'Não definido'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Departamento */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-indigo-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-indigo-700 mb-1" style={{ fontWeight: 500 }}>Departamento</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tarefa.departamento || 'Não definido'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prazos */}
          <div className="grid grid-cols-2 gap-4">
            {/* Prazo */}
            <Card className={`${atrasada ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${atrasada ? 'bg-red-200' : 'bg-gray-200'} flex items-center justify-center flex-shrink-0`}>
                    <Calendar className={`w-5 h-5 ${atrasada ? 'text-red-700' : 'text-gray-700'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${atrasada ? 'text-red-700' : 'text-gray-700'} mb-1`} style={{ fontWeight: 500 }}>
                      Prazo
                    </p>
                    <p className={`text-sm font-medium ${atrasada ? 'text-red-900' : 'text-gray-900'}`}>
                      {tarefa.prazo ? formatarData(tarefa.prazo) : 'Não definido'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data de Conclusão */}
            {tarefa.concluida && tarefa.dataConclusao && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-700 mb-1" style={{ fontWeight: 500 }}>Concluída em</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatarData(tarefa.dataConclusao)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}