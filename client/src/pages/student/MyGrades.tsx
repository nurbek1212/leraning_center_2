import { useState } from 'react';
import { t } from '../../i18n';
import { ClipboardList } from 'lucide-react';
import Badge, { scoreTone } from '../../components/Badge';
import ClientTable from '../../components/ClientTable';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import ProgressBar from '../../components/ProgressBar';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import type { MyGrades as MyGradesData } from '../../types';
import { fmtScore, formatDate, percentOf } from '../../utils/format';

export default function MyGrades() {
  const { data, loading, error } = useFetch<MyGradesData>('/students/me/grades');
  const [groupFilter, setGroupFilter] = useState('');

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('student.grades.loadFailed')} />;

  const rows = groupFilter ? data.grades.filter((g) => String(g.group_id) === groupFilter) : data.grades;

  if (data.groups.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<ClipboardList size={26} />} title={t('student.grades.noGroupTitle')} text={t('student.grades.noGroupText')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.overall != null && (
        <p className="text-sm text-slate-500">
          {t('student.grades.overall')} <b className="tabular text-slate-900">{data.overall}%</b>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.groups.map((g) => (
          <div key={g.group_id} className="card p-5">
            <div className="flex items-center gap-5">
              <ScoreRing value={g.total} max={g.max_total || 100} />
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900">{g.subject_name}</h3>
                <p className="truncate text-sm text-slate-500">{g.group_name}</p>
                {g.max_total > 0 ? (
                  <div className="mt-2">
                    <Badge tone={scoreTone(percentOf(g.total, g.max_total))}>
                      {t('student.grades.points', { score: fmtScore(g.total), max: g.max_total })}
                    </Badge>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">{t('student.grades.notPublished')}</p>
                )}
              </div>
            </div>

            {g.components.length > 0 && (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                {g.components.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">
                        {c.name}
                        {c.is_exam && <span className="ml-1.5 text-xs text-brand-600">{t('student.grades.exam')}</span>}
                      </span>
                      <span className="tabular text-slate-500">
                        <b className="text-slate-900">{c.earned == null ? '—' : fmtScore(c.earned)}</b> / {c.max_score}
                      </span>
                    </div>
                    <ProgressBar value={c.earned ?? 0} max={c.max_score} />
                  </div>
                ))}
              </div>
            )}
            {g.scheme_description && <p className="mt-4 text-xs text-slate-400">{g.scheme_description}</p>}
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-slate-900">{t('student.grades.allGrades')}</h3>
        <ClientTable
          rows={rows}
          rowKey={(g) => g.id}
          searchText={(g) => `${g.subject_name} ${g.component_name} ${g.teacher_name}`}
          searchPlaceholder={t('student.grades.searchPlaceholder')}
          emptyText={t('student.grades.empty')}
          toolbar={
            <select className="input sm:max-w-52" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label={t('common.group')}>
              <option value="">{t('student.grades.allGroups')}</option>
              {data.groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  {g.group_name}
                </option>
              ))}
            </select>
          }
          columns={[
            { header: t('common.date'), cell: (g) => formatDate(g.date) },
            { header: t('common.subject'), cell: (g) => g.subject_name },
            { header: t('student.grades.part'), cell: (g) => g.component_name },
            {
              header: t('common.score'),
              cell: (g) => (
                <Badge tone={scoreTone(percentOf(g.score, g.max_score))}>
                  {fmtScore(g.score)} / {g.max_score}
                </Badge>
              ),
            },
            { header: t('common.teacher'), cell: (g) => g.teacher_name },
            { header: t('common.comment'), cell: (g) => <span className="text-slate-500">{g.comment || '—'}</span> },
          ]}
        />
      </div>
    </div>
  );
}
