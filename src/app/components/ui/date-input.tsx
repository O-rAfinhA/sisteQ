import { Input } from './input';
import { dataParaISO } from '../../utils/formatters';
import { useState, useEffect } from 'react';

interface DateInputProps {
  value: string; // ISO format (YYYY-MM-DD)
  onChange: (value: string) => void; // Returns ISO format
  placeholder?: string;
  className?: string;
}

/**
 * Input de data customizado que exibe e aceita formato dd/mm/aa
 * Internamente trabalha com formato ISO (YYYY-MM-DD)
 */
export function DateInput({ value, onChange, placeholder = 'dd/mm/aa', className }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Converte ISO para dd/mm/aa quando o value muda
  useEffect(() => {
    if (value) {
      const [ano, mes, dia] = value.split('-');
      if (ano && mes && dia) {
        const anoAbreviado = ano.slice(-2);
        setDisplayValue(`${dia}/${mes}/${anoAbreviado}`);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove tudo que não é número ou barra
    inputValue = inputValue.replace(/[^\d/]/g, '');
    
    // Limita o tamanho total
    if (inputValue.length > 8) {
      inputValue = inputValue.slice(0, 8);
    }
    
    // Adiciona barras automaticamente
    if (inputValue.length >= 2 && inputValue[2] !== '/' && !inputValue.includes('/')) {
      inputValue = inputValue.slice(0, 2) + '/' + inputValue.slice(2);
    }
    if (inputValue.length >= 5 && inputValue[5] !== '/' && inputValue.split('/').length === 2) {
      const parts = inputValue.split('/');
      inputValue = parts[0] + '/' + parts[1].slice(0, 2) + '/' + parts[1].slice(2);
    }
    
    setDisplayValue(inputValue);
  };

  const handleBlur = () => {
    // Valida e converte para ISO ao sair do campo
    const parts = displayValue.split('/');
    
    if (parts.length === 3) {
      const [dia, mes, ano] = parts;
      
      // Valida se tem os tamanhos corretos
      if (dia.length === 2 && mes.length === 2 && ano.length === 2) {
        const diaNum = parseInt(dia);
        const mesNum = parseInt(mes);
        const anoNum = parseInt(ano);
        
        // Valida ranges básicos
        if (diaNum >= 1 && diaNum <= 31 && mesNum >= 1 && mesNum <= 12) {
          // Converte ano de 2 dígitos para 4 dígitos (assume 20XX)
          const anoCompleto = `20${ano}`;
          const isoDate = `${anoCompleto}-${mes}-${dia}`;
          onChange(isoDate);
          return;
        }
      }
    }
    
    // Se não é válido, limpa
    if (displayValue && displayValue.length < 8) {
      setDisplayValue('');
      onChange('');
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      maxLength={8}
    />
  );
}
