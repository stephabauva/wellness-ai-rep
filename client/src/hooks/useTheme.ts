import { useEffect, useState, useCallback, useMemo } from 'react';
import { useUserSettings } from './useUserSettings';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

// Cache MediaQueryList to avoid recreation on mobile
let mediaQueryList: MediaQueryList | null = null;
const getSystemMediaQuery = () => {
  if (!mediaQueryList) {
    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
  }
  return mediaQueryList;
};

// Cache system theme detection for better mobile performance
const getSystemTheme = (): 'light' | 'dark' => {
  return getSystemMediaQuery().matches ? 'dark' : 'light';
};

export function useTheme() {
  const { userSettings, updateUserSettings } = useUserSettings();
  
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    // Prioritize user settings, then localStorage, then default to system
    const savedTheme = userSettings?.themePreference || localStorage.getItem('theme-preference') as Theme || 'system';
    const systemTheme = getSystemTheme();
    const resolvedTheme = savedTheme === 'system' ? systemTheme : savedTheme;
    
    return {
      theme: savedTheme,
      systemTheme,
      resolvedTheme
    };
  });

  // Memoize DOM update function to prevent recreation and optimize mobile performance
  const updateDocumentTheme = useCallback((resolvedTheme: 'light' | 'dark') => {
    const isDark = resolvedTheme === 'dark';
    const hasClass = document.documentElement.classList.contains('dark');
    
    // Only update DOM if actually needed to reduce paint operations on mobile
    if (isDark && !hasClass) {
      document.documentElement.classList.add('dark');
    } else if (!isDark && hasClass) {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Optimized theme setter with requestAnimationFrame for smoother mobile performance
  const setTheme = useCallback((newTheme: Theme) => {
    // Batch DOM updates using requestAnimationFrame for smoother performance on mobile
    requestAnimationFrame(() => {
      localStorage.setItem('theme-preference', newTheme);
      updateUserSettings({ themePreference: newTheme });
      
      const systemTheme = getSystemTheme();
      const resolvedTheme = newTheme === 'system' ? systemTheme : newTheme;
      
      setThemeState({
        theme: newTheme,
        systemTheme,
        resolvedTheme
      });
      
      updateDocumentTheme(resolvedTheme);
    });
  }, [updateDocumentTheme, updateUserSettings]);

  const cycleTheme = useCallback(() => {
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(themeState.theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [themeState.theme, setTheme]);

  // Sync with user settings when they change, optimized for mobile
  useEffect(() => {
    if (userSettings?.themePreference && userSettings.themePreference !== themeState.theme) {
      const systemTheme = getSystemTheme();
      const resolvedTheme = userSettings.themePreference === 'system' ? systemTheme : userSettings.themePreference;
      
      setThemeState({
        theme: userSettings.themePreference,
        systemTheme,
        resolvedTheme
      });
      
      updateDocumentTheme(resolvedTheme);
    }
  }, [userSettings?.themePreference, themeState.theme, updateDocumentTheme]);

  useEffect(() => {
    const mediaQuery = getSystemMediaQuery();
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      
      setThemeState(prev => {
        const newResolvedTheme = prev.theme === 'system' ? newSystemTheme : prev.resolvedTheme;
        
        // Only update if there's an actual change to prevent unnecessary re-renders on mobile
        if (prev.systemTheme === newSystemTheme && prev.resolvedTheme === newResolvedTheme) {
          return prev;
        }
        
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