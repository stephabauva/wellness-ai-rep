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
  loadMore: () => void; // Specific to chat-like "load earlier" behavior
  isLoading: boolean; // For async loadMore
}

export function useMessagePagination<T>(
  items: T[],
  { pageSize, initialPage = 1 }: PaginationOptions
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false); // For simulating async load in loadMore

  const totalPages = Math.ceil(items.length / pageSize);

  // For chat messages, pagination typically means loading earlier messages,
  // so currentItems should represent the "tail" of the full list, growing backwards.
  const currentItems = useMemo(() => {
    if (items.length === 0) return [];

    // Calculate the total number of items to display based on the current page.
    // For example, if on page 2 with pageSize 10, show items from index (length - 20) to (length - 1).
    const totalItemsToShow = currentPage * pageSize;
    const startIndex = Math.max(0, items.length - totalItemsToShow);
    return items.slice(startIndex); // Returns items from startIndex to the end of the array
  }, [items, currentPage, pageSize]);

  // "hasNextPage" means there are earlier messages to load (items beyond the current view)
  const hasNextPage = currentPage * pageSize < items.length;
  // "hasPreviousPage" is less common in "load more" UIs but means we've loaded more than the first page.
  const hasPreviousPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  // nextPage for "load more" means increasing the page number to show more older items
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  // previousPage is less conventional for "load more" but would mean reducing items shown
  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  // loadMore is typically the action used in UIs for this kind of pagination
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      setIsLoading(true);
      // Simulate async loading (e.g., fetching from a local DB or API)
      // In a real scenario, you might await an actual data fetch here.
      await new Promise(resolve => setTimeout(resolve, 150)); // Simulate network delay
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
