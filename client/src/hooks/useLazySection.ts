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
      switch (sectionName) {
        case 'health':
          await Promise.all([
            queryClient.prefetchQuery({ queryKey: ['/api/health-data'] }),
            queryClient.prefetchQuery({ queryKey: ['/api/devices'] }),
            queryClient.prefetchQuery({ queryKey: ['/api/health-consent/visibility'] }),
            queryClient.prefetchQuery({ queryKey: ['/api/health-data/categories'] })
          ]);
          break;
        case 'memory':
          await queryClient.prefetchQuery({ queryKey: ['/api/memories/overview'] });
          break;
        case 'files':
          await Promise.all([
            queryClient.prefetchQuery({ queryKey: ['/api/files'] }),
            queryClient.prefetchQuery({ queryKey: ['/api/categories'] }),
            queryClient.prefetchQuery({ queryKey: ['/api/retention-settings'] })
          ]);
          break;
        case 'settings':
          await Promise.all([
            queryClient.prefetchQuery({ queryKey: ['/api/settings'] }),
            queryClient.prefetchQuery({ queryKey: ['/api/ai-models'] })
          ]);
          break;
        case 'devices':
          await queryClient.prefetchQuery({ queryKey: ['/api/devices'] });
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