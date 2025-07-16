import { useEffect, useState, useCallback } from 'react';
import { useUserSettings } from './useUserSettings';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

export function useTheme() {
  const { userSettings, updateUserSettings } = useUserSettings();
  
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    // Prioritize user settings, then localStorage, then default to system
    const savedTheme = userSettings?.themePreference || localStorage.getItem('theme-preference') as Theme || 'system';
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
    // Update localStorage for backward compatibility
    localStorage.setItem('theme-preference', newTheme);
    
    // Update user settings
    updateUserSettings({ themePreference: newTheme });
    
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const resolvedTheme = newTheme === 'system' ? systemTheme : newTheme;
    
    setThemeState({
      theme: newTheme,
      systemTheme,
      resolvedTheme
    });
    
    updateDocumentTheme(resolvedTheme);
  }, [updateDocumentTheme, updateUserSettings]);

  const cycleTheme = useCallback(() => {
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(themeState.theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [themeState.theme, setTheme]);

  // Sync with user settings when they change
  useEffect(() => {
    if (userSettings?.themePreference && userSettings.themePreference !== themeState.theme) {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const resolvedTheme = userSettings.themePreference === 'system' ? systemTheme : userSettings.themePreference;
      
      setThemeState({
        theme: userSettings.themePreference,
        systemTheme,
        resolvedTheme
      });
      
      updateDocumentTheme(resolvedTheme);
    }
  }, [userSettings?.themePreference, updateDocumentTheme]);

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