import { FormEvent, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Download, FileText, Loader2, Plus, Presentation, Trash2, Upload } from 'lucide-react';
import { api, del, getErrorMessage, post, put } from '../api/client';
import Badge from './Badge';
import ConfirmDialog from './ConfirmDialog';
import EmptyState from './EmptyState';
import ErrorBox from './ErrorBox';
import FormField from './FormField';
import Modal from './Modal';
import RowActions from './RowActions';
import Spinner from './Spinner';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import type { Material, MaterialKind, SubjectTopics, Topic } from '../types';
import { ALLOWED_FILE_EXTENSIONS, formatDate, formatFileSize, MAX_FILE_MB, materialKindLabels } from '../utils/format';
import { t } from '../i18n';

// Yuklab olish xatosida javob Blob bo'ladi, matnini o'qib olamiz
async function downloadError(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      /* matn emas */
    }
  }
  return getErrorMessage(err);
}

function KindIcon({ kind }: { kind: MaterialKind }) {
  return kind === 'presentation' ? <Presentation size={18} /> : <FileText size={18} />;
}

function TopicForm({ subjectId, topic, onClose, onSaved }: { subjectId: number; topic: Topic | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(topic?.title ?? '');
  const [description, setDescription] = useState(topic?.description ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return setError(t('materials.topicMinChars'));
    setSaving(true);
    setError('');
    try {
      const body = { title: title.trim(), description: description.trim() || null };
      if (topic) await put(`/topics/${topic.id}`, body);
      else await post(`/topics/subject/${subjectId}`, body);
      toast.success(topic ? t('materials.topicUpdated') : t('materials.topicAdded'));
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBox message={error} />
      <FormField label={t('materials.topicName')}>
        <input className="input" autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('materials.topicPlaceholder')} />
      </FormField>
      <FormField label={t('materials.topicDescription')}>
        <textarea className="input min-h-20" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
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
  );
}

function UploadForm({ topic, onClose, onSaved }: { topic: Topic; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<MaterialKind>('lecture');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setError('');
    if (!f) return setFile(null);
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      setError(t('materials.fileTypeNotAllowed', { list: ALLOWED_FILE_EXTENSIONS.join(', ') }));
      return setFile(null);
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(t('materials.fileTooLarge', { max: MAX_FILE_MB, size: formatFileSize(f.size) }));
      return setFile(null);
    }
    setFile(f);
    // Nom bo'sh bo'lsa, fayl nomidan olinadi
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return setError(t('materials.pickFile'));
    if (title.trim().length < 2) return setError(t('materials.titleMinChars'));
    setSaving(true);
    setError('');
    try {
      await api.post(`/topics/${topic.id}/materials`, file, {
        params: { kind, title: title.trim(), filename: file.name },
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
        timeout: 120000,
      });
      toast.success(t('materials.uploaded'));
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBox message={error} />
      <p className="text-sm text-slate-500">
        {t('materials.topicLabel', { title: topic.title })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('materials.kind')}>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)}>
            {(Object.keys(materialKindLabels) as MaterialKind[]).map((k) => (
              <option key={k} value={k}>
                {materialKindLabels[k]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t('materials.title')}>
          <input className="input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
      </div>
      <FormField label={t('materials.file')} hint={t('materials.fileHint', { list: ALLOWED_FILE_EXTENSIONS.join(', '), max: MAX_FILE_MB })}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left text-sm text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <Upload size={20} className="shrink-0 text-slate-400" />
          {file ? (
            <span>
              <b className="text-slate-800">{file.name}</b> <span className="text-slate-400">({formatFileSize(file.size)})</span>
            </span>
          ) : (
            t('materials.clickToPick')
          )}
        </button>
        <input ref={inputRef} type="file" className="hidden" accept={ALLOWED_FILE_EXTENSIONS.map((e) => `.${e}`).join(',')} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
      </FormField>
      {saving && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn-primary" disabled={saving || !file}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t('materials.uploadBtn')}
        </button>
      </div>
    </form>
  );
}

// Fan ichidagi mavzular ro'yxati, maruza va taqdimotlar.
// Admin/ustoz boshqaradi, talaba faqat ko'radi va yuklab oladi (server ham shuni majburlaydi).
export default function TopicsManager({ subjectId }: { subjectId: number }) {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch<SubjectTopics>(`/topics/subject/${subjectId}`);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [topicForm, setTopicForm] = useState<{ open: boolean; topic: Topic | null }>({ open: false, topic: null });
  const [uploadFor, setUploadFor] = useState<Topic | null>(null);
  const [delTopic, setDelTopic] = useState<Topic | null>(null);
  const [delMaterial, setDelMaterial] = useState<Material | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || t('materials.topicsLoadFailed')} />;

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const download = async (m: Material) => {
    setDownloading(m.id);
    try {
      const res = await api.get<Blob>(`/materials/${m.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = m.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(await downloadError(err));
    } finally {
      setDownloading(null);
    }
  };

  const confirm = async (kind: 'topic' | 'material') => {
    setBusy(true);
    try {
      if (kind === 'topic' && delTopic) await del(`/topics/${delTopic.id}`);
      if (kind === 'material' && delMaterial) await del(`/materials/${delMaterial.id}`);
      toast.success(t('common.deleted'));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
      setDelTopic(null);
      setDelMaterial(null);
    }
  };

  // Admin hamma materialni, ustoz faqat o'zi yuklaganini o'chira oladi
  const canDeleteMaterial = (m: Material) => data.can_manage && (user?.role === 'admin' || m.uploaded_by === user?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{t('materials.topicsCount', { n: data.topics.length })}</p>
        {data.can_manage && (
          <button className="btn-primary" onClick={() => setTopicForm({ open: true, topic: null })}>
            <Plus size={16} /> {t('materials.addTopic')}
          </button>
        )}
      </div>

      {data.topics.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen size={26} />}
            title={t('materials.emptyTitle')}
            text={data.can_manage ? t('materials.emptyManage') : t('materials.emptyView')}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {data.topics.map((tp, i) => {
            const isOpen = open.has(tp.id);
            return (
              <div key={tp.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggle(tp.id)} aria-expanded={isOpen}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{tp.title}</span>
                      <span className="block text-xs text-slate-400">{t('materials.materialsCount', { n: tp.materials.length })}</span>
                    </span>
                    <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {data.can_manage && <RowActions onEdit={() => setTopicForm({ open: true, topic: tp })} onDelete={() => setDelTopic(tp)} />}
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4">
                    {tp.description && <p className="text-sm text-slate-600">{tp.description}</p>}
                    {tp.materials.length === 0 ? (
                      <p className="text-sm text-slate-400">{t('materials.noMaterials')}</p>
                    ) : (
                      <ul className="space-y-2">
                        {tp.materials.map((m) => (
                          <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <KindIcon kind={m.kind} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{m.title}</p>
                              <p className="truncate text-xs text-slate-400">
                                {m.file_name} · {formatFileSize(m.size)} · {formatDate(m.created_at)}
                                {m.uploaded_by_name ? ` · ${m.uploaded_by_name}` : ''}
                              </p>
                            </div>
                            <Badge tone={m.kind === 'presentation' ? 'amber' : m.kind === 'lecture' ? 'blue' : 'gray'}>{materialKindLabels[m.kind]}</Badge>
                            <button className="icon-btn" onClick={() => download(m)} disabled={downloading === m.id} title={t('materials.download')} aria-label={t('materials.download')}>
                              {downloading === m.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            </button>
                            {canDeleteMaterial(m) && (
                              <button className="icon-btn hover:!bg-rose-50 hover:!text-rose-600" onClick={() => setDelMaterial(m)} title={t('common.delete')} aria-label={t('common.delete')}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {data.can_manage && (
                      <button className="btn-secondary !py-2" onClick={() => setUploadFor(tp)}>
                        <Upload size={16} /> {t('materials.upload')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={topicForm.open} title={topicForm.topic ? t('materials.editTopic') : t('materials.newTopic')} onClose={() => setTopicForm({ open: false, topic: null })}>
        <TopicForm
          key={topicForm.topic?.id ?? 'new'}
          subjectId={subjectId}
          topic={topicForm.topic}
          onClose={() => setTopicForm({ open: false, topic: null })}
          onSaved={() => {
            setTopicForm({ open: false, topic: null });
            reload();
          }}
        />
      </Modal>

      <Modal open={!!uploadFor} title={t('materials.upload')} onClose={() => setUploadFor(null)}>
        {uploadFor && (
          <UploadForm
            key={uploadFor.id}
            topic={uploadFor}
            onClose={() => setUploadFor(null)}
            onSaved={() => {
              setOpen((prev) => new Set(prev).add(uploadFor.id));
              setUploadFor(null);
              reload();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog open={!!delTopic} loading={busy} message={t('materials.confirmDeleteTopic', { title: delTopic?.title ?? '' })} onConfirm={() => confirm('topic')} onCancel={() => setDelTopic(null)} />
      <ConfirmDialog open={!!delMaterial} loading={busy} message={t('materials.confirmDeleteMaterial', { title: delMaterial?.title ?? '' })} onConfirm={() => confirm('material')} onCancel={() => setDelMaterial(null)} />
    </div>
  );
}
