import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

export function useTheme() {
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    const savedTheme = localStorage.getItem('theme-preference') as Theme || 'system';
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const resolvedTheme = savedTheme === 'system' ? systemTheme : savedTheme;
    
    return {
      theme: savedTheme,
      systemTheme,
      resolvedTheme
    };
  });

  const updateDocumentTheme = useCallback((resolvedTheme: 'light' | 'dark') => {
    if (resolvedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem('theme-preference', newTheme);
    
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const resolvedTheme = newTheme === 'system' ? systemTheme : newTheme;
    
    setThemeState({
      theme: newTheme,
      systemTheme,
      resolvedTheme
    });
    
    updateDocumentTheme(resolvedTheme);
  }, [updateDocumentTheme]);

  const cycleTheme = useCallback(() => {
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(themeState.theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [themeState.theme, setTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      
      setThemeState(prev => {
        const newResolvedTheme = prev.theme === 'system' ? newSystemTheme : prev.resolvedTheme;
        return {
          ...prev,
          systemTheme: newSystemTheme,
          resolvedTheme: newResolvedTheme
        };
      });
      
      if (themeState.theme === 'system') {
        updateDocumentTheme(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    updateDocumentTheme(themeState.resolvedTheme);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeState.theme, themeState.resolvedTheme, updateDocumentTheme]);

  return {
    ...themeState,
    setTheme,
    cycleTheme
  };
}