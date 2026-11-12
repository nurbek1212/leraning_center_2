import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, Timer } from 'lucide-react';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { MyAssessment } from '../../types';
import { formatDate } from '../../utils/format';
import { FormatBadge, StageBadge } from './shared';

export function MyStateBadge({ a }: { a: MyAssessment }) {
  if (a.score !== null) return <Badge tone="green">{t('assess.my.scored')}</Badge>;
  if (a.submitted_at) return <Badge tone="blue">{t('assess.my.waiting')}</Badge>;
  if (a.started_at) return <Badge tone="amber">{t('assess.res.inProgress')}</Badge>;
  if (a.status === 'closed') return <Badge>{t('assess.status.closed')}</Badge>;
  if (a.format === 'test') return <Badge tone="amber">{t('assess.my.available')}</Badge>;
  return <Badge>{t('assess.my.planned')}</Badge>;
}

export default function StudentAssessments() {
  const { data, loading, error } = useFetch<MyAssessment[]>('/assessments/my');
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (!data?.length) {
    return (
      <div className="card">
        <EmptyState icon={<ClipboardCheck size={26} />} title={t('assess.my.empty')} text={t('assess.my.emptyText')} />
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((a) => (
        <Link key={a.id} to={`/student/assessments/${a.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StageBadge stage={a.stage} />
              <FormatBadge format={a.format} />
            </div>
            <MyStateBadge a={a} />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">{a.title}</h3>
          <p className="text-sm text-brand-600">
            {a.group_name} · {a.subject_name}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={15} /> {formatDate(a.held_at)}
            </span>
            {a.duration_minutes && (
              <span className="flex items-center gap-1.5">
                <Timer size={15} /> {t('assess.minutes', { n: a.duration_minutes })}
              </span>
            )}
            {a.score !== null && (
              <span className="tabular font-semibold text-slate-900">
                {a.score} / {a.max_score}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
