import { FormEvent, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getErrorMessage, post, put } from '../../api/client';
import ErrorBox from '../../components/ErrorBox';
import FormField from '../../components/FormField';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { t } from '../../i18n';
import type { Group, HomeworkItem } from '../../types';
import { todayStr } from '../../utils/format';

interface Props {
  open: boolean;
  groups: Group[];
  presetGroupId?: number | null;
  homework?: HomeworkItem | null;
  onClose: () => void;
  onSaved: (id: number) => void;
}

export default function HomeworkFormModal({ open, groups, presetGroupId, homework, onClose, onSaved }: Props) {
  const toast = useToast();
  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(todayStr());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGroupId(homework ? String(homework.group_id) : presetGroupId ? String(presetGroupId) : groups.length === 1 ? String(groups[0].id) : '');
    setTitle(homework?.title ?? '');
    setDescription(homework?.description ?? '');
    setDueDate(homework?.due_date.slice(0, 10) ?? todayStr());
    setErrors({});
    setServerError('');
  }, [open, homework, presetGroupId, groups]);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!groupId) e.group = t('hw.form.pickGroup');
    if (title.trim().length < 2) e.title = t('hw.form.titleRequired');
    if (!dueDate) e.dueDate = t('hw.form.dueRequired');
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setServerError('');
    try {
      const body = { title: title.trim(), description: description.trim() || null, dueDate };
      if (homework) {
        await put(`/homework/${homework.id}`, body);
        toast.success(t('hw.form.updated'));
        onSaved(homework.id);
      } else {
        const r = await post<{ id: number }>('/homework', { ...body, groupId: Number(groupId) });
        toast.success(t('hw.form.created'));
        onSaved(r.id);
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={homework ? t('hw.form.editTitle') : t('hw.form.createTitle')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ErrorBox message={serverError} />
        <FormField label={t('common.group')} error={errors.group}>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!!homework}>
            <option value="">{t('hw.form.selectGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.subject_name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t('hw.form.title')} error={errors.title}>
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <FormField label={t('hw.form.description')}>
          <textarea className="input min-h-[110px]" value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label={t('hw.form.due')} error={errors.dueDate}>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
