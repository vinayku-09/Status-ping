'use client';

import { createContext, useContext, useEffect } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dashboard is light-only — dark mode removed entirely
  const theme: Theme = 'light';

  useEffect(() => {
    // Always force light mode: remove the .dark class regardless of any stored preference
    document.documentElement.classList.remove('dark');
    // Clear any old dark-mode preference that would be read on next load
    localStorage.removeItem('statusping-theme');
  }, []);

  const toggleTheme = () => {
    // No-op: theme switching is disabled; UI is light-only
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}