/**
 * CurrencyInput — entrada monetária estilo BRL
 * Dígitos entram pela direita: R$ 0,01 → R$ 0,12 → R$ 1,23 → R$ 12,34 …
 * Interface externa: value e onChange trabalham com float string ("1222.5") ou ""
 */
import { useState, useEffect, useRef } from 'react';
import { Input } from './input';

interface CurrencyInputProps {
  value: string;                     // float string "1222.5" | ""
  onChange: (floatStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Converte float string → centavos inteiros */
function floatToCents(floatStr: string): number {
  if (!floatStr) return 0;
  const n = parseFloat(floatStr);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

/** Formata centavos inteiros → "R$ X.XXX,XX" (vazio quando 0) */
function centsToDisplay(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte centavos → float string para persistência */
function centsToFloat(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2);
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  disabled,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => centsToDisplay(floatToCents(value)));
  const prevExternalRef = useRef(value);

  // Sincroniza quando o pai reseta o form (ex: FORM_VAZIO)
  useEffect(() => {
    if (value !== prevExternalRef.current) {
      prevExternalRef.current = value;
      setDisplay(centsToDisplay(floatToCents(value)));
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Extrai apenas dígitos do que foi digitado
    const digits = e.target.value.replace(/\D/g, '');
    // Limita a 11 dígitos → máximo R$ 99.999.999,99
    const trimmed = digits.slice(-11);
    const cents = parseInt(trimmed || '0', 10);
    const formatted = centsToDisplay(cents);
    setDisplay(formatted);
    const floatStr = centsToFloat(cents);
    prevExternalRef.current = floatStr;
    onChange(floatStr);
  }

  // Ao perder o foco, garante placeholder se zero
  function handleBlur() {
    const cents = floatToCents(value);
    setDisplay(centsToDisplay(cents));
  }

  return (
    <Input
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      inputMode="numeric"
    />
  );
}
