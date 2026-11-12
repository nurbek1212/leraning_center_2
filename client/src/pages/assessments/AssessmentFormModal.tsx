import { FormEvent, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { get, getErrorMessage, post, put } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import FormField from '../../components/FormField';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { t } from '../../i18n';
import type { AssessmentFormat, AssessmentStage, Group } from '../../types';
import { todayStr } from '../../utils/format';

interface ComponentOpt {
  id: number;
  name: string;
  max_score: number;
}

export interface AssessmentFormValues {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  stage: AssessmentStage;
  format: AssessmentFormat;
  component_id: number | null;
  max_score: number;
  held_at: string;
  duration_minutes: number | null;
}

interface Props {
  open: boolean;
  groups: Group[];
  presetGroupId?: number | null;
  assessment?: AssessmentFormValues | null;
  formatLocked?: boolean;
  onClose: () => void;
  onSaved: (id: number) => void;
}

export default function AssessmentFormModal({ open, groups, presetGroupId, assessment, formatLocked, onClose, onSaved }: Props) {
  const toast = useToast();
  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<AssessmentStage>('current');
  const [format, setFormat] = useState<AssessmentFormat>('test');
  const [componentId, setComponentId] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [heldAt, setHeldAt] = useState(todayStr());
  const [duration, setDuration] = useState('30');
  const [components, setComponents] = useState<ComponentOpt[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  // Forma ochilganda boshlang'ich qiymatlar
  useEffect(() => {
    if (!open) return;
    const a = assessment;
    setGroupId(a ? String(a.group_id) : presetGroupId ? String(presetGroupId) : groups.length === 1 ? String(groups[0].id) : '');
    setTitle(a?.title ?? '');
    setDescription(a?.description ?? '');
    setStage(a?.stage ?? 'current');
    setFormat(a?.format ?? 'test');
    setComponentId(a?.component_id ? String(a.component_id) : '');
    setMaxScore(a && !a.component_id ? String(a.max_score) : '');
    setHeldAt(a?.held_at.slice(0, 10) ?? todayStr());
    setDuration(a?.duration_minutes ? String(a.duration_minutes) : '30');
    setErrors({});
    setServerError('');
  }, [open, assessment, presetGroupId, groups]);

  // Tanlangan guruhning e'lon qilingan mezon qismlari
  useEffect(() => {
    if (!open || !groupId) {
      setComponents([]);
      return;
    }
    let cancelled = false;
    get<ComponentOpt[]>('/assessments/components', { groupId })
      .then((c) => !cancelled && setComponents(c))
      .catch(() => !cancelled && setComponents([]));
    return () => {
      cancelled = true;
    };
  }, [open, groupId]);

  const chosen = components.find((c) => String(c.id) === componentId);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!groupId) e.group = t('assess.form.pickGroup');
    if (title.trim().length < 2) e.title = t('assess.form.titleRequired');
    if (!componentId) {
      const m = Number(maxScore);
      if (!Number.isInteger(m) || m < 1 || m > 100) e.maxScore = t('assess.form.maxScoreInvalid');
    }
    if (format === 'test') {
      const d = Number(duration);
      if (!Number.isInteger(d) || d < 1 || d > 300) e.duration = t('assess.form.durationInvalid');
    }
    if (!heldAt) e.heldAt = t('assess.form.dateRequired');
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    setServerError('');
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        stage,
        format,
        componentId: componentId ? Number(componentId) : null,
        maxScore: componentId ? null : Number(maxScore),
        heldAt,
        durationMinutes: format === 'test' ? Number(duration) : null,
      };
      if (assessment) {
        await put(`/assessments/${assessment.id}`, body);
        toast.success(t('assess.form.updated'));
        onSaved(assessment.id);
      } else {
        const r = await post<{ id: number }>('/assessments', { ...body, groupId: Number(groupId) });
        toast.success(t('assess.form.created'));
        onSaved(r.id);
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const stages: AssessmentStage[] = ['current', 'midterm', 'final'];
  const formats: AssessmentFormat[] = ['test', 'written', 'oral'];

  return (
    <Modal open={open} title={assessment ? t('assess.form.editTitle') : t('assess.form.createTitle')} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBox message={serverError} />
        <FormField label={t('common.group')} error={errors.group}>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!!assessment}>
            <option value="">{t('assess.form.selectGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.subject_name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t('assess.form.title')} error={errors.title}>
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('assess.form.stage')}>
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value as AssessmentStage)}>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {t(`assess.stage.${s}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('assess.form.format')} hint={formatLocked ? t('assess.form.formatLocked') : undefined}>
            <select className="input" value={format} disabled={formatLocked} onChange={(e) => setFormat(e.target.value as AssessmentFormat)}>
              {formats.map((f) => (
                <option key={f} value={f}>
                  {t(`assess.format.${f}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('assess.form.component')} hint={t('assess.form.componentHint')}>
            <select className="input" value={componentId} onChange={(e) => setComponentId(e.target.value)}>
              <option value="">{t('assess.form.noComponent')}</option>
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({t('assess.form.max', { max: c.max_score })})
                </option>
              ))}
            </select>
          </FormField>
          {componentId ? (
            <FormField label={t('assess.maxScore')}>
              <input className="input" value={chosen ? chosen.max_score : assessment?.max_score ?? ''} disabled readOnly />
            </FormField>
          ) : (
            <FormField label={t('assess.maxScore')} error={errors.maxScore}>
              <input className="input" type="number" min={1} max={100} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </FormField>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('assess.form.heldAt')} error={errors.heldAt}>
            <input className="input" type="date" value={heldAt} onChange={(e) => setHeldAt(e.target.value)} />
          </FormField>
          {format === 'test' && (
            <FormField label={t('assess.form.duration')} error={errors.duration}>
              <input className="input" type="number" min={1} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </FormField>
          )}
        </div>
        <FormField label={t('assess.form.description')}>
          <textarea className="input min-h-[80px]" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
