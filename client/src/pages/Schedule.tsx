import { CalendarClock } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { t } from '../i18n';
import type { ScheduleGroup } from '../types';
import { dayLabel, parseSchedule, WEEK_DAYS } from '../utils/format';

// Haftalik dars jadvali: guruhlarning "Du-Chor-Ju 14:00" jadvalidan tuziladi
export default function Schedule() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch<ScheduleGroup[]>('/schedule/my');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  const lessons = (data ?? []).map((g) => ({ ...g, ...parseSchedule(g.schedule) })).filter((g) => g.days.length);
  if (!lessons.length) {
    return (
      <div className="card">
        <EmptyState icon={<CalendarClock size={26} />} title={t('schedule.empty')} text={t('schedule.emptyText')} />
      </div>
    );
  }
  // JS: 0 = yakshanba; WEEK_DAYS Dushanbadan boshlanadi
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {WEEK_DAYS.map((day, i) => {
        const items = lessons.filter((l) => l.days.includes(day)).sort((a, b) => a.time.localeCompare(b.time));
        const today = i === todayIdx;
        return (
          <div key={day} className={`card p-4 ${today ? 'ring-2 ring-brand-500' : ''} ${items.length ? '' : 'opacity-70'}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-slate-900">{dayLabel(day)}</p>
              {today && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{t('schedule.today')}</span>}
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">{t('schedule.noLessons')}</p>
            ) : (
              <ul className="space-y-2">
                {items.map((l) => (
                  <li key={l.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="tabular text-sm font-semibold text-brand-600">{l.time || '—'}</p>
                    <p className="text-sm font-medium text-slate-900">{l.subject_name}</p>
                    <p className="text-xs text-slate-500">{user?.role === 'teacher' ? l.name : `${l.name} · ${l.teacher_name}`}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
