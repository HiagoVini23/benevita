import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  readSavedTheme,
  systemTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from './theme-context.ts';

/** Follows the system until the user picks a theme; the choice is remembered. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readSavedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (readSavedTheme() !== null || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      if (readSavedTheme() === null) setTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', follow);
    return () => {
      media.removeEventListener('change', follow);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage blocked: the theme still changes, it just is not remembered.
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
