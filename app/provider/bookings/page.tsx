'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';

type Person = { firstName?: string; lastName?: string; email?: string };

type Booking = {
  id: number;
  bookingTime: string;
  status: string;
  paymentMethod?: string;
  price?: number;
  service?: { name?: string };
  customer?: Person & { user?: Person };
};

type Reliability = {
  score: number | null;
  completed: number;
  noShows: number;
  lateCancels: number;
  cancels: number;
};

export default function SoloBookingsPage() {
  const { format } = useOrgLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [records, setRecords] = useState<Record<number, Reliability>>({});
  // Fixed at page load; refreshed with the list after each action.
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Booking[]>('/api/provider/ops/bookings');
      setBookings(data);
      setNow(Date.now());
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const nameOf = (b: Booking) => {
    const u: Person | undefined = b.customer?.user || b.customer;
    return `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Customer';
  };

  const setStatus = async (b: Booking, status: 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED') => {
    const prompt =
      status === 'NO_SHOW'
        ? 'Mark this customer as a no-show? Any no-show fee in your policy will be recorded as owed.'
        : status === 'CANCELLED'
          ? 'Cancel this booking? The customer will be notified and anyone on the waitlist is told the slot is free.'
          : null;
    if (prompt && !window.confirm(prompt)) return;
    setBusyId(b.id);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/api/bookings/${b.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setMessage(status === 'NO_SHOW' ? 'Marked as no-show.' : status === 'CONFIRMED'
        ? 'Booking confirmed. The customer was emailed.' : 'Booking cancelled.');
      await load();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not update the booking.');
    } finally {
      setBusyId(null);
    }
  };

  const showRecord = async (b: Booking) => {
    try {
      const r = await apiFetch<Reliability>(`/api/bookings/${b.id}/customer-reliability`);
      setRecords((prev) => ({ ...prev, [b.id]: r }));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Could not load the customer record.');
    }
  };

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Bookings"
        subtitle="Appointments booked with you — not a multi-branch schedule."
        actions={
          <Link href="/provider/calendar" className="btn btn-secondary">
            Calendar
          </Link>
        }
      />
      {message && <div className="success-alert"><i className="fa-solid fa-circle-check" /> {message}</div>}
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={200} />
      ) : bookings.length === 0 ? (
        <EmptyState icon="fa-calendar-check" title="No bookings yet" description="When customers book your services, they will appear here." />
      ) : (
        <DataTable<Booking>
          rows={bookings}
          rowKey={(b) => b.id}
          defaultSort={{ key: 'when', dir: 'desc' }}
          columns={[
            {
              key: 'when', header: 'Date & time', width: 170, sortValue: (b) => new Date(b.bookingTime).getTime(),
              render: (b) => new Date(b.bookingTime).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
            },
            { key: 'customer', header: 'Customer', sortValue: (b) => nameOf(b), render: (b) => <strong>{nameOf(b)}</strong> },
            { key: 'service', header: 'Service', sortValue: (b) => b.service?.name || '', render: (b) => b.service?.name || 'Service' },
            { key: 'status', header: 'Status', sortValue: (b) => b.status, render: (b) => <StatusBadge status={b.status} /> },
            {
              key: 'record', header: 'Reliability', hideOnMobile: true,
              render: (b) => {
                const record = records[b.id];
                if (!record) {
                  return <button type="button" className="btn btn-ghost btn-sm" onClick={() => void showRecord(b)}>Check</button>;
                }
                return (
                  <span title={`${record.completed} completed · ${record.noShows} no-shows · ${record.lateCancels} late cancellations (12 months)`}>
                    {record.score == null ? 'New customer' : `${record.score}% show-up`}
                  </span>
                );
              },
            },
            { key: 'amount', header: 'Amount', align: 'right', sortValue: (b) => Number(b.price ?? 0), render: (b) => (b.price != null ? <strong>{format(b.price)}</strong> : '—') },
            {
              key: 'actions', header: '', align: 'right',
              render: (b) => {
                const active = b.status === 'CONFIRMED' || b.status === 'PENDING';
                const started = new Date(b.bookingTime).getTime() <= now;
                return (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {b.status === 'PENDING' && b.paymentMethod !== 'TRANSFER' && (
                    <button type="button" className="btn btn-primary btn-sm" disabled={busyId === b.id}
                      onClick={() => void setStatus(b, 'CONFIRMED')}>
                      <i className="fa-solid fa-check" /> Confirm
                    </button>
                  )}
                  {b.status === 'PENDING' && b.paymentMethod === 'TRANSFER' && (
                    <Link href="/provider/payments" className="btn btn-primary btn-sm">
                      <i className="fa-solid fa-magnifying-glass-dollar" /> Check payment
                    </Link>
                  )}
                  {active && started && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyId === b.id}
                      onClick={() => void setStatus(b, 'NO_SHOW')}>
                      No-show
                    </button>
                  )}
                  {active && !started && (
                    <button type="button" className="btn btn-outline btn-sm" disabled={busyId === b.id}
                      onClick={() => void setStatus(b, 'CANCELLED')}>
                      Cancel
                    </button>
                  )}
                </div>
                );
              },
            },
          ]}
        />
      )}
    </div>
  );
}
