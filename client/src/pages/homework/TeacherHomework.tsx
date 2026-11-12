import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, NotebookPen, Plus, Users } from 'lucide-react';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { Group, StaffHomework } from '../../types';
import { formatDate, todayStr } from '../../utils/format';
import HomeworkFormModal from './HomeworkFormModal';

export default function TeacherHomework() {
  const navigate = useNavigate();
  const groupsQ = useFetch<Group[]>('/groups/my');
  const [groupId, setGroupId] = useState('');
  const list = useFetch<StaffHomework[]>('/homework', { groupId });
  const [creating, setCreating] = useState(false);

  if (groupsQ.loading) return <Spinner />;
  if (groupsQ.error) return <ErrorBox message={groupsQ.error} />;
  const groups = groupsQ.data ?? [];
  const today = todayStr();

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
          <Plus size={16} /> {t('hw.create')}
        </button>
      </div>

      {list.error && <ErrorBox message={list.error} />}
      {list.loading ? (
        <Spinner />
      ) : !list.data?.length ? (
        <div className="card">
          <EmptyState icon={<NotebookPen size={26} />} title={t('hw.empty.title')} text={groups.length ? t('hw.empty.text') : t('assess.empty.noGroups')} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((h) => (
            <Link key={h.id} to={`/teacher/homework/${h.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-brand-600">
                  {h.group_name} · {h.subject_name}
                </p>
                {h.due_date.slice(0, 10) < today ? <Badge>{t('hw.deadlinePassed')}</Badge> : <Badge tone="green" dot>{t('hw.active')}</Badge>}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{h.title}</h3>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={15} /> {t('hw.dueOn', { date: formatDate(h.due_date) })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={15} /> {t('hw.submittedOf', { done: h.submitted_count, total: h.student_count })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <HomeworkFormModal
        open={creating}
        groups={groups}
        presetGroupId={groupId ? Number(groupId) : null}
        onClose={() => setCreating(false)}
        onSaved={(id) => {
          setCreating(false);
          navigate(`/teacher/homework/${id}`);
        }}
      />
    </div>
  );
}
