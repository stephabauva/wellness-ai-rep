import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ];

  return (
    <div className={`inline-flex items-center bg-muted rounded-full p-1 ${className}`}>
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={`
            flex items-center justify-center p-2 rounded-full transition-all duration-200
            ${theme === themeOption.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }
          `}
          title={`Switch to ${themeOption.label} mode`}
          aria-label={`Switch to ${themeOption.label} mode`}
        >
          {themeOption.icon}
        </button>
      ))}
    </div>
  );
}