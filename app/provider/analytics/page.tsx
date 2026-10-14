'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

type Analytics = {
  bookingsThisMonth?: number;
  completedBookings?: number;
  jobsCompleted?: number;
  quotesSent?: number;
  openRequests?: number;
  rating?: number;
  reviewCount?: number;
  opsStatus?: string;
};

export default function SoloAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Analytics>('/api/provider/ops/analytics')
      .then(setData)
      .catch((e) => setError(e?.message || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton variant="card" height={200} />;

  const cards = [
    { label: 'Bookings this month', value: data?.bookingsThisMonth ?? 0 },
    { label: 'Completed bookings', value: data?.completedBookings ?? 0 },
    { label: 'Jobs completed', value: data?.jobsCompleted ?? 0 },
    { label: 'Quotes sent', value: data?.quotesSent ?? 0 },
    { label: 'Open requests', value: data?.openRequests ?? 0 },
    { label: 'Rating', value: `${data?.rating ?? 0} (${data?.reviewCount ?? 0})` },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <PageHeader title="Analytics" subtitle="Performance for your solo practice." />
      {error && <div className="error-alert">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div key={c.label} className="card" style={{ padding: 16 }}>
            <strong style={{ display: 'block', fontSize: '1.3rem' }}>{c.value}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
