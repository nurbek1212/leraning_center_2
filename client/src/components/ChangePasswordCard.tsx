import { FormEvent, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { getErrorMessage, post, TOKEN_KEY } from '../api/client';
import ErrorBox from './ErrorBox';
import FormField from './FormField';
import { useToast } from '../context/ToastContext';
import { t } from '../i18n';

// Yangi parol qoidasi serverdagi bilan bir xil (asosiy tekshiruv serverda)
function newPasswordError(value: string): string {
  if (value.length < 8) return t('comp.pwd.newTooShort');
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return t('comp.pwd.newWeak');
  return '';
}

export default function ChangePasswordCard() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; repeat?: string }>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = t('comp.pwd.currentRequired');
    const nextErr = newPasswordError(next);
    if (nextErr) found.next = nextErr;
    else if (next === current) found.next = t('comp.pwd.newSame');
    if (repeat !== next) found.repeat = t('comp.pwd.mismatch');
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setServerError('');
    try {
      const res = await post<{ token: string }>('/auth/change-password', { currentPassword: current, newPassword: next });
      // Eski token endi yaroqsiz, shu qurilma uchun yangisini saqlaymiz
      localStorage.setItem(TOKEN_KEY, res.token);
      setCurrent('');
      setNext('');
      setRepeat('');
      toast.success(t('comp.pwd.changed'));
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <KeyRound size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{t('comp.pwd.title')}</h3>
          <p className="text-xs text-slate-400">{t('comp.pwd.subtitle')}</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBox message={serverError} />
        <FormField label={t('comp.pwd.current')} error={errors.current}>
          <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('comp.pwd.new')} error={errors.next} hint={t('comp.pwd.newHint')}>
            <input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </FormField>
          <FormField label={t('comp.pwd.repeat')} error={errors.repeat}>
            <input className="input" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {t('comp.pwd.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
