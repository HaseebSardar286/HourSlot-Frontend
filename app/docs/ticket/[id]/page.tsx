'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { dateLabel, money, type BookingTicket } from '@/lib/payments';
import TicketQr from '@/components/payments/TicketQr';
import DocShell from '../../DocShell';
import s from '../../docs.module.css';

export default function TicketDocPage() {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<BookingTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<BookingTicket>(`/api/customer/bookings/${id}/ticket`)
      .then(setT)
      .catch((e) => setError(e?.message || 'Booking not found.'));
  }, [id]);

  const back = { href: `/profile/bookings/${id}`, label: 'Booking' };
  if (error) return <DocShell back={back}><p className={s.error}>{error}</p></DocShell>;
  if (!t) return <DocShell back={back}><p className={s.error}>Loading ticket…</p></DocShell>;

  const b = t.booking;
  const cur = b.currency || 'PKR';

  return (
    <DocShell back={back}>
      <article className={s.ticket}>
        <header className={s.ticketHead}>
          <span>Duemet booking ticket</span>
          <h1>{b.serviceName || 'Appointment'}</h1>
          <div>{b.businessName}</div>
        </header>
        <div className={s.ticketBody}>
          <dl className={s.kv}>
            <dt>When</dt><dd>{dateLabel(b.bookingTime, true)}</dd>
            {b.durationMinutes ? <><dt>Length</dt><dd>{b.durationMinutes} min</dd></> : null}
            <dt>Where</dt><dd>{[b.branchName, b.branchAddress].filter(Boolean).join(', ') || b.businessName}</dd>
            {b.staffName ? <><dt>With</dt><dd>{b.staffName}</dd></> : null}
            <dt>Guest</dt><dd>{b.customerName}</dd>
            <dt>Total</dt><dd>{money(t.total, cur)}</dd>
            <dt>Paid</dt><dd>{money(t.paid, cur)}</dd>
            <dt>To pay</dt><dd>{Number(t.due) > 0 ? money(t.due, cur) : 'Nothing, fully paid'}</dd>
          </dl>
        </div>
        <div className={s.ticketCut} />
        <div className={s.ticketCode}>
          <TicketQr code={b.publicCode} />
          <strong>{b.publicCode}</strong>
          <p>Show this at {b.businessName} when you arrive.</p>
        </div>
      </article>
    </DocShell>
  );
}
