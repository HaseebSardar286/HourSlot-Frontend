'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import { INVOICE_STATUS, billNumber, dateLabel, methodLabel, money, type Invoice, type InvoiceStatus } from '@/lib/payments';
import s from '@/components/workspace/tools.module.css';
import GatewayPanel from './GatewayPanel';

const TONE = { amber: s.chipAmber, blue: s.chipBlue, green: s.chipGreen, slate: s.chipSlate } as const;
type Filter = InvoiceStatus | '';

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

export default function AdminBillingPage() {
  const [filter, setFilter] = useState<Filter>('PAYMENT_SUBMITTED');
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [action, setAction] = useState<{ inv: Invoice; kind: 'reject' | 'void' } | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<Invoice[]>(`/api/admin/billing/invoices${filter ? `?status=${filter}` : ''}`));
      setError(null);
    } catch (e) {
      setError(errText(e, 'Could not load invoices.'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on filter change
    void load();
  }, [load]);

  async function confirm(inv: Invoice) {
    setBusyId(inv.id);
    try {
      const r = await apiFetch<Invoice>(`/api/admin/billing/invoices/${inv.id}/confirm`, { method: 'POST', body: '{}' });
      setNotice(`${billNumber(inv)} confirmed: invoice ${r.invoiceNumber} issued. ${inv.planName} active until ${dateLabel(r.periodEnd)}.`);
      await load();
    } catch (e) {
      setError(errText(e, 'Could not confirm the invoice.'));
    } finally {
      setBusyId(null);
    }
  }

  async function runAction() {
    if (!action) return;
    setBusyId(action.inv.id);
    try {
      await apiFetch(`/api/admin/billing/invoices/${action.inv.id}/${action.kind}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setNotice(action.kind === 'reject' ? 'Sent back to the business with your note.' : 'Invoice cancelled.');
      setAction(null);
      setReason('');
      await load();
    } catch (e) {
      setError(errText(e, 'Could not update the invoice.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <h1>Billing</h1>
          <p>
            Businesses pay straight into Duemet&apos;s account. Their plan switches on as soon as they report the payment;
            check each transaction ID against the statement and confirm it to issue the invoice. Not received puts their
            previous plan back, and so does leaving it unchecked past the verify-by date.
          </p>
        </div>
      </header>

      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      {notice && <div className={`${s.alert} ${s.alertOk}`} role="status"><i className="fa-solid fa-circle-check" /> {notice}</div>}

      <GatewayPanel />

      <section className={s.panel}>
        <div className={s.toolbar}>
          <div className={s.tabs} role="tablist" aria-label="Filter invoices">
            {(['PAYMENT_SUBMITTED', 'ISSUED', 'PAID', 'VOID', ''] as Filter[]).map((f) => (
              <button key={f || 'all'} type="button" role="tab" aria-selected={filter === f}
                className={filter === f ? s.tabOn : ''} onClick={() => { setLoading(true); setFilter(f); }}>
                {f === 'PAYMENT_SUBMITTED' ? 'To confirm' : f === '' ? 'All' : INVOICE_STATUS[f].label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className={s.panelBody}>{[0, 1, 2].map((i) => <div key={i} className={s.skel} style={{ height: 52 }} />)}</div>
        ) : rows.length === 0 ? (
          <div className={s.empty} style={{ padding: '40px 20px' }}>
            <i className="fa-solid fa-file-invoice" />
            <strong>Nothing here</strong>
            {filter === 'PAYMENT_SUBMITTED' ? 'No payments waiting to be checked.' : 'No invoices in this view.'}
          </div>
        ) : (
          <DataTable<Invoice>
            rows={rows}
            rowKey={(inv) => inv.id}
            defaultSort={{ key: 'issued', dir: 'desc' }}
            columns={[
              { key: 'number', header: 'Number', sortValue: (inv) => billNumber(inv), render: (inv) => <span className={s.code}>{billNumber(inv)}</span> },
              {
                key: 'business', header: 'Business', sortValue: (inv) => inv.businessName || inv.organizationName || '',
                render: (inv) => (
                  <div className={s.cellStack}>
                    <strong>{inv.businessName || inv.organizationName}</strong>
                    <span>{inv.billingEmail || '—'}</span>
                  </div>
                ),
              },
              { key: 'plan', header: 'Plan', sortValue: (inv) => inv.planName, render: (inv) => `${inv.planName} · ${inv.months} mo` },
              { key: 'issued', header: 'Issued', sortValue: (inv) => new Date(inv.createdAt).getTime(), render: (inv) => dateLabel(inv.createdAt) },
              {
                key: 'payment', header: 'Payment', hideOnMobile: true,
                render: (inv) => inv.status === 'PAYMENT_SUBMITTED'
                  ? (
                    <div className={s.cellStack}>
                      <span>{methodLabel(inv.paymentMethod || 'OTHER')} · <span className={s.code}>{inv.paymentReference}</span></span>
                      {inv.payerName && <span>From {inv.payerName}{inv.payerAccount ? ` · ${inv.payerAccount}` : ''}</span>}
                    </div>
                  )
                  : inv.paidAt ? `Paid ${dateLabel(inv.paidAt)}` : inv.dueDate ? `Due ${dateLabel(inv.dueDate)}` : '—',
              },
              {
                key: 'status', header: 'Status', sortValue: (inv) => inv.status,
                render: (inv) => (
                  <div className={s.cellStack}>
                    <span className={`${s.chip} ${TONE[INVOICE_STATUS[inv.status].tone]}`}>{INVOICE_STATUS[inv.status].label}</span>
                    {inv.status === 'PAYMENT_SUBMITTED' && inv.provisionalState === 'ACTIVE' && (
                      <span>Plan already on · verify by {dateLabel(inv.provisionalUntil)}</span>
                    )}
                    {inv.status === 'PAYMENT_SUBMITTED' && inv.provisionalState === 'REVERTED' && <span>Not verified in time · plan off</span>}
                    {inv.status === 'PAYMENT_SUBMITTED' && !inv.provisionalState && inv.wasRejected && <span>Held: payment sent back before</span>}
                  </div>
                ),
              },
              { key: 'amount', header: 'Amount', align: 'right', sortValue: (inv) => Number(inv.amount), render: (inv) => <strong>{money(inv.amount, inv.currency)}</strong> },
              {
                key: 'actions', header: '', align: 'right',
                render: (inv) => {
                  const actionable = inv.status === 'ISSUED' || inv.status === 'PAYMENT_SUBMITTED';
                  return (
                    <div className={s.btnRow} style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <a className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} href={`/docs/invoice/${inv.id}?as=admin`} target="_blank" rel="noreferrer">View</a>
                      {inv.status === 'PAYMENT_SUBMITTED' && (
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} disabled={busyId === inv.id}
                          onClick={() => { setAction({ inv, kind: 'reject' }); setReason(''); }}>Not received</button>
                      )}
                      {inv.status === 'ISSUED' && (
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} disabled={busyId === inv.id}
                          onClick={() => { setAction({ inv, kind: 'void' }); setReason(''); }}>Cancel</button>
                      )}
                      {actionable && (
                        <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} disabled={busyId === inv.id} onClick={() => confirm(inv)}>
                          <i className="fa-solid fa-check" /> Mark paid
                        </button>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </section>

      <Modal open={!!action} title={action?.kind === 'reject' ? 'Payment not received' : 'Cancel invoice'} onClose={() => setAction(null)}
        footer={
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setAction(null)}>Back</button>
            <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={(action?.kind === 'reject' && !reason.trim()) || busyId === action?.inv.id} onClick={runAction}>
              {action?.kind === 'reject' ? 'Send back to business' : 'Cancel invoice'}
            </button>
          </div>
        }>
        <label className={s.field}>
          <span className={s.label}>{action?.kind === 'reject' ? 'What should the business check?' : 'Reason (optional)'}</span>
          <textarea id="billing-reason" className={s.textarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={action?.kind === 'reject' ? 'No transfer with this ID has reached our account yet.' : ''} />
        </label>
      </Modal>
    </div>
  );
}
