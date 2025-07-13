import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSectionCacheTime } from '@shared';
import { SectionName } from './useLazySection';

export const useBackgroundPreload = (sections: SectionName[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const preloadWithDelay = async () => {
      sections.forEach((section, index) => {
        // Priority weighting: memory gets faster loading, others get staggered delays
        const delay = section === 'memory' ? 50 : (index + 1) * 100;
        
        setTimeout(() => {
          switch (section) {
            case 'health':
              queryClient.prefetchQuery({ 
                queryKey: ['/api/health-data'],
                staleTime: getSectionCacheTime('/api/health-data')
              });
              queryClient.prefetchQuery({ 
                queryKey: ['/api/devices'],
                staleTime: getSectionCacheTime('/api/devices')
              });
              queryClient.prefetchQuery({ 
                queryKey: ['/api/health-consent/visibility'],
                staleTime: getSectionCacheTime('/api/health-consent/visibility')
              });
              queryClient.prefetchQuery({ 
                queryKey: ['/api/health-data/categories'],
                staleTime: getSectionCacheTime('/api/health-data/categories')
              });
              break;
            case 'memory':
              queryClient.prefetchQuery({ 
                queryKey: ['/api/memories/overview'],
                staleTime: getSectionCacheTime('/api/memories/overview')
              });
              break;
            case 'files':
              queryClient.prefetchQuery({ 
                queryKey: ['/api/files'],
                staleTime: getSectionCacheTime('/api/files')
              });
              queryClient.prefetchQuery({ 
                queryKey: ['/api/categories'],
                staleTime: getSectionCacheTime('/api/categories')
              });
              queryClient.prefetchQuery({ 
                queryKey: ['/api/retention-settings'],
                staleTime: getSectionCacheTime('/api/retention-settings')
              });
              break;
            case 'settings':
              queryClient.prefetchQuery({ 
                queryKey: ['/api/settings'],
                staleTime: getSectionCacheTime('/api/settings')
              });
              queryClient.prefetchQuery({ 
                queryKey: ['/api/ai-models'],
                staleTime: getSectionCacheTime('/api/ai-models')
              });
              break;
            case 'devices':
              queryClient.prefetchQuery({ 
                queryKey: ['/api/devices'],
                staleTime: getSectionCacheTime('/api/devices')
              });
              break;
          }
        }, delay);
      });
    };

    preloadWithDelay();
  }, [sections, queryClient]);
};