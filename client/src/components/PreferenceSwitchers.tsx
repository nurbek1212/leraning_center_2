import { Monitor, Moon, Sun } from 'lucide-react';
import { LANGS, t, useI18n } from '../i18n';
import { ThemeMode, useTheme } from '../context/ThemeContext';

const modes: { mode: ThemeMode; icon: typeof Sun; key: string }[] = [
  { mode: 'light', icon: Sun, key: 'layout.theme.light' },
  { mode: 'system', icon: Monitor, key: 'layout.theme.system' },
  { mode: 'dark', icon: Moon, key: 'layout.theme.dark' },
];

const group = 'flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5';
const item = (active: boolean) =>
  `flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
    active ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
  }`;

// Kunduzgi / tungi rejim va til tanlash (sarlavha va kirish sahifasida)
export default function PreferenceSwitchers({ className = '' }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const { lang, setLang } = useI18n();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={group} role="group" aria-label={t('common.theme')}>
        {modes.map(({ mode: m, icon: Icon, key }) => (
          <button key={m} type="button" className={item(mode === m)} onClick={() => setMode(m)} title={t(key)} aria-label={t(key)} aria-pressed={mode === m}>
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div className={group} role="group" aria-label={t('common.language')}>
        {LANGS.map((l) => (
          <button key={l.code} type="button" className={item(lang === l.code)} onClick={() => setLang(l.code)} title={l.label} aria-label={l.label} aria-pressed={lang === l.code}>
            {l.short}
          </button>
        ))}
      </div>
    </div>
  );
}
