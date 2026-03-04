import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { DateInput } from './ui/date-input';
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
import { PlanoAcaoSelector } from './PlanoAcaoSelector';
import { QuickPAEDialog } from './QuickPAEDialog';
import { ObjetivoBscItem, PerspectivaBsc, PoliticaBscItem } from '../types/strategic';
import { useStrategic } from '../context/StrategicContext';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface ObjetivoDialogProps {
  mode: 'new' | 'edit';
  perspectiva: PerspectivaBsc;
  perspectivaLabel: string;
  politicas: PoliticaBscItem[];
  objetivo?: ObjetivoBscItem;
  onSave: (objetivo: Omit<ObjetivoBscItem, 'id' | 'numeroObjetivo'>) => void;
  trigger: React.ReactNode;
}

export function ObjetivoDialog({ mode, perspectiva, perspectivaLabel, politicas, objetivo, onSave, trigger }: ObjetivoDialogProps) {
  const { addPlanoAcao } = useStrategic();
  const [open, setOpen] = useState(false);
  const [isQuickPAEDialogOpen, setIsQuickPAEDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    descricao: objetivo?.descricao || '',
    indicadorProjeto: objetivo?.indicadorProjeto || '',
    resultadoAtual: objetivo?.resultadoAtual || '',
    meta: objetivo?.meta || '',
    prazoInicio: objetivo?.prazoInicio || '',
    prazo: objetivo?.prazo || '',
    politicaVinculadaId: objetivo?.politicaVinculadaId || undefined,
    planoAcaoVinculado: objetivo?.planoAcaoVinculado || undefined,
  });

  const handleSubmit = () => {
    if (!formData.descricao.trim()) {
      toast.error('Por favor, informe a descrição do objetivo.');
      return;
    }

    onSave({
      perspectiva,
      descricao: formData.descricao.trim(),
      indicadorProjeto: formData.indicadorProjeto.trim(),
      resultadoAtual: formData.resultadoAtual.trim(),
      meta: formData.meta.trim(),
      prazoInicio: formData.prazoInicio,
      prazo: formData.prazo,
      politicaVinculadaId: formData.politicaVinculadaId,
      planoAcaoVinculado: formData.planoAcaoVinculado,
    });

    toast.success(mode === 'edit' ? 'Objetivo atualizado!' : 'Objetivo adicionado!');
    setOpen(false);
    
    // Limpar form se for novo
    if (mode === 'new') {
      setFormData({
        descricao: '',
        indicadorProjeto: '',
        resultadoAtual: '',
        meta: '',
        prazoInicio: '',
        prazo: '',
        politicaVinculadaId: undefined,
        planoAcaoVinculado: undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar' : 'Novo'} Objetivo - {perspectivaLabel}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do objetivo estratégico.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
          <div>
            <Label className="mb-2 block">Descrição do Objetivo *</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              rows={2}
              placeholder="Descreva o objetivo estratégico..."
            />
          </div>
          <div>
            <Label className="mb-2 block">Indicador/Projeto</Label>
            <Input
              value={formData.indicadorProjeto}
              onChange={(e) => setFormData(prev => ({ ...prev, indicadorProjeto: e.target.value }))}
              placeholder="Ex: ROI, NPS, Pesquisa de Satisfação, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Resultado Atual</Label>
              <Input
                value={formData.resultadoAtual}
                onChange={(e) => setFormData(prev => ({ ...prev, resultadoAtual: e.target.value }))}
                placeholder="Ex: 15%"
              />
            </div>
            <div>
              <Label className="mb-2 block">Meta a ser Atingida</Label>
              <Input
                value={formData.meta}
                onChange={(e) => setFormData(prev => ({ ...prev, meta: e.target.value }))}
                placeholder="Ex: 25%"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Prazo de Início/Definição</Label>
              <DateInput
                value={formData.prazoInicio}
                onChange={(value) => setFormData(prev => ({ ...prev, prazoInicio: value }))}
              />
            </div>
            <div>
              <Label className="mb-2 block">Prazo de Conclusão</Label>
              <DateInput
                value={formData.prazo}
                onChange={(value) => setFormData(prev => ({ ...prev, prazo: value }))}
              />
            </div>
          </div>
          <div>
            <PlanoAcaoSelector
              value={formData.planoAcaoVinculado}
              onChange={(value) => setFormData(prev => ({ ...prev, planoAcaoVinculado: value }))}
            />
            
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              onClick={() => setIsQuickPAEDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar PE Agora e Vincular
            </Button>
          </div>
          <Button onClick={handleSubmit} variant={mode === "edit" ? "black" : "default"} className="w-full">
            {mode === 'edit' ? 'Salvar Alterações' : 'Adicionar Objetivo'}
          </Button>
        </div>
      </DialogContent>

      {/* QuickPAEDialog */}
      <QuickPAEDialog
        open={isQuickPAEDialogOpen}
        onOpenChange={setIsQuickPAEDialogOpen}
        prefilledOrigem="Objetivo"
        onSave={(plano) => {
          const newPE = addPlanoAcao(plano);
          setFormData(prev => ({ ...prev, planoAcaoVinculado: newPE.numeroPE }));
          toast.success(`PE ${newPE.numeroPE} criado e vinculado!`);
        }}
      />
    </Dialog>
  );
}
