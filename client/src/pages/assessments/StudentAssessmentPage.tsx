import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, Timer, XCircle } from 'lucide-react';
import { getErrorMessage, post } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { t } from '../../i18n';
import type { MyAssessmentDetail, TakeQuestion } from '../../types';
import { formatDate } from '../../utils/format';
import { FormatBadge, StageBadge } from './shared';
import { MyStateBadge } from './StudentAssessments';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

// Vaqt hisoblagichli test oynasi
function TestRunner({ id, onDone }: { id: number; onDone: () => void }) {
  const toast = useToast();
  const [questions, setQuestions] = useState<TakeQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [left, setLeft] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sent = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const deadline = useRef(0);

  useEffect(() => {
    let cancelled = false;
    post<{ seconds_left: number; questions: TakeQuestion[] }>(`/assessments/my/${id}/start`)
      .then((r) => {
        if (cancelled) return;
        deadline.current = Date.now() + r.seconds_left * 1000;
        setLeft(r.seconds_left);
        setQuestions(r.questions);
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const submit = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSubmitting(true);
    try {
      const payload = Object.entries(answersRef.current).map(([q, o]) => ({ questionId: Number(q), optionId: o }));
      await post(`/assessments/my/${id}/submit`, { answers: payload });
      toast.success(t('assess.take.submitted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      onDone();
    }
  }, [id, onDone, toast]);

  // Vaqt tugasa avtomatik topshiriladi
  useEffect(() => {
    if (!questions) return;
    const timer = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) {
        clearInterval(timer);
        submit();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [questions, submit]);

  if (error) {
    return (
      <div className="space-y-3">
        <ErrorBox message={error} />
        <button className="btn-secondary" onClick={onDone}>
          {t('common.back')}
        </button>
      </div>
    );
  }
  if (!questions) return <Spinner />;

  const answered = Object.keys(answers).length;
  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-card backdrop-blur">
        <span className="text-sm text-slate-600">{t('assess.take.progress', { done: answered, total: questions.length })}</span>
        <span className={`tabular flex items-center gap-1.5 text-lg font-bold ${left <= 60 ? 'text-rose-600' : 'text-slate-900'}`}>
          <Timer size={18} /> {clock(left)}
        </span>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="card space-y-3 p-5">
          <p className="font-medium text-slate-900">
            {i + 1}. {q.text}
          </p>
          <div className="space-y-2">
            {q.options.map((o) => {
              const on = answers[q.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name={`q-${q.id}`} checked={on} onChange={() => setAnswers((p) => ({ ...p, [q.id]: o.id }))} />
                  {o.text}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button className="btn-primary" disabled={submitting} onClick={submit}>
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {t('assess.take.submit')}
        </button>
      </div>
      <p className="text-xs text-slate-400">{t('assess.take.noSave')}</p>
    </div>
  );
}

export default function StudentAssessmentPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<MyAssessmentDetail>(`/assessments/my/${id}`);
  const [taking, setTaking] = useState(false);

  const done = useCallback(() => {
    setTaking(false);
    reload();
  }, [reload]);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('assess.d.notFound')} />;
  const a = data;

  if (taking || (a.format === 'test' && a.started_at && !a.submitted_at && a.status === 'open')) {
    return <TestRunner id={a.id} onDone={done} />;
  }

  const pct = a.total_questions ? Math.round(((a.correct_count ?? 0) / a.total_questions) * 100) : null;
  const canStart = a.format === 'test' && a.status === 'open' && !a.submitted_at;

  return (
    <div className="space-y-5">
      <Link to="/student/assessments" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={a.stage} />
            <FormatBadge format={a.format} />
          </div>
          <MyStateBadge a={a} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{a.title}</h2>
          <p className="text-sm text-brand-600">
            {a.group_name} · {a.subject_name}
          </p>
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
          {a.format === 'test' && <span>{t('assess.my.questions', { n: a.question_count })}</span>}
        </div>
        {a.description && <p className="whitespace-pre-line text-sm text-slate-600">{a.description}</p>}

        {canStart && (
          <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
            <p>{t('assess.my.startInfo', { n: a.duration_minutes ?? 0 })}</p>
            <button className="btn-primary mt-3" onClick={() => setTaking(true)}>
              {a.started_at ? t('assess.my.resume') : t('assess.my.start')}
            </button>
          </div>
        )}
        {a.format === 'test' && !a.submitted_at && a.status === 'closed' && <p className="text-sm text-slate-500">{t('assess.my.closedNoAttempt')}</p>}
        {a.format !== 'test' && a.score === null && <p className="text-sm text-slate-500">{t('assess.my.awaitingTeacher')}</p>}
      </div>

      {a.submitted_at && (
        <div className="card flex flex-wrap items-center gap-5 p-5">
          {a.score !== null && <ScoreRing value={a.score} max={a.max_score} />}
          <div className="space-y-1 text-sm text-slate-600">
            {a.total_questions ? (
              <p>
                {t('assess.my.correctOf', { right: a.correct_count ?? 0, total: a.total_questions })} {pct !== null && `(${pct}%)`}
              </p>
            ) : null}
            {a.score === null && <p>{t('assess.my.waitingScore')}</p>}
          </div>
        </div>
      )}

      {a.format !== 'test' && a.score !== null && (
        <div className="card flex flex-wrap items-center gap-5 p-5">
          <ScoreRing value={a.score} max={a.max_score} />
          {a.comment && <p className="text-sm text-slate-600">{a.comment}</p>}
        </div>
      )}
      {a.format === 'test' && a.score !== null && a.comment && <p className="text-sm text-slate-600">{a.comment}</p>}

      {a.review && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">{t('assess.my.review')}</h3>
          {a.review.map((q, i) => {
            const options = typeof q.options === 'string' ? (JSON.parse(q.options) as typeof q.options) : q.options;
            const right = options.find((o) => o.is_correct)?.id;
            const isRight = q.chosen_option_id === right;
            return (
              <div key={q.question_id} className="card space-y-2 p-4">
                <p className="flex items-start gap-2 font-medium text-slate-900">
                  {isRight ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />}
                  <span>
                    {i + 1}. {q.text}
                  </span>
                </p>
                <ul className="space-y-1 pl-7 text-sm">
                  {options.map((o) => (
                    <li
                      key={o.id}
                      className={o.is_correct ? 'font-medium text-emerald-600' : o.id === q.chosen_option_id ? 'text-rose-600' : 'text-slate-600'}
                    >
                      {o.text}
                      {o.id === q.chosen_option_id && <span className="ml-2 text-xs">({t('assess.my.yourAnswer')})</span>}
                    </li>
                  ))}
                </ul>
                {q.chosen_option_id === null && <p className="pl-7 text-xs text-slate-400">{t('assess.my.unanswered')}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
