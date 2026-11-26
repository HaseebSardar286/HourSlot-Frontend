'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { billNumber, dateLabel, methodLabel, money, type BillingOverview, type Invoice } from '@/lib/payments';
import s from './tools.module.css';

/** Invoices for the business's Duemet plan. One is issued each time a plan payment is confirmed. */
export default function DuemetInvoices() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<BillingOverview>('/api/workspace/billing')
      .then((d) => setRows((d.invoices || []).filter((i) => i.status === 'PAID')))
      .catch((e) => setError((e as { message?: string })?.message || 'Could not load invoices.'));
  }, []);

  return (
    <section className={s.panel}>
      <div className={s.panelHead}>
        <div className={s.panelHeadText}>
          <h2>Duemet invoices</h2>
          <p>An invoice is issued each time your plan payment is confirmed, including renewals.</p>
        </div>
      </div>
      {error ? (
        <div className={s.panelBody}><div className={`${s.alert} ${s.alertErr}`} role="alert">{error}</div></div>
      ) : rows === null ? (
        <div className={s.panelBody}><div className={s.skel} style={{ height: 52 }} /></div>
      ) : rows.length === 0 ? (
        <div className={s.empty} style={{ padding: '32px 20px' }}>
          <i className="fa-solid fa-file-invoice" />
          <strong>No invoices yet</strong>
          Your first invoice appears here once a plan payment is confirmed.
        </div>
      ) : (
        <div className={s.list}>
          {rows.map((inv) => (
            <div key={inv.id} className={s.row}>
              <span className={s.iconTile}><i className="fa-solid fa-file-invoice" /></span>
              <div className={s.rowMain}>
                <div className={s.rowTitle}>{billNumber(inv)} <span className={s.hint}>{inv.planName} · {inv.months} mo</span></div>
                <div className={s.rowMeta}>
                  Paid {dateLabel(inv.paidAt)} · {methodLabel(inv.paymentMethod || undefined)}
                  {inv.periodStart && inv.periodEnd ? ` · ${dateLabel(inv.periodStart)} to ${dateLabel(inv.periodEnd)}` : ''}
                </div>
              </div>
              <div className={s.rowEnd}>
                <span className={s.amount}>{money(inv.amount, inv.currency)}</span>
                <span className={`${s.chip} ${s.chipGreen}`}>Paid</span>
                <a className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} href={`/docs/invoice/${inv.id}?as=owner`} target="_blank" rel="noreferrer">
                  <i className="fa-solid fa-print" /> View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
