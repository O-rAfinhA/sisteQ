import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, CheckCircle2, Eye } from 'lucide-react';

interface PlanoAcaoCorretivaSelectorProps {
  value?: string;
  onChange: (numeroPA: string | undefined) => void;
  label?: string;
  allowManualInput?: boolean;
  onViewDetails?: () => void;
}

export function PlanoAcaoCorretivaSelector({ 
  value, 
  onChange, 
  label = "Vincular ao Plano de Ação Corretiva (opcional)",
  allowManualInput = true,
  onViewDetails
}: PlanoAcaoCorretivaSelectorProps) {
  const { dados } = useStrategic();
  const [modo, setModo] = useState<'select' | 'input'>('select');
  const [inputValue, setInputValue] = useState(value || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Garantir que planosAcoes seja um array
  const planosAcaoCorretiva = dados?.planosAcoes || [];

  const handleSelectChange = (val: string) => {
    if (val === 'manual') {
      setModo('input');
      setInputValue('');
      onChange(undefined);
    } else {
      onChange(val);
      setValidationError(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setInputValue(val);
    setValidationError(null);

    if (!val) {
      onChange(undefined);
      return;
    }

    // Aceitar apenas formato PAX ou PAXX ou PAXXX etc
    if (!/^PA\d+$/.test(val)) {
      setValidationError('Formato inválido. Use PA seguido de números (ex: PA001)');
      onChange(undefined);
      return;
    }

    // Validar se existe
    const paExists = planosAcaoCorretiva.some(p => p.numeroPE.toUpperCase() === val);
    if (!paExists) {
      setValidationError(`PA ${val} não encontrado. Crie o plano primeiro.`);
      onChange(undefined);
      return;
    }

    onChange(val);
  };

  const handleBackToSelect = () => {
    setModo('select');
    setInputValue('');
    setValidationError(null);
    onChange(undefined);
  };

  const hasSelectedPA = () => {
    if (modo === 'input') {
      if (!inputValue || inputValue.length < 3) return null;
      const paExists = planosAcaoCorretiva.some(p => p.numeroPE.toUpperCase() === inputValue);
      return paExists;
    }
    return !!value;
  };

  const selectedPAExists = hasSelectedPA();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value && onViewDetails && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="h-7 text-blue-600 hover:text-blue-700"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Ver Detalhes
          </Button>
        )}
      </div>

      {modo === 'select' ? (
        <>
          <Select value={value || ''} onValueChange={handleSelectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um PA..." />
            </SelectTrigger>
            <SelectContent>
              {allowManualInput && (
                <SelectItem value="manual">✏️ Digitar número PA...</SelectItem>
              )}
              {planosAcaoCorretiva.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t">
                    Planos Existentes
                  </div>
                  {planosAcaoCorretiva.map((plano) => (
                    <SelectItem key={plano.id} value={plano.numeroPE}>
                      <div className="flex flex-col">
                        <span className="font-semibold">{plano.numeroPE}</span>
                        <span className="text-xs text-gray-500">
                          {plano.descricaoNaoConformidade.substring(0, 50)}{plano.descricaoNaoConformidade.length > 50 ? '...' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          {planosAcaoCorretiva.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Nenhum plano criado ainda. {allowManualInput && 'Você pode digitar o número PA manualmente.'}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Ex: PA001"
                className={validationError ? 'border-red-500' : selectedPAExists ? 'border-green-500' : ''}
              />
              {selectedPAExists !== null && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {selectedPAExists ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToSelect}
              size="sm"
            >
              Cancelar
            </Button>
          </div>
          {validationError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationError}
            </p>
          )}
          {selectedPAExists && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              PA encontrado e vinculado
            </p>
          )}
        </div>
      )}
    </div>
  );
}