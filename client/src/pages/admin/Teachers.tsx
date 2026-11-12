import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { del, get, getErrorMessage, post, put } from '../../api/client';
import Badge from '../../components/Badge';
import TagInput from '../../components/TagInput';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import ErrorBox from '../../components/ErrorBox';
import FormField from '../../components/FormField';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import RowActions from '../../components/RowActions';
import SearchInput from '../../components/SearchInput';
import { useToast } from '../../context/ToastContext';
import { usePagedList } from '../../hooks/usePagedList';
import type { Paged, Subject, Teacher } from '../../types';
import { isEmail } from '../../utils/format';
import { t } from '../../i18n';

interface FormState {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  subjectNames: string[];
}

type Errors = Partial<Record<'full_name' | 'email' | 'password', string>>;

function TeacherForm({
  teacher,
  subjects,
  onClose,
  onSaved,
}: {
  teacher: Teacher | null;
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ full_name: '', email: '', password: '', phone: '', subjectNames: [] });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: teacher?.full_name || '',
      email: teacher?.email || '',
      password: '',
      phone: teacher?.phone || '',
      subjectNames: teacher?.subjects.map((s) => s.name) || [],
    });
    setErrors({});
    setServerError('');
  }, [teacher]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.full_name.trim().length < 2) e.full_name = t('admin.teachers.nameTooShort');
    if (!isEmail(form.email)) e.email = t('admin.teachers.emailInvalid');
    if (!teacher && form.password.length < 6) e.password = t('admin.teachers.passwordTooShort');
    if (teacher && form.password && form.password.length < 6) e.password = t('admin.teachers.passwordTooShort');
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    setServerError('');
    try {
      const body = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        subjectNames: form.subjectNames,
      };
      if (teacher) await put(`/teachers/${teacher.id}`, body);
      else await post('/teachers', body);
      toast.success(teacher ? t('admin.teachers.updated') : t('admin.teachers.added'));
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBox message={serverError} />
      <FormField label={t('common.fullName')} error={errors.full_name}>
        <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('common.email')} error={errors.email}>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label={t('common.phone')}>
          <input className="input" value={form.phone} placeholder="+998901234567" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
      </div>
      <FormField
        label={teacher ? t('admin.teachers.newPassword') : t('common.password')}
        error={errors.password}
        hint={teacher ? t('admin.teachers.passwordKeepHint') : t('admin.teachers.passwordMinHint')}
      >
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </FormField>
      <FormField label={t('admin.teachers.subjectsLabel')} hint={t('admin.teachers.subjectsHint')}>
        <TagInput
          value={form.subjectNames}
          onChange={(subjectNames) => setForm({ ...form, subjectNames })}
          suggestions={subjects.map((s) => s.name)}
          placeholder={t('admin.teachers.subjectsPlaceholder')}
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t('common.save')}
        </button>
      </div>
    </form>
  );
}

export default function Teachers() {
  const toast = useToast();
  const list = usePagedList<Teacher>('/teachers');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    get<Paged<Subject>>('/subjects', { limit: 1000 })
      .then((d) => setSubjects(d.items))
      .catch((e) => toast.error(getErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await del(`/teachers/${deleting.id}`);
      toast.success(t('admin.teachers.deleted'));
      list.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBox message={list.error} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.searchInput} onChange={list.setSearchInput} placeholder={t('admin.teachers.searchPlaceholder')} />
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> {t('admin.teachers.add')}
          </button>
        </div>
        <DataTable
          loading={list.loading}
          rows={list.items}
          rowKey={(t) => t.id}
          columns={[
            { header: t('admin.teachers.colName'), cell: (t) => <span className="font-medium text-slate-900">{t.full_name}</span> },
            { header: t('common.email'), cell: (t) => t.email },
            { header: t('common.phone'), cell: (t) => t.phone || '—' },
            {
              header: t('admin.teachers.colSubjects'),
              cell: (t) =>
                t.subjects.length ? (
                  <div className="flex flex-wrap gap-1">
                    {t.subjects.map((s) => (
                      <Badge key={s.id} tone="blue">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  '—'
                ),
            },
            {
              header: t('common.actions'),
              className: 'w-28 text-right',
              cell: (t) => (
                <RowActions
                  onEdit={() => {
                    setEditing(t);
                    setModalOpen(true);
                  }}
                  onDelete={() => setDeleting(t)}
                />
              ),
            },
          ]}
        />
        <Pagination page={list.page} totalPages={list.totalPages} total={list.total} limit={list.limit} onChange={list.setPage} />
      </div>

      <Modal open={modalOpen} title={editing ? t('admin.teachers.modalEdit') : t('admin.teachers.modalNew')} onClose={() => setModalOpen(false)}>
        <TeacherForm
          teacher={editing}
          subjects={subjects}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            list.reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        loading={deleteBusy}
        message={t('admin.teachers.confirmDelete', { name: deleting?.full_name ?? '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
