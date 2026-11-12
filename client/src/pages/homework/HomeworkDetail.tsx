import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, Loader2, Pencil, Trash2 } from 'lucide-react';
import { del, getErrorMessage, put } from '../../api/client';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { Group, HomeworkDetail as Detail, HomeworkSubmissionRow } from '../../types';
import { formatDate } from '../../utils/format';
import HomeworkFormModal from './HomeworkFormModal';

function SubmissionCard({ hwId, s, onChanged }: { hwId: number; s: HomeworkSubmissionRow; onChanged: () => void }) {
  const toast = useToast();
  const [feedback, setFeedback] = useState(s.feedback ?? '');
  const [score, setScore] = useState(s.score === null ? '' : String(s.score));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const value = score.trim() === '' ? null : Number(score);
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100)) return toast.error(t('hw.d.scoreInvalid'));
    setBusy(true);
    try {
      await put(`/homework/${hwId}/submissions/${s.student_id}`, { feedback: feedback.trim() || null, score: value });
      toast.success(t('hw.d.reviewed'));
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-900">{s.full_name}</p>
        {!s.submitted_at ? (
          <Badge tone="red">{t('hw.d.notSubmitted')}</Badge>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {s.late && <Badge tone="amber">{t('hw.d.late')}</Badge>}
            {s.reviewed_at ? <Badge tone="green">{t('hw.d.reviewedBadge')}</Badge> : <Badge tone="blue">{t('hw.d.toReview')}</Badge>}
          </div>
        )}
      </div>
      {s.submitted_at && (
        <>
          <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{s.content}</p>
          <div className="flex flex-wrap items-end gap-3">
            <input className="input min-w-[12rem] flex-1" placeholder={t('hw.d.feedback')} value={feedback} maxLength={500} onChange={(e) => setFeedback(e.target.value)} />
            <input className="input w-24" type="number" min={0} max={100} placeholder={t('hw.d.score')} value={score} onChange={(e) => setScore(e.target.value)} />
            <button className="btn-primary" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t('hw.d.markReviewed')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function HomeworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const detail = useFetch<Detail>(`/homework/${id}`);
  const groups = useFetch<Group[]>('/groups/my');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (detail.loading && !detail.data) return <Spinner />;
  if (detail.error || !detail.data) return <ErrorBox message={detail.error || t('hw.d.notFound')} />;
  const h = detail.data;

  const remove = async () => {
    setBusy(true);
    try {
      await del(`/homework/${h.id}`);
      toast.success(t('common.deleted'));
      navigate('/teacher/homework', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/teacher/homework" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>
      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-brand-600">
              {h.group_name} · {h.subject_name}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{h.title}</h2>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> {t('common.edit')}
            </button>
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> {t('common.delete')}
            </button>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <CalendarDays size={15} /> {t('hw.dueOn', { date: formatDate(h.due_date) })}
        </p>
        {h.description && <p className="whitespace-pre-line text-sm text-slate-600">{h.description}</p>}
      </div>

      <h3 className="text-base font-semibold text-slate-900">{t('hw.d.submissions')}</h3>
      {h.submissions.length === 0 ? (
        <p className="text-sm text-slate-500">{t('hw.d.noStudents')}</p>
      ) : (
        <div className="space-y-3">
          {h.submissions.map((s) => (
            <SubmissionCard key={`${s.student_id}-${s.reviewed_at}-${s.submitted_at}`} hwId={h.id} s={s} onChanged={detail.reload} />
          ))}
        </div>
      )}

      <HomeworkFormModal
        open={editing}
        groups={groups.data ?? []}
        homework={h}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          detail.reload();
        }}
      />
      <ConfirmDialog open={confirmDelete} message={t('hw.d.deleteConfirm')} loading={busy} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
