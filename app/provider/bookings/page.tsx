'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useOrgLocale } from '@/lib/org-locale-context';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';

type Booking = {
  id: number;
  bookingTime: string;
  status: string;
  price?: number;
  service?: { name?: string };
  customer?: { user?: { firstName?: string; lastName?: string; email?: string }; firstName?: string; lastName?: string };
};

export default function SoloBookingsPage() {
  const { format } = useOrgLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Booking[]>('/api/provider/ops/bookings');
      setBookings(data);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nameOf = (b: Booking) => {
    const u = b.customer?.user || b.customer;
    return `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Customer';
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader
        title="Bookings"
        subtitle="Appointments booked with you — not a multi-branch schedule."
        actions={
          <Link href="/provider/calendar" className="btn btn-secondary">
            Calendar
          </Link>
        }
      />
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={200} />
      ) : bookings.length === 0 ? (
        <EmptyState icon="fa-calendar-check" title="No bookings yet" description="When customers book your services, they will appear here." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {bookings.map((b) => (
            <article key={b.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{b.service?.name || 'Service'}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  {nameOf(b)} · {new Date(b.bookingTime).toLocaleString()}
                  {b.price != null ? ` · ${format(b.price)}` : ''}
                </div>
              </div>
              <StatusBadge status={b.status} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
