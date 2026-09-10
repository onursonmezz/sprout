import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { loadJSON, saveJSON } from '@/utils/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'sprout:theme-mode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: 'light' | 'dark';
  loaded: boolean;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);
  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    loadJSON<ThemeMode>(STORAGE_KEY, 'system').then((saved) => {
      setModeState(saved);
      setLoaded(true);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    saveJSON(STORAGE_KEY, next);
  };

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, scheme, loaded }}>{children}</ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within a ThemeModeProvider');
  return ctx;
}
