import { useState } from 'react';
import { useStrategic } from '../context/StrategicContext';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PlanoAcaoSelectorProps {
  value?: string;
  onChange: (numeroPE: string | undefined) => void;
  label?: string;
  allowManualInput?: boolean;
}

export function PlanoAcaoSelector({ 
  value, 
  onChange, 
  label = "Vincular ao Plano Estratégico (opcional)",
  allowManualInput = true 
}: PlanoAcaoSelectorProps) {
  const { dados } = useStrategic();
  const [modo, setModo] = useState<'select' | 'input'>('select');
  const [inputValue, setInputValue] = useState(value || '');
  const [validationError, setValidationError] = useState('');

  const handleSelectChange = (val: string) => {
    if (val === 'none') {
      onChange(undefined);
    } else if (val === 'manual') {
      setModo('input');
      setValidationError('');
    } else {
      onChange(val);
    }
  };

  const validatePE = (peNumber: string): boolean => {
    if (!peNumber) return true; // Empty is valid (no link)
    
    // Validar formato
    if (!peNumber.match(/^PE\d{3}$/i)) {
      setValidationError('Formato inválido. Use PE001, PE002, etc.');
      return false;
    }

    // Validar se existe
    const peExists = dados.planosAcao.some(p => p.numeroPE.toUpperCase() === peNumber.toUpperCase());
    if (!peExists) {
      setValidationError(`PE ${peNumber} não encontrado. Crie o plano primeiro.`);
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleInputChange = (val: string) => {
    const upperVal = val.toUpperCase();
    setInputValue(upperVal);
    
    if (val === '') {
      setValidationError('');
      onChange(undefined);
      return;
    }

    // Validar formato enquanto digita
    if (!upperVal.match(/^PE\d{0,3}$/i)) {
      setValidationError('Formato inválido. Use PE001, PE002, etc.');
      onChange(undefined);
      return;
    }

    // Se completou o formato, validar existência
    if (upperVal.match(/^PE\d{3}$/i)) {
      if (validatePE(upperVal)) {
        onChange(upperVal);
      } else {
        onChange(undefined);
      }
    } else {
      setValidationError('');
      onChange(undefined);
    }
  };

  const getPEStatus = () => {
    if (!inputValue || inputValue.length < 5) return null;
    
    const peExists = dados.planosAcao.some(p => p.numeroPE.toUpperCase() === inputValue.toUpperCase());
    return peExists;
  };

  const peStatus = getPEStatus();

  if (modo === 'input' && allowManualInput) {
    return (
      <div>
        <Label>{label}</Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Ex: PE001, PE002..."
              maxLength={5}
              className={validationError ? 'border-red-500' : peStatus === true ? 'border-green-500' : ''}
            />
            {peStatus !== null && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {peStatus ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setModo('select');
              setInputValue('');
              setValidationError('');
              onChange(undefined);
            }}
            className="text-sm text-blue-600 hover:underline whitespace-nowrap"
          >
            Voltar
          </button>
        </div>
        {validationError ? (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {validationError}
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Digite o número PE no formato PE001, PE002, etc.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || 'none'} onValueChange={handleSelectChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem vinculação</SelectItem>
          {allowManualInput && (
            <SelectItem value="manual">✏️ Digitar número PE...</SelectItem>
          )}
          {dados.planosAcao.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-t">
                Planos Existentes
              </div>
              {dados.planosAcao.map((plano) => (
                <SelectItem key={plano.id} value={plano.numeroPE}>
                  <div className="flex flex-col">
                    <span className="font-semibold">{plano.numeroPE}</span>
                    <span className="text-xs text-gray-500">
                      {plano.acao.substring(0, 50)}{plano.acao.length > 50 ? '...' : ''}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      {dados.planosAcao.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Nenhum plano criado ainda. {allowManualInput && 'Você pode digitar o número PE manualmente.'}
        </p>
      )}
    </div>
  );
}
