import { Link } from 'react-router-dom';
import { CalendarDays, NotebookPen } from 'lucide-react';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { MyHomework } from '../../types';
import { formatDate, todayStr } from '../../utils/format';

export function HomeworkState({ h }: { h: MyHomework }) {
  if (h.reviewed_at) return <Badge tone="green">{t('hw.my.reviewed')}</Badge>;
  if (h.submitted_at) return <Badge tone="blue">{t('hw.my.submitted')}</Badge>;
  if (h.due_date.slice(0, 10) < todayStr()) return <Badge tone="red">{t('hw.my.overdue')}</Badge>;
  return <Badge tone="amber">{t('hw.my.todo')}</Badge>;
}

export default function StudentHomework() {
  const { data, loading, error } = useFetch<MyHomework[]>('/homework/my');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (!data?.length) {
    return (
      <div className="card">
        <EmptyState icon={<NotebookPen size={26} />} title={t('hw.my.empty')} text={t('hw.my.emptyText')} />
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((h) => (
        <Link key={h.id} to={`/student/homework/${h.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-brand-600">
              {h.group_name} · {h.subject_name}
            </p>
            <HomeworkState h={h} />
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{h.title}</h3>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays size={15} /> {t('hw.dueOn', { date: formatDate(h.due_date) })}
            {h.score !== null && <span className="tabular ml-auto font-semibold text-slate-900">{h.score}</span>}
          </p>
        </Link>
      ))}
    </div>
  );
}
