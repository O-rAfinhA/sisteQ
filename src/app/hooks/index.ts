/**
 * Hooks Centralizados
 * Exporta todos os hooks customizados em um único arquivo
 */

export { useDebounce } from './useDebounce';
export { useFornecedores } from './useFornecedores';
export { useKPI } from './useKPI';
export { useProcessos } from './useProcessos';
export { useOptimizedForm } from './useOptimizedForm';
export { useDialog, useMultipleDialogs } from './useDialog';
export { useFilters, usePagination, useFilteredPagination } from './useFilters';
export { useLocalStorage } from './useLocalStorage';

export type { UseOptimizedFormOptions } from './useOptimizedForm';
export type { UseDialogOptions } from './useDialog';
export type { FilterConfig, UsePaginationOptions } from './useFilters';