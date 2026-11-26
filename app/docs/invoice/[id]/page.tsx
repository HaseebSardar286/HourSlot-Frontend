'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { INVOICE_STATUS, billNumber, dateLabel, methodLabel, money, type Invoice } from '@/lib/payments';
import DocShell from '../../DocShell';
import s from '../../docs.module.css';

function InvoiceDoc() {
  const { id } = useParams<{ id: string }>();
  const as = useSearchParams().get('as') === 'admin' ? 'admin' : 'owner';
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Invoice>(as === 'admin' ? `/api/admin/billing/invoices/${id}` : `/api/workspace/billing/invoices/${id}`)
      .then(setInv)
      .catch((e) => setError(e?.message || 'Invoice not found.'));
  }, [id, as]);

  const back = as === 'admin' ? { href: '/admin/billing', label: 'Billing' } : { href: '/business/plan', label: 'Subscription' };

  if (error) return <DocShell back={back}><p className={s.error}>{error}</p></DocShell>;
  if (!inv) return <DocShell back={back}><p className={s.error}>Loading invoice…</p></DocShell>;

  const p = inv.payee;
  const stampClass = inv.status === 'PAID' ? s.paid : inv.status === 'VOID' ? s.voided : s.due;

  return (
    <DocShell back={back}>
      <article className={s.doc}>
        <header className={s.top}>
          <div className={s.brand}>
            <span className={s.mark}>D</span>
            {p?.companyName || 'Duemet'}
          </div>
          <div className={s.docType}>
            <h1>{inv.status === 'PAID' ? 'Invoice' : 'Payment request'}</h1>
            <p>{billNumber(inv)}</p>
            <p>Issued {dateLabel(inv.createdAt)}{inv.status !== 'PAID' && inv.dueDate ? ` · due ${dateLabel(inv.dueDate)}` : ''}</p>
          </div>
        </header>

        <div className={s.parties}>
          <div className={s.party}>
            <h2>From</h2>
            <p>
              {p?.companyName || 'Duemet'}
              {p?.companyAddress ? <><br />{p.companyAddress}</> : null}
              {p?.companyEmail ? <><br />{p.companyEmail}</> : null}
            </p>
          </div>
          <div className={s.party}>
            <h2>Bill to</h2>
            <p>{inv.businessName || inv.organizationName}{inv.billingEmail ? <><br />{inv.billingEmail}</> : null}</p>
          </div>
        </div>

        <table className={s.table}>
          <thead>
            <tr><th>Description</th><th className={s.num}>Months</th><th className={s.num}>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Duemet {inv.planName} plan
                {inv.periodStart && inv.periodEnd ? <><br /><small>{dateLabel(inv.periodStart)} to {dateLabel(inv.periodEnd)}</small></> : null}
              </td>
              <td className={s.num}>{inv.months}</td>
              <td className={s.num}>{money(inv.amount, inv.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className={s.totals}>
          <div className={s.grand}><span>Total</span><span>{money(inv.amount, inv.currency)}</span></div>
          <div><span>Status</span><span className={`${s.stamp} ${stampClass}`}>{INVOICE_STATUS[inv.status].label}</span></div>
        </div>

        {inv.status === 'PAID' ? (
          <dl className={s.kv}>
            <dt>Paid on</dt><dd>{dateLabel(inv.paidAt)}</dd>
            {inv.paymentMethod && <><dt>Method</dt><dd>{methodLabel(inv.paymentMethod)}</dd></>}
            {inv.paymentReference && <><dt>Transaction ID</dt><dd>{inv.paymentReference}</dd></>}
          </dl>
        ) : inv.status !== 'VOID' && p?.configured ? (
          <section className={s.section}>
            <h2>How to pay</h2>
            <dl className={s.kv}>
              {p.accountTitle && <><dt>Account title</dt><dd>{p.accountTitle}</dd></>}
              {p.bankName && <><dt>Bank</dt><dd>{p.bankName}</dd></>}
              {p.accountNumber && <><dt>Account number</dt><dd>{p.accountNumber}</dd></>}
              {p.iban && <><dt>IBAN</dt><dd>{p.iban}</dd></>}
              {p.jazzcash && <><dt>JazzCash</dt><dd>{p.jazzcash}</dd></>}
              {p.easypaisa && <><dt>Easypaisa</dt><dd>{p.easypaisa}</dd></>}
              <dt>Reference</dt><dd>{billNumber(inv)}</dd>
            </dl>
          </section>
        ) : null}

        <p className={s.note}>
          Pay Duemet directly by bank transfer or mobile wallet and add the transaction ID under Subscription in your
          dashboard. Your plan is activated and the invoice is issued when the payment is confirmed.
        </p>
      </article>
    </DocShell>
  );
}

export default function InvoicePage() {
  return <Suspense fallback={null}><InvoiceDoc /></Suspense>;
}
