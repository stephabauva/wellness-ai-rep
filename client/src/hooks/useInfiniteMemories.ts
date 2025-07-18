import { useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@shared';

interface Memory {
  id: string;
  content: string;
  category: string;
  labels: string[];
  importanceScore: number;
  keywords: string[];
  createdAt: string;
  accessCount: number;
  lastAccessed: string;
}

interface MemoryPage {
  memories: Memory[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface UseInfiniteMemoriesOptions {
  category?: string;
  limit?: number;
  enabled?: boolean;
}

export function useInfiniteMemories({
  category,
  limit = 20,
  enabled = true
}: UseInfiniteMemoriesOptions = {}) {
  const query = useInfiniteQuery<MemoryPage, Error>({
    queryKey: ['memories', 'infinite', category],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString()
      });
      
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`/api/memories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memories');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Flatten all memories from all pages
  const memories = query.data?.pages.flatMap(page => page.memories) || [];
  
  const totalCount = query.data?.pages[0]?.pagination.totalCount || 0;
  const hasMore = query.hasNextPage;
  const isLoading = query.isLoading;
  const isFetchingNextPage = query.isFetchingNextPage;
  const error = query.error;

  return {
    memories,
    totalCount,
    hasMore,
    isLoading,
    isFetchingNextPage,
    error,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    invalidate: () => {
      // This will be handled by the query client
    }
  };
}