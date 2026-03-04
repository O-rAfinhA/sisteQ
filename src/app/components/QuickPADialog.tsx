import { capitalizarNome, capitalizarPrimeiraLetra, dataHojeISO } from '../utils/formatters';
import { generateId } from '../utils/helpers';
import { useState } from 'react';
import { useNavigate } from 'react-router';
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
import { Checkbox } from './ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PlanoAcoes, OrigemPA } from '../types/strategic';
import { ROUTES } from '../config/routes';

interface QuickPADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (plano: Omit<PlanoAcoes, 'id' | 'numeroPE' | 'criadoEm'>) => void;
  prefilledOrigem?: OrigemPA;
}

const ORIGEM_PA_OPTIONS: OrigemPA[] = [
  'NC Interna',
  'Falha de processo',
  'Produto/serviço NC',
  'Auditoria Interna',
  'Auditoria Externa',
  'Cliente',
  'Reclamação de Cliente',
  'Indicador de desempenho',
  'Fornecedor',
  'Meio Ambiente',
  'Segurança e Saúde',
  'Risco',
  'Outros',
];

export function QuickPADialog({ open, onOpenChange, onSave, prefilledOrigem = 'Risco' }: QuickPADialogProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    origem: prefilledOrigem,
    descricaoNaoConformidade: '',
    acaoImediata: '',
    causaRaiz: '',
    responsavel: '',
    prazo: '',
    investimento: '',
  });
  const [identificadoNovoRisco, setIdentificadoNovoRisco] = useState(false);

  const handleSubmit = () => {
    if (!formData.descricaoNaoConformidade.trim()) {
      toast.error('Por favor, informe a descrição da não conformidade.');
      return;
    }

    if (!formData.acaoImediata.trim()) {
      toast.error('Por favor, informe a ação imediata.');
      return;
    }

    if (!formData.causaRaiz.trim()) {
      toast.error('Por favor, informe a causa raiz.');
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

    // Calcular data de verificação de eficácia (+30 dias do prazo)
    const dataVerificacao = new Date(formData.prazo);
    dataVerificacao.setDate(dataVerificacao.getDate() + 30);
    const dataVerificacaoEficacia = dataVerificacao.toISOString().split('T')[0];

    onSave({
      origem: formData.origem as OrigemPA,
      descricaoNaoConformidade: formData.descricaoNaoConformidade.trim(),
      acaoImediata: formData.acaoImediata.trim(),
      causaRaiz: formData.causaRaiz.trim(),
      tarefas: [{
        id: generateId(),
        descricao: formData.acaoImediata.trim(),
        responsavel: formData.responsavel.trim(),
        prazo: formData.prazo,
        concluida: false,
      }],
      investimento: investimentoNumero,
      dataInicio: dataHojeISO(),
      prazoFinal: formData.prazo,
      statusAcompanhamento: 'nao-iniciado',
      acompanhamentos: [],
      acaoImplantada: false,
      dataVerificacaoEficacia,
    });

    // Limpar form
    setFormData({
      origem: prefilledOrigem,
      descricaoNaoConformidade: '',
      acaoImediata: '',
      causaRaiz: '',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar PA e Vincular</DialogTitle>
          <DialogDescription>
            Crie um novo Plano de Ação Corretiva que será automaticamente vinculado a este risco.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Origem *</Label>
            <Select 
              value={formData.origem} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, origem: value as OrigemPA }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGEM_PA_OPTIONS.map((origem) => (
                  <SelectItem key={origem} value={origem}>
                    {origem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição da Não Conformidade / Problema *</Label>
            <Textarea
              value={formData.descricaoNaoConformidade}
              onChange={(e) => setFormData(prev => ({ ...prev, descricaoNaoConformidade: capitalizarPrimeiraLetra(e.target.value) }))}
              placeholder="Descreva a não conformidade ou problema identificado..."
              rows={3}
            />
          </div>

          <div>
            <Label>Ação Imediata *</Label>
            <Textarea
              value={formData.acaoImediata}
              onChange={(e) => setFormData(prev => ({ ...prev, acaoImediata: capitalizarPrimeiraLetra(e.target.value) }))}
              placeholder="Descreva a ação imediata tomada para conter o problema..."
              rows={2}
            />
          </div>

          <div>
            <Label>Causa Raiz *</Label>
            <Textarea
              value={formData.causaRaiz}
              onChange={(e) => setFormData(prev => ({ ...prev, causaRaiz: capitalizarPrimeiraLetra(e.target.value) }))}
              placeholder="Identifique a causa raiz do problema..."
              rows={2}
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
              <Label>Prazo Final *</Label>
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

          {/* Nova seção: Identificado novo risco */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="novo-risco"
                checked={identificadoNovoRisco}
                onCheckedChange={(checked) => setIdentificadoNovoRisco(checked === true)}
              />
              <label
                htmlFor="novo-risco"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Identificado novo risco?
              </label>
            </div>

            {identificadoNovoRisco && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-900 font-medium">
                      Novo risco identificado
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Você pode cadastrar este risco no módulo de Gestão de Riscos.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 hover:bg-amber-100 text-amber-900"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`${ROUTES.GESTAO_RISCOS.REGISTRO}?novoRisco=true`);
                  }}
                >
                  Cadastrar Novo Risco
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} className="flex-1">
              Criar e Vincular PA
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