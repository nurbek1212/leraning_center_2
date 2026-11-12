import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, Loader2, Plus } from 'lucide-react';
import { del, getErrorMessage, post, put } from '../../api/client';
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
import type { Subject } from '../../types';
import { t } from '../../i18n';

interface FormState {
  name: string;
  description: string;
}

function SubjectForm({
  subject,
  onClose,
  onSaved,
}: {
  subject: Subject | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ name: '', description: '' });
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: subject?.name || '', description: subject?.description || '' });
    setErrors({});
    setServerError('');
  }, [subject]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: t('admin.subjects.nameTooShort') });
      return;
    }
    setSaving(true);
    setServerError('');
    try {
      const body = { name: form.name.trim(), description: form.description.trim() || null };
      if (subject) await put(`/subjects/${subject.id}`, body);
      else await post('/subjects', body);
      toast.success(subject ? t('admin.subjects.updated') : t('admin.subjects.added'));
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
      <FormField label={t('admin.subjects.nameLabel')} error={errors.name}>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label={t('common.description')}>
        <textarea
          className="input min-h-24"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
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

export default function Subjects() {
  const toast = useToast();
  const list = usePagedList<Subject>('/subjects');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: Subject) => {
    setEditing(s);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await del(`/subjects/${deleting.id}`);
      toast.success(t('admin.subjects.deleted'));
      setDeleting(null);
      list.reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorBox message={list.error} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.searchInput} onChange={list.setSearchInput} placeholder={t('admin.subjects.searchPlaceholder')} />
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> {t('admin.subjects.add')}
          </button>
        </div>
        <DataTable
          loading={list.loading}
          rows={list.items}
          rowKey={(s) => s.id}
          columns={[
            { header: '#', cell: (s) => s.id, className: 'w-16' },
            { header: t('common.name'), cell: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
            { header: t('common.description'), cell: (s) => s.description || '—' },
            {
              header: t('common.actions'),
              className: 'w-64 text-right',
              cell: (s) => (
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/admin/subjects/${s.id}/topics`} className="btn-secondary !px-3 !py-1.5 !text-xs">
                    <Library size={14} /> {t('admin.subjects.topics')}
                  </Link>
                  <RowActions onEdit={() => openEdit(s)} onDelete={() => setDeleting(s)} />
                </div>
              ),
            },
          ]}
        />
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          limit={list.limit}
          onChange={list.setPage}
        />
      </div>

      <Modal open={modalOpen} title={editing ? t('admin.subjects.modalEdit') : t('admin.subjects.modalNew')} onClose={() => setModalOpen(false)}>
        <SubjectForm
          subject={editing}
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
        message={t('admin.subjects.confirmDelete', { name: deleting?.name ?? '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
