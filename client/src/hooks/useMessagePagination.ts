import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  pageSize: number;
  initialPage?: number;
}

interface PaginationResult<T> {
  currentItems: T[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  loadMore: () => void;
  isLoading: boolean;
}

export function useMessagePagination<T>(
  items: T[],
  { pageSize, initialPage = 1 }: PaginationOptions
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(items.length / pageSize);
  
  const currentItems = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const loadMore = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      setIsLoading(true);
      // Simulate async loading
      await new Promise(resolve => setTimeout(resolve, 100));
      setCurrentPage(prev => prev + 1);
      setIsLoading(false);
    }
  }, [hasNextPage, isLoading]);

  return {
    currentItems,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    loadMore,
    isLoading,
  };
}