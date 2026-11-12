import { createContext, Fragment, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { messages } from './locales';

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'uz', label: "O'zbekcha", short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
];

const STORAGE_KEY = 'oquv_markaz_lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'uz' || saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* localStorage mavjud emas (maxfiy rejim va h.k.) */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'uz').toLowerCase();
  if (nav.startsWith('ru')) return 'ru';
  if (nav.startsWith('en')) return 'en';
  return 'uz';
}

// Joriy til modul darajasida saqlanadi, shuning uchun `t()` ni istalgan joydan (hook'siz) chaqirish mumkin.
// Til almashganda butun ilova qayta chiziladi (Provider ichida key={lang}), shuning uchun eski matn qolib ketmaydi.
let current: Lang = detect();

export const getLang = () => current;

type Vars = Record<string, string | number>;

// t('admin.subjects.title') yoki t('common.itemsCount', { n: 5 }) -> "{n} ta" ichidagi {n} almashtiriladi.
// Kalit topilmasa: avval o'zbekcha, keyin kalitning o'zi qaytadi (sahifa buzilmaydi).
export function t(key: string, vars?: Vars): string {
  const text = messages[current][key] ?? messages.uz[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof t;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);
  current = lang; // bolalar chizilishidan oldin joriy til o'rnatiladi
  if (typeof document !== 'undefined') document.documentElement.lang = lang;

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* saqlab bo'lmasa ham til almashadi */
    }
    current = next;
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang]);

  return (
    <I18nContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n faqat I18nProvider ichida ishlatiladi');
  return ctx;
}
