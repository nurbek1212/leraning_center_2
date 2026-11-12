import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { t } from '../i18n';

interface Props {
  open: boolean;
  message: string;
  loading?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, message, loading, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} title={t('common.confirm')} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel} disabled={loading}>
          {t('common.close')}
        </button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {confirmLabel ?? t('common.delete')}
        </button>
      </div>
    </Modal>
  );
}
