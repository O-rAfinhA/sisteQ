import { useState, useEffect } from 'react';
import { dataHojeISO } from '../utils/formatters';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Calendar, CheckCircle2, X } from 'lucide-react';

interface TarefaEditDialogProps {
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
    observacoesConclusao?: string;
    numeroPE: string;
    numeroTarefa: string;
    acaoDescricao: string;
  };
  salvarTarefaEditada: (tarefaAtualizada: {
    id: string;
    descricao: string;
    responsavel?: string;
    departamento?: string;
    prazo?: string;
    concluida: boolean;
    dataConclusao?: string;
    observacoesConclusao?: string;
  }) => void;
}

export function TarefaEditDialog({ open, onOpenChange, tarefa, salvarTarefaEditada }: TarefaEditDialogProps) {
  const [formData, setFormData] = useState({
    descricao: tarefa.descricao,
    responsavel: tarefa.responsavel || '',
    departamento: tarefa.departamento || '',
    prazo: tarefa.prazo || '',
    concluida: tarefa.concluida,
    dataConclusao: tarefa.dataConclusao || '',
    observacoesConclusao: tarefa.observacoesConclusao || '',
  });

  useEffect(() => {
    setFormData({
      descricao: tarefa.descricao,
      responsavel: tarefa.responsavel || '',
      departamento: tarefa.departamento || '',
      prazo: tarefa.prazo || '',
      concluida: tarefa.concluida,
      dataConclusao: tarefa.dataConclusao || '',
      observacoesConclusao: tarefa.observacoesConclusao || '',
    });
  }, [tarefa]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tarefaAtualizada = {
      id: tarefa.id,
      descricao: formData.descricao,
      responsavel: formData.responsavel || undefined,
      departamento: formData.departamento || undefined,
      prazo: formData.prazo || undefined,
      concluida: formData.concluida,
      dataConclusao: formData.concluida ? (formData.dataConclusao || new Date().toISOString()) : undefined,
      observacoesConclusao: formData.observacoesConclusao || undefined,
    };
    
    salvarTarefaEditada(tarefaAtualizada);
    onOpenChange(false);
  };

  const handleConcluidaChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      concluida: checked,
      dataConclusao: checked ? (prev.dataConclusao || dataHojeISO()) : '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3" style={{ fontWeight: 700 }}>
            <span>Editar Tarefa</span>
            <span className="text-blue-600 text-base">{tarefa.numeroTarefa}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 text-sm font-normal">{tarefa.numeroPE}</span>
          </DialogTitle>
          <DialogDescription>Edite as informações da tarefa vinculada ao plano estratégico</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Descrição da Tarefa */}
          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-sm font-semibold">
              Descrição da Tarefa *
            </Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              className="min-h-[80px]"
              placeholder="Descreva a tarefa..."
              required
            />
          </div>

          {/* Informações do PE (somente leitura) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label className="text-xs text-blue-700 mb-2 block" style={{ fontWeight: 500 }}>
              Plano Estratégico Vinculado
            </Label>
            <p className="text-sm text-gray-700">{tarefa.acaoDescricao}</p>
            <p className="text-xs text-blue-600 font-semibold mt-1">{tarefa.numeroPE}</p>
          </div>

          {/* Responsável e Departamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsavel" className="text-sm font-semibold">
                Responsável
              </Label>
              <Input
                id="responsavel"
                value={formData.responsavel}
                onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departamento" className="text-sm font-semibold">
                Departamento
              </Label>
              <Input
                id="departamento"
                value={formData.departamento}
                onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                placeholder="Departamento"
              />
            </div>
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label htmlFor="prazo" className="text-sm font-semibold">
              Prazo
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="prazo"
                type="date"
                value={formData.prazo}
                onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Seção de Conclusão */}
          <div className="border-t pt-5 space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="concluida"
                checked={formData.concluida}
                onCheckedChange={handleConcluidaChange}
              />
              <Label 
                htmlFor="concluida" 
                className="text-base font-semibold cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className={`w-5 h-5 ${formData.concluida ? 'text-green-600' : 'text-gray-400'}`} />
                Marcar como Concluída
              </Label>
            </div>

            {formData.concluida && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dataConclusao" className="text-sm font-semibold text-green-800">
                    Data de Conclusão
                  </Label>
                  <Input
                    id="dataConclusao"
                    type="date"
                    value={formData.dataConclusao}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataConclusao: e.target.value }))}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoesConclusao" className="text-sm font-semibold text-green-800">
                    Observações da Conclusão
                  </Label>
                  <Textarea
                    id="observacoesConclusao"
                    value={formData.observacoesConclusao}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoesConclusao: e.target.value }))}
                    className="min-h-[100px] bg-white"
                    placeholder="Adicione observações sobre a conclusão da tarefa..."
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="black"
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
