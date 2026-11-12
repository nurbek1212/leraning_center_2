import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TopicsManager from '../../components/TopicsManager';
import { t } from '../../i18n';

export default function SubjectTopics() {
  const { subjectId } = useParams();
  const id = Number(subjectId);
  if (!Number.isInteger(id) || id <= 0) return <p className="text-sm text-slate-500">{t('materials.subjectNotFound')}</p>;

  return (
    <div className="space-y-4">
      <Link to="/admin/subjects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> {t('materials.backToSubjects')}
      </Link>
      <TopicsManager key={id} subjectId={id} />
    </div>
  );
}
