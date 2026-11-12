import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'oquv_markaz_theme';

interface ThemeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* localStorage mavjud emas */
  }
  return 'system';
}

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

function apply(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
  // Telefon brauzeri manzil satri rangi
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0e1c' : '#2563eb');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);

  useEffect(() => {
    apply(mode);
    if (mode !== 'system') return;
    // "Tizim" rejimida qurilma sozlamasi o'zgarsa, tema ham o'zgaradi
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* saqlab bo'lmasa ham tema almashadi */
    }
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme faqat ThemeProvider ichida ishlatiladi');
  return ctx;
}
