import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';

/**
 * Hook otimizado para gerenciamento de filtros
 * Centraliza lógica comum de filtros, busca e ordenação
 */

export interface FilterConfig<T> {
  searchFields?: (keyof T)[];
  sortField?: keyof T;
  sortOrder?: 'asc' | 'desc';
}

export function useFilters<T extends Record<string, any>>(
  data: T[],
  config?: FilterConfig<T>
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Partial<Record<keyof T, any>>>({});
  const [sortField, setSortField] = useState<keyof T | undefined>(config?.sortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config?.sortOrder || 'asc');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filtra dados por busca textual
  const searchFiltered = useMemo(() => {
    if (!debouncedSearchTerm || !config?.searchFields) return data;

    const searchLower = debouncedSearchTerm.toLowerCase();
    return data.filter(item => {
      return config.searchFields!.some(field => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, debouncedSearchTerm, config?.searchFields]);

  // Aplica filtros customizados
  const customFiltered = useMemo(() => {
    if (Object.keys(filters).length === 0) return searchFiltered;

    return searchFiltered.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === '' || value === null || value === undefined) return true;
        
        // Suporte para arrays (ex: status múltiplos)
        if (Array.isArray(value)) {
          return value.length === 0 || value.includes(item[key as keyof T]);
        }
        
        return item[key as keyof T] === value;
      });
    });
  }, [searchFiltered, filters]);

  // Ordena dados
  const sorted = useMemo(() => {
    if (!sortField) return customFiltered;

    return [...customFiltered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [customFiltered, sortField, sortOrder]);

  // Atualiza um filtro específico
  const setFilter = useCallback(<K extends keyof T>(field: K, value: T[K] | null) => {
    setFilters(prev => {
      if (value === null || value === '' || value === undefined) {
        const next: Partial<Record<keyof T, any>> = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: value };
    });
  }, []);

  // Limpa todos os filtros
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({});
  }, []);

  // Toggle de ordenação
  const toggleSort = useCallback((field: keyof T) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  // Reseta ordenação
  const resetSort = useCallback(() => {
    setSortField(config?.sortField);
    setSortOrder(config?.sortOrder || 'asc');
  }, [config]);

  return {
    // Estados
    searchTerm,
    filters,
    sortField,
    sortOrder,
    
    // Dados filtrados
    filteredData: sorted,
    
    // Ações
    setSearchTerm,
    setFilter,
    setFilters,
    clearFilters,
    toggleSort,
    resetSort,
    
    // Informações
    hasActiveFilters: searchTerm !== '' || Object.keys(filters).length > 0,
    totalCount: data.length,
    filteredCount: sorted.length,
  };
}

/**
 * Hook para paginação
 */
export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export function usePagination<T>(
  data: T[],
  options?: UsePaginationOptions
) {
  const [currentPage, setCurrentPage] = useState(options?.initialPage || 1);
  const [pageSize, setPageSize] = useState(options?.initialPageSize || 10);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Auto-reset page quando dados mudam
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [data.length, totalPages, currentPage]);

  return {
    // Dados paginados
    paginatedData,
    
    // Estados
    currentPage,
    pageSize,
    totalPages,
    totalItems: data.length,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, data.length),
    
    // Ações
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    setCurrentPage,
    setPageSize,
    
    // Informações
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
}

/**
 * Hook combinado de filtros + paginação
 */
export function useFilteredPagination<T extends Record<string, any>>(
  data: T[],
  filterConfig?: FilterConfig<T>,
  paginationOptions?: UsePaginationOptions
) {
  const filterHook = useFilters(data, filterConfig);
  const paginationHook = usePagination(filterHook.filteredData, paginationOptions);

  return {
    ...filterHook,
    ...paginationHook,
  };
}
