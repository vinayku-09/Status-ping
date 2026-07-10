'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dashboard is light-only — dark mode removed entirely
  const theme: Theme = 'light';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Always force light mode: remove the .dark class regardless of any stored preference
    document.documentElement.classList.remove('dark');
    // Clear any old dark-mode preference that would be read on next load
    localStorage.removeItem('statusping-theme');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const toggleTheme = () => {
    // No-op: theme switching is disabled; UI is light-only
  };

  if (!mounted) {
    // Render children invisible to avoid flash; same strategy as before
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

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