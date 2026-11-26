'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import AttendanceBar from '@/components/ops/AttendanceBar';
import {
  METHOD_ICON, PAYMENT_STATUS, REMOTE_METHODS, dateLabel, methodLabel, money,
  type BookingTicket,
} from '@/lib/payments';
import TicketQr from '@/components/payments/TicketQr';
import PayByTransfer from '@/components/payments/PayByTransfer';
import PaymentStatusBanner from '@/components/payments/PaymentStatusBanner';
import s from '@/components/workspace/tools.module.css';
import pay from '@/components/payments/pay.module.css';

const TONE = { amber: s.chipAmber, green: s.chipGreen, rose: s.chipRose } as const;

function errText(e: unknown, fallback: string) {
  return (e as { message?: string })?.message || fallback;
}

export default function BookingTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<BookingTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const uploadFailed = useSearchParams().get('upload') === 'failed';

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<BookingTicket>(`/api/customer/bookings/${id}/ticket`);
      setT(data);
      setError(null);
    } catch (e) {
      setError(errText(e, 'Could not load this booking.'));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  // While the business checks a payment, look for its answer every 30 seconds.
  const waiting = !!t?.pendingReview;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [waiting, load]);

  if (!t) {
    return (
      <div className={s.page}>
        {error ? <div className={`${s.alert} ${s.alertErr}`}>{error}</div> : <div className={s.skel} style={{ height: 240 }} />}
      </div>
    );
  }

  const b = t.booking;
  const cur = b.currency || 'PKR';
  const remote = t.paymentMethods.filter((m) => REMOTE_METHODS.includes(m.methodType));
  const atVenue = t.paymentMethods.filter((m) => !REMOTE_METHODS.includes(m.methodType));
  const cancelled = b.status.toUpperCase().startsWith('CANCEL');
  const fullyPaid = Number(t.due) <= 0 && Number(t.total) > 0;

  return (
    <div className={s.page}>
      <header className={s.head}>
        <div>
          <Link href="/profile/bookings" className={s.hint}><i className="fa-solid fa-arrow-left" /> All bookings</Link>
          <h1>{b.serviceName || 'Appointment'} at {b.businessName}</h1>
          <p>{dateLabel(b.bookingTime, true)}{b.staffName ? ` with ${b.staffName}` : ''}</p>
        </div>
        <div className={s.headActions}>
          <a className={`${s.btn} ${s.btnGhost}`} href={`/docs/ticket/${b.id}`} target="_blank" rel="noreferrer">
            <i className="fa-solid fa-ticket" /> Open ticket
          </a>
          <Link className={`${s.btn} ${s.btnGhost}`} href={`/profile/support?new=1&category=BOOKING&bookingId=${b.id}&subject=${encodeURIComponent(`Help with booking ${b.publicCode}`)}`}>
            <i className="fa-solid fa-life-ring" /> Get help
          </Link>
        </div>
      </header>

      {uploadFailed && t.awaitingPayment && !t.pendingReview && !notice && (
        <div className={`${s.alert} ${s.alertErr}`} role="alert">
          <i className="fa-solid fa-circle-exclamation" /> Your booking request was saved, but the screenshot didn&apos;t upload. Send it again below.
        </div>
      )}
      {error && <div className={`${s.alert} ${s.alertErr}`} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
      {notice && <div className={`${s.alert} ${s.alertOk}`} role="status"><i className="fa-solid fa-circle-check" /> {notice}</div>}

      <div className={s.split}>
        <div className={s.stack}>
          <PaymentStatusBanner ticket={t} />
          {!cancelled && !t.awaitingPayment && <AttendanceBar bookingId={b.id} onChanged={() => void load()} />}
          <div className={`${s.stats} ${s.stats3}`}>
            <div className={s.stat}>
              <span className={s.iconTile}><i className="fa-solid fa-receipt" /></span>
              <div className={s.statText}><div className={s.statLabel}>Total</div><div className={s.statValue}>{money(t.total, cur)}</div></div>
            </div>
            <div className={s.stat}>
              <span className={`${s.iconTile} ${s.toneGreen}`}><i className="fa-solid fa-check" /></span>
              <div className={s.statText}><div className={s.statLabel}>Paid</div><div className={s.statValue}>{money(t.paid, cur)}</div></div>
            </div>
            <div className={s.stat}>
              <span className={`${s.iconTile} ${fullyPaid ? s.toneGreen : s.toneAmber}`}><i className="fa-solid fa-wallet" /></span>
              <div className={s.statText}><div className={s.statLabel}>To pay</div><div className={s.statValue}>{fullyPaid ? 'Nothing' : money(t.due, cur)}</div></div>
            </div>
          </div>

          {!cancelled && !fullyPaid && !t.pendingReview && remote.length > 0 && (
            <PayByTransfer ticket={t} onSent={(data, note) => { setT(data); setNotice(note); setError(null); }} />
          )}

          {!cancelled && !fullyPaid && !t.awaitingPayment && (remote.length === 0 || atVenue.length > 0) && (
            <p className={s.hint}>
              <i className="fa-solid fa-store" /> Paying at the venue? Nothing to do here; {b.businessName} records it and you get a receipt.
            </p>
          )}

          <section className={s.panel}>
            <div className={s.panelHead}><div className={s.panelHeadText}><h2>Payments and receipts</h2></div></div>
            {t.payments.length === 0 ? (
              <div className={s.empty} style={{ padding: '28px 20px' }}>
                <i className="fa-solid fa-receipt" />
                <strong>No payments yet</strong>
                Receipts appear here once the business confirms a payment.
              </div>
            ) : (
              <div className={s.list}>
                {t.payments.map((p) => {
                  const st = PAYMENT_STATUS[p.status];
                  return (
                    <div key={p.id} className={s.row}>
                      <span className={`${s.iconTile} ${p.status === 'CONFIRMED' ? s.toneGreen : p.status === 'REJECTED' ? s.toneRose : s.toneAmber}`}>
                        <i className={`fa-solid ${METHOD_ICON[p.methodType]}`} />
                      </span>
                      <div className={s.rowMain}>
                        <div className={s.rowTitle}>{methodLabel(p.methodType)} {p.reference && <span className={s.hint}>{p.reference}</span>}</div>
                        <div className={s.rowMeta}>
                          {dateLabel(p.createdAt, true)}
                          {p.status === 'REJECTED' && p.rejectionReason ? ` · ${p.rejectionReason}` : ''}
                          {p.status === 'SUBMITTED' ? ' · waiting for the business to confirm' : ''}
                        </div>
                      </div>
                      <div className={s.rowEnd}>
                        {p.hasProof && (
                          <a className={pay.thumb} href={`/api/customer/payment-records/${p.id}/proof`} target="_blank" rel="noreferrer"
                            aria-label="Open your payment screenshot">
                            {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-cookie image */}
                            <img src={`/api/customer/payment-records/${p.id}/proof`} alt="" />
                          </a>
                        )}
                        <span className={s.amount}>{money(p.amount, p.currency)}</span>
                        <span className={`${s.chip} ${TONE[st.tone]}`}>{st.label}</span>
                        {p.receiptNumber && (
                          <a className={`${s.btn} ${s.btnSm} ${s.btnGhost}`} href={`/docs/receipt/${p.id}`} target="_blank" rel="noreferrer">
                            <i className="fa-solid fa-receipt" /> Receipt
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className={s.stack}>
          <section className={s.panel}>
            <div className={s.ticketTop} style={{ padding: 18, display: 'grid', gap: 4 }}>
              <span className={s.hint}>Booking ticket</span>
              <strong>{b.businessName}</strong>
              <span className={s.hint}>{[b.branchName, b.branchAddress].filter(Boolean).join(', ')}</span>
            </div>
            <div className={s.panelBody} style={{ display: 'grid', justifyItems: 'center', gap: 8, textAlign: 'center' }}>
              <TicketQr code={b.publicCode} size={150} />
              <strong className={s.code} style={{ fontSize: 20, letterSpacing: '0.16em' }}>{b.publicCode}</strong>
              <span className={s.hint}>
                {t.awaitingPayment ? 'Not confirmed until your payment is checked.' : 'Show this code when you arrive.'}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
