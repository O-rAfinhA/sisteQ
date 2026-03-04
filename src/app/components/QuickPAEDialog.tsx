import { capitalizarNome, capitalizarPrimeiraLetra, dataHojeISO } from '../utils/formatters';
import { generateId } from '../utils/helpers';
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
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { PlanoAcaoEstrategico } from '../types/strategic';

interface QuickPAEDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (plano: Omit<PlanoAcaoEstrategico, 'id' | 'numeroPE' | 'criadoEm'>) => void;
  prefilledOrigem?: 'SWOT' | 'Mudança' | 'Objetivo' | 'Outros';
}

export function QuickPAEDialog({ open, onOpenChange, onSave, prefilledOrigem = 'SWOT' }: QuickPAEDialogProps) {
  const [formData, setFormData] = useState({
    origemTipo: prefilledOrigem,
    acao: '',
    responsavel: '',
    prazo: '',
    investimento: '',
  });

  const handleSubmit = () => {
    if (!formData.acao.trim()) {
      toast.error('Por favor, informe a ação do PAE.');
      return;
    }

    if (!formData.responsavel.trim()) {
      toast.error('Por favor, informe o responsável.');
      return;
    }

    if (!formData.prazo) {
      toast.error('Por favor, informe o prazo.');
      return;
    }

    // Limpar formato do investimento para salvar apenas números
    const investimentoNumero = formData.investimento 
      ? parseFloat(formData.investimento.replace(/[^\d,]/g, '').replace(',', '.'))
      : 0;

    onSave({
      origemTipo: formData.origemTipo as any,
      acao: formData.acao.trim(),
      tarefas: [{
        id: generateId(),
        descricao: formData.acao.trim(),
        responsavel: formData.responsavel.trim(),
        prazo: formData.prazo,
        concluida: false,
      }],
      investimento: investimentoNumero,
      dataInicio: dataHojeISO(), // Data atual
      prazoFinal: formData.prazo,
      statusAcompanhamento: 'nao-iniciado',
      acompanhamentos: [],
    });

    // Limpar form
    setFormData({
      origemTipo: prefilledOrigem,
      acao: '',
      responsavel: '',
      prazo: '',
      investimento: '',
    });

    onOpenChange(false);
  };

  const handleInvestimentoChange = (value: string) => {
    // Remove tudo exceto números e vírgula
    const apenasNumeros = value.replace(/[^\d,]/g, '');
    
    // Formatar o valor
    const partes = apenasNumeros.split(',');
    let inteiro = partes[0] || '';
    const decimal = partes[1] || '';
    
    // Adicionar pontos de milhar
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Montar valor formatado
    let valorFormatado = inteiro;
    if (partes.length > 1) {
      valorFormatado += ',' + decimal.substring(0, 2);
    }
    
    setFormData(prev => ({ ...prev, investimento: valorFormatado }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar PAE e Vincular</DialogTitle>
          <DialogDescription>
            Crie um novo Plano de Ação Estratégico que será automaticamente vinculado a este item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Origem *</Label>
            <Select 
              value={formData.origemTipo} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, origemTipo: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SWOT">SWOT</SelectItem>
                <SelectItem value="Mudança">Mudança</SelectItem>
                <SelectItem value="Objetivo">Objetivo</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ação *</Label>
            <Textarea
              value={formData.acao}
              onChange={(e) => setFormData(prev => ({ ...prev, acao: capitalizarPrimeiraLetra(e.target.value) }))}
              placeholder="Descreva a ação estratégica..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável *</Label>
              <Input
                value={formData.responsavel}
                onChange={(e) => setFormData(prev => ({ ...prev, responsavel: capitalizarNome(e.target.value) }))}
                placeholder="Nome do responsável"
              />
            </div>
            <div>
              <Label>Prazo *</Label>
              <DateInput
                value={formData.prazo}
                onChange={(value) => setFormData(prev => ({ ...prev, prazo: value }))}
              />
            </div>
          </div>

          <div>
            <Label>Investimento (opcional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <Input
                value={formData.investimento}
                onChange={(e) => handleInvestimentoChange(e.target.value)}
                placeholder="0.000,00"
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} className="flex-1">
              Criar e Vincular PAE
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}