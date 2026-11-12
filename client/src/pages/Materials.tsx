import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ErrorBox from '../components/ErrorBox';
import Spinner from '../components/Spinner';
import TopicsManager from '../components/TopicsManager';
import { useFetch } from '../hooks/useFetch';
import type { MySubjectTopics } from '../types';
import { t } from '../i18n';

// Ustoz va talaba uchun: o'z fanlari bo'yicha mavzular va materiallar
export default function Materials() {
  const { data, loading, error } = useFetch<MySubjectTopics[]>('/topics/my');
  const [selected, setSelected] = useState<number | null>(null);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('materials.loadFailed')} />;
  if (data.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<BookOpen size={26} />} title={t('materials.noSubjects')} text={t('materials.noSubjectsText')} />
      </div>
    );
  }

  const current = data.find((s) => s.subject_id === selected) ?? data[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {data.map((s) => (
          <button
            key={s.subject_id}
            role="tab"
            aria-selected={s.subject_id === current.subject_id}
            onClick={() => setSelected(s.subject_id)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              s.subject_id === current.subject_id ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.subject_name}
          </button>
        ))}
      </div>
      <TopicsManager key={current.subject_id} subjectId={current.subject_id} />
    </div>
  );
}
