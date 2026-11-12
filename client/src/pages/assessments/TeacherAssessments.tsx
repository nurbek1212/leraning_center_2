import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, Plus, Users } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { Group, StaffAssessment } from '../../types';
import { formatDate } from '../../utils/format';
import AssessmentFormModal from './AssessmentFormModal';
import { FormatBadge, StageBadge, StatusBadge } from './shared';

export default function TeacherAssessments() {
  const navigate = useNavigate();
  const groupsQ = useFetch<Group[]>('/groups/my');
  const [groupId, setGroupId] = useState('');
  const list = useFetch<StaffAssessment[]>('/assessments', { groupId });
  const [creating, setCreating] = useState(false);

  if (groupsQ.loading) return <Spinner />;
  if (groupsQ.error) return <ErrorBox message={groupsQ.error} />;
  const groups = groupsQ.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select className="input w-full sm:w-64" value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label={t('common.group')}>
          <option value="">{t('assess.allGroups')}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={() => setCreating(true)} disabled={!groups.length}>
          <Plus size={16} /> {t('assess.create')}
        </button>
      </div>

      {list.error && <ErrorBox message={list.error} />}
      {list.loading ? (
        <Spinner />
      ) : !list.data?.length ? (
        <div className="card">
          <EmptyState icon={<ClipboardCheck size={26} />} title={t('assess.empty.title')} text={groups.length ? t('assess.empty.text') : t('assess.empty.noGroups')} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((a) => (
            <Link key={a.id} to={`/teacher/assessments/${a.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={a.stage} />
                <FormatBadge format={a.format} />
                <StatusBadge status={a.status} />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{a.title}</h3>
              <p className="text-sm text-brand-600">
                {a.group_name} · {a.subject_name}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={15} /> {formatDate(a.held_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={15} /> {t('assess.scoredOf', { done: a.scored_count, total: a.student_count })}
                </span>
                <span>{t('assess.maxScoreValue', { max: a.max_score })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AssessmentFormModal
        open={creating}
        groups={groups}
        presetGroupId={groupId ? Number(groupId) : null}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCreating(false);
          navigate(`/teacher/assessments/${id}`);
        }}
      />
    </div>
  );
}
