'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { dateLabel, methodLabel, money, type Receipt } from '@/lib/payments';
import DocShell from '../../DocShell';
import s from '../../docs.module.css';

function ReceiptDoc() {
  const { id } = useParams<{ id: string }>();
  const as = useSearchParams().get('as') === 'workspace' ? 'workspace' : 'customer';
  const [r, setR] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Receipt>(as === 'workspace' ? `/api/workspace/receipts/${id}` : `/api/customer/receipts/${id}`)
      .then(setR)
      .catch((e) => setError(e?.message || 'Receipt not found.'));
  }, [id, as]);

  const back = as === 'workspace'
    ? { href: '/business/payments', label: 'Payments' }
    : { href: r ? `/profile/bookings/${r.bookingId}` : '/profile/bookings', label: 'Booking' };

  if (error) return <DocShell back={back}><p className={s.error}>{error}</p></DocShell>;
  if (!r) return <DocShell back={back}><p className={s.error}>Loading receipt…</p></DocShell>;

  const confirmed = r.status === 'CONFIRMED';

  return (
    <DocShell back={back}>
      <article className={s.doc}>
        <header className={s.top}>
          <div className={s.brand}>
            <span className={s.mark}><i className="fa-solid fa-store" /></span>
            {r.businessName}
          </div>
          <div className={s.docType}>
            <h1>Payment receipt</h1>
            <p>{r.receiptNumber || 'Not yet issued'}</p>
            <p>{dateLabel(r.reviewedAt || r.createdAt, true)}</p>
          </div>
        </header>

        <div className={s.parties}>
          <div className={s.party}>
            <h2>Received from</h2>
            <p>{r.customerName || 'Customer'}<br />{r.customerEmail}</p>
          </div>
          <div className={s.party}>
            <h2>Received by</h2>
            <p>{r.businessName}{r.branchAddress ? <><br />{r.branchAddress}</> : null}{r.businessPhone ? <><br />{r.businessPhone}</> : null}</p>
          </div>
        </div>

        <table className={s.table}>
          <thead>
            <tr><th>For</th><th>Booking</th><th className={s.num}>Amount</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{r.serviceName || 'Appointment'}<br /><small>{dateLabel(r.bookingTime, true)}</small></td>
              <td>{r.bookingCode}</td>
              <td className={s.num}>{money(r.amount, r.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className={s.totals}>
          {r.totalPrice != null && <div><span>Booking total</span><span>{money(r.totalPrice, r.currency)}</span></div>}
          <div className={s.grand}><span>Paid</span><span>{money(r.amount, r.currency)}</span></div>
        </div>

        <dl className={s.kv}>
          <dt>Payment method</dt><dd>{methodLabel(r.methodType)}</dd>
          {r.reference && <><dt>Transaction ID</dt><dd>{r.reference}</dd></>}
          <dt>Status</dt>
          <dd>
            <span className={`${s.stamp} ${confirmed ? s.paid : r.status === 'REJECTED' ? s.voided : s.due}`}>
              {confirmed ? 'Confirmed by the business' : r.status === 'REJECTED' ? 'Not matched' : 'Waiting for the business to confirm'}
            </span>
          </dd>
        </dl>

        <p className={s.note}>
          Paid directly to {r.businessName}. Duemet records the booking and this receipt but does not handle the money.
          For questions about this payment, contact the business or open a support ticket in Duemet.
        </p>
      </article>
    </DocShell>
  );
}

export default function ReceiptPage() {
  return <Suspense fallback={null}><ReceiptDoc /></Suspense>;
}
