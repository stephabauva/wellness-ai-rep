import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type SectionName = 'chat' | 'health' | 'memory' | 'files' | 'settings' | 'devices';

export const useLazySection = (sectionName: SectionName) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const loadSection = useCallback(async () => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      // Helper function to safely prefetch a query without throwing
      const safePrefetch = async (queryKey: string[]) => {
        try {
          await queryClient.prefetchQuery({ queryKey });
        } catch (error) {
          console.warn(`[useLazySection] Failed to prefetch ${queryKey.join('/')}:`, error);
          // Don't rethrow - we want to continue with other prefetches
        }
      };

      switch (sectionName) {
        case 'health':
          await Promise.allSettled([
            safePrefetch(['/api/health-data']),
            safePrefetch(['/api/devices']),
            safePrefetch(['/api/health-consent/visibility']),
            safePrefetch(['/api/health-data/categories'])
          ]);
          break;
        case 'memory':
          await safePrefetch(['/api/memories/overview']);
          break;
        case 'files':
          await Promise.allSettled([
            safePrefetch(['/api/files']),
            safePrefetch(['/api/categories']),
            safePrefetch(['/api/retention-settings'])
          ]);
          break;
        case 'settings':
          await Promise.allSettled([
            safePrefetch(['/api/settings']),
            safePrefetch(['/api/ai-models'])
          ]);
          break;
        case 'devices':
          await safePrefetch(['/api/devices']);
          break;
        case 'chat':
          // Chat data is handled by AppContext directly
          break;
      }
      setIsLoaded(true);
    } catch (error) {
      console.error(`[useLazySection] Error loading section ${sectionName}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [sectionName, isLoaded, isLoading, queryClient]);

  return { isLoaded, isLoading, loadSection };
};