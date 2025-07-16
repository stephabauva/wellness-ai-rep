import React, { useMemo } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = React.memo<ThemeToggleProps>(({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  // Memoize theme options to prevent recreation on every render
  const themes = useMemo(() => [
    { value: 'light' as Theme, icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { value: 'dark' as Theme, icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { value: 'system' as Theme, icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ], []);

  // Memoize button class computation for better mobile performance
  const getButtonClassName = useMemo(() => (isActive: boolean) => 
    `flex items-center justify-center p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 touch-manipulation will-change-transform ${isActive
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground hover:bg-background/50 active:scale-95'
    }`, []);

  return (
    <div className={`inline-flex items-center bg-muted rounded-full p-1 ${className}`}>
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={getButtonClassName(theme === themeOption.value)}
          title={`Switch to ${themeOption.label} mode`}
          aria-label={`Switch to ${themeOption.label} mode`}
        >
          {themeOption.icon}
        </button>
      ))}
    </div>
  );
});

ThemeToggle.displayName = 'ThemeToggle';