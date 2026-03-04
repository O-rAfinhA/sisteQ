import { useState, useCallback, useMemo } from 'react';

/**
 * Hook otimizado para gerenciamento de formulários
 * Reduz re-renders desnecessários e centraliza lógica comum
 */

export interface UseOptimizedFormOptions<T> {
  initialValues: T;
  onSubmit?: (values: T) => void | Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
}

export function useOptimizedForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
}: UseOptimizedFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualiza um campo específico
  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  // Atualiza múltiplos campos de uma vez
  const setFieldsValue = useCallback((updates: Partial<T>) => {
    setValues(prev => ({ ...prev, ...updates }));
  }, []);

  // Marca um campo como tocado
  const setFieldTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  // Reset do formulário
  const resetForm = useCallback((newValues?: T) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Handler de mudança otimizado
  const handleChange = useCallback((field: keyof T) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      setFieldValue(field, value as T[keyof T]);
    };
  }, [setFieldValue]);

  // Handler de blur otimizado
  const handleBlur = useCallback((field: keyof T) => {
    return () => {
      setFieldTouched(field);
      if (validate) {
        const validationErrors = validate(values);
        setErrors(validationErrors);
      }
    };
  }, [setFieldTouched, validate, values]);

  // Submit otimizado
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, values, onSubmit]);

  // Verifica se o formulário é válido
  const isValid = useMemo(() => {
    if (!validate) return true;
    const validationErrors = validate(values);
    return Object.keys(validationErrors).length === 0;
  }, [validate, values]);

  // Verifica se há mudanças não salvas
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setFieldValue,
    setFieldsValue,
    setFieldTouched,
    setValues,
    resetForm,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
