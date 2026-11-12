import { useState } from 'react';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import { del, getErrorMessage, put } from '../../api/client';
import Badge from '../../components/Badge';
import { useToast } from '../../context/ToastContext';
import { t } from '../../i18n';
import type { AssessmentFormat, AssessmentResultRow } from '../../types';

interface Props {
  assessmentId: number;
  format: AssessmentFormat;
  maxScore: number;
  rows: AssessmentResultRow[];
  canScore: boolean;
  onChanged: () => void;
}

function Row({ row, assessmentId, format, maxScore, canScore, onChanged }: Omit<Props, 'rows'> & { row: AssessmentResultRow }) {
  const toast = useToast();
  const [score, setScore] = useState(row.score === null ? '' : String(row.score));
  const [comment, setComment] = useState(row.comment ?? '');
  const [busy, setBusy] = useState(false);
  const dirty = score !== (row.score === null ? '' : String(row.score)) || comment !== (row.comment ?? '');

  const save = async () => {
    const value = Number(score);
    if (score.trim() === '' || !Number.isInteger(value) || value < 0) return toast.error(t('assess.res.scoreInt'));
    if (value > maxScore) return toast.error(t('assess.res.scoreMax', { max: maxScore }));
    setBusy(true);
    try {
      await put(`/assessments/${assessmentId}/results/${row.student_id}`, { score: value, comment: comment.trim() || null });
      toast.success(t('assess.res.saved'));
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await del(`/assessments/${assessmentId}/results/${row.student_id}`);
      toast.success(t('assess.res.resetDone'));
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  let state = <Badge>{t('assess.res.notStarted')}</Badge>;
  if (row.submitted_at) state = <Badge tone="green">{t('assess.res.submitted')}</Badge>;
  else if (row.started_at) state = <Badge tone="amber">{t('assess.res.inProgress')}</Badge>;
  else if (format !== 'test' && row.score !== null) state = <Badge tone="blue">{t('assess.res.scored')}</Badge>;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="td font-medium text-slate-900">{row.full_name}</td>
      {format === 'test' && (
        <>
          <td className="td">{state}</td>
          <td className="td tabular">
            {row.submitted_at && row.total_questions ? `${row.correct_count}/${row.total_questions}` : '—'}
            {row.submitted_at && row.total_questions ? (
              <span className="ml-1 text-xs text-slate-400">({Math.round(((row.correct_count ?? 0) / row.total_questions) * 100)}%)</span>
            ) : null}
          </td>
        </>
      )}
      <td className="td">
        <div className="flex items-center gap-1.5">
          <input
            className="input w-20 py-1.5"
            type="number"
            min={0}
            max={maxScore}
            value={score}
            disabled={!canScore || busy}
            aria-label={t('assess.res.score')}
            onChange={(e) => setScore(e.target.value)}
          />
          <span className="text-xs text-slate-400">/ {maxScore}</span>
        </div>
      </td>
      <td className="td">
        <input
          className="input min-w-[10rem] py-1.5"
          value={comment}
          maxLength={255}
          disabled={!canScore || busy}
          aria-label={t('common.comment')}
          onChange={(e) => setComment(e.target.value)}
        />
      </td>
      <td className="td">
        <div className="flex items-center justify-end gap-1">
          {row.posted && <Badge tone="blue">{t('assess.res.posted')}</Badge>}
          {canScore && dirty && (
            <button className="btn-primary px-3 py-1.5" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {t('common.save')}
            </button>
          )}
          {format === 'test' && row.started_at && (
            <button className="icon-btn" title={t('assess.res.reset')} aria-label={t('assess.res.reset')} onClick={reset} disabled={busy}>
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ResultsTable({ rows, ...rest }: Props) {
  if (!rows.length) return <p className="text-sm text-slate-500">{t('assess.res.noStudents')}</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full">
        <thead className="border-b border-slate-100 bg-slate-50/80">
          <tr>
            <th className="th">{t('common.student')}</th>
            {rest.format === 'test' && (
              <>
                <th className="th">{t('assess.res.state')}</th>
                <th className="th">{t('assess.res.correct')}</th>
              </>
            )}
            <th className="th">{t('assess.res.score')}</th>
            <th className="th">{t('common.comment')}</th>
            <th className="th" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={`${r.student_id}-${r.score}-${r.submitted_at}-${r.started_at}`} row={r} {...rest} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
