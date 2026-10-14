'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

type CustomerRow = {
  customer_id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  booking_count?: number;
  last_booking_at?: string;
};

export default function SoloCustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<CustomerRow[]>('/api/provider/ops/customers')
      .then(setRows)
      .catch((e) => setError(e?.message || 'Failed to load customers.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Customers" subtitle="People who have booked with you." />
      {error && <div className="error-alert">{error}</div>}
      {loading ? (
        <Skeleton variant="card" height={180} />
      ) : rows.length === 0 ? (
        <EmptyState icon="fa-users" title="No customers yet" description="Customers appear after their first booking with you." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <article key={r.customer_id} className="card" style={{ padding: 14 }}>
              <strong>
                {`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email}
              </strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                {r.email}
                {r.phone_number ? ` · ${r.phone_number}` : ''} · {r.booking_count || 0} bookings
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
