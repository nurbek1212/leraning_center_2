import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { del, getErrorMessage, post, put } from '../../api/client';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorBox from '../../components/ErrorBox';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import type { SchemeDetail } from '../../types';
import { t } from '../../i18n';

interface Row {
  key: string;
  id?: number;
  name: string;
  maxScore: string;
  isExam: boolean;
  grade_count: number;
  max_used: number;
}

let counter = 0;
const newKey = () => `n${++counter}`;

export default function GradingEditor() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, setData } = useFetch<SchemeDetail>(`/grading-schemes/${subjectId}`);

  const [rows, setRows] = useState<Row[]>([]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'publish' | 'unpublish' | 'delete'>('');
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Serverdan kelgan ma'lumot bo'yicha forma to'ldiriladi
  const load = (d: SchemeDetail) => {
    setRows(
      d.components.map((c) => ({
        key: `c${c.id}`,
        id: c.id,
        name: c.name,
        maxScore: String(c.max_score),
        isExam: !!c.is_exam,
        grade_count: c.grade_count,
        max_used: c.max_used,
      }))
    );
    setDescription(d.scheme?.description ?? '');
  };
  useEffect(() => {
    if (data) load(data);
  }, [data]);

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.maxScore) || 0), 0), [rows]);
  const published = data?.scheme?.status === 'published';
  const exists = !!data?.scheme;

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('grading.list.notLoaded')} />;

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = (isExam = false) =>
    setRows((rs) => [...rs, { key: newKey(), name: isExam ? t('grading.editor.exam') : '', maxScore: '', isExam, grade_count: 0, max_used: 0 }]);

  // Brauzerda tezkor tekshiruv (asosiy tekshiruv serverda)
  const validate = (): string => {
    if (!rows.length) return t('grading.editor.vNone');
    const names = new Set<string>();
    for (const r of rows) {
      const name = r.name.trim();
      const max = Number(r.maxScore);
      if (name.length < 2) return t('grading.editor.vNameLen');
      if (names.has(name.toLowerCase())) return t('grading.editor.vDup', { name });
      names.add(name.toLowerCase());
      if (!Number.isInteger(max) || max < 1) return t('grading.editor.vInt', { name });
      if (r.grade_count > 0 && max < r.max_used) return t('grading.editor.vBelowUsed', { name, used: r.max_used });
    }
    if (total > 100) return t('grading.editor.vOver', { total });
    return '';
  };

  const body = () => ({
    description: description.trim() || null,
    components: rows.map((r) => ({ id: r.id, name: r.name.trim(), maxScore: Number(r.maxScore), isExam: r.isExam })),
  });

  const run = async (kind: typeof busy, fn: () => Promise<SchemeDetail | null>, okMsg: string) => {
    setBusy(kind);
    setFormError('');
    try {
      const next = await fn();
      if (next) setData(next);
      toast.success(okMsg);
      return true;
    } catch (err) {
      setFormError(getErrorMessage(err));
      return false;
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    const v = validate();
    if (v) return setFormError(v);
    await run('save', () => put<SchemeDetail>(`/grading-schemes/${subjectId}`, body()), t('common.saved'));
  };

  const publish = async () => {
    const v = validate();
    if (v) return setFormError(v);
    if (total !== 100) return setFormError(t('grading.editor.vPublish', { total }));
    // Avval saqlanadi, keyin e'lon qilinadi
    setBusy('publish');
    setFormError('');
    try {
      await put<SchemeDetail>(`/grading-schemes/${subjectId}`, body());
      const next = await post<SchemeDetail>(`/grading-schemes/${subjectId}/publish`);
      setData(next);
      toast.success(t('grading.editor.toastPublished'));
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const unpublish = () => run('unpublish', () => post<SchemeDetail>(`/grading-schemes/${subjectId}/unpublish`), t('grading.editor.toastUnpublished'));

  const remove = async () => {
    setBusy('delete');
    try {
      await del(`/grading-schemes/${subjectId}`);
      toast.success(t('grading.editor.toastDeleted'));
      navigate('/admin/grading', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirmDelete(false);
    } finally {
      setBusy('');
    }
  };

  const left = 100 - total;
  const working = busy !== '';

  return (
    <div className="space-y-5">
      <Link to="/admin/grading" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> {t('grading.editor.allSubjects')}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{data.subject.name}</h2>
        {!exists ? <Badge tone="gray">{t('grading.editor.newScheme')}</Badge> : published ? <Badge tone="green" dot>{t('grading.status.published')}</Badge> : <Badge tone="amber" dot>{t('grading.status.draft')}</Badge>}
      </div>

      {published && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t('grading.editor.publishedNote')}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t('grading.editor.partsTitle')}</h3>
            <div className="flex gap-2">
              <button className="btn-secondary !py-2" onClick={() => addRow(false)} disabled={working}>
                <Plus size={16} /> {t('grading.editor.addPart')}
              </button>
              <button className="btn-secondary !py-2" onClick={() => addRow(true)} disabled={working}>
                <Plus size={16} /> {t('grading.editor.exam')}
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
              {t('grading.editor.empty')}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_6.5rem_5.5rem_2.5rem] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
                <span>{t('common.name')}</span>
                <span>{t('common.score')}</span>
                <span>{t('grading.editor.exam')}</span>
                <span />
              </div>
              {rows.map((r) => (
                <div key={r.key} className="grid grid-cols-[1fr_5.5rem] items-center gap-3 rounded-xl bg-slate-50 p-2 sm:grid-cols-[1fr_6.5rem_5.5rem_2.5rem]">
                  <input
                    className="input"
                    placeholder={t('grading.editor.namePlaceholder')}
                    value={r.name}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    aria-label={t('grading.editor.nameAria')}
                  />
                  <input
                    className="input tabular"
                    inputMode="numeric"
                    placeholder="0"
                    value={r.maxScore}
                    onChange={(e) => update(r.key, { maxScore: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    aria-label={t('grading.editor.maxAria')}
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-brand"
                      checked={r.isExam}
                      onChange={(e) => update(r.key, { isExam: e.target.checked })}
                    />
                    {t('grading.editor.exam')}
                  </label>
                  <button
                    className="icon-btn justify-self-end hover:!bg-rose-50 hover:!text-rose-600 disabled:opacity-30"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    disabled={r.grade_count > 0 || working}
                    title={r.grade_count > 0 ? t('grading.editor.deleteLocked', { n: r.grade_count }) : t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                  {r.grade_count > 0 && (
                    <p className="col-span-full -mt-1 px-1 text-xs text-slate-400">
                      {t('grading.editor.gradesInfo', { n: r.grade_count, max: r.max_used })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('grading.editor.commentLabel')}</label>
            <textarea
              className="input min-h-20"
              maxLength={500}
              placeholder={t('grading.editor.commentPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card flex flex-col items-center p-5">
            <ScoreRing value={total} max={100} size={132} caption="/ 100" />
            <p className={`mt-3 text-sm font-medium ${left === 0 ? 'text-emerald-600' : left < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {left === 0 ? t('grading.editor.allocated') : left > 0 ? t('grading.editor.unallocated', { n: left }) : t('grading.editor.excess', { n: -left })}
            </p>
          </div>

          <div className="card space-y-2.5 p-5">
            <ErrorBox message={formError} />
            <button className="btn-secondary w-full" onClick={save} disabled={working}>
              {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {published ? t('common.save') : t('grading.editor.saveDraft')}
            </button>
            {!published && (
              <button className="btn-primary w-full" onClick={publish} disabled={working || total !== 100}>
                {busy === 'publish' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t('grading.editor.publish')}
              </button>
            )}
            {!published && total !== 100 && <p className="text-xs text-slate-400">{t('grading.editor.publishHint')}</p>}
            {published && (
              <button className="btn-secondary w-full" onClick={unpublish} disabled={working}>
                {busy === 'unpublish' ? <Loader2 size={16} className="animate-spin" /> : <EyeOff size={16} />}
                {t('grading.editor.unpublish')}
              </button>
            )}
            {exists && (
              <button className="btn-ghost w-full !text-rose-600 hover:!bg-rose-50" onClick={() => setConfirmDelete(true)} disabled={working}>
                <Trash2 size={16} /> {t('grading.editor.deleteScheme')}
              </button>
            )}
          </div>

          {!published && (
            <p className="flex items-start gap-2 px-1 text-xs text-slate-400">
              <Eye size={14} className="mt-0.5 shrink-0" /> {t('grading.editor.draftHint')}
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        loading={busy === 'delete'}
        message={t('grading.editor.confirmDelete')}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
