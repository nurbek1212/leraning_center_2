import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { getErrorMessage, put } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import { useToast } from '../../context/ToastContext';
import { t } from '../../i18n';
import type { AssessmentQuestion } from '../../types';

interface Props {
  assessmentId: number;
  initial: AssessmentQuestion[];
  locked: boolean;
  onSaved: () => void;
}

const blank = (): AssessmentQuestion => ({
  text: '',
  options: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
});

// Test savollarini tahrirlash: har savolda bitta to'g'ri javob
export default function QuestionEditor({ assessmentId, initial, locked, onSaved }: Props) {
  const toast = useToast();
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(() =>
    initial.map((q) => ({ text: q.text, options: q.options.map((o) => ({ text: o.text, is_correct: !!o.is_correct })) }))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const patch = (qi: number, fn: (q: AssessmentQuestion) => AssessmentQuestion) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? fn(q) : q)));

  const save = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const filled = q.options.filter((o) => o.text.trim());
      if (!q.text.trim()) return setError(t('assess.q.errText', { n: i + 1 }));
      if (filled.length < 2) return setError(t('assess.q.errOptions', { n: i + 1 }));
      if (!q.options.some((o) => o.is_correct && o.text.trim())) return setError(t('assess.q.errCorrect', { n: i + 1 }));
    }
    setError('');
    setSaving(true);
    try {
      const payload = questions.map((q) => ({
        text: q.text.trim(),
        options: q.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), isCorrect: !!o.is_correct })),
      }));
      await put(`/assessments/${assessmentId}/questions`, { questions: payload });
      toast.success(t('assess.q.saved'));
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {locked && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{t('assess.q.locked')}</p>}
      <ErrorBox message={error} />
      {questions.length === 0 && <p className="text-sm text-slate-500">{t('assess.q.none')}</p>}
      {questions.map((q, qi) => (
        <div key={qi} className="card space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-2 text-sm font-semibold text-slate-400">{qi + 1}.</span>
            <textarea
              className="input min-h-[60px] flex-1"
              placeholder={t('assess.q.textPlaceholder')}
              value={q.text}
              disabled={locked}
              maxLength={2000}
              onChange={(e) => patch(qi, (x) => ({ ...x, text: e.target.value }))}
            />
            {!locked && (
              <button className="icon-btn" aria-label={t('common.delete')} onClick={() => setQuestions((p) => p.filter((_, i) => i !== qi))}>
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <div className="space-y-2 pl-7">
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={!!o.is_correct}
                  disabled={locked}
                  title={t('assess.q.markCorrect')}
                  aria-label={t('assess.q.markCorrect')}
                  onChange={() => patch(qi, (x) => ({ ...x, options: x.options.map((p, k) => ({ ...p, is_correct: k === oi })) }))}
                />
                <input
                  className="input flex-1"
                  placeholder={t('assess.q.optionPlaceholder', { n: oi + 1 })}
                  value={o.text}
                  disabled={locked}
                  maxLength={500}
                  onChange={(e) => patch(qi, (x) => ({ ...x, options: x.options.map((p, k) => (k === oi ? { ...p, text: e.target.value } : p)) }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setQuestions((p) => [...p, blank()])} disabled={questions.length >= 100}>
            <Plus size={16} /> {t('assess.q.add')}
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {t('assess.q.save')}
          </button>
        </div>
      )}
    </div>
  );
}
