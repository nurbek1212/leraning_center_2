import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Loader2 } from 'lucide-react';
import { getErrorMessage, put } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { MyHomework } from '../../types';
import { formatDate } from '../../utils/format';
import { HomeworkState } from './StudentHomework';

export default function StudentHomeworkPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<MyHomework>(`/homework/my/${id}`);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setContent(data.content ?? '');
  }, [data]);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('hw.d.notFound')} />;
  const h = data;
  const locked = !!h.reviewed_at;

  const submit = async () => {
    if (!content.trim()) return toast.error(t('hw.my.answerRequired'));
    setSaving(true);
    try {
      await put(`/homework/my/${h.id}/submit`, { content: content.trim() });
      toast.success(t('hw.my.sent'));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/student/homework" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-brand-600">
            {h.group_name} · {h.subject_name}
          </p>
          <HomeworkState h={h} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{h.title}</h2>
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <CalendarDays size={15} /> {t('hw.dueOn', { date: formatDate(h.due_date) })}
        </p>
        {h.description && <p className="whitespace-pre-line text-sm text-slate-600">{h.description}</p>}
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="text-base font-semibold text-slate-900">{t('hw.my.yourAnswer')}</h3>
        <textarea
          className="input min-h-[160px]"
          value={content}
          maxLength={10000}
          disabled={locked}
          placeholder={t('hw.my.answerPlaceholder')}
          onChange={(e) => setContent(e.target.value)}
        />
        {locked ? (
          <p className="text-sm text-slate-500">{t('hw.my.locked')}</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">{t('hw.my.lateNote')}</p>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {h.submitted_at ? t('hw.my.update') : t('hw.my.submit')}
            </button>
          </div>
        )}
      </div>

      {h.reviewed_at && (
        <div className="card space-y-1 p-5">
          <h3 className="text-base font-semibold text-slate-900">{t('hw.my.teacherReview')}</h3>
          {h.score !== null && <p className="tabular text-2xl font-bold text-slate-900">{h.score}</p>}
          {h.feedback ? <p className="text-sm text-slate-600">{h.feedback}</p> : <p className="text-sm text-slate-400">{t('hw.my.noFeedback')}</p>}
        </div>
      )}
    </div>
  );
}
