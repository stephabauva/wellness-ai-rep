import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SectionName } from './useLazySection';

export const useBackgroundPreload = (sections: SectionName[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const preloadWithDelay = async () => {
      sections.forEach((section, index) => {
        // Staggered delays: 100ms, 200ms, 300ms, etc.
        setTimeout(() => {
          switch (section) {
            case 'health':
              queryClient.prefetchQuery({ queryKey: ['/api/health-data'] });
              queryClient.prefetchQuery({ queryKey: ['/api/devices'] });
              queryClient.prefetchQuery({ queryKey: ['/api/health-consent/visibility'] });
              queryClient.prefetchQuery({ queryKey: ['/api/health-data/categories'] });
              break;
            case 'memory':
              queryClient.prefetchQuery({ queryKey: ['/api/memories/overview'] });
              break;
            case 'files':
              queryClient.prefetchQuery({ queryKey: ['/api/files'] });
              queryClient.prefetchQuery({ queryKey: ['/api/categories'] });
              queryClient.prefetchQuery({ queryKey: ['/api/retention-settings'] });
              break;
            case 'settings':
              queryClient.prefetchQuery({ queryKey: ['/api/settings'] });
              queryClient.prefetchQuery({ queryKey: ['/api/ai-models'] });
              break;
            case 'devices':
              queryClient.prefetchQuery({ queryKey: ['/api/devices'] });
              break;
          }
        }, (index + 1) * 100);
      });
    };

    preloadWithDelay();
  }, [sections, queryClient]);
};