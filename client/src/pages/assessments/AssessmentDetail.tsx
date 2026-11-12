import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCheck, Lock, Pencil, Play, Send, Timer, Trash2 } from 'lucide-react';
import { del, getErrorMessage, post } from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorBox from '../../components/ErrorBox';
import Spinner from '../../components/Spinner';
import Tabs from '../../components/Tabs';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { AssessmentDetail as Detail, AssessmentResultRow, AssessmentStatus, Group } from '../../types';
import { formatDate } from '../../utils/format';
import AssessmentFormModal from './AssessmentFormModal';
import QuestionEditor from './QuestionEditor';
import ResultsTable from './ResultsTable';
import { FormatBadge, StageBadge, StatusBadge } from './shared';

export default function AssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const detail = useFetch<Detail>(`/assessments/${id}`);
  const results = useFetch<AssessmentResultRow[]>(`/assessments/${id}/results`);
  const groups = useFetch<Group[]>('/groups/my');
  const [tab, setTab] = useState<'results' | 'questions'>('results');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);

  if (detail.loading) return <Spinner />;
  if (detail.error || !detail.data) return <ErrorBox message={detail.error || t('assess.d.notFound')} />;
  const a = detail.data;
  const isTest = a.format === 'test';

  const reloadAll = () => {
    detail.reload();
    results.reload();
  };

  const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: AssessmentStatus, msg: string) => run(() => post(`/assessments/${a.id}/status`, { status }), msg);

  const accept = async () => {
    setBusy(true);
    try {
      const r = await post<{ updated: number }>(`/assessments/${a.id}/results/accept-suggested`);
      toast.success(t('assess.d.accepted', { n: r.updated }));
      reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const postGrades = async () => {
    setBusy(true);
    try {
      const r = await post<{ posted: number }>(`/assessments/${a.id}/post-grades`);
      toast.success(t('assess.d.posted', { n: r.posted }));
      reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await del(`/assessments/${a.id}`);
      toast.success(t('common.deleted'));
      navigate('/teacher/assessments', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/teacher/assessments" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StageBadge stage={a.stage} />
              <FormatBadge format={a.format} />
              <StatusBadge status={a.status} />
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">{a.title}</h2>
            <p className="text-sm text-brand-600">
              {a.group_name} · {a.subject_name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> {t('common.edit')}
            </button>
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> {t('common.delete')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} /> {formatDate(a.held_at)}
          </span>
          <span>{t('assess.maxScoreValue', { max: a.max_score })}</span>
          {a.duration_minutes && (
            <span className="flex items-center gap-1.5">
              <Timer size={15} /> {t('assess.minutes', { n: a.duration_minutes })}
            </span>
          )}
          <span>
            {t('assess.d.component')}: {a.component_name ?? t('assess.d.noComponent')}
          </span>
        </div>
        {a.description && <p className="whitespace-pre-line text-sm text-slate-600">{a.description}</p>}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {a.status !== 'open' && (
            <button className="btn-primary" disabled={busy} onClick={() => setStatus('open', t('assess.d.opened'))}>
              <Play size={16} /> {a.status === 'closed' ? t('assess.d.reopen') : t('assess.d.open')}
            </button>
          )}
          {a.status === 'open' && (
            <button className="btn-secondary" disabled={busy} onClick={() => setStatus('closed', t('assess.d.closed'))}>
              <Lock size={16} /> {t('assess.d.close')}
            </button>
          )}
          {isTest && a.status !== 'draft' && (
            <button className="btn-secondary" disabled={busy} onClick={accept}>
              <CheckCheck size={16} /> {t('assess.d.acceptSuggested')}
            </button>
          )}
          <button className="btn-secondary" disabled={busy || !a.component_id} title={a.component_id ? undefined : t('assess.d.linkFirst')} onClick={postGrades}>
            <Send size={16} /> {t('assess.d.postGrades')}
          </button>
        </div>
        {isTest && a.status === 'draft' && <p className="text-xs text-slate-500">{t('assess.d.draftHint')}</p>}
        {isTest && <p className="text-xs text-slate-400">{t('assess.d.autoHint')}</p>}
      </div>

      {isTest && (
        <Tabs
          tabs={[
            { key: 'results', label: t('assess.tab.results') },
            { key: 'questions', label: t('assess.tab.questions', { n: a.questions.length }) },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      {(!isTest || tab === 'results') &&
        (results.loading ? (
          <Spinner />
        ) : results.error ? (
          <ErrorBox message={results.error} />
        ) : a.status === 'draft' ? (
          <p className="text-sm text-slate-500">{t('assess.d.openToScore')}</p>
        ) : (
          <ResultsTable assessmentId={a.id} format={a.format} maxScore={a.max_score} rows={results.data ?? []} canScore onChanged={reloadAll} />
        ))}

      {isTest && tab === 'questions' && (
        <QuestionEditor
          key={editorVersion}
          assessmentId={a.id}
          initial={a.questions}
          locked={a.has_attempts}
          onSaved={() => {
            setEditorVersion((v) => v + 1);
            reloadAll();
          }}
        />
      )}

      <AssessmentFormModal
        open={editing}
        groups={groups.data ?? []}
        assessment={a}
        formatLocked={a.has_attempts}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reloadAll();
        }}
      />
      <ConfirmDialog open={confirmDelete} message={t('assess.d.deleteConfirm')} loading={busy} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
