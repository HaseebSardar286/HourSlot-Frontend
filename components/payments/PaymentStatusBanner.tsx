'use client';

import { useEffect, useState } from 'react';
import { dateLabel, money, type BookingTicket } from '@/lib/payments';
import p from './pay.module.css';

function left(ms: number) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Where a pay-now booking stands: slot held (with countdown), payment being checked, confirmed, or released. */
export default function PaymentStatusBanner({ ticket }: { ticket: BookingTicket }) {
  const b = ticket.booking;
  const due = b.paymentDueAt ? new Date(b.paymentDueAt).getTime() : null;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!due) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [due]);

  const status = b.status.toUpperCase();
  const lastRejected = ticket.payments.find((x) => x.status !== 'CONFIRMED');

  if (Number(b.refundDueAmount) > 0) {
    const sent = !!b.refundedAt;
    return (
      <div className={`${p.hold} ${sent ? p.holdGreen : p.holdBlue}`} role="status">
        <i className={`fa-solid ${sent ? 'fa-circle-check' : 'fa-rotate-left'}`} aria-hidden />
        <div>
          <strong>{sent ? 'Refund sent' : 'Refund on its way'}</strong>
          <span>
            {sent
              ? `${b.businessName} sent you ${money(b.refundDueAmount, b.currency || 'PKR')} on ${dateLabel(b.refundedAt)}. Contact them if it hasn't arrived.`
              : `This booking was cancelled. ${b.businessName} will send you ${money(b.refundDueAmount, b.currency || 'PKR')}.`}
          </span>
        </div>
      </div>
    );
  }

  if (b.paymentMethod !== 'TRANSFER') {
    if (status !== 'PENDING') return null;
    return (
      <div className={`${p.hold} ${p.holdBlue}`} role="status">
        <i className="fa-solid fa-hourglass-half" aria-hidden />
        <div>
          <strong>Waiting for {b.businessName} to confirm</strong>
          <span>Your slot is held. You&apos;ll get an email as soon as they confirm your booking.</span>
        </div>
      </div>
    );
  }

  if (status === 'CANCELLED' && b.paymentStatus === 'EXPIRED') {
    return (
      <div className={`${p.hold} ${p.holdRose}`} role="status">
        <i className="fa-solid fa-clock-rotate-left" aria-hidden />
        <div>
          <strong>This slot was released</strong>
          <span>No payment screenshot arrived in time. If you already paid, contact {b.businessName} with the transaction details.</span>
        </div>
      </div>
    );
  }

  if (!ticket.awaitingPayment) {
    if (status === 'CONFIRMED' && Number(ticket.paid) > 0) {
      return (
        <div className={`${p.hold} ${p.holdGreen}`} role="status">
          <i className="fa-solid fa-circle-check" aria-hidden />
          <div>
            <strong>Paid and confirmed</strong>
            <span>{b.businessName} confirmed your payment. Your receipt is below.</span>
          </div>
        </div>
      );
    }
    return null;
  }

  if (ticket.pendingReview) {
    return (
      <div className={`${p.hold} ${p.holdBlue}`} role="status">
        <i className="fa-solid fa-magnifying-glass-dollar" aria-hidden />
        <div>
          <strong>Pending: {b.businessName} is checking your payment</strong>
          <span>Your slot is held. Once they confirm the payment, your booking is confirmed and you&apos;ll get an email.</span>
        </div>
      </div>
    );
  }

  const remaining = due && now ? due - now : null;
  return (
    <div className={`${p.hold} ${lastRejected?.status === 'REJECTED' ? p.holdRose : ''}`} role="status">
      <i className="fa-solid fa-hourglass-half" aria-hidden />
      <div>
        <strong>{lastRejected?.status === 'REJECTED' ? 'Your last payment could not be matched' : 'Pay to confirm your booking'}</strong>
        <span>
          {lastRejected?.status === 'REJECTED' && lastRejected.rejectionReason ? `${lastRejected.rejectionReason} ` : ''}
          Your slot is held until {dateLabel(b.paymentDueAt, true)}. Send the payment and upload the screenshot before then.
        </span>
      </div>
      {remaining !== null && (
        <div className={p.holdEnd} aria-label="Time left to pay">
          <b>{left(remaining)}</b>
          <span>left</span>
        </div>
      )}
    </div>
  );
}
