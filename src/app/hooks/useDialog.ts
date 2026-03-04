import { useState, useCallback } from 'react';

/**
 * Hook otimizado para gerenciamento de Dialogs/Modais
 * Centraliza lógica comum e reduz código duplicado
 */

export interface UseDialogOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export function useDialog(options?: UseDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    options?.onOpen?.();
  }, [options]);

  const close = useCallback(() => {
    setIsOpen(false);
    options?.onClose?.();
  }, [options]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, close, open]);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
}

/**
 * Hook para gerenciar múltiplos diálogos simultaneamente
 */
export function useMultipleDialogs<T extends string>(dialogNames: T[]) {
  const [openDialogs, setOpenDialogs] = useState<Set<T>>(new Set());

  const isOpen = useCallback((name: T) => openDialogs.has(name), [openDialogs]);

  const open = useCallback((name: T) => {
    setOpenDialogs(prev => new Set(prev).add(name));
  }, []);

  const close = useCallback((name: T) => {
    setOpenDialogs(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenDialogs(new Set());
  }, []);

  const toggle = useCallback((name: T) => {
    if (openDialogs.has(name)) {
      close(name);
    } else {
      open(name);
    }
  }, [openDialogs, close, open]);

  return {
    isOpen,
    open,
    close,
    toggle,
    closeAll,
  };
}
