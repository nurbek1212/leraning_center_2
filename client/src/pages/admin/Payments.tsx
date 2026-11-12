import { FormEvent, useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { Ban, Loader2, Plus, Receipt, Wallet } from 'lucide-react';
import { getErrorMessage, post } from '../../api/client';
import Badge, { Tone } from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import ClientTable from '../../components/ClientTable';
import ErrorBox from '../../components/ErrorBox';
import FormField from '../../components/FormField';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import PeriodPicker from '../../components/PeriodPicker';
import SearchInput from '../../components/SearchInput';
import StatCard from '../../components/StatCard';
import Tabs from '../../components/Tabs';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { usePagedList } from '../../hooks/usePagedList';
import type { DebtRow, DebtsResponse, Payment, PaymentStatus } from '../../types';
import { currentPeriod, formatDate, formatMoney, paymentMethodLabels, paymentStatusLabels, periodLabel } from '../../utils/format';

const statusTone: Record<PaymentStatus, Tone> = { paid: 'green', pending: 'amber', cancelled: 'gray' };
const MANUAL = ['cash', 'card', 'transfer'] as const;

function ManualPaymentForm({
  period,
  debts,
  preset,
  onClose,
  onSaved,
}: {
  period: string;
  debts: DebtRow[];
  preset: DebtRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const keyOf = (d: DebtRow) => `${d.student_id}:${d.group_id}`;
  const open = debts.filter((d) => d.debt > 0);
  const [sel, setSel] = useState(preset ? keyOf(preset) : '');
  const [amount, setAmount] = useState(preset ? String(preset.debt) : '');
  const [method, setMethod] = useState<(typeof MANUAL)[number]>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const chosen = open.find((d) => keyOf(d) === sel);

  const pick = (key: string) => {
    setSel(key);
    const d = open.find((x) => keyOf(x) === key);
    setAmount(d ? String(d.debt) : '');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sum = Number(amount);
    if (!chosen) return setError(t('payments.admin.vPick'));
    if (!Number.isInteger(sum) || sum < 1) return setError(t('payments.admin.vAmount'));
    setSaving(true);
    setError('');
    try {
      await post('/payments', {
        studentId: chosen.student_id,
        groupId: chosen.group_id,
        period,
        amount: sum,
        method,
        note: note.trim() || null,
      });
      toast.success(t('payments.admin.toastAccepted'));
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
        {t('payments.admin.period')} <b className="text-slate-800">{periodLabel(period)}</b>
      </p>
      <FormField label={t('payments.admin.studentGroup')} hint={t('payments.admin.studentGroupHint')}>
        <select className="input" value={sel} onChange={(e) => pick(e.target.value)}>
          <option value="">{t('common.pick')}</option>
          {open.map((d) => (
            <option key={keyOf(d)} value={keyOf(d)}>
              {t('payments.admin.optionDebt', { student: d.student_name, group: d.group_name, debt: formatMoney(d.debt) })}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('payments.admin.amountLabel')}>
          <input className="input tabular" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
        </FormField>
        <FormField label={t('payments.admin.methodLabel')}>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            {MANUAL.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabels[m]}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label={t('common.comment')}>
        <input className="input" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t('payments.admin.accept')}
        </button>
      </div>
    </form>
  );
}

export default function Payments() {
  const toast = useToast();
  const [tab, setTab] = useState<'history' | 'debts'>('debts');
  const [period, setPeriod] = useState(currentPeriod());
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<{ open: boolean; preset: DebtRow | null }>({ open: false, preset: null });
  const [cancelling, setCancelling] = useState<Payment | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const debts = useFetch<DebtsResponse>('/payments/debts', { period });
  const history = usePagedList<Payment>('/payments', { period, status });

  const reloadAll = () => {
    debts.reload();
    history.reload();
  };

  // Yuqoridagi umumiy ko'rsatkichlar (shu oy bo'yicha)
  const sums = useMemo(() => {
    const items = debts.data?.items ?? [];
    return {
      expected: items.reduce((s, d) => s + d.price, 0),
      paid: items.reduce((s, d) => s + Math.min(d.paid, d.price), 0),
      debt: items.reduce((s, d) => s + d.debt, 0),
      debtors: items.filter((d) => d.debt > 0).length,
    };
  }, [debts.data]);

  useEffect(() => setStatus(''), [tab]);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setCancelBusy(true);
    try {
      await post(`/payments/${cancelling.id}/cancel`);
      toast.success(t('payments.admin.toastCancelled'));
      reloadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelBusy(false);
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodPicker value={period} onChange={setPeriod} />
        <button className="btn-primary" onClick={() => setModal({ open: true, preset: null })} disabled={!debts.data}>
          <Plus size={16} /> {t('payments.admin.acceptPayment')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('payments.admin.expected')} value={formatMoney(sums.expected)} icon={<Receipt size={22} />} tone="sky" />
        <StatCard label={t('payments.admin.paid')} value={formatMoney(sums.paid)} icon={<Wallet size={22} />} tone="green" />
        <StatCard label={t('payments.admin.debt')} value={formatMoney(sums.debt)} hint={t('payments.admin.debtorsCount', { n: sums.debtors })} icon={<Ban size={22} />} tone="rose" />
      </div>

      <Tabs
        tabs={[
          { key: 'debts', label: t('payments.admin.tabDebts') },
          { key: 'history', label: t('payments.admin.tabHistory') },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'debts' ? (
        <>
          <ErrorBox message={debts.error} />
          <ClientTable
            loading={debts.loading}
            rows={debts.data?.items ?? []}
            rowKey={(d) => `${d.student_id}:${d.group_id}`}
            searchText={(d) => `${d.student_name} ${d.group_name} ${d.phone ?? ''}`}
            searchPlaceholder={t('payments.admin.searchPlaceholder')}
            emptyText={t('payments.admin.emptyDebts')}
            columns={[
              { header: t('common.student'), cell: (d) => <span className="font-medium text-slate-900">{d.student_name}</span> },
              { header: t('common.group'), cell: (d) => d.group_name },
              { header: t('common.price'), cell: (d) => <span className="tabular">{formatMoney(d.price)}</span> },
              { header: t('payStatus.paid'), cell: (d) => <span className="tabular">{formatMoney(d.paid)}</span> },
              {
                header: t('common.status'),
                cell: (d) =>
                  d.debt > 0 ? <Badge tone="red">{t('payments.admin.debtBadge', { amount: formatMoney(d.debt) })}</Badge> : <Badge tone="green" dot>{t('payStatus.paid')}</Badge>,
              },
              {
                header: '',
                className: 'text-right',
                cell: (d) =>
                  d.debt > 0 && (
                    <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => setModal({ open: true, preset: d })}>
                      {t('payments.admin.accept')}
                    </button>
                  ),
              },
            ]}
          />
        </>
      ) : (
        <>
          <ErrorBox message={history.error} />
          <div className="card overflow-hidden">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput value={history.searchInput} onChange={history.setSearchInput} placeholder={t('payments.admin.searchPlaceholder')} />
              <select className="input sm:!w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('common.status')}>
                <option value="">{t('payments.admin.allStatuses')}</option>
                <option value="paid">{paymentStatusLabels.paid}</option>
                <option value="pending">{paymentStatusLabels.pending}</option>
                <option value="cancelled">{paymentStatusLabels.cancelled}</option>
              </select>
            </div>
            <DataTable
              loading={history.loading}
              rows={history.items}
              rowKey={(p) => p.id}
              emptyText={t('payments.admin.emptyHistory')}
              columns={[
                { header: t('common.student'), cell: (p) => <span className="font-medium text-slate-900">{p.student_name}</span> },
                { header: t('common.group'), cell: (p) => p.group_name },
                { header: t('common.amount'), cell: (p) => <span className="tabular">{formatMoney(p.amount)}</span> },
                { header: t('common.method'), cell: (p) => paymentMethodLabels[p.method] },
                { header: t('common.status'), cell: (p) => <Badge tone={statusTone[p.status]} dot>{paymentStatusLabels[p.status]}</Badge> },
                { header: t('common.date'), cell: (p) => formatDate(p.paid_at ?? p.created_at) },
                {
                  header: '',
                  className: 'text-right',
                  cell: (p) =>
                    p.status === 'paid' &&
                    (MANUAL as readonly string[]).includes(p.method) && (
                      <button className="icon-btn hover:!bg-rose-50 hover:!text-rose-600" title={t('payments.admin.cancelPayment')} aria-label={t('payments.admin.cancelPayment')} onClick={() => setCancelling(p)}>
                        <Ban size={16} />
                      </button>
                    ),
                },
              ]}
            />
            <Pagination page={history.page} totalPages={history.totalPages} total={history.total} limit={history.limit} onChange={history.setPage} />
          </div>
        </>
      )}

      <Modal open={modal.open} title={t('payments.admin.acceptPayment')} onClose={() => setModal({ open: false, preset: null })}>
        <ManualPaymentForm
          key={modal.preset ? `${modal.preset.student_id}:${modal.preset.group_id}` : 'new'}
          period={period}
          debts={debts.data?.items ?? []}
          preset={modal.preset}
          onClose={() => setModal({ open: false, preset: null })}
          onSaved={() => {
            setModal({ open: false, preset: null });
            reloadAll();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!cancelling}
        loading={cancelBusy}
        confirmLabel={t('payments.admin.cancelPayment')}
        message={t('payments.admin.confirmCancel', { name: cancelling?.student_name ?? '', amount: formatMoney(cancelling?.amount) })}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
