'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import Dropdown from '@/components/ui/Dropdown';
import { METHOD_ICON, METHOD_LABEL, money, type Invoice, type MethodType, type Payee } from '@/lib/payments';
import { PayeeDetails } from './SubscriptionBilling';
import s from './tools.module.css';

export type PlanPayment = {
  planCode: string;
  planName: string;
  months: number;
  amount: number;
  currency: string;
  /** Paying an existing request (e.g. a renewal reminder) instead of starting a new one. */
  invoiceId?: number;
  reference?: string | null;
};

const PAY_METHODS: MethodType[] = ['BANK_TRANSFER', 'RAAST', 'JAZZCASH', 'EASYPAISA'];
const ACCOUNT_LABEL: Partial<Record<MethodType, string>> = {
  BANK_TRANSFER: 'Your account number or IBAN',
  RAAST: 'Your Raast ID or IBAN',
  JAZZCASH: 'Your JazzCash number',
  EASYPAISA: 'Your Easypaisa number',
};

/**
 * Pay by bank or wallet: shows Duemet's account and the amount, then the owner enters the account they paid
 * from and the transaction ID. Nothing is created until they submit.
 */
export default function PlanPayModal({ payment, payee, onClose, onPaid }: {
  payment: PlanPayment | null;
  payee?: Payee;
  onClose: () => void;
  onPaid: (inv: Invoice) => void;
}) {
  const [form, setForm] = useState({ methodType: 'BANK_TRANSFER' as MethodType, payerName: '', payerAccount: '', reference: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ready = form.payerName.trim() && form.payerAccount.trim() && form.reference.trim();

  async function submit() {
    if (!payment) return;
    setBusy(true);
    setErr(null);
    try {
      const inv = await apiFetch<Invoice>('/api/workspace/billing/pay', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          planCode: payment.planCode,
          months: payment.months,
          invoiceId: payment.invoiceId,
        }),
      });
      setForm({ methodType: 'BANK_TRANSFER', payerName: '', payerAccount: '', reference: '', note: '' });
      onPaid(inv);
    } catch (e) {
      setErr((e as { message?: string })?.message || 'Could not submit the payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!payment}
      wide
      title={payment ? `Pay for ${payment.planName}` : 'Pay'}
      onClose={() => { if (!busy) onClose(); }}
      footer={(
        <div className={s.btnRow} style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={busy || !ready} onClick={submit}>
            {busy ? 'Submitting…' : 'Submit payment'}
          </button>
        </div>
      )}
    >
      {payment && (
        <div className={s.stack}>
          {err && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}

          <div className={`${s.alert} ${s.alertOk}`} role="note">
            <i className="fa-solid fa-receipt" />
            <span>
              <strong>{money(payment.amount, payment.currency)}</strong> for {payment.planName}, {payment.months}{' '}
              {payment.months === 1 ? 'month' : 'months'}
            </span>
          </div>

          <div className={s.fieldGrid}>
            <div className={s.stack}>
              <h3 style={{ margin: 0, fontSize: 15 }}>1. Send the amount to Duemet</h3>
              <PayeeDetails payee={payee} />
              {payment.reference && (
                <p className={s.hint}>Put <strong className={s.code}>{payment.reference}</strong> in the transfer remark if your app allows it.</p>
              )}
            </div>

            <div className={s.stack}>
              <h3 style={{ margin: 0, fontSize: 15 }}>2. Your payment details</h3>
              <label className={s.field}>
                <span className={s.label}>Paid by</span>
                <Dropdown id="pp-method" aria-label="Paid by" value={form.methodType}
                  onChange={(v) => setForm({ ...form, methodType: v as MethodType })}
                  options={PAY_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m], icon: METHOD_ICON[m] }))} />
              </label>
              <label className={s.field}>
                <span className={s.label}>Account holder name</span>
                <input id="pp-name" className={s.input} value={form.payerName} maxLength={120} autoComplete="name"
                  onChange={(e) => setForm({ ...form, payerName: e.target.value })} placeholder="As it appears on your account" />
              </label>
              <label className={s.field}>
                <span className={s.label}>{ACCOUNT_LABEL[form.methodType] || 'Your account number'}</span>
                <input id="pp-account" className={s.input} value={form.payerAccount} maxLength={64}
                  onChange={(e) => setForm({ ...form, payerAccount: e.target.value })} />
              </label>
              <label className={s.field}>
                <span className={s.label}>Transaction ID</span>
                <input id="pp-ref" className={s.input} value={form.reference} maxLength={120}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="From your bank or wallet app" />
              </label>
              <label className={s.field}>
                <span className={s.label}>Note (optional)</span>
                <input id="pp-note" className={s.input} value={form.note} maxLength={500}
                  onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>
            </div>
          </div>

          <p className={s.hint}>
            Submit after the money has left your account. Your plan switches on straight away while we verify the payment,
            and your invoice appears under Payments › Duemet invoices once it&apos;s confirmed.
          </p>
        </div>
      )}
    </Modal>
  );
}
