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
  
  // For chat messages, show most recent messages first and load earlier ones
  const currentItems = useMemo(() => {
    if (items.length === 0) return [];
    
    // Show the most recent messages up to current page * pageSize
    const totalItemsToShow = currentPage * pageSize;
    const startIndex = Math.max(0, items.length - totalItemsToShow);
    return items.slice(startIndex);
  }, [items, currentPage, pageSize]);

  // For chat pagination, "next page" means loading earlier messages
  const hasNextPage = currentPage * pageSize < items.length;
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
      // Small delay to prevent rapid clicking
      await new Promise(resolve => setTimeout(resolve, 150));
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