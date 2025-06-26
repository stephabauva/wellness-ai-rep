import { useState, useEffect } from 'react';
import { SectionName } from './useLazySection';

export const useStaggeredLoading = () => {
  const [loadedSections, setLoadedSections] = useState<SectionName[]>([]);

  useEffect(() => {
    const loadSequence = async () => {
      // Load chat immediately - critical path
      setLoadedSections(['chat']);

      // Wait 200ms, then load memory overview (lightweight)
      setTimeout(() => {
        setLoadedSections(prev => [...prev, 'memory']);
      }, 200);

      // Wait 500ms, then load settings data
      setTimeout(() => {
        setLoadedSections(prev => [...prev, 'settings']);
      }, 500);

      // Wait 1000ms, then preload other sections in background
      setTimeout(() => {
        setLoadedSections(prev => [...prev, 'health', 'files', 'devices']);
      }, 1000);
    };

    loadSequence();
  }, []);

  return loadedSections;
};