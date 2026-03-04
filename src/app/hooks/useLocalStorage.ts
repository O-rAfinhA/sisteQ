import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook que sincroniza state React com localStorage.
 * Carrega valor inicial do localStorage e auto-salva a cada setState.
 * Substitui o padrao: useState + useEffect load + saveToLocalStorage.
 * Suporta chaves dinâmicas — quando a key muda, re-lê do localStorage.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Re-ler do localStorage quando a key muda (chaves dinâmicas)
  const prevKeyRef = useRef(key);
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      try {
        const item = localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValueRef.current);
      } catch {
        setStoredValue(initialValueRef.current);
      }
    }
  }, [key]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Erro ao salvar localStorage "${key}":`, error);
      }
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}