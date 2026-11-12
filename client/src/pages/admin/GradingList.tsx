import { useNavigate } from 'react-router-dom';
import { ChevronRight, ListChecks } from 'lucide-react';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import ProgressBar from '../../components/ProgressBar';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import type { SchemeSummary } from '../../types';
import { t } from '../../i18n';

function StatusBadge({ s }: { s: SchemeSummary }) {
  if (!s.scheme_id) return <Badge tone="gray">{t('grading.status.none')}</Badge>;
  if (s.status === 'published') return <Badge tone="green" dot>{t('grading.status.published')}</Badge>;
  return <Badge tone="amber" dot>{t('grading.status.draft')}</Badge>;
}

export default function GradingList() {
  const { data, loading, error } = useFetch<SchemeSummary[]>('/grading-schemes');
  const navigate = useNavigate();

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('grading.list.notLoaded')} />;

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-slate-500">
        {t('grading.list.intro')}
      </p>
      {data.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ListChecks size={26} />} title={t('grading.list.emptyTitle')} text={t('grading.list.emptyText')} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <button
              key={s.subject_id}
              onClick={() => navigate(`/admin/grading/${s.subject_id}`)}
              className="card group p-5 text-left transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{s.subject_name}</h3>
                <ChevronRight size={18} className="mt-0.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </div>
              <div className="mt-2">
                <StatusBadge s={s} />
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                  <span>{t('grading.list.parts', { n: s.component_count })}</span>
                  <span className="tabular font-medium text-slate-700">{s.total} / 100</span>
                </div>
                <ProgressBar value={s.total} max={100} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {t('grading.list.groupsGrades', { groups: s.group_count, grades: s.grade_count })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
