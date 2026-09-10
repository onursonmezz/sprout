import { createContext, ReactNode, useContext, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: 'light' | 'dark';
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, scheme }}>{children}</ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within a ThemeModeProvider');
  return ctx;
}
