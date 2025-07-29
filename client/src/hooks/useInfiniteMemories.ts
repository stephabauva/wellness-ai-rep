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
  hasMore: boolean;
  page: number;
  limit: number;
  count: number;
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
    queryFn: async ({ pageParam = 1 }: { pageParam: unknown }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;
      const startTime = performance.now();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`http://localhost:8081/api/memories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memories');
      
      const data = await response.json();
      const duration = performance.now() - startTime;
      
      console.log(`[Memory Loading Performance] Page ${page}: ${duration.toFixed(2)}ms (Target: <100ms)`);
      
      if (duration > 100) {
        console.warn(`[Memory Loading Performance] Slower than target: ${duration.toFixed(2)}ms > 100ms`);
      }
      
      return data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled,
    staleTime: 10 * 60 * 1000, // Increased to 10 minutes for better caching
    gcTime: 15 * 60 * 1000, // Keep in memory for 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if we have data
    refetchOnReconnect: false // Don't refetch on reconnect
  });

  // Flatten all memories from all pages
  const memories = query.data?.pages.flatMap(page => page.memories) || [];
  
  const totalCount = query.data?.pages.reduce((total, page) => total + page.count, 0) || 0;
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