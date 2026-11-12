import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BarChart3, GraduationCap, ListChecks, Loader2, Wallet } from 'lucide-react';
import { getErrorMessage } from '../api/client';
import ErrorBox from '../components/ErrorBox';
import FormField from '../components/FormField';
import PreferenceSwitchers from '../components/PreferenceSwitchers';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { homePath, isEmail } from '../utils/format';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner className="min-h-screen" />;
  if (user) return <Navigate to={homePath(user.role)} replace />;

  const features = [
    { icon: <ListChecks size={18} />, text: t('auth.feature.grading') },
    { icon: <BarChart3 size={18} />, text: t('auth.feature.stats') },
    { icon: <Wallet size={18} />, text: t('auth.feature.payments') },
  ];

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = t('auth.err.email');
    if (!password) next.password = t('auth.err.password');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const u = await login(email.trim(), password);
      navigate(homePath(u.role), { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-[#0b1a4a] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <GraduationCap size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">{t('layout.brand')}</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            {t('auth.hero1')}
            <br />
            {t('auth.hero2')}
          </h2>
          <ul className="mt-8 space-y-4">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-white/85">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/50">© {new Date().getFullYear()} {t('layout.brand')}</p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <PreferenceSwitchers className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white">
              <GraduationCap size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900">{t('layout.brand')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('auth.welcome')}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{t('auth.subtitle')}</p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <ErrorBox message={serverError} />
            <FormField label={t('common.email')} error={errors.email}>
              <input className="input" type="email" autoComplete="username" placeholder="admin@markaz.uz" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label={t('common.password')} error={errors.password}>
              <input className="input" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t('auth.login')}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">{t('auth.noRegister')}</p>
        </div>
      </div>
    </div>
  );
}
