import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ComunicacaoItem } from '../types/communication';
import { getDepartamentosNomes } from '../types/config';
import { toast } from 'sonner';

interface ComunicacaoDialogProps {
  mode: 'new' | 'edit';
  item?: ComunicacaoItem;
  onSave: (item: Omit<ComunicacaoItem, 'id'>) => void;
  trigger: React.ReactNode;
}

export function ComunicacaoDialog({ mode, item, onSave, trigger }: ComunicacaoDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    setor: '',
    informacao: '',
    comoComunicar: '',
    quemComunicara: '',
    quandoComunicara: '',
    aQuemComunicar: ''
  });

  const departamentos = getDepartamentosNomes();

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        setor: item.setor,
        informacao: item.informacao,
        comoComunicar: item.comoComunicar,
        quemComunicara: item.quemComunicara,
        quandoComunicara: item.quandoComunicara,
        aQuemComunicar: item.aQuemComunicar
      });
    } else if (mode === 'new') {
      setFormData({
        setor: '',
        informacao: '',
        comoComunicar: '',
        quemComunicara: '',
        quandoComunicara: '',
        aQuemComunicar: ''
      });
    }
  }, [item, mode, open]);

  const handleSubmit = () => {
    if (!formData.setor || !formData.informacao) {
      toast.error('Por favor, preencha pelo menos o Setor e a Informação');
      return;
    }

    onSave(formData);
    toast.success(mode === 'edit' ? 'Comunicação atualizada!' : 'Comunicação adicionada!');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Comunicação' : 'Nova Comunicação'}
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes da comunicação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label className="mb-2 block">Setor/Departamento *</Label>
            <Select
              value={formData.setor}
              onValueChange={(value) => setFormData(prev => ({ ...prev, setor: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {departamentos.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="mb-2 block">Informação *</Label>
            <Input
              value={formData.informacao}
              onChange={(e) => setFormData(prev => ({ ...prev, informacao: e.target.value }))}
              placeholder="Qual informação será comunicada?"
            />
          </div>

          <div>
            <Label className="mb-2 block">Como Comunicar</Label>
            <Input
              value={formData.comoComunicar}
              onChange={(e) => setFormData(prev => ({ ...prev, comoComunicar: e.target.value }))}
              placeholder="Ex: E-mail, Reunião, Mural..."
            />
          </div>

          <div>
            <Label className="mb-2 block">Quem Comunicará</Label>
            <Input
              value={formData.quemComunicara}
              onChange={(e) => setFormData(prev => ({ ...prev, quemComunicara: e.target.value }))}
              placeholder="Nome ou cargo do responsável"
            />
          </div>

          <div>
            <Label className="mb-2 block">Quando Comunicará</Label>
            <Input
              value={formData.quandoComunicara}
              onChange={(e) => setFormData(prev => ({ ...prev, quandoComunicara: e.target.value }))}
              placeholder="Ex: Mensalmente, Semanalmente..."
            />
          </div>

          <div>
            <Label className="mb-2 block">A Quem Comunicar</Label>
            <Input
              value={formData.aQuemComunicar}
              onChange={(e) => setFormData(prev => ({ ...prev, aQuemComunicar: e.target.value }))}
              placeholder="Público-alvo"
            />
          </div>

          <Button onClick={handleSubmit} variant={mode === "edit" ? "black" : "default"} className="w-full mt-4">
            {mode === 'edit' ? 'Salvar Alterações' : 'Adicionar Comunicação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
